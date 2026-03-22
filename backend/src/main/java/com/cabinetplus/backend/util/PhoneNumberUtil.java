package com.cabinetplus.backend.util;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class PhoneNumberUtil {
    private PhoneNumberUtil() {}

    public static String trimToNull(String value) {
        if (value == null) return null;
        String v = value.trim();
        return v.isEmpty() ? null : v;
    }

    public static String digitsOnly(String value) {
        if (value == null) return "";
        StringBuilder out = new StringBuilder(value.length());
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (c >= '0' && c <= '9') out.append(c);
        }
        return out.toString();
    }

    /**
     * Returns possible stored representations for Algerian mobile numbers.
     * Existing DB rows may store either local (0XXXXXXXXX) or international (+213XXXXXXXXX).
     */
    public static List<String> algeriaStoredCandidates(String rawInput) {
        String raw = trimToNull(rawInput);
        if (raw == null) return List.of();

        String digits = digitsOnly(raw);
        if (digits.isEmpty()) return List.of();

        Set<String> candidates = new LinkedHashSet<>();

        // Local format: 0XXXXXXXXX (10 digits).
        if (digits.startsWith("0") && digits.length() == 10) {
            candidates.add(digits);
            candidates.add("+213" + digits.substring(1));
            return List.copyOf(candidates);
        }

        // Intl format without +: 213XXXXXXXXX (12 digits).
        if (digits.startsWith("213") && digits.length() == 12) {
            String national = digits.substring(3);
            candidates.add("+213" + national);
            candidates.add("0" + national);
            return List.copyOf(candidates);
        }

        // Intl format with +: +213XXXXXXXXX.
        if (raw.startsWith("+") && digits.startsWith("213") && digits.length() == 12) {
            String national = digits.substring(3);
            candidates.add("+213" + national);
            candidates.add("0" + national);
            return List.copyOf(candidates);
        }

        // Fallback: keep raw trimmed.
        candidates.add(raw);
        candidates.add(digits);
        return List.copyOf(candidates);
    }

    public static String canonicalAlgeriaForStorage(String rawInput) {
        List<String> candidates = algeriaStoredCandidates(rawInput);
        if (candidates.isEmpty()) return null;
        for (String candidate : candidates) {
            if (candidate != null && candidate.startsWith("+")) return candidate;
        }
        return candidates.get(0);
    }

    public static boolean looksLikeAlgerianMobile(String rawInput) {
        String raw = trimToNull(rawInput);
        if (raw == null) return false;

        String normalized = raw.replace(" ", "").replace("-", "");
        String digits = digitsOnly(normalized);
        if (digits.startsWith("0") && digits.length() == 10) {
            return isDzMobilePrefix(digits.substring(1, 2));
        }
        if (digits.startsWith("213") && digits.length() == 12) {
            return isDzMobilePrefix(digits.substring(3, 4));
        }
        return false;
    }

    private static boolean isDzMobilePrefix(String firstDigitAfterPrefix) {
        if (firstDigitAfterPrefix == null || firstDigitAfterPrefix.isEmpty()) return false;
        String d = firstDigitAfterPrefix.toLowerCase(Locale.ROOT);
        return "5".equals(d) || "6".equals(d) || "7".equals(d);
    }
}

