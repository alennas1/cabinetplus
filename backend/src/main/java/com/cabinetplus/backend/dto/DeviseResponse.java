package com.cabinetplus.backend.dto;

import java.util.List;

public record DeviseResponse(
    Long id,
    String title,
    Double totalAmount,
    List<DeviseItemResponse> items
) {}