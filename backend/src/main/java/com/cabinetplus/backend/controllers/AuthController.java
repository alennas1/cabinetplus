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
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

import com.cabinetplus.backend.dto.AuthRequest;
import com.cabinetplus.backend.dto.LoginTwoFactorResendRequest;
import com.cabinetplus.backend.dto.LoginTwoFactorVerifyRequest;
import com.cabinetplus.backend.dto.PasswordResetConfirmRequest;
import com.cabinetplus.backend.dto.PasswordResetSendRequest;
import com.cabinetplus.backend.dto.RegisterRequest;
import com.cabinetplus.backend.dto.UserDto;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.ClinicAccessRole;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.BadGatewayException;
import com.cabinetplus.backend.exceptions.ForbiddenException;
import com.cabinetplus.backend.exceptions.InternalServerErrorException;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.exceptions.TooManyRequestsException;
import com.cabinetplus.backend.exceptions.UnauthorizedException;
import com.cabinetplus.backend.models.RefreshToken;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.RefreshTokenRepository;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.security.JwtUtil;
import com.cabinetplus.backend.security.RefreshTokenHash;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.PhoneVerificationService;
import com.cabinetplus.backend.util.PhoneNumberUtil;
import com.twilio.exception.ApiException;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final AuthenticationManager authManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepo;
    private final RefreshTokenRepository refreshRepo;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final PhoneVerificationService phoneVerificationService;
    private final boolean devProfile;

    @Value("${jwt.access.expiration-ms}")
    private long accessTokenMs;

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

    @Value("${app.login-2fa.challenge-ttl-seconds:300}")
    private long loginTwoFactorChallengeTtlSeconds;

    @Value("${app.login-2fa.bypass-local:false}")
    private boolean bypassLoginTwoFactorLocal;

    public AuthController(AuthenticationManager authManager, JwtUtil jwtUtil,
                          UserRepository userRepo, RefreshTokenRepository refreshRepo,
                          PasswordEncoder passwordEncoder, AuditService auditService,
                          PhoneVerificationService phoneVerificationService,
                          Environment environment) {
        this.authManager = authManager;
        this.jwtUtil = jwtUtil;
        this.userRepo = userRepo;
        this.refreshRepo = refreshRepo;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.phoneVerificationService = phoneVerificationService;
        this.devProfile = Arrays.asList(environment.getActiveProfiles()).contains("dev");
    }

    // ---------------- COOKIE HELPER ----------------
    private void addRefreshCookie(HttpServletResponse response, String refreshToken, long maxAgeSeconds) {
        ResponseCookie cookie = ResponseCookie.from("refresh_token", refreshToken)
                .httpOnly(true)   // secure in production
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/auth")
                .maxAge(maxAgeSeconds)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
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
    
    // ---------------- LOGIN ----------------
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest body, HttpServletResponse response, HttpServletRequest request) {
        String identifier = body.phoneNumber();
        String password = body.password();

        var phoneCandidates = PhoneNumberUtil.algeriaStoredCandidates(identifier);
        User user = userRepo.findFirstByPhoneNumberInOrderByIdAsc(phoneCandidates).orElse(null);
        if (user == null) {
            auditService.logFailure(
                    AuditEventType.AUTH_LOGIN,
                    "SESSION",
                    identifier,
                    "Numero de telephone introuvable"
            );
            throw new UnauthorizedException(
                    "Numero de telephone introuvable",
                    Map.of("phoneNumber", "Numero de telephone introuvable")
            );
        }

        try {
            String principalPhoneNumber = user.getPhoneNumber();
            authManager.authenticate(new UsernamePasswordAuthenticationToken(principalPhoneNumber, password));

            // Only enforce login 2FA once the phone number is verified.
            // This keeps the registration flow smooth (register -> verify -> plan -> waiting)
            // and ensures 2FA is required on subsequent logins after verification.
            if (user.isLoginTwoFactorEnabled() && user.isPhoneVerified()) {
                return ResponseEntity.ok(startLoginTwoFactorChallenge(user, request));
            }

            auditService.logSuccessAsUser(user, AuditEventType.AUTH_LOGIN, "SESSION", null, "Connexion reussie");
            return ResponseEntity.ok(establishSession(user, request, response));

        } catch (AuthenticationException e) {
            auditService.logFailureAsUser(
                    user,
                    AuditEventType.AUTH_LOGIN,
                    "SESSION",
                    String.valueOf(user.getId()),
                    "Mot de passe invalide"
            );
            throw new UnauthorizedException(
                    "Mot de passe invalide",
                    Map.of("password", "Mot de passe invalide")
            );
        }
    }

    // ---------------- LOGIN 2FA: VERIFY CODE ----------------
    @PostMapping("/login/verify")
    public ResponseEntity<?> verifyLoginTwoFactor(@Valid @RequestBody LoginTwoFactorVerifyRequest body,
                                                  HttpServletResponse response,
                                                  HttpServletRequest request) {
        final String phoneNumber;
        try {
            phoneNumber = jwtUtil.extractPhoneNumberFromLoginTwoFactorChallenge(body.challengeToken());
        } catch (ExpiredJwtException e) {
            throw new UnauthorizedException(
                    "Session expiree. Veuillez vous reconnecter.",
                    Map.of("_", "Session expiree. Veuillez vous reconnecter.", "reason", "challenge_expired")
            );
        } catch (JwtException e) {
            throw new UnauthorizedException(
                    "Session invalide. Veuillez vous reconnecter.",
                    Map.of("_", "Session invalide. Veuillez vous reconnecter.", "reason", "challenge_invalid")
            );
        }

        var candidates = PhoneNumberUtil.algeriaStoredCandidates(phoneNumber);
        User user = userRepo.findFirstByPhoneNumberInOrderByIdAsc(candidates).orElse(null);
        if (user == null) {
            throw new UnauthorizedException(
                    "Session invalide. Veuillez vous reconnecter.",
                    Map.of("_", "Session invalide. Veuillez vous reconnecter.", "reason", "user_not_found")
            );
        }

        if (user.isLoginTwoFactorEnabled()) {
            String formattedNumber = formatPhoneNumber(user.getPhoneNumber());
            if (formattedNumber == null || formattedNumber.isEmpty()) {
                throw new BadRequestException(Map.of("phoneNumber", "Numero de telephone invalide ou manquant."));
            }

            boolean approved;
            try {
                if (bypassLoginTwoFactorLocal && devProfile && isLocalRequest(request)) {
                    approved = true;
                } else {
                    approved = phoneVerificationService.checkVerificationCode(formattedNumber, body.code());
                }
            } catch (IllegalStateException e) {
                logger.error("Twilio Verify not configured for login 2FA verify (to={})", maskPhone(formattedNumber), e);
                throw new InternalServerErrorException(
                        "Service SMS indisponible",
                        Map.of("_", "Service SMS indisponible", "reason", "not_configured")
                );
            } catch (ApiException e) {
                int status = e.getStatusCode();
                logger.warn("Twilio Verify check failed for login 2FA (to={}, status={})", maskPhone(formattedNumber), status, e);
                if (status == 400) {
                    throw new BadRequestException(Map.of("code", "Code SMS invalide"));
                }
                if (status == 429) {
                    throw new TooManyRequestsException("Trop de demandes. Reessayez plus tard.");
                }
                if (status == 401 || status == 403) {
                    throw new InternalServerErrorException("Configuration SMS invalide");
                }
                if (status == 404) {
                    throw new InternalServerErrorException("Configuration SMS invalide");
                }
                throw new BadGatewayException("Service SMS indisponible");
            } catch (Exception e) {
                logger.error("Unexpected error during login 2FA verify (to={})", maskPhone(formattedNumber), e);
                throw new InternalServerErrorException(
                        "Service SMS indisponible",
                        Map.of("_", "Service SMS indisponible", "reason", "unexpected")
                );
            }

            if (!approved) {
                auditService.logFailureAsUser(
                        user,
                        AuditEventType.AUTH_LOGIN_2FA_VERIFY,
                        "SESSION",
                        null,
                        "Code SMS invalide"
                );
                throw new BadRequestException(Map.of("code", "Code SMS invalide"));
            }
        }

        auditService.logSuccessAsUser(user, AuditEventType.AUTH_LOGIN_2FA_VERIFY, "SESSION", null, "OTP connexion verifie");
        auditService.logSuccessAsUser(user, AuditEventType.AUTH_LOGIN, "SESSION", null, "Connexion reussie");
        return ResponseEntity.ok(establishSession(user, request, response));
    }

    // ---------------- LOGIN 2FA: RESEND CODE ----------------
    @PostMapping("/login/2fa/resend")
    public ResponseEntity<?> resendLoginTwoFactor(@Valid @RequestBody LoginTwoFactorResendRequest body,
                                                  HttpServletRequest request) {
        final String phoneNumber;
        try {
            phoneNumber = jwtUtil.extractPhoneNumberFromLoginTwoFactorChallenge(body.challengeToken());
        } catch (ExpiredJwtException e) {
            throw new UnauthorizedException(
                    "Session expiree. Veuillez vous reconnecter.",
                    Map.of("_", "Session expiree. Veuillez vous reconnecter.", "reason", "challenge_expired")
            );
        } catch (JwtException e) {
            throw new UnauthorizedException(
                    "Session invalide. Veuillez vous reconnecter.",
                    Map.of("_", "Session invalide. Veuillez vous reconnecter.", "reason", "challenge_invalid")
            );
        }

        var candidates = PhoneNumberUtil.algeriaStoredCandidates(phoneNumber);
        User user = userRepo.findFirstByPhoneNumberInOrderByIdAsc(candidates).orElse(null);
        if (user == null) {
            throw new UnauthorizedException(
                    "Session invalide. Veuillez vous reconnecter.",
                    Map.of("_", "Session invalide. Veuillez vous reconnecter.", "reason", "user_not_found")
            );
        }
        if (!user.isLoginTwoFactorEnabled()) {
            throw new BadRequestException(Map.of("_", "La verification en 2 etapes est desactivee."));
        }

        Map<String, Object> payload = sendLoginTwoFactorCode(user, request);
        return ResponseEntity.ok(Map.of(
                "challengeToken", payload.get("challengeToken"),
                "maskedPhone", payload.get("maskedPhone"),
                "message", payload.get("message")
        ));
    }

    private Map<String, Object> establishSession(User user, HttpServletRequest request, HttpServletResponse response) {
        String accessToken = jwtUtil.generateAccessToken(user);

        String deviceId = resolveDeviceId(request);
        if (deviceId == null || deviceId.isBlank()) {
            deviceId = java.util.UUID.randomUUID().toString();
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
        refreshRepo.save(refreshToken);

        addRefreshCookie(response, rawRefreshToken, refreshTokenMs / 1000);
        return Map.of("accessToken", accessToken);
    }

    private Map<String, Object> startLoginTwoFactorChallenge(User user, HttpServletRequest request) {
        Map<String, Object> payload = sendLoginTwoFactorCode(user, request);
        return Map.of(
                "twoFactorRequired", true,
                "challengeToken", payload.get("challengeToken"),
                "maskedPhone", payload.get("maskedPhone"),
                "message", payload.get("message")
        );
    }

    private Map<String, Object> sendLoginTwoFactorCode(User user, HttpServletRequest request) {
        String formattedNumber = formatPhoneNumber(user.getPhoneNumber());
        if (formattedNumber == null || formattedNumber.isEmpty()) {
            throw new BadRequestException(Map.of("phoneNumber", "Numero de telephone invalide ou manquant."));
        }

        Long retryAfterSeconds = checkCooldown(user.getLoginOtpLastSentAt());
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

        boolean devBypass = bypassLoginTwoFactorLocal && devProfile && isLocalRequest(request);
        try {
            if (!devBypass) {
                phoneVerificationService.sendVerificationCode(formattedNumber);
            }
            user.setLoginOtpLastSentAt(LocalDateTime.now());
            userRepo.save(user);

            long ttlMs = Math.max(1, loginTwoFactorChallengeTtlSeconds) * 1000L;
            String challengeToken = jwtUtil.generateLoginTwoFactorChallengeToken(user.getPhoneNumber(), ttlMs);

            auditService.logSuccessAsUser(
                    user,
                    AuditEventType.AUTH_LOGIN_2FA_SEND,
                    "SESSION",
                    null,
                    devBypass ? "OTP connexion envoye (dev)" : "OTP connexion envoye"
            );

            return Map.of(
                    "challengeToken", challengeToken,
                    "maskedPhone", maskPhone(formattedNumber),
                    "message", devBypass ? "Code SMS envoye (mode dev)" : "Code SMS envoye"
            );
        } catch (IllegalStateException e) {
            logger.error("Twilio Verify not configured for login 2FA send (to={})", maskPhone(formattedNumber), e);
            throw new InternalServerErrorException(
                    "Service SMS indisponible",
                    Map.of("_", "Service SMS indisponible", "reason", "not_configured")
            );
        } catch (ApiException e) {
            int status = e.getStatusCode();
            Integer twilioCode = e.getCode();
            logger.warn("Twilio Verify send failed for login 2FA (to={}, status={})", maskPhone(formattedNumber), status, e);

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
            if (status == 401 || status == 403) {
                throw new InternalServerErrorException("Configuration SMS invalide");
            }
            if (status == 404) {
                throw new InternalServerErrorException("Configuration SMS invalide");
            }
            throw new BadGatewayException("Service SMS indisponible");
        } catch (Exception e) {
            logger.error("Unexpected error during login 2FA send (to={})", maskPhone(formattedNumber), e);
            throw new InternalServerErrorException(
                    "Service SMS indisponible",
                    Map.of("_", "Service SMS indisponible", "reason", "unexpected")
            );
        }
    }

    // ---------------- REGISTER ----------------
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response, HttpServletRequest httpRequest) {
        var phoneCandidates = PhoneNumberUtil.algeriaStoredCandidates(request.phoneNumber());
        if (!phoneCandidates.isEmpty() && userRepo.existsByPhoneNumberIn(phoneCandidates)) {
            auditService.logFailure(
                    AuditEventType.AUTH_REGISTER,
                    "USER",
                    request.phoneNumber(),
                    "Numero de telephone deja utilise"
            );
            throw new BadRequestException(Map.of("phoneNumber", "Ce numero de telephone est deja utilise"));
        }

        User user = new User();
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFirstname(request.firstname());
        user.setLastname(request.lastname());
        user.setPhoneNumber(PhoneNumberUtil.canonicalAlgeriaForStorage(request.phoneNumber()));
        String clinicName = request.clinicName() == null ? null : request.clinicName().trim();
        String address = request.address() == null ? null : request.address().trim();
        user.setClinicName(clinicName == null || clinicName.isBlank() ? null : clinicName);
        user.setAddress(address == null || address.isBlank() ? null : address);
        UserRole role = UserRole.valueOf(request.role());
        user.setRole(role);
        user.setClinicAccessRole(role == UserRole.DENTIST ? ClinicAccessRole.DENTIST : null);
        user.setCreatedAt(LocalDateTime.now());

        if (bypassPhoneVerificationLocal && devProfile && isLocalRequest(httpRequest)) {
            user.setPhoneVerified(true);
        }

        User saved = userRepo.save(user);

        String accessToken = jwtUtil.generateAccessToken(saved);

        String deviceId = resolveDeviceId(httpRequest);

if (deviceId == null || deviceId.isBlank()) {
    deviceId = java.util.UUID.randomUUID().toString();
    addDeviceCookie(response, deviceId);
}
        revokeActiveSessionsForDevice(saved, deviceId);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(saved);
        String rawRefreshToken = jwtUtil.generateRefreshToken(saved.getPhoneNumber(), refreshTokenMs);
        refreshToken.setToken(RefreshTokenHash.hash(rawRefreshToken));
        refreshToken.setDeviceId(deviceId);

        refreshToken.setCreatedAt(LocalDateTime.now());
        refreshToken.setExpiresAt(LocalDateTime.now().plusSeconds(refreshTokenMs / 1000));
        refreshToken.setLastUsedAt(LocalDateTime.now());
        fillSessionMeta(refreshToken, httpRequest);
        refreshRepo.save(refreshToken);

        addRefreshCookie(response, rawRefreshToken, refreshTokenMs / 1000);
        auditService.logSuccessAsUser(saved, AuditEventType.AUTH_REGISTER, "USER", String.valueOf(saved.getId()), "Inscription reussie");

        UserDto dto = new UserDto(
                saved.getId(),
                saved.getFirstname(),
                saved.getLastname(),
                saved.getPhoneNumber(),
                saved.getRole().name()
        );

        return ResponseEntity.ok(Map.of("user", dto, "accessToken", accessToken));
    }

    // ---------------- SESSION ----------------
    @PostMapping("/session")
    public ResponseEntity<?> session(@CookieValue(name = "refresh_token", required = false) String refreshTokenCookie,
                                     HttpServletResponse response,
                                     HttpServletRequest request) {
        if (refreshTokenCookie == null) {
            return ResponseEntity.ok(Map.of("accessToken", ""));
        }

        String tokenHash = RefreshTokenHash.hash(refreshTokenCookie);
        var byHash = refreshRepo.findByTokenWithUser(tokenHash);
        var tokenLookup = byHash.isPresent()
                ? byHash
                : refreshRepo.findByTokenWithUser(refreshTokenCookie).map(tokenEntity -> {
                    // Migrate legacy rows storing plaintext refresh tokens.
                    tokenEntity.setToken(tokenHash);
                    return refreshRepo.save(tokenEntity);
                });

        return tokenLookup
                .map(tokenEntity -> {
                    User user = tokenEntity.getUser();
                    boolean expiredJwt = !jwtUtil.validateRefreshToken(refreshTokenCookie);

                    if (tokenEntity.isRevoked() || tokenEntity.getExpiresAt().isBefore(LocalDateTime.now())
                            || user == null || expiredJwt) {
                        return ResponseEntity.ok(Map.of("accessToken", ""));
                    }

                    // Only generate new access token, no refresh token rotation
                    ensureDeviceIdCookieAndToken(tokenEntity, request, response);
                    tokenEntity.setLastUsedAt(LocalDateTime.now());
                    fillSessionMetaIfMissing(tokenEntity, request);
                    refreshRepo.save(tokenEntity);
                    String newAccessToken = jwtUtil.generateAccessToken(user);
                    return ResponseEntity.ok(Map.of("accessToken", newAccessToken));
                })
                .orElseGet(() -> ResponseEntity.ok(Map.of("accessToken", "")));
    }

    // ---------------- LOGOUT ----------------
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = "refresh_token", required = false) String refreshTokenCookie,
                                       HttpServletResponse response) {
        if (refreshTokenCookie != null) {
            String tokenHash = RefreshTokenHash.hash(refreshTokenCookie);
            var byHash = refreshRepo.findByToken(tokenHash);
            var tokenLookup = byHash.isPresent()
                    ? byHash
                    : refreshRepo.findByToken(refreshTokenCookie).map(tokenEntity -> {
                        tokenEntity.setToken(tokenHash);
                        return refreshRepo.save(tokenEntity);
                    });

            tokenLookup.ifPresent(tokenEntity -> {
                tokenEntity.setRevoked(true);
                refreshRepo.save(tokenEntity);
                if (tokenEntity.getUser() != null) {
                    auditService.logSuccessAsUser(
                            tokenEntity.getUser(),
                            AuditEventType.AUTH_LOGOUT,
                            "SESSION",
                            String.valueOf(tokenEntity.getId()),
                            "Deconnexion reussie"
                    );
                }
            });
        }

        ResponseCookie cookie = ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/auth")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok().build();
    }

    // NOTE: logout-all is handled by authenticated endpoints under /api/users/me/sessions/*
    // to enforce password confirmation and avoid exposing a public userId-based revoke endpoint.

    // ---------------- RESET PASSWORD (SMS) ----------------
    @PostMapping("/password/reset/send")
    public ResponseEntity<?> sendPasswordReset(@Valid @RequestBody PasswordResetSendRequest request,
                                               HttpServletRequest httpRequest) {
        String formattedNumber = formatPhoneNumber(request.phoneNumber());
        if (formattedNumber == null || formattedNumber.isEmpty()) {
            throw new BadRequestException(Map.of("phoneNumber", "Numero de telephone invalide ou manquant."));
        }

        User user = findUserByPhoneNumber(request.phoneNumber());
        if (user == null) {
            throw new NotFoundException("Numero de telephone introuvable");
        }
        if (isEmployeeAccount(user)) {
            throw new ForbiddenException("Les comptes employes ne peuvent pas reinitialiser le mot de passe. Contactez le proprietaire du cabinet.");
        }

        Long retryAfterSeconds = checkCooldown(user.getPasswordResetOtpLastSentAt());
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

        try {
            if (devProfile && isLocalRequest(httpRequest)) {
                user.setPasswordResetOtpLastSentAt(LocalDateTime.now());
                userRepo.save(user);
                auditService.logSuccessAsUser(user, AuditEventType.AUTH_PASSWORD_RESET_SEND, "USER", String.valueOf(user.getId()), "OTP reinitialisation mot de passe envoye (dev)");
                return ResponseEntity.ok(Map.of("message", "Code SMS envoye (mode dev)"));
            }
            phoneVerificationService.sendVerificationCode(formattedNumber);
            user.setPasswordResetOtpLastSentAt(LocalDateTime.now());
            userRepo.save(user);
            auditService.logSuccessAsUser(user, AuditEventType.AUTH_PASSWORD_RESET_SEND, "USER", String.valueOf(user.getId()), "OTP reinitialisation mot de passe envoye");
            return ResponseEntity.ok(Map.of("message", "Code SMS envoye"));
        } catch (IllegalStateException e) {
            logger.error("Twilio Verify not configured for password reset send (to={})", maskPhone(formattedNumber), e);
            throw new InternalServerErrorException(
                    "Service SMS indisponible",
                    Map.of("_", "Service SMS indisponible", "reason", "not_configured")
            );
        } catch (ApiException e) {
            int status = e.getStatusCode();
            Integer twilioCode = e.getCode();
            logger.warn("Twilio Verify send failed for password reset (to={}, status={})", maskPhone(formattedNumber), status, e);

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
            if (status == 401 || status == 403) {
                throw new InternalServerErrorException("Configuration SMS invalide");
            }
            if (status == 404) {
                throw new InternalServerErrorException("Configuration SMS invalide");
            }
            throw new BadGatewayException("Service SMS indisponible");
        } catch (Exception e) {
            logger.error("Unexpected error during password reset send (to={})", maskPhone(formattedNumber), e);
            throw new InternalServerErrorException(
                    "Service SMS indisponible",
                    Map.of("_", "Service SMS indisponible", "reason", "unexpected")
            );
        }
    }

    @PostMapping("/password/reset/confirm")
    public ResponseEntity<?> confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequest request,
                                                  HttpServletRequest httpRequest) {
        String formattedNumber = formatPhoneNumber(request.phoneNumber());
        if (formattedNumber == null || formattedNumber.isEmpty()) {
            throw new BadRequestException(Map.of("phoneNumber", "Numero de telephone invalide ou manquant."));
        }

        User user = findUserByPhoneNumber(request.phoneNumber());
        if (user == null) {
            throw new NotFoundException("Numero de telephone introuvable");
        }
        if (isEmployeeAccount(user)) {
            throw new ForbiddenException("Les comptes employes ne peuvent pas reinitialiser le mot de passe. Contactez le proprietaire du cabinet.");
        }

        boolean approved;
        try {
            if (devProfile && isLocalRequest(httpRequest)) {
                approved = true;
            } else {
                approved = phoneVerificationService.checkVerificationCode(formattedNumber, request.code());
            }
        } catch (IllegalStateException e) {
            logger.error("Twilio Verify not configured for password reset confirm (to={})", maskPhone(formattedNumber), e);
            throw new InternalServerErrorException(
                    "Service SMS indisponible",
                    Map.of("_", "Service SMS indisponible", "reason", "not_configured")
            );
        } catch (ApiException e) {
            int status = e.getStatusCode();
            Integer twilioCode = e.getCode();
            logger.warn("Twilio Verify check failed for password reset (to={}, status={})", maskPhone(formattedNumber), status, e);
            if (status == 400) {
                throw new BadRequestException(Map.of("code", "Code SMS invalide"));
            }
            if (status == 429) {
                throw new TooManyRequestsException("Trop de demandes. Reessayez plus tard.");
            }
            if (status == 401 || status == 403) {
                throw new InternalServerErrorException("Configuration SMS invalide");
            }
            if (status == 404) {
                throw new InternalServerErrorException("Configuration SMS invalide");
            }
            throw new BadGatewayException("Service SMS indisponible");
        } catch (Exception e) {
            logger.error("Unexpected error during password reset confirm (to={})", maskPhone(formattedNumber), e);
            throw new InternalServerErrorException(
                    "Service SMS indisponible",
                    Map.of("_", "Service SMS indisponible", "reason", "unexpected")
            );
        }

        if (!approved) {
            throw new BadRequestException(Map.of("code", "Code SMS invalide"));
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setPhoneVerified(true);
        userRepo.save(user);
        refreshRepo.deleteAllByUser(user);

        auditService.logSuccessAsUser(
                user,
                AuditEventType.USER_PASSWORD_CHANGE,
                "USER",
                String.valueOf(user.getId()),
                "Mot de passe reinitialise par SMS"
        );

        return ResponseEntity.ok(Map.of("message", "Mot de passe reinitialise"));
    }

    // ---------------- HELPERS ----------------
    private String formatPhoneNumber(String number) {
        if (number == null || number.isBlank()) return null;
        String clean = number.replaceAll("[^0-9]", "");

        if (clean.startsWith("0") && clean.length() == 10) return "+213" + clean.substring(1);
        if (clean.startsWith("213") && clean.length() == 12) return "+" + clean;
        if (clean.length() >= 10) return "+" + clean;

        return null;
    }

    private User findUserByPhoneNumber(String rawNumber) {
        if (rawNumber == null || rawNumber.isBlank()) return null;
        String clean = rawNumber.replaceAll("[^0-9]", "");

        if (clean.startsWith("0") && clean.length() == 10) {
            String local = clean;
            String intl = "+213" + clean.substring(1);
            return userRepo.findFirstByPhoneNumberOrderByIdAsc(local)
                    .or(() -> userRepo.findFirstByPhoneNumberOrderByIdAsc(intl))
                    .orElse(null);
        }

        if (clean.startsWith("213") && clean.length() == 12) {
            String intl = "+" + clean;
            String local = "0" + clean.substring(3);
            return userRepo.findFirstByPhoneNumberOrderByIdAsc(intl)
                    .or(() -> userRepo.findFirstByPhoneNumberOrderByIdAsc(local))
                    .orElse(null);
        }

        if (rawNumber.startsWith("+")) {
            String intl = "+" + clean;
            return userRepo.findFirstByPhoneNumberOrderByIdAsc(intl).orElse(null);
        }

        return userRepo.findFirstByPhoneNumberOrderByIdAsc(rawNumber).orElse(null);
    }

    private boolean isLocalRequest(HttpServletRequest request) {
        if (request == null) return false;

        // Typical local dev: request coming from a localhost frontend (even if backend is in Docker)
        String origin = request.getHeader("Origin");
        if (origin != null) {
            String o = origin.toLowerCase();
            if (o.startsWith("http://localhost")
                    || o.startsWith("https://localhost")
                    || o.startsWith("http://127.0.0.1")
                    || o.startsWith("https://127.0.0.1")) {
                return true;
            }
        }

        String serverName = request.getServerName();
        if ("localhost".equalsIgnoreCase(serverName) || "127.0.0.1".equals(serverName)) {
            return true;
        }

        String clientIp = extractClientIp(request);
        if (clientIp == null) return false;
        clientIp = clientIp.trim();
        if (clientIp.startsWith("::ffff:")) clientIp = clientIp.substring(7);

        if ("127.0.0.1".equals(clientIp)
                || "0:0:0:0:0:0:0:1".equals(clientIp)
                || "::1".equals(clientIp)) {
            return true;
        }

        return isPrivateIpv4(clientIp);
    }

    private Long checkCooldown(LocalDateTime lastSentAt) {
        if (lastSentAt == null) return null;
        LocalDateTime now = LocalDateTime.now();
        long elapsed = Duration.between(lastSentAt, now).getSeconds();
        if (elapsed < otpCooldownSeconds) {
            return Math.max(otpCooldownSeconds - elapsed, 1);
        }
        return null;
    }

    private boolean isPrivateIpv4(String ip) {
        if (ip == null || ip.isBlank()) return false;
        String[] parts = ip.split("\\.");
        if (parts.length != 4) return false;
        try {
            int a = Integer.parseInt(parts[0]);
            int b = Integer.parseInt(parts[1]);

            if (a == 10) return true;
            if (a == 192 && b == 168) return true;
            if (a == 172 && b >= 16 && b <= 31) return true;
            if (a == 127) return true; // loopback range
        } catch (NumberFormatException ignore) {
            return false;
        }
        return false;
    }

    private void fillSessionMeta(RefreshToken token, HttpServletRequest request) {
        if (request == null || token == null) return;
        token.setUserAgent(trim(request.getHeader("User-Agent"), 255));
        String ipAddress = trim(extractClientIp(request), 100);
        token.setIpAddress(ipAddress);
        token.setLocation(trim(extractLocation(request, ipAddress), 120));
    }

    private void fillSessionMetaIfMissing(RefreshToken token, HttpServletRequest request) {
        if (token == null || request == null) return;
        if (token.getUserAgent() == null || token.getUserAgent().isBlank()) {
            token.setUserAgent(trim(request.getHeader("User-Agent"), 255));
        }
        if (token.getIpAddress() == null || token.getIpAddress().isBlank()) {
            String ipAddress = trim(extractClientIp(request), 100);
            token.setIpAddress(ipAddress);
            token.setLocation(trim(extractLocation(request, ipAddress), 120));
        }
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String extractLocation(HttpServletRequest request, String ipAddress) {
        String city = headerOrNull(request, "X-City");
        String region = headerOrNull(request, "X-Region");
        String country = firstNonBlank(
                headerOrNull(request, "CF-IPCountry"),
                headerOrNull(request, "X-Country-Code"),
                headerOrNull(request, "X-Country"),
                headerOrNull(request, "X-AppEngine-Country"),
                headerOrNull(request, "X-Geo-Country")
        );

        StringBuilder location = new StringBuilder();
        if (city != null) location.append(city);
        if (region != null) {
            if (!location.isEmpty()) location.append(", ");
            location.append(region);
        }
        if (country != null) {
            if (!location.isEmpty()) location.append(", ");
            location.append(country);
        }
        if (!location.isEmpty()) return location.toString();

        if (isPrivateOrLocalIp(ipAddress)) {
            return "Reseau local";
        }
        return "Localisation indisponible";
    }

    private String headerOrNull(HttpServletRequest request, String headerName) {
        String value = request.getHeader(headerName);
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private boolean isPrivateOrLocalIp(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) return true;

        String ip = ipAddress.trim();
        String lower = ip.toLowerCase();
        if (lower.startsWith("10.")
                || lower.startsWith("192.168.")
                || lower.startsWith("fc")
                || lower.startsWith("fd")
                || "127.0.0.1".equals(lower)
                || "0:0:0:0:0:0:0:1".equals(lower)
                || "::1".equals(lower)) {
            return true;
        }

        if (!lower.contains(".")) {
            return false;
        }

        String[] parts = lower.split("\\.");
        if (parts.length != 4) {
            return false;
        }

        try {
            int first = Integer.parseInt(parts[0]);
            int second = Integer.parseInt(parts[1]);
            return first == 172 && second >= 16 && second <= 31;
        } catch (NumberFormatException ignored) {
            return false;
        }
    }

    private String trim(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private void revokeActiveSessionsForDevice(User user, String deviceId) {
        if (user == null || deviceId == null || deviceId.isBlank()) return;
        var existing = refreshRepo.findActiveSessionsByDevice(user, deviceId, LocalDateTime.now());
        if (existing == null || existing.isEmpty()) return;
        for (var token : existing) {
            token.setRevoked(true);
        }
        refreshRepo.saveAll(existing);
    }

    private void ensureDeviceIdCookieAndToken(RefreshToken tokenEntity, HttpServletRequest request, HttpServletResponse response) {
        if (tokenEntity == null || response == null) return;

        String tokenDeviceId = tokenEntity.getDeviceId();
        String cookieDeviceId = resolveDeviceId(request);

        String resolvedDeviceId = (tokenDeviceId != null && !tokenDeviceId.isBlank())
                ? tokenDeviceId
                : (cookieDeviceId != null && !cookieDeviceId.isBlank())
                ? cookieDeviceId
                : UUID.randomUUID().toString();

        if (tokenDeviceId == null || tokenDeviceId.isBlank()) {
            tokenEntity.setDeviceId(resolvedDeviceId);
        }

        if (cookieDeviceId == null || cookieDeviceId.isBlank() || !cookieDeviceId.equals(resolvedDeviceId)) {
            addDeviceCookie(response, resolvedDeviceId);
        }
    }

    private String maskPhone(String value) {
        if (value == null || value.isBlank()) return "<empty>";
        String digits = value.replaceAll("[^0-9]", "");
        if (digits.length() <= 4) return "****";
        return "****" + digits.substring(digits.length() - 4);
    }

    private boolean isEmployeeAccount(User user) {
        if (user == null) return false;
        if (user.getRole() != UserRole.DENTIST) return false;
        // Any linked sub-account (or non-owner clinic role) is treated as an "employee" account for password reset.
        if (user.getOwnerDentist() != null) return true;
        return user.getClinicAccessRole() != null && user.getClinicAccessRole() != ClinicAccessRole.DENTIST;
    }
    
}
