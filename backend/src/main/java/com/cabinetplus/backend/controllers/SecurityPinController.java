package com.cabinetplus.backend.controllers;

import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.SecurityPinChangeRequest;
import com.cabinetplus.backend.dto.SecurityPinDisableRequest;
import com.cabinetplus.backend.dto.SecurityPinEnableRequest;
import com.cabinetplus.backend.dto.SecurityPinRequirementRequest;
import com.cabinetplus.backend.dto.SecurityPinVerifyRequest;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.BadRequestException;
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

    @GetMapping
    public Map<String, Object> status(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        User user = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        boolean pinSet = user.getGestionCabinetPinHash() != null;
        boolean requirePin = pinSet && user.isGestionCabinetPinEnabled();
        auditService.logSuccessAsUser(user, AuditEventType.SECURITY_PIN_STATUS, "USER", String.valueOf(user.getId()), "Statut PIN consulte");
        return Map.of("pinSet", pinSet, "requirePin", requirePin, "enabled", requirePin);
    }

    @PostMapping
    public Map<String, Object> enable(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
                                      @Valid @RequestBody SecurityPinEnableRequest payload) {
        User actor = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        if (actor.getRole() == UserRole.EMPLOYEE || actor.getOwnerDentist() != null) {
            throw new BadRequestException(Map.of("_", "Seul le dentiste propriétaire peut activer le code PIN."));
        }
        User clinicOwner = userService.resolveClinicOwner(actor);
        if (clinicOwner == null || clinicOwner.getRole() != UserRole.DENTIST || clinicOwner.getOwnerDentist() != null) {
            throw new BadRequestException(Map.of("_", "Compte dentiste propriétaire introuvable."));
        }

        requirePassword(clinicOwner, payload.password());
        String pin = normalizePin(payload.pin());

        clinicOwner.setGestionCabinetPinEnabled(true);
        clinicOwner.setGestionCabinetPinHash(passwordEncoder.encode(pin));
        clinicOwner.setGestionCabinetPinUpdatedAt(LocalDateTime.now());
        userService.save(clinicOwner);
        auditService.logSuccessAsUser(actor, AuditEventType.SECURITY_PIN_ENABLE, "USER", String.valueOf(clinicOwner.getId()), "PIN de securite active");

        return Map.of("pinSet", true, "requirePin", true, "enabled", true);
    }

    @PutMapping
    public Map<String, Object> change(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
                                      @Valid @RequestBody SecurityPinChangeRequest payload) {
        User actor = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        if (actor.getRole() == UserRole.EMPLOYEE || actor.getOwnerDentist() != null) {
            throw new BadRequestException(Map.of("_", "Seul le dentiste propriétaire peut modifier le code PIN."));
        }
        User clinicOwner = userService.resolveClinicOwner(actor);
        if (clinicOwner == null || clinicOwner.getRole() != UserRole.DENTIST || clinicOwner.getOwnerDentist() != null) {
            throw new BadRequestException(Map.of("_", "Compte dentiste propriétaire introuvable."));
        }

        requirePassword(clinicOwner, payload.password());
        String pin = normalizePin(payload.pin());

        clinicOwner.setGestionCabinetPinEnabled(true);
        clinicOwner.setGestionCabinetPinHash(passwordEncoder.encode(pin));
        clinicOwner.setGestionCabinetPinUpdatedAt(LocalDateTime.now());
        userService.save(clinicOwner);
        auditService.logSuccessAsUser(actor, AuditEventType.SECURITY_PIN_CHANGE, "USER", String.valueOf(clinicOwner.getId()), "PIN de securite modifie");

        return Map.of("pinSet", true, "requirePin", clinicOwner.isGestionCabinetPinEnabled(), "enabled", clinicOwner.isGestionCabinetPinEnabled());
    }

    @PostMapping("/disable")
    public Map<String, Object> disable(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
                                       @Valid @RequestBody SecurityPinDisableRequest payload) {
        User actor = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        if (actor.getRole() == UserRole.EMPLOYEE || actor.getOwnerDentist() != null) {
            throw new BadRequestException(Map.of("_", "Seul le dentiste propriétaire peut désactiver le code PIN."));
        }
        User clinicOwner = userService.resolveClinicOwner(actor);
        if (clinicOwner == null || clinicOwner.getRole() != UserRole.DENTIST || clinicOwner.getOwnerDentist() != null) {
            throw new BadRequestException(Map.of("_", "Compte dentiste propriétaire introuvable."));
        }

        requirePassword(clinicOwner, payload.password());

        clinicOwner.setGestionCabinetPinEnabled(false);
        clinicOwner.setGestionCabinetPinUpdatedAt(LocalDateTime.now());
        userService.save(clinicOwner);
        auditService.logSuccessAsUser(actor, AuditEventType.SECURITY_PIN_DISABLE, "USER", String.valueOf(clinicOwner.getId()), "PIN de securite desactive");

        boolean pinSet = clinicOwner.getGestionCabinetPinHash() != null;
        return Map.of("pinSet", pinSet, "requirePin", false, "enabled", false);
    }

    @PutMapping("/requirement")
    public Map<String, Object> setRequirement(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
                                              @Valid @RequestBody SecurityPinRequirementRequest payload) {
        User actor = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        if (actor.getRole() == UserRole.EMPLOYEE || actor.getOwnerDentist() != null) {
            throw new BadRequestException(Map.of("_", "Seul le dentiste propriÃ©taire peut modifier ce paramÃ¨tre."));
        }
        User clinicOwner = userService.resolveClinicOwner(actor);
        if (clinicOwner == null || clinicOwner.getRole() != UserRole.DENTIST || clinicOwner.getOwnerDentist() != null) {
            throw new BadRequestException(Map.of("_", "Compte dentiste propriÃ©taire introuvable."));
        }

        if (clinicOwner.getGestionCabinetPinHash() == null) {
            throw new BadRequestException(Map.of("pin", "Configurez d'abord le code PIN."));
        }

        requirePassword(clinicOwner, payload.password());
        boolean enabled = Boolean.TRUE.equals(payload.enabled());
        clinicOwner.setGestionCabinetPinEnabled(enabled);
        clinicOwner.setGestionCabinetPinUpdatedAt(LocalDateTime.now());
        userService.save(clinicOwner);

        auditService.logSuccessAsUser(
                actor,
                enabled ? AuditEventType.SECURITY_PIN_ENABLE : AuditEventType.SECURITY_PIN_DISABLE,
                "USER",
                String.valueOf(clinicOwner.getId()),
                enabled ? "Exigence PIN activÃ©e" : "Exigence PIN dÃ©sactivÃ©e"
        );

        return Map.of("pinSet", true, "requirePin", enabled, "enabled", enabled);
    }

    @PostMapping("/verify")
    public Map<String, Object> verify(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
                                      @Valid @RequestBody SecurityPinVerifyRequest payload) {
        User user = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (user.getGestionCabinetPinHash() == null) {
            return Map.of("valid", false);
        }

        String pin = normalizePin(payload.pin());
        boolean valid = passwordEncoder.matches(pin, user.getGestionCabinetPinHash());
        if (valid) {
            auditService.logSuccessAsUser(user, AuditEventType.SECURITY_PIN_VERIFY, "USER", String.valueOf(user.getId()), "Verification PIN reussie");
        } else {
            auditService.logFailureAsUser(user, AuditEventType.SECURITY_PIN_VERIFY, "USER", String.valueOf(user.getId()), "Verification PIN echouee");
        }
        return Map.of("valid", valid);
    }
}
