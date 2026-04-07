package com.cabinetplus.backend.dto;

import java.util.List;

public record LabPendingResponse(
        List<LabProthesisListItemResponse> protheses,
        List<LabPaymentListItemResponse> payments
) {}

