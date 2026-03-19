package com.cabinetplus.backend.security.crypto;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Backwards-compatible decryptor for legacy values written by the old AES/ECB converter.
 * This exists only to allow in-place migration of existing databases.
 */
public final class LegacyAesEcbStringDecryptor {

    private static final String LEGACY_ALGORITHM = "AES/ECB/PKCS5Padding";
    private static final String LEGACY_SECRET = "MySuperSecretKey";

    private LegacyAesEcbStringDecryptor() {
    }

    public static boolean looksLikeLegacyBase64(String value) {
        if (value == null) return false;
        String v = value.trim();
        if (v.length() < 16) return false;
        // quick heuristic: legacy values were base64, not prefixed
        return v.matches("^[A-Za-z0-9+/=\\r\\n]+$");
    }

    /**
     * @return decrypted plaintext, or null if it doesn't look like legacy ciphertext.
     */
    public static String tryDecrypt(String legacyBase64Ciphertext) {
        try {
            byte[] decoded = Base64.getDecoder().decode(legacyBase64Ciphertext);
            SecretKeySpec key = new SecretKeySpec(LEGACY_SECRET.getBytes(StandardCharsets.UTF_8), "AES");
            Cipher cipher = Cipher.getInstance(LEGACY_ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, key);
            byte[] plaintext = cipher.doFinal(decoded);
            return new String(plaintext, StandardCharsets.UTF_8);
        } catch (Exception ex) {
            return null;
        }
    }
}

