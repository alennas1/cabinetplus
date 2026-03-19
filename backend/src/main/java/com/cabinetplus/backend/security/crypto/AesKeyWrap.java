package com.cabinetplus.backend.security.crypto;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

final class AesKeyWrap {

    private AesKeyWrap() {
    }

    static byte[] wrap(byte[] kek, byte[] dek) {
        try {
            Cipher cipher = Cipher.getInstance("AESWrap");
            SecretKey key = new SecretKeySpec(kek, "AES");
            cipher.init(Cipher.WRAP_MODE, key);
            return cipher.wrap(new SecretKeySpec(dek, "AES"));
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to wrap DEK", ex);
        }
    }

    static byte[] unwrap(byte[] kek, byte[] wrappedDek) {
        try {
            Cipher cipher = Cipher.getInstance("AESWrap");
            SecretKey key = new SecretKeySpec(kek, "AES");
            cipher.init(Cipher.UNWRAP_MODE, key);
            SecretKey unwrapped = (SecretKey) cipher.unwrap(wrappedDek, "AES", Cipher.SECRET_KEY);
            return unwrapped.getEncoded();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to unwrap DEK", ex);
        }
    }
}

