package com.cabinetplus.backend.dto;

import java.util.List;

public record LabProthesisStatusUpdateRequest(
        List<Long> ids,
        String status
) {}

