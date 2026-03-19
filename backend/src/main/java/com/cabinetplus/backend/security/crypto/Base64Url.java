package com.cabinetplus.backend.security.crypto;

import java.util.Base64;

final class Base64Url {

    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private Base64Url() {
    }

    static String encode(byte[] bytes) {
        return ENCODER.encodeToString(bytes);
    }

    static byte[] decode(String value) {
        return DECODER.decode(value);
    }
}

