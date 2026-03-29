package com.cabinetplus.backend.util;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;

public final class PagedQueryUtil {

    private PagedQueryUtil() {}

    public static String normalizeText(String value) {
        if (value == null) return "";
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.trim().toLowerCase();
    }

    public static boolean matchesSearch(String haystack, String q) {
        String needle = normalizeText(q);
        if (needle.isEmpty()) return true;
        String hay = normalizeText(haystack);
        return hay.contains(needle);
    }

    public static boolean isInDateRange(LocalDateTime dateTime, LocalDate from, LocalDate to) {
        if (from == null && to == null) {
            return true;
        }
        if (dateTime == null) {
            return false;
        }
        if (from != null) {
            if (dateTime.isBefore(from.atStartOfDay())) return false;
        }
        if (to != null) {
            LocalDateTime endExclusive = to.plusDays(1).atStartOfDay();
            if (!dateTime.isBefore(endExclusive)) return false;
        }
        return true;
    }

    public static Comparator<String> stringComparator(boolean desc) {
        Comparator<String> base = String.CASE_INSENSITIVE_ORDER;
        if (desc) {
            base = base.reversed();
        }
        return Comparator.nullsLast(base);
    }

    public static Comparator<LocalDateTime> dateTimeComparator(boolean desc) {
        Comparator<LocalDateTime> base = Comparator.naturalOrder();
        if (desc) {
            base = Comparator.<LocalDateTime>reverseOrder();
        }
        return Comparator.nullsLast(base);
    }

    public static Comparator<Double> doubleComparator(boolean desc) {
        Comparator<Double> base = Comparator.naturalOrder();
        if (desc) {
            base = Comparator.<Double>reverseOrder();
        }
        return Comparator.nullsLast(base);
    }

    public static Comparator<Long> longComparator(boolean desc) {
        Comparator<Long> base = Comparator.naturalOrder();
        if (desc) {
            base = Comparator.<Long>reverseOrder();
        }
        return Comparator.nullsLast(base);
    }

    public static Comparator<Integer> integerComparator(boolean desc) {
        Comparator<Integer> base = Comparator.naturalOrder();
        if (desc) {
            base = Comparator.<Integer>reverseOrder();
        }
        return Comparator.nullsLast(base);
    }
}

