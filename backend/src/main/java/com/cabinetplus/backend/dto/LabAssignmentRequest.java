package com.cabinetplus.backend.dto;

public record LabAssignmentRequest(
    Long laboratoryId,
    Double labCost
) {}