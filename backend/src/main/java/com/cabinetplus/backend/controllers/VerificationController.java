package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.services.OtpService;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/verify")
public class VerificationController {

    private static final Logger logger = LoggerFactory.getLogger(VerificationController.class);

    private final UserRepository userRepo;
    private final OtpService otpService;

    public VerificationController(UserRepository userRepo, OtpService otpService) {
        this.userRepo = userRepo;
        this.otpService = otpService;
    }

    // ------------------- SEND PHONE OTP -------------------
    @PostMapping("/phone/send")
    public ResponseEntity<?> sendPhoneOtp(Principal principal) {
        logger.info("Request received: /api/verify/phone/send");
        User user = getUser(principal);
        if (user == null) return unauthorizedResponse();

        String formattedNumber = formatPhoneNumber(user.getPhoneNumber());
        if (formattedNumber == null || formattedNumber.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Numéro de téléphone invalide ou manquant."));
        }

        try {
            String otp = String.format("%06d", new Random().nextInt(999999));
            user.setPhoneOtp(otp);
            user.setPhoneOtpExpires(LocalDateTime.now().plusMinutes(15));
            userRepo.save(user);

            logger.info("Attempting to send SMS OTP to: {}", formattedNumber);
            otpService.sendSmsOtp(formattedNumber, otp);

            return ResponseEntity.ok(Map.of("message", "Code SMS envoyé au " + formattedNumber));
        } catch (Exception e) {
            logger.error("Error sending SMS OTP: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Erreur service SMS: " + e.getMessage()));
        }
    }

    // ------------------- CHECK PHONE OTP -------------------
    @PostMapping("/phone/check")
    public ResponseEntity<?> checkPhoneOtp(Principal principal, @RequestBody Map<String, String> body) {
        User user = getUser(principal);
        if (user == null) return unauthorizedResponse();

        String code = body.get("code");
        if (user.getPhoneOtp() != null &&
            user.getPhoneOtp().equals(code) &&
            user.getPhoneOtpExpires() != null &&
            user.getPhoneOtpExpires().isAfter(LocalDateTime.now())) {

            user.setPhoneVerified(true);
            user.setPhoneOtp(null);
            user.setPhoneOtpExpires(null);
            userRepo.save(user);
            return ResponseEntity.ok(Map.of("verified", true));
        }

        return ResponseEntity.badRequest().body(Map.of("message", "Code SMS invalide"));
    }

    // ------------------- SIMULATE PHONE VERIFICATION (LOCAL DEV) -------------------
    @PostMapping("/phone/simulate")
    public ResponseEntity<?> simulatePhoneVerification(Principal principal, HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        if (!"127.0.0.1".equals(remoteAddr) && !"0:0:0:0:0:0:0:1".equals(remoteAddr)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Simulation allowed only from localhost"));
        }

        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Session expired"));

        User user = userRepo.findByUsername(principal.getName()).orElse(null);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "User not found"));

        user.setPhoneVerified(true);
        user.setPhoneOtp(null);
        user.setPhoneOtpExpires(null);
        userRepo.save(user);

        return ResponseEntity.ok(Map.of(
            "message", "Phone verification simulated successfully",
            "user", user
        ));
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
                .body(Map.of("message", "Session expirée. Veuillez vous reconnecter."));
    }
}