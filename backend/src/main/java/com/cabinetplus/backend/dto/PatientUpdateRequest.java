package com.cabinetplus.backend.dto;


import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PatientUpdateRequest(
        @Size(min = 2, max = 50, message = "Le prenom doit contenir entre 2 et 50 caracteres")
        String firstname,

        @Size(min = 2, max = 50, message = "Le nom doit contenir entre 2 et 50 caracteres")
        String lastname,

        @Min(value = 0, message = "Age invalide")
        @Max(value = 120, message = "Age invalide")
        Integer age,

        @Pattern(regexp = "^(Homme|Femme)$", message = "Sexe invalide")
        String sex,

        @Pattern(regexp = "^0\\d{9}$", message = "Numero de telephone invalide")
        String phone
) {
}
