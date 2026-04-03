package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.OtpCodeRequest;
import com.cabinetplus.backend.dto.EmployeePhoneVerificationSendRequest;
import com.cabinetplus.backend.dto.PhoneChangeConfirmRequest;
import com.cabinetplus.backend.dto.PhoneChangeSendRequest;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.BadGatewayException;
import com.cabinetplus.backend.exceptions.ForbiddenException;
import com.cabinetplus.backend.exceptions.InternalServerErrorException;
import com.cabinetplus.backend.exceptions.TooManyRequestsException;
import com.cabinetplus.backend.exceptions.UnauthorizedException;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.EmployeeRepository;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.PhoneVerificationService;
import com.cabinetplus.backend.util.PhoneNumberUtil;
import com.twilio.exception.ApiException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/verify")
public class VerificationController {

    private static final Logger logger = LoggerFactory.getLogger(VerificationController.class);

    private final UserRepository userRepo;
    private final EmployeeRepository employeeRepository;
    private final PhoneVerificationService phoneVerificationService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final boolean devProfile;

    @Value("${app.otp.cooldown-seconds:60}")
    private long otpCooldownSeconds;

    public VerificationController(UserRepository userRepo,
                                  EmployeeRepository employeeRepository,
                                  PhoneVerificationService phoneVerificationService,
                                  PasswordEncoder passwordEncoder,
                                  AuditService auditService,
                                  Environment environment) {
        this.userRepo = userRepo;
        this.employeeRepository = employeeRepository;
        this.phoneVerificationService = phoneVerificationService;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.devProfile = Arrays.asList(environment.getActiveProfiles()).contains("dev");
    }

    // ------------------- SEND PHONE OTP -------------------
    @PostMapping("/phone/send")
    public ResponseEntity<?> sendPhoneOtp(Principal principal, HttpServletRequest httpRequest) {
        logger.info("Request received: /api/verify/phone/send");
        User user = requireUser(principal);

        Long retryAfterSeconds = checkCooldown(user.getPhoneVerificationOtpLastSentAt());
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
            if (devProfile && isLocalRequest(httpRequest)) {
                user.setPhoneVerificationOtpLastSentAt(LocalDateTime.now());
                userRepo.save(user);
                auditService.logSuccessAsUser(user, AuditEventType.VERIFY_PHONE_OTP_SEND, "USER", String.valueOf(user.getId()), "OTP telephone envoye (dev)");
                return ResponseEntity.ok(Map.of("message", "Code SMS envoye (mode dev)"));
            }
            logger.info("Attempting to send SMS OTP to: {}", maskPhone(formattedNumber));
            phoneVerificationService.sendVerificationCode(formattedNumber);
            user.setPhoneVerificationOtpLastSentAt(LocalDateTime.now());
            userRepo.save(user);
            auditService.logSuccessAsUser(user, AuditEventType.VERIFY_PHONE_OTP_SEND, "USER", String.valueOf(user.getId()), "OTP telephone envoye");

            return ResponseEntity.ok(Map.of("message", "Code SMS envoye au " + formattedNumber));
        } catch (IllegalStateException e) {
            logger.error("Twilio Verify not configured for phone verification send (to={})", maskPhone(formattedNumber), e);
            throw new InternalServerErrorException(
                    "Service SMS indisponible",
                    Map.of("_", "Service SMS indisponible", "reason", "not_configured")
            );
        } catch (ApiException e) {
            int status = e.getStatusCode();
            Integer twilioCode = e.getCode();
            logger.warn("Twilio Verify send failed (to={}, status={})", maskPhone(formattedNumber), status, e);
            // Special-case Verify blocks (Fraud Guard / risk prevention) to return a clear message.
            // 60410 = Fraud Guard temporary block (typically 12h). See Twilio error dictionary.
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
            logger.error("Error sending SMS OTP: ", e);
            throw new InternalServerErrorException("Service SMS indisponible");
        }
    }

    // ------------------- SEND EMPLOYEE PHONE OTP (OWNER ONLY) -------------------
    @PostMapping("/employee/phone/send")
    public ResponseEntity<?> sendEmployeePhoneOtp(
            Principal principal,
            @Valid @RequestBody EmployeePhoneVerificationSendRequest body,
            HttpServletRequest httpRequest
    ) {
        User actor = requireUser(principal);

        if (actor.getRole() != UserRole.ADMIN && !isClinicOwner(actor)) {
            throw new ForbiddenException("Acces refuse");
        }

        String formattedNumber = formatPhoneNumber(body.phoneNumber());
        if (formattedNumber == null || formattedNumber.isEmpty()) {
            throw new BadRequestException(Map.of("phoneNumber", "Numero de telephone invalide ou manquant."));
        }

        var candidates = PhoneNumberUtil.algeriaStoredCandidates(body.phoneNumber());
        if (!candidates.isEmpty() && userRepo.existsByPhoneNumberIn(candidates)) {
            throw new BadRequestException(Map.of("phoneNumber", "Ce numero de telephone est deja utilise."));
        }

        try {
            if (devProfile && isLocalRequest(httpRequest)) {
                auditService.logSuccessAsUser(actor, AuditEventType.VERIFY_PHONE_OTP_SEND, "EMPLOYEE", null, "OTP employe envoye (dev)");
                return ResponseEntity.ok(Map.of("message", "Code SMS envoye (mode dev)"));
            }
            phoneVerificationService.sendVerificationCode(formattedNumber);
            auditService.logSuccessAsUser(actor, AuditEventType.VERIFY_PHONE_OTP_SEND, "EMPLOYEE", null, "OTP employe envoye");
            return ResponseEntity.ok(Map.of("message", "Code SMS envoye"));
        } catch (IllegalStateException e) {
            logger.error("Twilio Verify not configured for employee phone verification send (to={})", maskPhone(formattedNumber), e);
            throw new InternalServerErrorException(
                    "Service SMS indisponible",
                    Map.of("_", "Service SMS indisponible", "reason", "not_configured")
            );
        } catch (ApiException e) {
            int status = e.getStatusCode();
            Integer twilioCode = e.getCode();
            logger.warn("Twilio Verify send failed for employee phone verification (to={}, status={})", maskPhone(formattedNumber), status, e);

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
            logger.error("Error sending employee SMS OTP: ", e);
            throw new InternalServerErrorException("Service SMS indisponible");
        }
    }

    // ------------------- CHECK PHONE OTP -------------------
    @PostMapping("/phone/check")
    public ResponseEntity<?> checkPhoneOtp(Principal principal, @Valid @RequestBody OtpCodeRequest body, HttpServletRequest httpRequest) {
        User user = requireUser(principal);

        String code = body.code();
        String formattedNumber = formatPhoneNumber(user.getPhoneNumber());
        if (formattedNumber == null || formattedNumber.isEmpty() || code == null || code.isBlank()) {
            throw new BadRequestException(Map.of("code", "Code SMS invalide"));
        }

        boolean approved;
        try {
            if (devProfile && isLocalRequest(httpRequest)) {
                approved = true;
            } else {
                approved = phoneVerificationService.checkVerificationCode(formattedNumber, code);
            }
        } catch (IllegalStateException e) {
            logger.error("Twilio Verify not configured for phone verification check (to={})", maskPhone(formattedNumber), e);
            throw new InternalServerErrorException(
                    "Service SMS indisponible",
                    Map.of("_", "Service SMS indisponible", "reason", "not_configured")
            );
        } catch (ApiException e) {
            int status = e.getStatusCode();
            Integer twilioCode = e.getCode();
            logger.warn("Twilio Verify check failed (to={}, status={})", maskPhone(formattedNumber), status, e);
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
            logger.error("Error verifying SMS OTP: ", e);
            throw new InternalServerErrorException("Service SMS indisponible");
        }

        if (approved) {

            user.setPhoneVerified(true);
            userRepo.save(user);
            syncEmployeePhoneIfLinked(user);
            auditService.logSuccessAsUser(user, AuditEventType.VERIFY_PHONE_OTP_CHECK, "USER", String.valueOf(user.getId()), "OTP telephone verifie");
            return ResponseEntity.ok(Map.of("verified", true));
        }

        throw new BadRequestException(Map.of("code", "Code SMS invalide"));
    }

    // ------------------- SEND PHONE CHANGE OTP -------------------
    @PostMapping("/phone-change/send")
    public ResponseEntity<?> sendPhoneChangeOtp(Principal principal,
                                                @Valid @RequestBody PhoneChangeSendRequest body,
                                                HttpServletRequest httpRequest) {
        User user = requireUser(principal);

        Long retryAfterSeconds = checkCooldown(user.getPhoneChangeOtpLastSentAt());
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

        String requestedNumber = body.phoneNumber();

        String formattedNumber = formatPhoneNumber(requestedNumber);
        if (formattedNumber == null || formattedNumber.isEmpty()) {
            throw new BadRequestException(Map.of("phoneNumber", "Numero de telephone invalide ou manquant."));
        }

        // Prevent using a phone number already bound to another account (common confusion with reset password).
        if (isPhoneNumberUsedByAnotherUser(user, requestedNumber)) {
            throw new BadRequestException(Map.of("phoneNumber", "Ce numero de telephone est deja utilise."));
        }

        try {
            if (devProfile && isLocalRequest(httpRequest)) {
                user.setPhoneChangeOtpLastSentAt(LocalDateTime.now());
                userRepo.save(user);
                auditService.logSuccessAsUser(user, AuditEventType.PHONE_CHANGE_SEND, "USER", String.valueOf(user.getId()), "OTP changement telephone envoye (dev)");
                return ResponseEntity.ok(Map.of("message", "Code SMS envoye (mode dev)"));
            }
            phoneVerificationService.sendVerificationCode(formattedNumber);
            user.setPhoneChangeOtpLastSentAt(LocalDateTime.now());
            userRepo.save(user);
            auditService.logSuccessAsUser(user, AuditEventType.PHONE_CHANGE_SEND, "USER", String.valueOf(user.getId()), "OTP changement telephone envoye");
            return ResponseEntity.ok(Map.of("message", "Code SMS envoye"));
        } catch (IllegalStateException e) {
            logger.error("Twilio Verify not configured for phone change send (to={})", maskPhone(formattedNumber), e);
            throw new InternalServerErrorException(
                    "Service SMS indisponible",
                    Map.of("_", "Service SMS indisponible", "reason", "not_configured")
            );
        } catch (ApiException e) {
            int status = e.getStatusCode();
            Integer twilioCode = e.getCode();
            logger.warn("Twilio Verify send failed for phone change (to={}, status={})", maskPhone(formattedNumber), status, e);
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
            throw new BadGatewayException("Service SMS indisponible");
        } catch (Exception e) {
            logger.error("Unexpected error during phone change send (to={})", maskPhone(formattedNumber), e);
            throw new InternalServerErrorException(
                    "Service SMS indisponible",
                    Map.of("_", "Service SMS indisponible", "reason", "unexpected")
            );
        }
    }

    // ------------------- CONFIRM PHONE CHANGE OTP -------------------
    @PostMapping("/phone-change/confirm")
    public ResponseEntity<?> confirmPhoneChangeOtp(Principal principal,
                                                   @Valid @RequestBody PhoneChangeConfirmRequest body,
                                                   HttpServletRequest httpRequest) {
        User user = requireUser(principal);

        String requestedNumber = body.phoneNumber();
        String code = body.code();
        String password = body.password();

        String formattedNumber = formatPhoneNumber(requestedNumber);
        if (formattedNumber == null || formattedNumber.isEmpty() || code == null || code.isBlank()) {
            throw new BadRequestException(Map.of("code", "Code SMS invalide"));
        }
        if (password == null || password.isBlank()) {
            throw new BadRequestException(Map.of("password", "Mot de passe requis"));
        }
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadRequestException(Map.of("password", "Mot de passe incorrect"));
        }

        if (isPhoneNumberUsedByAnotherUser(user, requestedNumber)) {
            throw new BadRequestException(Map.of("phoneNumber", "Ce numero de telephone est deja utilise."));
        }

        boolean approved;
        try {
            if (devProfile && isLocalRequest(httpRequest)) {
                approved = true;
            } else {
                approved = phoneVerificationService.checkVerificationCode(formattedNumber, code);
            }
        } catch (IllegalStateException e) {
            logger.error("Twilio Verify not configured for phone change confirm (to={})", maskPhone(formattedNumber), e);
            throw new InternalServerErrorException(
                    "Service SMS indisponible",
                    Map.of("_", "Service SMS indisponible", "reason", "not_configured")
            );
        } catch (ApiException e) {
            int status = e.getStatusCode();
            Integer twilioCode = e.getCode();
            logger.warn("Twilio Verify check failed for phone change (to={}, status={})", maskPhone(formattedNumber), status, e);
            if (status == 400) {
                throw new BadRequestException(Map.of("code", "Code SMS invalide"));
            }
            throw new BadGatewayException("Service SMS indisponible");
        } catch (Exception e) {
            logger.error("Unexpected error during phone change confirm (to={})", maskPhone(formattedNumber), e);
            throw new InternalServerErrorException(
                    "Service SMS indisponible",
                    Map.of("_", "Service SMS indisponible", "reason", "unexpected")
            );
        }

        if (!approved) {
            throw new BadRequestException(Map.of("code", "Code SMS invalide"));
        }

        user.setPhoneNumber(normalizeStoredPhoneNumber(requestedNumber));
        user.setPhoneVerified(true);
        userRepo.save(user);
        syncEmployeePhoneIfLinked(user);
        auditService.logSuccessAsUser(user, AuditEventType.PHONE_CHANGE_CONFIRM, "USER", String.valueOf(user.getId()), "Telephone mis a jour");

        return ResponseEntity.ok(Map.of("updated", true));
    }

    private void syncEmployeePhoneIfLinked(User user) {
        if (user == null) return;
        employeeRepository.findByUser(user).ifPresent(employee -> {
            employee.setPhone(user.getPhoneNumber());
            employee.setUpdatedAt(LocalDateTime.now());
            employeeRepository.save(employee);
        });
    }

    // ------------------- HELPER METHODS -------------------
    private String maskPhone(String value) {
        if (value == null || value.isBlank()) return "<empty>";
        String digits = value.replaceAll("[^0-9]", "");
        if (digits.length() <= 4) return "****";
        return "****" + digits.substring(digits.length() - 4);
    }

    private boolean isClinicOwner(User user) {
        if (user == null) return false;
        return user.getRole() == UserRole.DENTIST && user.getOwnerDentist() == null;
    }

    private String formatPhoneNumber(String number) {
        if (number == null || number.isBlank()) return null;
        String clean = number.replaceAll("[^0-9]", "");

        if (clean.startsWith("0") && clean.length() == 10) return "+213" + clean.substring(1);
        if (clean.startsWith("213") && clean.length() == 12) return "+" + clean;
        if (clean.length() >= 10) return "+" + clean;

        return null;
    }

    private User requireUser(Principal principal) {
        if (principal == null) {
            logger.warn("Principal is null - user not authenticated");
            throw new UnauthorizedException("Session expiree. Veuillez vous reconnecter.");
        }
        var candidates = com.cabinetplus.backend.util.PhoneNumberUtil.algeriaStoredCandidates(principal.getName());
        if (candidates.isEmpty()) {
            throw new UnauthorizedException("Session expiree. Veuillez vous reconnecter.");
        }
        return userRepo.findFirstByPhoneNumberInOrderByIdAsc(candidates)
                .orElseThrow(() -> new UnauthorizedException("Session expiree. Veuillez vous reconnecter."));
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

    private boolean isPhoneNumberUsedByAnotherUser(User currentUser, String rawNumber) {
        if (currentUser == null || rawNumber == null || rawNumber.isBlank()) return false;
        String clean = rawNumber.replaceAll("[^0-9]", "");
        Long id = currentUser.getId();

        if (clean.startsWith("0") && clean.length() == 10) {
            String local = clean;
            String intl = "+213" + clean.substring(1);
            return userRepo.existsByPhoneNumberAndIdNot(local, id) || userRepo.existsByPhoneNumberAndIdNot(intl, id);
        }

        if (clean.startsWith("213") && clean.length() == 12) {
            String intl = "+" + clean;
            String local = "0" + clean.substring(3);
            return userRepo.existsByPhoneNumberAndIdNot(intl, id) || userRepo.existsByPhoneNumberAndIdNot(local, id);
        }

        if (rawNumber.startsWith("+")) {
            String intl = "+" + clean;
            return userRepo.existsByPhoneNumberAndIdNot(intl, id);
        }

        return userRepo.existsByPhoneNumberAndIdNot(rawNumber, id);
    }

    private String normalizeStoredPhoneNumber(String rawNumber) {
        if (rawNumber == null) return null;
        String trimmed = rawNumber.trim();
        if (trimmed.isEmpty()) return "";

        String digits = trimmed.replaceAll("[^0-9]", "");
        if (digits.startsWith("0") && digits.length() == 10) {
            return digits; // local
        }
        if (digits.startsWith("213") && digits.length() == 12) {
            return "+" + digits; // intl (E.164)
        }
        if (trimmed.startsWith("+") && !digits.isEmpty()) {
            return "+" + digits;
        }
        // Fallback: strip spaces only.
        return trimmed.replaceAll("\\s+", "");
    }

    private boolean isLocalRequest(HttpServletRequest request) {
        if (request == null) return false;

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

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) return null;
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
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
            if (a == 127) return true;
        } catch (NumberFormatException ignore) {
            return false;
        }
        return false;
    }
}
