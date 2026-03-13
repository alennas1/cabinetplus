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

import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.services.PhoneVerificationService;
import com.twilio.exception.ApiException;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/verify")
public class VerificationController {

    private static final Logger logger = LoggerFactory.getLogger(VerificationController.class);

    private final UserRepository userRepo;
    private final PhoneVerificationService phoneVerificationService;
    private final PasswordEncoder passwordEncoder;
    private final boolean devProfile;

    @Value("${app.otp.cooldown-seconds:60}")
    private long otpCooldownSeconds;

    public VerificationController(UserRepository userRepo,
                                  PhoneVerificationService phoneVerificationService,
                                  PasswordEncoder passwordEncoder,
                                  Environment environment) {
        this.userRepo = userRepo;
        this.phoneVerificationService = phoneVerificationService;
        this.passwordEncoder = passwordEncoder;
        this.devProfile = Arrays.asList(environment.getActiveProfiles()).contains("dev");
    }

    // ------------------- SEND PHONE OTP -------------------
    @PostMapping("/phone/send")
    public ResponseEntity<?> sendPhoneOtp(Principal principal, HttpServletRequest httpRequest) {
        logger.info("Request received: /api/verify/phone/send");
        User user = getUser(principal);
        if (user == null) return unauthorizedResponse();

        var cooldown = checkCooldown(user.getPhoneVerificationOtpLastSentAt());
        if (cooldown != null) {
            return ResponseEntity.status(429).body(cooldown);
        }

        String formattedNumber = formatPhoneNumber(user.getPhoneNumber());
        if (formattedNumber == null || formattedNumber.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Numero de telephone invalide ou manquant."));
        }

        try {
            if (devProfile && isLocalRequest(httpRequest)) {
                user.setPhoneVerificationOtpLastSentAt(LocalDateTime.now());
                userRepo.save(user);
                return ResponseEntity.ok(Map.of("message", "Code SMS envoye (mode dev)"));
            }
            logger.info("Attempting to send SMS OTP to: {}", formattedNumber);
            phoneVerificationService.sendVerificationCode(formattedNumber);
            user.setPhoneVerificationOtpLastSentAt(LocalDateTime.now());
            userRepo.save(user);

            return ResponseEntity.ok(Map.of("message", "Code SMS envoye au " + formattedNumber));
        } catch (IllegalStateException e) {
            logger.error("Twilio Verify not configured for phone verification send (to={})", formattedNumber, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Service SMS indisponible", "reason", "not_configured"));
        } catch (ApiException e) {
            int status = e.getStatusCode();
            Integer twilioCode = e.getCode();
            logger.warn("Twilio Verify send failed (to={}, status={})", formattedNumber, status, e);
            // Special-case Verify blocks (Fraud Guard / risk prevention) to return a clear message.
            // 60410 = Fraud Guard temporary block (typically 12h). See Twilio error dictionary.
            if (twilioCode != null && twilioCode == 60410) {
                var body = new java.util.HashMap<String, Object>();
                body.put("error", "Envoi SMS temporairement bloque. Reessayez plus tard.");
                body.put("reason", "fraud_guard_blocked");
                body.put("twilioStatus", status);
                body.put("twilioCode", twilioCode);
                body.put("retryAfterSeconds", 60 * 60 * 12);
                return ResponseEntity.status(429).body(body);
            }
            if (status == 400) {
                var body = new java.util.HashMap<String, Object>();
                body.put("error", "Numero de telephone invalide");
                body.put("reason", "twilio_rejected");
                body.put("twilioStatus", status);
                if (twilioCode != null) body.put("twilioCode", twilioCode);
                return ResponseEntity.badRequest().body(body);
            }
            if (status == 429) {
                var body = new java.util.HashMap<String, Object>();
                body.put("error", "Trop de demandes. Reessayez plus tard.");
                body.put("reason", "rate_limited");
                body.put("twilioStatus", status);
                if (twilioCode != null) body.put("twilioCode", twilioCode);
                return ResponseEntity.status(429).body(body);
            }
            if (status == 401 || status == 403) {
                var body = new java.util.HashMap<String, Object>();
                body.put("error", "Configuration SMS invalide");
                body.put("reason", "auth_failed");
                body.put("twilioStatus", status);
                if (twilioCode != null) body.put("twilioCode", twilioCode);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
            }
            if (status == 404) {
                var body = new java.util.HashMap<String, Object>();
                body.put("error", "Configuration SMS invalide");
                body.put("reason", "service_not_found");
                body.put("twilioStatus", status);
                if (twilioCode != null) body.put("twilioCode", twilioCode);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
            }
            var body = new java.util.HashMap<String, Object>();
            body.put("error", "Service SMS indisponible");
            body.put("reason", "upstream_error");
            body.put("twilioStatus", status);
            if (twilioCode != null) body.put("twilioCode", twilioCode);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(body);
        } catch (Exception e) {
            logger.error("Error sending SMS OTP: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Service SMS indisponible"));
        }
    }

    // ------------------- CHECK PHONE OTP -------------------
    @PostMapping("/phone/check")
    public ResponseEntity<?> checkPhoneOtp(Principal principal, @RequestBody Map<String, String> body, HttpServletRequest httpRequest) {
        User user = getUser(principal);
        if (user == null) return unauthorizedResponse();

        String code = body.get("code");
        String formattedNumber = formatPhoneNumber(user.getPhoneNumber());
        if (formattedNumber == null || formattedNumber.isEmpty() || code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Code SMS invalide"));
        }

        boolean approved;
        try {
            if (devProfile && isLocalRequest(httpRequest)) {
                approved = true;
            } else {
                approved = phoneVerificationService.checkVerificationCode(formattedNumber, code);
            }
        } catch (IllegalStateException e) {
            logger.error("Twilio Verify not configured for phone verification check (to={})", formattedNumber, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Service SMS indisponible", "reason", "not_configured"));
        } catch (ApiException e) {
            int status = e.getStatusCode();
            Integer twilioCode = e.getCode();
            logger.warn("Twilio Verify check failed (to={}, status={})", formattedNumber, status, e);
            if (status == 400) {
                var respBody = new java.util.HashMap<String, Object>();
                respBody.put("error", "Code SMS invalide");
                respBody.put("reason", "twilio_rejected");
                respBody.put("twilioStatus", status);
                if (twilioCode != null) respBody.put("twilioCode", twilioCode);
                return ResponseEntity.badRequest().body(respBody);
            }
            if (status == 429) {
                var respBody = new java.util.HashMap<String, Object>();
                respBody.put("error", "Trop de demandes. Reessayez plus tard.");
                respBody.put("reason", "rate_limited");
                respBody.put("twilioStatus", status);
                if (twilioCode != null) respBody.put("twilioCode", twilioCode);
                return ResponseEntity.status(429).body(respBody);
            }
            if (status == 401 || status == 403) {
                var respBody = new java.util.HashMap<String, Object>();
                respBody.put("error", "Configuration SMS invalide");
                respBody.put("reason", "auth_failed");
                respBody.put("twilioStatus", status);
                if (twilioCode != null) respBody.put("twilioCode", twilioCode);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(respBody);
            }
            if (status == 404) {
                var respBody = new java.util.HashMap<String, Object>();
                respBody.put("error", "Configuration SMS invalide");
                respBody.put("reason", "service_not_found");
                respBody.put("twilioStatus", status);
                if (twilioCode != null) respBody.put("twilioCode", twilioCode);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(respBody);
            }
            var respBody = new java.util.HashMap<String, Object>();
            respBody.put("error", "Service SMS indisponible");
            respBody.put("reason", "upstream_error");
            respBody.put("twilioStatus", status);
            if (twilioCode != null) respBody.put("twilioCode", twilioCode);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(respBody);
        } catch (Exception e) {
            logger.error("Error verifying SMS OTP: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Service SMS indisponible"));
        }

        if (approved) {

            user.setPhoneVerified(true);
            userRepo.save(user);
            return ResponseEntity.ok(Map.of("verified", true));
        }

        return ResponseEntity.badRequest().body(Map.of("error", "Code SMS invalide"));
    }

    // ------------------- SEND PHONE CHANGE OTP -------------------
    @PostMapping("/phone-change/send")
    public ResponseEntity<?> sendPhoneChangeOtp(Principal principal,
                                                @RequestBody Map<String, String> body,
                                                HttpServletRequest httpRequest) {
        User user = getUser(principal);
        if (user == null) return unauthorizedResponse();

        // Only the owner dentist can change their phone number.
        if (user.getRole() == com.cabinetplus.backend.enums.UserRole.DENTIST
                && user.getClinicAccessRole() != null
                && user.getClinicAccessRole() != com.cabinetplus.backend.enums.ClinicAccessRole.DENTIST) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error",
                    "Les comptes employes ne peuvent pas modifier le numero de telephone. Contactez le proprietaire du cabinet."
            ));
        }

        var cooldown = checkCooldown(user.getPhoneChangeOtpLastSentAt());
        if (cooldown != null) {
            return ResponseEntity.status(429).body(cooldown);
        }

        String requestedNumber = body != null ? body.get("phoneNumber") : null;
        if (requestedNumber == null || requestedNumber.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Numero de telephone invalide ou manquant."));
        }

        String formattedNumber = formatPhoneNumber(requestedNumber);
        if (formattedNumber == null || formattedNumber.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Numero de telephone invalide ou manquant."));
        }

        // Prevent using a phone number already bound to another account (common confusion with reset password).
        if (isPhoneNumberUsedByAnotherUser(user, requestedNumber)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ce numero de telephone est deja utilise."));
        }

        try {
            if (devProfile && isLocalRequest(httpRequest)) {
                user.setPhoneChangeOtpLastSentAt(LocalDateTime.now());
                userRepo.save(user);
                return ResponseEntity.ok(Map.of("message", "Code SMS envoye (mode dev)"));
            }
            phoneVerificationService.sendVerificationCode(formattedNumber);
            user.setPhoneChangeOtpLastSentAt(LocalDateTime.now());
            userRepo.save(user);
            return ResponseEntity.ok(Map.of("message", "Code SMS envoye"));
        } catch (IllegalStateException e) {
            logger.error("Twilio Verify not configured for phone change send (to={})", formattedNumber, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Service SMS indisponible", "reason", "not_configured"));
        } catch (ApiException e) {
            int status = e.getStatusCode();
            Integer twilioCode = e.getCode();
            logger.warn("Twilio Verify send failed for phone change (to={}, status={})", formattedNumber, status, e);
            if (twilioCode != null && twilioCode == 60410) {
                var resp = new java.util.HashMap<String, Object>();
                resp.put("error", "Envoi SMS temporairement bloque. Reessayez plus tard.");
                resp.put("reason", "fraud_guard_blocked");
                resp.put("twilioStatus", status);
                resp.put("twilioCode", twilioCode);
                resp.put("retryAfterSeconds", 60 * 60 * 12);
                return ResponseEntity.status(429).body(resp);
            }
            var resp = new java.util.HashMap<String, Object>();
            resp.put("error", "Service SMS indisponible");
            resp.put("reason", "upstream_error");
            resp.put("twilioStatus", status);
            if (twilioCode != null) resp.put("twilioCode", twilioCode);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(resp);
        } catch (Exception e) {
            logger.error("Unexpected error during phone change send (to={})", formattedNumber, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Service SMS indisponible", "reason", "unexpected"));
        }
    }

    // ------------------- CONFIRM PHONE CHANGE OTP -------------------
    @PostMapping("/phone-change/confirm")
    public ResponseEntity<?> confirmPhoneChangeOtp(Principal principal,
                                                   @RequestBody Map<String, String> body,
                                                   HttpServletRequest httpRequest) {
        User user = getUser(principal);
        if (user == null) return unauthorizedResponse();

        if (user.getRole() == com.cabinetplus.backend.enums.UserRole.DENTIST
                && user.getClinicAccessRole() != null
                && user.getClinicAccessRole() != com.cabinetplus.backend.enums.ClinicAccessRole.DENTIST) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error",
                    "Les comptes employes ne peuvent pas modifier le numero de telephone. Contactez le proprietaire du cabinet."
            ));
        }

        String requestedNumber = body != null ? body.get("phoneNumber") : null;
        String code = body != null ? body.get("code") : null;
        String password = body != null ? body.get("password") : null;

        String formattedNumber = formatPhoneNumber(requestedNumber);
        if (formattedNumber == null || formattedNumber.isEmpty() || code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Code SMS invalide"));
        }
        if (password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mot de passe requis"));
        }
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Mot de passe incorrect"));
        }

        if (isPhoneNumberUsedByAnotherUser(user, requestedNumber)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ce numero de telephone est deja utilise."));
        }

        boolean approved;
        try {
            if (devProfile && isLocalRequest(httpRequest)) {
                approved = true;
            } else {
                approved = phoneVerificationService.checkVerificationCode(formattedNumber, code);
            }
        } catch (IllegalStateException e) {
            logger.error("Twilio Verify not configured for phone change confirm (to={})", formattedNumber, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Service SMS indisponible", "reason", "not_configured"));
        } catch (ApiException e) {
            int status = e.getStatusCode();
            Integer twilioCode = e.getCode();
            logger.warn("Twilio Verify check failed for phone change (to={}, status={})", formattedNumber, status, e);
            var respBody = new java.util.HashMap<String, Object>();
            if (status == 400) {
                respBody.put("error", "Code SMS invalide");
                respBody.put("reason", "twilio_rejected");
                respBody.put("twilioStatus", status);
                if (twilioCode != null) respBody.put("twilioCode", twilioCode);
                return ResponseEntity.badRequest().body(respBody);
            }
            respBody.put("error", "Service SMS indisponible");
            respBody.put("reason", "upstream_error");
            respBody.put("twilioStatus", status);
            if (twilioCode != null) respBody.put("twilioCode", twilioCode);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(respBody);
        } catch (Exception e) {
            logger.error("Unexpected error during phone change confirm (to={})", formattedNumber, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Service SMS indisponible", "reason", "unexpected"));
        }

        if (!approved) {
            return ResponseEntity.badRequest().body(Map.of("error", "Code SMS invalide"));
        }

        user.setPhoneNumber(normalizeStoredPhoneNumber(requestedNumber));
        user.setPhoneVerified(true);
        userRepo.save(user);

        return ResponseEntity.ok(Map.of("updated", true));
    }

    // ------------------- HELPER METHODS -------------------
    private String formatPhoneNumber(String number) {
        if (number == null || number.isBlank()) return null;
        String clean = number.replaceAll("[^0-9]", "");

        if (clean.startsWith("0") && clean.length() == 10) return "+213" + clean.substring(1);
        if (clean.startsWith("213") && clean.length() == 12) return "+" + clean;
        if (clean.length() >= 10) return "+" + clean;

        return null;
    }

    private User getUser(Principal principal) {
        if (principal == null) {
            logger.warn("Principal is null - user not authenticated");
            return null;
        }
        return userRepo.findByUsername(principal.getName()).orElse(null);
    }

    private ResponseEntity<?> unauthorizedResponse() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "Session expiree. Veuillez vous reconnecter."));
    }

    private Map<String, Object> checkCooldown(LocalDateTime lastSentAt) {
        if (lastSentAt == null) return null;
        LocalDateTime now = LocalDateTime.now();
        long elapsed = Duration.between(lastSentAt, now).getSeconds();
        if (elapsed < otpCooldownSeconds) {
            long retryAfterSeconds = Math.max(otpCooldownSeconds - elapsed, 1);
            return Map.of(
                    "error", "Veuillez patienter avant de renvoyer un code.",
                    "reason", "cooldown",
                    "retryAfterSeconds", retryAfterSeconds
            );
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
