package com.cabinetplus.backend.dto;

public record AdminCreateAdminRequest(
        @jakarta.validation.constraints.NotBlank(message = "Le prenom est obligatoire")
        @jakarta.validation.constraints.Size(max = 255, message = "Le prenom ne doit pas depasser 255 caracteres")
        String firstname,

        @jakarta.validation.constraints.NotBlank(message = "Le nom est obligatoire")
        @jakarta.validation.constraints.Size(max = 255, message = "Le nom ne doit pas depasser 255 caracteres")
        String lastname,

        @jakarta.validation.constraints.NotBlank(message = "Le numero de telephone est obligatoire")
        @jakarta.validation.constraints.Pattern(
                regexp = "^(?:0[5-7]\\d{8}|(?:\\+?213)[5-7]\\d{8})$",
                message = "Numero de telephone algerien invalide (ex: 0550123456 ou +213550123456)"
        )
        String phoneNumber,

        @jakarta.validation.constraints.NotBlank(message = "Le mot de passe est obligatoire")
        @jakarta.validation.constraints.Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,100}$",
                message = "Mot de passe invalide: minimum 8 caracteres avec majuscule, minuscule, chiffre et symbole"
        )
        String password,

        boolean canDeleteAdmin
) {
}
