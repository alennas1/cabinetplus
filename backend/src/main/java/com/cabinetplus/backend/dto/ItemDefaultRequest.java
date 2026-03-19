package com.cabinetplus.backend.dto;

import com.cabinetplus.backend.enums.ItemCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record ItemDefaultRequest(
        @NotBlank(message = "Le nom est obligatoire")
        @Size(max = 255, message = "Le nom ne doit pas depasser 255 caracteres")
        String name,

        @NotNull(message = "Categorie obligatoire")
        ItemCategory category,

        @NotNull(message = "Prix obligatoire")
        @PositiveOrZero(message = "Prix invalide")
        Double defaultPrice,

        @Size(max = 500, message = "La description ne doit pas depasser 500 caracteres")
        String description
) {
}
