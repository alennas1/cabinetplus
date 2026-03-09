package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO for creating or updating a Laboratory partner.
 */
public record LaboratoryRequest(
    @NotBlank(message = "Lab name is required") 
    String name,
    
    String contactPerson,
    
    String phoneNumber,
    
    String address
) {}