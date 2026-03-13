package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.Arrays;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
    private final boolean devProfile;

    public VerificationController(UserRepository userRepo, PhoneVerificationService phoneVerificationService, Environment environment) {
        this.userRepo = userRepo;
        this.phoneVerificationService = phoneVerificationService;
        this.devProfile = Arrays.asList(environment.getActiveProfiles()).contains("dev");
    }

    // ------------------- SEND PHONE OTP -------------------
    @PostMapping("/phone/send")
    public ResponseEntity<?> sendPhoneOtp(Principal principal, HttpServletRequest httpRequest) {
        logger.info("Request received: /api/verify/phone/send");
        User user = getUser(principal);
        if (user == null) return unauthorizedResponse();

        String formattedNumber = formatPhoneNumber(user.getPhoneNumber());
        if (formattedNumber == null || formattedNumber.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Numero de telephone invalide ou manquant."));
        }

        try {
            if (devProfile && isLocalRequest(httpRequest)) {
                return ResponseEntity.ok(Map.of("message", "Code SMS envoye (mode dev)"));
            }
            logger.info("Attempting to send SMS OTP to: {}", formattedNumber);
            phoneVerificationService.sendVerificationCode(formattedNumber);

            return ResponseEntity.ok(Map.of("message", "Code SMS envoye au " + formattedNumber));
        } catch (IllegalStateException e) {
            logger.error("Twilio Verify not configured for phone verification send (to={})", formattedNumber, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Service SMS indisponible", "reason", "not_configured"));
        } catch (ApiException e) {
            int status = e.getStatusCode();
            logger.warn("Twilio Verify send failed (to={}, status={})", formattedNumber, status, e);
            if (status == 400) {
                var body = new java.util.HashMap<String, Object>();
                body.put("error", "Numero de telephone invalide");
                body.put("reason", "twilio_rejected");
                body.put("twilioStatus", status);
                if (e.getCode() != null) body.put("twilioCode", e.getCode());
                return ResponseEntity.badRequest().body(body);
            }
            if (status == 429) {
                var body = new java.util.HashMap<String, Object>();
                body.put("error", "Trop de demandes. Reessayez plus tard.");
                body.put("reason", "rate_limited");
                body.put("twilioStatus", status);
                if (e.getCode() != null) body.put("twilioCode", e.getCode());
                return ResponseEntity.status(429).body(body);
            }
            if (status == 401 || status == 403) {
                var body = new java.util.HashMap<String, Object>();
                body.put("error", "Configuration SMS invalide");
                body.put("reason", "auth_failed");
                body.put("twilioStatus", status);
                if (e.getCode() != null) body.put("twilioCode", e.getCode());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
            }
            if (status == 404) {
                var body = new java.util.HashMap<String, Object>();
                body.put("error", "Configuration SMS invalide");
                body.put("reason", "service_not_found");
                body.put("twilioStatus", status);
                if (e.getCode() != null) body.put("twilioCode", e.getCode());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
            }
            var body = new java.util.HashMap<String, Object>();
            body.put("error", "Service SMS indisponible");
            body.put("reason", "upstream_error");
            body.put("twilioStatus", status);
            if (e.getCode() != null) body.put("twilioCode", e.getCode());
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
            logger.warn("Twilio Verify check failed (to={}, status={})", formattedNumber, status, e);
            if (status == 400) {
                var respBody = new java.util.HashMap<String, Object>();
                respBody.put("error", "Code SMS invalide");
                respBody.put("reason", "twilio_rejected");
                respBody.put("twilioStatus", status);
                if (e.getCode() != null) respBody.put("twilioCode", e.getCode());
                return ResponseEntity.badRequest().body(respBody);
            }
            if (status == 429) {
                var respBody = new java.util.HashMap<String, Object>();
                respBody.put("error", "Trop de demandes. Reessayez plus tard.");
                respBody.put("reason", "rate_limited");
                respBody.put("twilioStatus", status);
                if (e.getCode() != null) respBody.put("twilioCode", e.getCode());
                return ResponseEntity.status(429).body(respBody);
            }
            if (status == 401 || status == 403) {
                var respBody = new java.util.HashMap<String, Object>();
                respBody.put("error", "Configuration SMS invalide");
                respBody.put("reason", "auth_failed");
                respBody.put("twilioStatus", status);
                if (e.getCode() != null) respBody.put("twilioCode", e.getCode());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(respBody);
            }
            if (status == 404) {
                var respBody = new java.util.HashMap<String, Object>();
                respBody.put("error", "Configuration SMS invalide");
                respBody.put("reason", "service_not_found");
                respBody.put("twilioStatus", status);
                if (e.getCode() != null) respBody.put("twilioCode", e.getCode());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(respBody);
            }
            var respBody = new java.util.HashMap<String, Object>();
            respBody.put("error", "Service SMS indisponible");
            respBody.put("reason", "upstream_error");
            respBody.put("twilioStatus", status);
            if (e.getCode() != null) respBody.put("twilioCode", e.getCode());
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
