package com.cabinetplus.backend.dto;

import java.util.List;

/**
 * Generic paginated response for server-side tables.
 *
 * @param items page content
 * @param page 0-based page index
 * @param size page size
 * @param totalElements total matching rows
 * @param totalPages total pages
 */
public record PageResponse<T>(
        List<T> items,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}

