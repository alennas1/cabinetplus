package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Le nom d'utilisateur est obligatoire")
        @Size(min = 3, max = 20, message = "Le nom d'utilisateur doit contenir entre 3 et 20 caracteres")
        String username,

        @NotBlank(message = "Le mot de passe est obligatoire")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,100}$",
                message = "Mot de passe invalide: minimum 8 caracteres avec majuscule, minuscule, chiffre et symbole"
        )
        String password,

        @NotBlank(message = "Le prenom est obligatoire")
        String firstname,

        @NotBlank(message = "Le nom est obligatoire")
        String lastname,

        @NotBlank(message = "Le numero de telephone est obligatoire")
        @Pattern(
                regexp = "^(?:0[5-7]\\d{8}|(?:\\+?213)[5-7]\\d{8})$",
                message = "Numero de telephone algerien invalide (ex: 0550123456 ou +213550123456)"
        )
        String phoneNumber,

        String clinicName,
        String address,

        @NotBlank(message = "Le role est obligatoire")
        String role
) {}
