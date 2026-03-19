package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class JustificationRequest {
    @NotNull(message = "Patient obligatoire")
    @Positive(message = "Patient invalide")
    private Long patientId;

    @NotBlank(message = "Le titre est obligatoire")
    @Size(max = 150, message = "Le titre ne doit pas depasser 150 caracteres")
    private String title;

    @NotBlank(message = "Le contenu est obligatoire")
    @Size(max = 20000, message = "Le contenu est trop long")
    private String content;
}
