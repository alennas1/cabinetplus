package com.cabinetplus.backend.security;

import java.security.MessageDigest;

public final class RefreshTokenHash {

    private static final String PREFIX = "rtokh:v1:";

    private RefreshTokenHash() {
    }

    public static String hash(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new IllegalArgumentException("Refresh token is required");
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(refreshToken.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return PREFIX + java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to hash refresh token", ex);
        }
    }

    public static boolean looksLikeHash(String value) {
        return value != null && value.startsWith(PREFIX);
    }
}

