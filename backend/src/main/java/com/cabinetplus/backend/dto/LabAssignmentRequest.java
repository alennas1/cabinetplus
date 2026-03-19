package com.cabinetplus.backend.dto;

public record LabAssignmentRequest(
    @jakarta.validation.constraints.NotNull(message = "Laboratoire obligatoire")
    @jakarta.validation.constraints.Positive(message = "Laboratoire invalide")
    Long laboratoryId,

    @jakarta.validation.constraints.NotNull(message = "Cout labo obligatoire")
    @jakarta.validation.constraints.PositiveOrZero(message = "Cout labo invalide")
    Double labCost
) {}
