package com.cabinetplus.backend.controllers;

import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.cabinetplus.backend.dto.SecurityPinChangeRequest;
import com.cabinetplus.backend.dto.SecurityPinDisableRequest;
import com.cabinetplus.backend.dto.SecurityPinEnableRequest;
import com.cabinetplus.backend.dto.SecurityPinRequirementRequest;
import com.cabinetplus.backend.dto.SecurityPinVerifyRequest;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/security/gestion-cabinet-pin")
public class SecurityPinController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public SecurityPinController(UserService userService, PasswordEncoder passwordEncoder, AuditService auditService) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    private static String normalizePin(String pin) {
        if (pin == null) {
            throw new BadRequestException(Map.of("pin", "PIN requis"));
        }
        String normalized = pin.replaceAll("\\D", "");
        if (!normalized.matches("^\\d{4}$")) {
            throw new BadRequestException(Map.of("pin", "Le PIN doit contenir 4 chiffres"));
        }
        return normalized;
    }

    private void requirePassword(User user, String password) {
        if (password == null || password.isBlank()) {
            throw new BadRequestException(Map.of("password", "Mot de passe requis"));
        }
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadRequestException(Map.of("password", "Mot de passe incorrect"));
        }
    }

    private boolean isClinicOwner(User user) {
        return user != null && user.getRole() == UserRole.DENTIST && user.getOwnerDentist() == null;
    }

    private User resolvePinOwner(User actor) {
        if (actor == null) return null;
        // Employees (and legacy staff accounts) manage their own PIN.
        if (actor.getRole() == UserRole.EMPLOYEE || actor.getOwnerDentist() != null) {
            return actor;
        }
        // Dentist owner manages their own PIN.
        if (isClinicOwner(actor)) {
            return actor;
        }
        // Fallback: resolve to clinic owner.
        return userService.resolveClinicOwner(actor);
    }

    @GetMapping
    public Map<String, Object> status(
            @RequestParam(name = "silent", defaultValue = "false") boolean silent,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails
    ) {
        User actor = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        User pinOwner = resolvePinOwner(actor);
        if (pinOwner == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable");
        }

        boolean pinSet = pinOwner.getGestionCabinetPinHash() != null;
        boolean requirePin = pinSet && pinOwner.isGestionCabinetPinEnabled();

        if (!silent) {
            auditService.logSuccessAsUser(
                    actor,
                    AuditEventType.SECURITY_PIN_STATUS,
                    "USER",
                    String.valueOf(pinOwner.getId()),
                    "Statut PIN consulte"
            );
        }
        return Map.of("pinSet", pinSet, "requirePin", requirePin, "enabled", requirePin);
    }

    @PostMapping
    public Map<String, Object> enable(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
            @Valid @RequestBody SecurityPinEnableRequest payload
    ) {
        User actor = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        User pinOwner = resolvePinOwner(actor);
        if (pinOwner == null) {
            throw new BadRequestException(Map.of("_", "Compte introuvable."));
        }

        requirePassword(pinOwner, payload.password());
        String pin = normalizePin(payload.pin());

        pinOwner.setGestionCabinetPinEnabled(true);
        pinOwner.setGestionCabinetPinHash(passwordEncoder.encode(pin));
        pinOwner.setGestionCabinetPinUpdatedAt(LocalDateTime.now());
        userService.save(pinOwner);

        auditService.logSuccessAsUser(
                actor,
                AuditEventType.SECURITY_PIN_ENABLE,
                "USER",
                String.valueOf(pinOwner.getId()),
                "PIN de securite active"
        );

        return Map.of(
                "pinSet", true,
                "requirePin", pinOwner.isGestionCabinetPinEnabled(),
                "enabled", pinOwner.isGestionCabinetPinEnabled()
        );
    }

    @PutMapping
    public Map<String, Object> change(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
            @Valid @RequestBody SecurityPinChangeRequest payload
    ) {
        User actor = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        User pinOwner = resolvePinOwner(actor);
        if (pinOwner == null) {
            throw new BadRequestException(Map.of("_", "Compte introuvable."));
        }
        if (pinOwner.getGestionCabinetPinHash() == null) {
            throw new BadRequestException(Map.of("pin", "Configurez d'abord le code PIN."));
        }

        requirePassword(pinOwner, payload.password());
        String pin = normalizePin(payload.pin());

        pinOwner.setGestionCabinetPinEnabled(true);
        pinOwner.setGestionCabinetPinHash(passwordEncoder.encode(pin));
        pinOwner.setGestionCabinetPinUpdatedAt(LocalDateTime.now());
        userService.save(pinOwner);

        auditService.logSuccessAsUser(
                actor,
                AuditEventType.SECURITY_PIN_CHANGE,
                "USER",
                String.valueOf(pinOwner.getId()),
                "PIN de securite modifie"
        );

        return Map.of(
                "pinSet", true,
                "requirePin", pinOwner.isGestionCabinetPinEnabled(),
                "enabled", pinOwner.isGestionCabinetPinEnabled()
        );
    }

    @PostMapping("/disable")
    public Map<String, Object> disable(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
            @Valid @RequestBody SecurityPinDisableRequest payload
    ) {
        User actor = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        User pinOwner = resolvePinOwner(actor);
        if (pinOwner == null) {
            throw new BadRequestException(Map.of("_", "Compte introuvable."));
        }

        requirePassword(pinOwner, payload.password());

        pinOwner.setGestionCabinetPinEnabled(false);
        pinOwner.setGestionCabinetPinUpdatedAt(LocalDateTime.now());
        userService.save(pinOwner);

        auditService.logSuccessAsUser(
                actor,
                AuditEventType.SECURITY_PIN_DISABLE,
                "USER",
                String.valueOf(pinOwner.getId()),
                "PIN de securite desactive"
        );

        boolean pinSet = pinOwner.getGestionCabinetPinHash() != null;
        return Map.of("pinSet", pinSet, "requirePin", false, "enabled", false);
    }

    @PutMapping("/requirement")
    public Map<String, Object> setRequirement(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
            @Valid @RequestBody SecurityPinRequirementRequest payload
    ) {
        User actor = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        User pinOwner = resolvePinOwner(actor);
        if (pinOwner == null) {
            throw new BadRequestException(Map.of("_", "Compte introuvable."));
        }

        if (pinOwner.getGestionCabinetPinHash() == null) {
            throw new BadRequestException(Map.of("pin", "Configurez d'abord le code PIN."));
        }

        requirePassword(pinOwner, payload.password());
        boolean enabled = Boolean.TRUE.equals(payload.enabled());
        pinOwner.setGestionCabinetPinEnabled(enabled);
        pinOwner.setGestionCabinetPinUpdatedAt(LocalDateTime.now());
        userService.save(pinOwner);

        auditService.logSuccessAsUser(
                actor,
                enabled ? AuditEventType.SECURITY_PIN_ENABLE : AuditEventType.SECURITY_PIN_DISABLE,
                "USER",
                String.valueOf(pinOwner.getId()),
                enabled ? "Exigence PIN activee" : "Exigence PIN desactivee"
        );

        return Map.of("pinSet", true, "requirePin", enabled, "enabled", enabled);
    }

    @PostMapping("/verify")
    public Map<String, Object> verify(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
            @Valid @RequestBody SecurityPinVerifyRequest payload
    ) {
        User actor = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        User pinOwner = resolvePinOwner(actor);
        if (pinOwner == null || pinOwner.getGestionCabinetPinHash() == null) {
            return Map.of("valid", false);
        }

        String pin = normalizePin(payload.pin());
        boolean valid = passwordEncoder.matches(pin, pinOwner.getGestionCabinetPinHash());
        if (valid) {
            auditService.logSuccessAsUser(
                    actor,
                    AuditEventType.SECURITY_PIN_VERIFY,
                    "USER",
                    String.valueOf(pinOwner.getId()),
                    "Verification PIN reussie"
            );
        } else {
            auditService.logFailureAsUser(
                    actor,
                    AuditEventType.SECURITY_PIN_VERIFY,
                    "USER",
                    String.valueOf(pinOwner.getId()),
                    "Verification PIN echouee"
            );
        }
        return Map.of("valid", valid);
    }
}

