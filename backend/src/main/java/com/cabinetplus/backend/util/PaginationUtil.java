package com.cabinetplus.backend.util;

import java.util.List;

import com.cabinetplus.backend.dto.PageResponse;

public final class PaginationUtil {

    private PaginationUtil() {}

    public static <T> PageResponse<T> toPageResponse(List<T> allItems, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        long totalElements = allItems != null ? allItems.size() : 0L;
        int totalPages = safeSize == 0 ? 0 : (int) Math.ceil(totalElements / (double) safeSize);

        if (allItems == null || allItems.isEmpty()) {
            return new PageResponse<>(List.of(), safePage, safeSize, 0L, 0);
        }

        int fromIndex = safePage * safeSize;
        if (fromIndex >= allItems.size()) {
            return new PageResponse<>(List.of(), safePage, safeSize, totalElements, totalPages);
        }
        int toIndex = Math.min(fromIndex + safeSize, allItems.size());
        List<T> pageItems = allItems.subList(fromIndex, toIndex);

        return new PageResponse<>(pageItems, safePage, safeSize, totalElements, totalPages);
    }
}

