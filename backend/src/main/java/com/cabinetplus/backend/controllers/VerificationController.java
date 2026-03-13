package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.services.PhoneVerificationService;

@RestController
@RequestMapping("/api/verify")
public class VerificationController {

    private static final Logger logger = LoggerFactory.getLogger(VerificationController.class);

    private final UserRepository userRepo;
    private final PhoneVerificationService phoneVerificationService;

    public VerificationController(UserRepository userRepo, PhoneVerificationService phoneVerificationService) {
        this.userRepo = userRepo;
        this.phoneVerificationService = phoneVerificationService;
    }

    // ------------------- SEND PHONE OTP -------------------
    @PostMapping("/phone/send")
    public ResponseEntity<?> sendPhoneOtp(Principal principal) {
        logger.info("Request received: /api/verify/phone/send");
        User user = getUser(principal);
        if (user == null) return unauthorizedResponse();

        String formattedNumber = formatPhoneNumber(user.getPhoneNumber());
        if (formattedNumber == null || formattedNumber.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Numero de telephone invalide ou manquant."));
        }

        try {
            logger.info("Attempting to send SMS OTP to: {}", formattedNumber);
            phoneVerificationService.sendVerificationCode(formattedNumber);

            return ResponseEntity.ok(Map.of("message", "Code SMS envoye au " + formattedNumber));
        } catch (Exception e) {
            logger.error("Error sending SMS OTP: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Service SMS indisponible"));
        }
    }

    // ------------------- CHECK PHONE OTP -------------------
    @PostMapping("/phone/check")
    public ResponseEntity<?> checkPhoneOtp(Principal principal, @RequestBody Map<String, String> body) {
        User user = getUser(principal);
        if (user == null) return unauthorizedResponse();

        String code = body.get("code");
        String formattedNumber = formatPhoneNumber(user.getPhoneNumber());
        if (formattedNumber == null || formattedNumber.isEmpty() || code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Code SMS invalide"));
        }

        boolean approved;
        try {
            approved = phoneVerificationService.checkVerificationCode(formattedNumber, code);
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
}
