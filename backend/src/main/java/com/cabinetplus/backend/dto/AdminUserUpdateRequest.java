package com.cabinetplus.backend.dto;

public record AdminUserUpdateRequest(
        @jakarta.validation.constraints.Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,100}$",
                message = "Mot de passe invalide: minimum 8 caracteres avec majuscule, minuscule, chiffre et symbole"
        )
        String password,

        @jakarta.validation.constraints.Size(max = 255, message = "Le prenom ne doit pas depasser 255 caracteres")
        String firstname,

        @jakarta.validation.constraints.Size(max = 255, message = "Le nom ne doit pas depasser 255 caracteres")
        String lastname,

        @jakarta.validation.constraints.Pattern(
                regexp = "^(?:0[5-7]\\d{8}|(?:\\+?213)[5-7]\\d{8})$",
                message = "Numero de telephone algerien invalide (ex: 0550123456 ou +213550123456)"
        )
        String phoneNumber
) {
}
