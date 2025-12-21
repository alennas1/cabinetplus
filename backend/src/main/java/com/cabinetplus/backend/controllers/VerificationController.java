package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.services.OtpService;

@RestController
@RequestMapping("/api/verify")
public class VerificationController {

    private final UserRepository userRepo;
    private final OtpService otpService;

    public VerificationController(UserRepository userRepo, OtpService otpService) {
        this.userRepo = userRepo;
        this.otpService = otpService;
    }

    // --- 1. SEND EMAIL OTP ---
    @PostMapping("/email/send")
    public ResponseEntity<?> sendEmailOtp(Principal principal) {
        User user = getUser(principal);
        
        // Generate random 6-digit code
        String otp = String.format("%06d", new Random().nextInt(999999));
        
        user.setEmailOtp(otp);
        user.setEmailOtpExpires(LocalDateTime.now().plusMinutes(15));
        userRepo.save(user);

        otpService.sendEmailOtp(user.getEmail(), otp);
        return ResponseEntity.ok(Map.of("message", "Code email envoyé !"));
    }

    // --- 2. CHECK EMAIL OTP ---
    @PostMapping("/email/check")
    public ResponseEntity<?> checkEmailOtp(Principal principal, @RequestBody Map<String, String> body) {
        User user = getUser(principal);
        String code = body.get("code");

        if (user.getEmailOtp() != null && 
            user.getEmailOtp().equals(code) && 
            user.getEmailOtpExpires().isAfter(LocalDateTime.now())) {
            
            user.setEmailVerified(true);
            user.setEmailOtp(null); // Clear after success
            userRepo.save(user);
            return ResponseEntity.ok(Map.of("verified", true));
        }
        return ResponseEntity.badRequest().body(Map.of("message", "Code invalide ou expiré"));
    }

    // --- 3. SEND PHONE OTP ---
    @PostMapping("/phone/send")
    public ResponseEntity<?> sendPhoneOtp(Principal principal) {
        User user = getUser(principal);
        
        String otp = String.format("%06d", new Random().nextInt(999999));
        
        user.setPhoneOtp(otp);
        user.setPhoneOtpExpires(LocalDateTime.now().plusMinutes(15));
        userRepo.save(user);

        otpService.sendSmsOtp(user.getPhoneNumber(), otp);
        return ResponseEntity.ok(Map.of("message", "Code SMS envoyé !"));
    }

    // --- 4. CHECK PHONE OTP ---
    @PostMapping("/phone/check")
    public ResponseEntity<?> checkPhoneOtp(Principal principal, @RequestBody Map<String, String> body) {
        User user = getUser(principal);
        String code = body.get("code");

        if (user.getPhoneOtp() != null && 
            user.getPhoneOtp().equals(code) && 
            user.getPhoneOtpExpires().isAfter(LocalDateTime.now())) {
            
            user.setPhoneVerified(true);
            user.setPhoneOtp(null);
            userRepo.save(user);
            return ResponseEntity.ok(Map.of("verified", true));
        }
        return ResponseEntity.badRequest().body(Map.of("message", "Code SMS invalide"));
    }

    private User getUser(Principal principal) {
        return userRepo.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
    }
}