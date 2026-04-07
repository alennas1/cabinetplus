package com.cabinetplus.backend.services;

import java.security.SecureRandom;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.repositories.LaboratoryRepository;

@Service
public class LaboratoryInviteCodeService {

    private static final SecureRandom random = new SecureRandom();

    private final LaboratoryRepository laboratoryRepository;

    public LaboratoryInviteCodeService(LaboratoryRepository laboratoryRepository) {
        this.laboratoryRepository = laboratoryRepository;
    }

    public String nextInviteCode() {
        // Binance-style numeric ID: random digits to reduce guessability.
        // Keep it short but large enough to avoid collisions.
        for (int attempt = 0; attempt < 25; attempt++) {
            String code = randomDigits(9);
            if (!laboratoryRepository.existsByInviteCode(code)) {
                return code;
            }
        }
        // Extremely unlikely, but fail safely.
        throw new IllegalStateException("Unable to generate a unique laboratory invite code");
    }

    private static String randomDigits(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append((char) ('0' + random.nextInt(10)));
        }
        // Ensure it doesn't start with 0 (more "ID-like").
        if (sb.length() > 0 && sb.charAt(0) == '0') {
            sb.setCharAt(0, (char) ('1' + random.nextInt(9)));
        }
        return sb.toString();
    }
}
