package com.cabinetplus.backend.services;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
public class ReferenceCodeGeneratorService {

    public LocalDateTime dayStart(LocalDateTime dateTime) {
        LocalDate date = safeDate(dateTime);
        return date.atStartOfDay();
    }

    public LocalDateTime nextDayStart(LocalDateTime dateTime) {
        LocalDate date = safeDate(dateTime);
        return date.plusDays(1).atStartOfDay();
    }

    public String generate(String prefix, LocalDateTime createdAt, long existingCountForDay) {
        String safePrefix = prefix != null ? prefix : "";
        LocalDate date = safeDate(createdAt);

        long seq = Math.max(0L, existingCountForDay) + 1L;
        String ddmmyy = String.format("%02d%02d%02d", date.getDayOfMonth(), date.getMonthValue(), date.getYear() % 100);
        String seqPart = seq < 100 ? String.format("%02d", seq) : Long.toString(seq);

        return safePrefix + ddmmyy + seqPart;
    }

    private LocalDate safeDate(LocalDateTime dateTime) {
        return (dateTime != null ? dateTime : LocalDateTime.now()).toLocalDate();
    }
}

