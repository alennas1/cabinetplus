package com.cabinetplus.backend.security.crypto;

import java.util.Base64;

public final class EncryptionKeyProvider {

    private static volatile byte[] kek;
    // Local-only fallback to keep development simple without environment variables.
    // Do NOT rely on this for production.
    private static final String DEV_FALLBACK_KEK_BASE64 = "bgNrqmRxdm2ou9lOrIJLJBJQe4pVbOMuQ47gPGHkipo=";

    private EncryptionKeyProvider() {
    }

    public static byte[] getOrLoadKek() {
        byte[] current = kek;
        if (current != null) return current;

        synchronized (EncryptionKeyProvider.class) {
            if (kek != null) return kek;

            String base64 = System.getProperty("cabinetplus.crypto.kek-base64");
            if (base64 == null || base64.isBlank()) {
                base64 = System.getenv("CABINETPLUS_KMS_KEK_BASE64");
            }
            if ((base64 == null || base64.isBlank()) && isDevProfileActive()) {
                base64 = DEV_FALLBACK_KEK_BASE64;
            }
            if (base64 == null || base64.isBlank()) {
                throw new IllegalStateException(
                        "Missing encryption key. Set system property 'cabinetplus.crypto.kek-base64' or env var 'CABINETPLUS_KMS_KEK_BASE64'."
                );
            }

            byte[] decoded;
            try {
                decoded = Base64.getDecoder().decode(base64.trim());
            } catch (IllegalArgumentException ex) {
                throw new IllegalStateException("Invalid base64 for KEK (cabinetplus.crypto.kek-base64 / CABINETPLUS_KMS_KEK_BASE64).", ex);
            }

            if (!(decoded.length == 16 || decoded.length == 24 || decoded.length == 32)) {
                throw new IllegalStateException("KEK must be 16/24/32 bytes after base64 decoding (AES-128/192/256).");
            }

            kek = decoded;
            return decoded;
        }
    }

    private static boolean isDevProfileActive() {
        String profiles = System.getenv("SPRING_PROFILES_ACTIVE");
        if (profiles == null || profiles.isBlank()) {
            profiles = System.getProperty("spring.profiles.active");
        }
        // Default profile in this app is "dev" when SPRING_PROFILES_ACTIVE is not set.
        if (profiles == null || profiles.isBlank()) {
            return true;
        }
        for (String p : profiles.split(",")) {
            if ("dev".equalsIgnoreCase(p.trim())) {
                return true;
            }
        }
        return false;
    }
}
