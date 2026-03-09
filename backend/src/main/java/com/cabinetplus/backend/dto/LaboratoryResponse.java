package com.cabinetplus.backend.dto;

/**
 * DTO for returning Laboratory details to the frontend.
 */
public record LaboratoryResponse(
    Long id,
    String name,
    String contactPerson,
    String phoneNumber,
    String address
) {}