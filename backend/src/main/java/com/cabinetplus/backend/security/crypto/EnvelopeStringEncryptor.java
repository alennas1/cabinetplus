package com.cabinetplus.backend.security.crypto;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;

/**
 * Encrypts strings using AES-256-GCM with a per-value DEK wrapped by a KEK.
 *
 * Stored format: {@code cpenc:v1:<iv>.<wrappedDek>.<ciphertext>}
 * where components are base64url (no padding).
 */
public final class EnvelopeStringEncryptor {

    private static final String PREFIX = "cpenc:v1:";
    private static final int GCM_TAG_BITS = 128;
    private static final int IV_BYTES = 12;
    private static final int DEK_BYTES = 32;

    private final byte[] kek;
    private final SecureRandom secureRandom = new SecureRandom();

    public EnvelopeStringEncryptor(byte[] kek) {
        this.kek = kek.clone();
    }

    public String encrypt(String plaintext) {
        byte[] iv = new byte[IV_BYTES];
        secureRandom.nextBytes(iv);

        byte[] dek = new byte[DEK_BYTES];
        secureRandom.nextBytes(dek);

        byte[] wrappedDek = AesKeyWrap.wrap(kek, dek);
        byte[] ciphertext = encryptAesGcm(dek, iv, plaintext.getBytes(StandardCharsets.UTF_8));

        return PREFIX
                + Base64Url.encode(iv) + "."
                + Base64Url.encode(wrappedDek) + "."
                + Base64Url.encode(ciphertext);
    }

    public String decrypt(String envelope) {
        if (!looksLikeEnvelope(envelope)) {
            throw new IllegalArgumentException("Value is not a supported envelope");
        }
        String payload = envelope.substring(PREFIX.length());
        String[] parts = payload.split("\\.", 3);
        if (parts.length != 3) {
            throw new IllegalArgumentException("Invalid envelope format");
        }
        byte[] iv = Base64Url.decode(parts[0]);
        byte[] wrappedDek = Base64Url.decode(parts[1]);
        byte[] ciphertext = Base64Url.decode(parts[2]);

        byte[] dek = AesKeyWrap.unwrap(kek, wrappedDek);
        byte[] plaintextBytes = decryptAesGcm(dek, iv, ciphertext);
        return new String(plaintextBytes, StandardCharsets.UTF_8);
    }

    public static boolean looksLikeEnvelope(String value) {
        return value != null && value.startsWith(PREFIX);
    }

    private static byte[] encryptAesGcm(byte[] dek, byte[] iv, byte[] plaintext) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            SecretKey key = new SecretKeySpec(dek, "AES");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, iv));
            return cipher.doFinal(plaintext);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to encrypt value", ex);
        }
    }

    private static byte[] decryptAesGcm(byte[] dek, byte[] iv, byte[] ciphertext) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            SecretKey key = new SecretKeySpec(dek, "AES");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, iv));
            return cipher.doFinal(ciphertext);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to decrypt value", ex);
        }
    }
}

