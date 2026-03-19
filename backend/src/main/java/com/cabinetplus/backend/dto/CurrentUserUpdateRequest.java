package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.Size;

public record CurrentUserUpdateRequest(
        @Size(max = 255, message = "Le prenom ne doit pas depasser 255 caracteres")
        String firstname,

        @Size(max = 255, message = "Le nom ne doit pas depasser 255 caracteres")
        String lastname,

        @Size(max = 255, message = "Le nom du cabinet ne doit pas depasser 255 caracteres")
        String clinicName,

        @Size(max = 2000, message = "L'adresse ne doit pas depasser 2000 caracteres")
        String address,

        // Accepted but forbidden to change here (must go through SMS verification flow).
        String phoneNumber
) {
}
