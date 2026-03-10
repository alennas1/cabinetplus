package com.cabinetplus.backend.controllers;

import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.UserService;

@RestController
@RequestMapping("/api/security/gestion-cabinet-pin")
public class SecurityPinController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    public SecurityPinController(UserService userService, PasswordEncoder passwordEncoder) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
    }

    private static String requirePin(Map<String, String> payload) {
        String pin = payload.get("pin");
        if (pin == null) throw new RuntimeException("PIN requis");
        String normalized = pin.replaceAll("\\D", "");
        if (!normalized.matches("^\\d{4}$")) throw new RuntimeException("Le PIN doit contenir 4 chiffres");
        return normalized;
    }

    private void requirePassword(User user, Map<String, String> payload) {
        String password = payload.get("password");
        if (password == null || password.isBlank()) throw new RuntimeException("Mot de passe requis");
        if (!passwordEncoder.matches(password, user.getPasswordHash())) throw new RuntimeException("Mot de passe incorrect");
    }

    @GetMapping
    public Map<String, Object> status(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean enabled = user.isGestionCabinetPinEnabled() && user.getGestionCabinetPinHash() != null;
        return Map.of("enabled", enabled);
    }

    @PostMapping
    public Map<String, Object> enable(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
                                      @RequestBody Map<String, String> payload) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String pin = requirePin(payload);

        user.setGestionCabinetPinEnabled(true);
        user.setGestionCabinetPinHash(passwordEncoder.encode(pin));
        user.setGestionCabinetPinUpdatedAt(LocalDateTime.now());
        userService.save(user);

        return Map.of("enabled", true);
    }

    @PutMapping
    public Map<String, Object> change(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
                                      @RequestBody Map<String, String> payload) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        requirePassword(user, payload);
        String pin = requirePin(payload);

        user.setGestionCabinetPinEnabled(true);
        user.setGestionCabinetPinHash(passwordEncoder.encode(pin));
        user.setGestionCabinetPinUpdatedAt(LocalDateTime.now());
        userService.save(user);

        return Map.of("enabled", true);
    }

    @PostMapping("/disable")
    public Map<String, Object> disable(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
                                       @RequestBody Map<String, String> payload) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        requirePassword(user, payload);

        user.setGestionCabinetPinEnabled(false);
        user.setGestionCabinetPinHash(null);
        user.setGestionCabinetPinUpdatedAt(LocalDateTime.now());
        userService.save(user);

        return Map.of("enabled", false);
    }

    @PostMapping("/verify")
    public Map<String, Object> verify(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
                                      @RequestBody Map<String, String> payload) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.isGestionCabinetPinEnabled() || user.getGestionCabinetPinHash() == null) {
            return Map.of("valid", false);
        }

        String pin = requirePin(payload);
        boolean valid = passwordEncoder.matches(pin, user.getGestionCabinetPinHash());
        return Map.of("valid", valid);
    }
}

