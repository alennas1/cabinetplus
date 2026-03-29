package com.cabinetplus.backend.dto;

import java.util.List;
import java.time.LocalDateTime;

public record DeviseResponse(
    Long id,
    String title,
    LocalDateTime createdAt,
    Double totalAmount,
    List<DeviseItemResponse> items
) {}
