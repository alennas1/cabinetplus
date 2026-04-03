package com.cabinetplus.backend.services;

import java.util.Map;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.User;

@Service
public class CancellationSecurityService {

    private final PasswordEncoder passwordEncoder;

    public CancellationSecurityService(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
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

    private static String normalizeReason(String reason) {
        if (reason == null) {
            throw new BadRequestException(Map.of("reason", "Motif requis"));
        }
        String normalized = reason.trim();
        if (normalized.isBlank()) {
            throw new BadRequestException(Map.of("reason", "Motif requis"));
        }
        if (normalized.length() > 200) {
            throw new BadRequestException(Map.of("reason", "Motif trop long (max 200 caractères)"));
        }
        return normalized;
    }

    public String requirePinAndReason(User clinicOwner, String pin, String reason) {
        if (clinicOwner == null) {
            throw new BadRequestException(Map.of("_", "Utilisateur introuvable"));
        }

        if (!clinicOwner.isGestionCabinetPinEnabled() || clinicOwner.getGestionCabinetPinHash() == null) {
            throw new BadRequestException(Map.of("pin", "Activez d'abord le code PIN (Paramètres → Sécurité)."));
        }

        String normalizedPin = normalizePin(pin);
        if (!passwordEncoder.matches(normalizedPin, clinicOwner.getGestionCabinetPinHash())) {
            throw new BadRequestException(Map.of("pin", "Code PIN incorrect"));
        }

        return normalizeReason(reason);
    }
}

