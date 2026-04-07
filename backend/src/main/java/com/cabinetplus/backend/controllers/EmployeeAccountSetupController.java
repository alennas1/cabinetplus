package com.cabinetplus.backend.controllers;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.EmployeeAccountSetupConfirmRequest;
import com.cabinetplus.backend.dto.EmployeeAccountSetupStartRequest;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.BadGatewayException;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.InternalServerErrorException;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.exceptions.TooManyRequestsException;
import com.cabinetplus.backend.models.Employee;
import com.cabinetplus.backend.models.RefreshToken;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.EmployeeRepository;
import com.cabinetplus.backend.repositories.RefreshTokenRepository;
import com.cabinetplus.backend.security.JwtUtil;
import com.cabinetplus.backend.security.RefreshTokenHash;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.PhoneVerificationService;
import com.cabinetplus.backend.services.UserService;
import com.cabinetplus.backend.util.PhoneNumberUtil;
import com.twilio.exception.ApiException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth/employee-setup")
public class EmployeeAccountSetupController {

    private static final Logger logger = LoggerFactory.getLogger(EmployeeAccountSetupController.class);

    private final EmployeeRepository employeeRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PhoneVerificationService phoneVerificationService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuditService auditService;
    private final UserService userService;
    private final boolean devProfile;

    @Value("${jwt.refresh.expiration-ms}")
    private long refreshTokenMs;

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${app.cookie.same-site:Lax}")
    private String cookieSameSite;

    @Value("${app.otp.cooldown-seconds:60}")
    private long otpCooldownSeconds;

    @Value("${app.phone-verification.bypass-local:false}")
    private boolean bypassPhoneVerificationLocal;

    public EmployeeAccountSetupController(
            EmployeeRepository employeeRepository,
            RefreshTokenRepository refreshTokenRepository,
            PhoneVerificationService phoneVerificationService,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            AuditService auditService,
            UserService userService,
            Environment environment
    ) {
        this.employeeRepository = employeeRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.phoneVerificationService = phoneVerificationService;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.auditService = auditService;
        this.userService = userService;
        this.devProfile = environment != null && Arrays.asList(environment.getActiveProfiles()).contains("dev");
    }

    @PostMapping("/start")
    public ResponseEntity<?> start(
            @Valid @RequestBody EmployeeAccountSetupStartRequest body,
            HttpServletRequest request
    ) {
        String setupCode = parseSetupCode(body.employeeSetupCode());
        Employee employee = employeeRepository.findBySetupCode(setupCode)
                .orElseThrow(() -> new NotFoundException("Employe introuvable"));
        if (employee.getArchivedAt() != null) {
            throw new BadRequestException(Map.of("_", "Employe archive"));
        }
        User user = employee.getUser();
        if (user == null) {
            throw new BadRequestException(Map.of("_", "Compte utilisateur manquant."));
        }
        if (user.isAccountSetupCompleted()) {
            return ResponseEntity.ok(Map.of(
                    "maskedPhone", maskPhoneForUi(user.getPhoneNumber()),
                    "message", "Compte deja configure"
            ));
        }

        Long retryAfterSeconds = checkCooldown(user.getEmployeeSetupOtpLastSentAt());
        if (retryAfterSeconds != null) {
            throw new TooManyRequestsException(
                    "Veuillez patienter avant de renvoyer un code.",
                    Map.of(
                            "_", "Veuillez patienter avant de renvoyer un code.",
                            "reason", "cooldown",
                            "retryAfterSeconds", String.valueOf(retryAfterSeconds)
                    )
            );
        }

        String formattedNumber = formatPhoneNumber(user.getPhoneNumber());
        if (formattedNumber == null || formattedNumber.isEmpty()) {
            throw new BadRequestException(Map.of("phoneNumber", "Numero de telephone invalide ou manquant."));
        }

        try {
            boolean devBypass = bypassPhoneVerificationLocal && devProfile && isLocalRequest(request);
            if (!devBypass) {
                phoneVerificationService.sendVerificationCode(formattedNumber);
            }
            user.setEmployeeSetupOtpLastSentAt(LocalDateTime.now());
            userService.save(user);

            auditService.logSuccessAsUser(
                    user,
                    AuditEventType.EMPLOYEE_SETUP_OTP_SEND,
                    "EMPLOYEE",
                    String.valueOf(employee.getId()),
                    devBypass ? "OTP setup employe envoye (dev)" : "OTP setup employe envoye"
            );

            return ResponseEntity.ok(Map.of(
                    "maskedPhone", maskPhoneForUi(formattedNumber),
                    "message", devBypass ? "Code SMS envoye (mode dev)" : "Code SMS envoye"
            ));
        } catch (IllegalStateException e) {
            logger.error("Twilio Verify not configured for employee setup send (to={})", maskPhoneForLog(formattedNumber), e);
            throw new InternalServerErrorException(
                    "Service SMS indisponible",
                    Map.of("_", "Service SMS indisponible", "reason", "not_configured")
            );
        } catch (ApiException e) {
            int status = e.getStatusCode();
            Integer twilioCode = e.getCode();
            logger.warn("Twilio Verify send failed for employee setup (to={}, status={})", maskPhoneForLog(formattedNumber), status, e);

            if (twilioCode != null && twilioCode == 60410) {
                throw new TooManyRequestsException(
                        "Envoi SMS temporairement bloque. Reessayez plus tard.",
                        Map.of(
                                "_", "Envoi SMS temporairement bloque. Reessayez plus tard.",
                                "reason", "fraud_guard_blocked",
                                "retryAfterSeconds", String.valueOf(60 * 60 * 12)
                        )
                );
            }
            if (status == 400) {
                throw new BadRequestException(Map.of("phoneNumber", "Numero de telephone invalide"));
            }
            if (status == 429) {
                throw new TooManyRequestsException("Trop de demandes. Reessayez plus tard.");
            }
            throw new BadGatewayException("Service SMS indisponible");
        } catch (Exception e) {
            logger.error("Unexpected error during employee setup send (to={})", maskPhoneForLog(formattedNumber), e);
            throw new InternalServerErrorException(
                    "Service SMS indisponible",
                    Map.of("_", "Service SMS indisponible", "reason", "unexpected")
            );
        }
    }

    @PostMapping("/confirm")
    public ResponseEntity<?> confirm(
            @Valid @RequestBody EmployeeAccountSetupConfirmRequest body,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String setupCode = parseSetupCode(body.employeeSetupCode());
        Employee employee = employeeRepository.findBySetupCode(setupCode)
                .orElseThrow(() -> new NotFoundException("Employe introuvable"));
        if (employee.getArchivedAt() != null) {
            throw new BadRequestException(Map.of("_", "Employe archive"));
        }
        User user = employee.getUser();
        if (user == null) {
            throw new BadRequestException(Map.of("_", "Compte utilisateur manquant."));
        }
        if (user.isAccountSetupCompleted()) {
            return ResponseEntity.ok(Map.of("message", "Compte deja configure"));
        }

        String formattedNumber = formatPhoneNumber(user.getPhoneNumber());
        if (formattedNumber == null || formattedNumber.isEmpty()) {
            throw new BadRequestException(Map.of("phoneNumber", "Numero de telephone invalide ou manquant."));
        }

        boolean approved;
        try {
            if (bypassPhoneVerificationLocal && devProfile && isLocalRequest(request)) {
                approved = true;
            } else {
                approved = phoneVerificationService.checkVerificationCode(formattedNumber, body.code());
            }
        } catch (IllegalStateException e) {
            logger.error("Twilio Verify not configured for employee setup verify (to={})", maskPhoneForLog(formattedNumber), e);
            throw new InternalServerErrorException(
                    "Service SMS indisponible",
                    Map.of("_", "Service SMS indisponible", "reason", "not_configured")
            );
        } catch (ApiException e) {
            int status = e.getStatusCode();
            logger.warn("Twilio Verify check failed for employee setup (to={}, status={})", maskPhoneForLog(formattedNumber), status, e);
            if (status == 400) {
                throw new BadRequestException(Map.of("code", "Code SMS invalide"));
            }
            if (status == 429) {
                throw new TooManyRequestsException("Trop de demandes. Reessayez plus tard.");
            }
            throw new BadGatewayException("Service SMS indisponible");
        } catch (Exception e) {
            logger.error("Unexpected error during employee setup verify (to={})", maskPhoneForLog(formattedNumber), e);
            throw new InternalServerErrorException(
                    "Service SMS indisponible",
                    Map.of("_", "Service SMS indisponible", "reason", "unexpected")
            );
        }

        if (!approved) {
            auditService.logFailureAsUser(
                    user,
                    AuditEventType.EMPLOYEE_SETUP_COMPLETE,
                    "EMPLOYEE",
                    String.valueOf(employee.getId()),
                    "OTP setup employe invalide"
            );
            throw new BadRequestException(Map.of("code", "Code SMS invalide"));
        }

        String normalizedPin = body.pin().replaceAll("\\D", "");
        user.setPasswordHash(passwordEncoder.encode(body.newPassword()));
        user.setPhoneVerified(true);
        user.setAccountSetupCompleted(true);
        user.setEmployeeSetupOtpLastSentAt(null);
        user.setGestionCabinetPinHash(passwordEncoder.encode(normalizedPin));
        user.setGestionCabinetPinEnabled(false);
        user.setGestionCabinetPinUpdatedAt(LocalDateTime.now());

        userService.save(user);

        refreshTokenRepository.deleteAllByUser(user);
        Map<String, Object> session = establishSession(user, request, response);

        auditService.logSuccessAsUser(
                user,
                AuditEventType.EMPLOYEE_SETUP_COMPLETE,
                "EMPLOYEE",
                String.valueOf(employee.getId()),
                "Compte employe configure"
        );

        return ResponseEntity.ok(Map.of(
                "message", "Compte configure",
                "accessToken", session.get("accessToken")
        ));
    }

    private String parseSetupCode(String value) {
        String code = value != null ? value.trim() : "";
        if (code.isBlank()) {
            throw new BadRequestException(Map.of("employeeSetupCode", "ID d'invitation obligatoire"));
        }
        if (!code.matches("\\d{4,12}")) {
            throw new BadRequestException(Map.of("employeeSetupCode", "ID d'invitation invalide"));
        }
        return code;
    }

    private Long checkCooldown(LocalDateTime lastSentAt) {
        if (lastSentAt == null) return null;
        long seconds = Math.max(1, otpCooldownSeconds);
        Duration elapsed = Duration.between(lastSentAt, LocalDateTime.now());
        if (elapsed.getSeconds() < seconds) {
            return seconds - elapsed.getSeconds();
        }
        return null;
    }

    private Map<String, Object> establishSession(User user, HttpServletRequest request, HttpServletResponse response) {
        String accessToken = jwtUtil.generateAccessToken(user);

        String deviceId = resolveDeviceId(request);
        if (deviceId == null || deviceId.isBlank()) {
            deviceId = UUID.randomUUID().toString();
            addDeviceCookie(response, deviceId);
        }

        revokeActiveSessionsForDevice(user, deviceId);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        String rawRefreshToken = jwtUtil.generateRefreshToken(user.getPhoneNumber(), refreshTokenMs);
        refreshToken.setToken(RefreshTokenHash.hash(rawRefreshToken));
        refreshToken.setDeviceId(deviceId);
        refreshToken.setCreatedAt(LocalDateTime.now());
        refreshToken.setExpiresAt(LocalDateTime.now().plusSeconds(refreshTokenMs / 1000));
        refreshToken.setLastUsedAt(LocalDateTime.now());
        fillSessionMeta(refreshToken, request);
        refreshTokenRepository.save(refreshToken);

        addRefreshCookie(response, rawRefreshToken, refreshTokenMs / 1000);
        return Map.of("accessToken", accessToken);
    }

    private void revokeActiveSessionsForDevice(User user, String deviceId) {
        if (user == null || deviceId == null || deviceId.isBlank()) return;
        var sessions = refreshTokenRepository.findActiveSessionsByDevice(user, deviceId, LocalDateTime.now());
        if (sessions == null || sessions.isEmpty()) return;
        sessions.forEach(s -> s.setRevoked(true));
        refreshTokenRepository.saveAll(sessions);
    }

    private void fillSessionMeta(RefreshToken token, HttpServletRequest request) {
        if (token == null || request == null) return;
        String userAgent = request.getHeader("User-Agent");
        if (userAgent != null) token.setUserAgent(userAgent.substring(0, Math.min(userAgent.length(), 255)));
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) ip = request.getRemoteAddr();
        if (ip != null) token.setIpAddress(ip.substring(0, Math.min(ip.length(), 100)));
    }

    private String resolveDeviceId(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (var cookie : request.getCookies()) {
            if ("device_id".equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private void addDeviceCookie(HttpServletResponse response, String deviceId) {
        ResponseCookie cookie = ResponseCookie.from("device_id", deviceId)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/auth")
                .maxAge(60L * 60 * 24 * 365)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void addRefreshCookie(HttpServletResponse response, String rawRefreshToken, long maxAgeSeconds) {
        ResponseCookie cookie = ResponseCookie.from("refresh_token", rawRefreshToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/auth")
                .maxAge(maxAgeSeconds)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String formatPhoneNumber(String number) {
        if (number == null || number.isBlank()) return null;
        String canonical = PhoneNumberUtil.canonicalAlgeriaForStorage(number);
        if (canonical != null && canonical.startsWith("+")) return canonical;
        String clean = number.replaceAll("[^0-9]", "");
        if (clean.startsWith("0") && clean.length() == 10) return "+213" + clean.substring(1);
        if (clean.startsWith("213") && clean.length() == 12) return "+" + clean;
        return null;
    }

    private boolean isLocalRequest(HttpServletRequest request) {
        if (request == null) return false;
        String ip = request.getRemoteAddr();
        return "127.0.0.1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip);
    }

    private String maskPhoneForUi(String phone) {
        if (phone == null) return null;
        String digits = PhoneNumberUtil.digitsOnly(phone);
        if (digits.length() <= 4) return "****";
        String last4 = digits.substring(digits.length() - 4);
        return "****" + last4;
    }

    private String maskPhoneForLog(String phone) {
        return maskPhoneForUi(phone);
    }
}
