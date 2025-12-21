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
    // --- 3. SEND PHONE OTP ---
@PostMapping("/phone/send")
public ResponseEntity<?> sendPhoneOtp(Principal principal) {
    User user = getUser(principal);
    
    // 1. Get the raw number from the user object
    String rawNumber = user.getPhoneNumber();
    
    // 2. Format it to E.164 (e.g., +213...)
    String formattedNumber = formatPhoneNumber(rawNumber);
    
    if (formattedNumber == null) {
        return ResponseEntity.badRequest().body(Map.of("message", "Format de numéro invalide. Utilisez 05, 06 ou 07..."));
    }

    String otp = String.format("%06d", new Random().nextInt(999999));
    
    user.setPhoneOtp(otp);
    user.setPhoneOtpExpires(LocalDateTime.now().plusMinutes(15));
    userRepo.save(user);

    // 3. Send using the clean, formatted number
    otpService.sendSmsOtp(formattedNumber, otp);
    
    return ResponseEntity.ok(Map.of("message", "Code SMS envoyé au " + formattedNumber));
}

/**
 * Helper to convert local Algerian numbers to Twilio-friendly E.164 format.
 * Adjust the "+213" if you are testing with numbers from another country.
 */
private String formatPhoneNumber(String number) {
    if (number == null) return null;
    
    // Remove all spaces, dots, or dashes
    String clean = number.replaceAll("[^0-9+]", "");

    // If already starts with +, assume it's correct
    if (clean.startsWith("+")) return clean;

    // If starts with 00, replace with +
    if (clean.startsWith("00")) return "+" + clean.substring(2);

    // If starts with 0 and is likely a local Algerian number (10 digits)
    if (clean.startsWith("0") && clean.length() == 10) {
        return "+213" + clean.substring(1);
    }

    // Return as is if we don't recognize the pattern, but Twilio might still fail
    return clean;
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