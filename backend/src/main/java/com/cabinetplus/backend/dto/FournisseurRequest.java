package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record FournisseurRequest(
        @NotBlank(message = "Le nom du fournisseur est obligatoire")
        String name,
        String contactPerson,
        String phoneNumber,
        String address
) {}

