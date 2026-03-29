package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PatientCreateRequest(
        @NotBlank(message = "Le prenom est obligatoire")
        @Size(min = 2, max = 50, message = "Le prenom doit contenir entre 2 et 50 caracteres")
        String firstname,

        @NotBlank(message = "Le nom est obligatoire")
        @Size(min = 2, max = 50, message = "Le nom doit contenir entre 2 et 50 caracteres")
        String lastname,

        @Min(value = 0, message = "Age invalide")
        @Max(value = 120, message = "Age invalide")
        Integer age,

        @NotBlank(message = "Le sexe est obligatoire")
        @Pattern(regexp = "^(Homme|Femme)$", message = "Sexe invalide")
        String sex,

        @NotBlank(message = "Le numero de telephone est obligatoire")
        @Pattern(regexp = "^0\\d{9}$", message = "Numero de telephone invalide")
        String phone,

        @Size(max = 2000, message = "La liste de maladies est trop longue")
        String diseases,

        @Size(max = 2000, message = "La liste d'allergies est trop longue")
        String allergies
) {
}
