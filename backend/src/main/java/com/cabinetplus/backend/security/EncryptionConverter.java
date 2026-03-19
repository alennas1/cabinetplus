package com.cabinetplus.backend.security;

import com.cabinetplus.backend.security.crypto.EnvelopeStringEncryptor;
import com.cabinetplus.backend.security.crypto.EncryptionKeyProvider;
import com.cabinetplus.backend.security.crypto.LegacyAesEcbStringDecryptor;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Encrypts/decrypts String columns at rest.
 *
 * <p>New values are stored using an envelope format (AES-256-GCM with per-value DEK, wrapped by a KEK).
 * Legacy values (from the previous AES/ECB implementation) are still readable for migration purposes.</p>
 *
 * <p>Configure the KEK via:
 * - System property: cabinetplus.crypto.kek-base64
 * - Env var: CABINETPLUS_KMS_KEK_BASE64
 * </p>
 */
@Converter
public class EncryptionConverter implements AttributeConverter<String, String> {

    private volatile EnvelopeStringEncryptor encryptor;

    private EnvelopeStringEncryptor getEncryptor() {
        EnvelopeStringEncryptor current = encryptor;
        if (current != null) {
            return current;
        }
        synchronized (this) {
            if (encryptor == null) {
                encryptor = new EnvelopeStringEncryptor(EncryptionKeyProvider.getOrLoadKek());
            }
            return encryptor;
        }
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) return null;
        if (attribute.isBlank()) return attribute;
        return getEncryptor().encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        if (dbData.isBlank()) return dbData;

        // New envelope format (preferred)
        if (EnvelopeStringEncryptor.looksLikeEnvelope(dbData)) {
            return getEncryptor().decrypt(dbData);
        }

        // Legacy AES/ECB base64 ciphertext (migration path)
        if (LegacyAesEcbStringDecryptor.looksLikeLegacyBase64(dbData)) {
            String legacy = LegacyAesEcbStringDecryptor.tryDecrypt(dbData);
            if (legacy != null) {
                return legacy;
            }
        }

        // Plaintext (older rows or non-migrated columns)
        return dbData;
    }
}
