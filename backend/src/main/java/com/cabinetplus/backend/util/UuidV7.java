package com.cabinetplus.backend.util;

import java.security.SecureRandom;
import java.util.UUID;

/**
 * UUIDv7 generator (RFC 9562).
 */
public final class UuidV7 {

    private static final SecureRandom RANDOM = new SecureRandom();

    private UuidV7() {
    }

    public static UUID randomUuidV7() {
        long timestampMs = System.currentTimeMillis() & 0xFFFFFFFFFFFFL; // 48 bits
        int randA = RANDOM.nextInt(1 << 12); // 12 bits
        long randB = RANDOM.nextLong();

        long mostSigBits = (timestampMs << 16) | 0x7000L | (randA & 0x0FFFL);

        long leastSigBits = randB & 0x3FFFFFFFFFFFFFFFL; // clear top two bits
        leastSigBits |= 0x8000000000000000L; // set variant 10xx...

        return new UUID(mostSigBits, leastSigBits);
    }
}
