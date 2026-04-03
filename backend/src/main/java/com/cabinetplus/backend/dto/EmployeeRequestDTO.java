package com.cabinetplus.backend.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class EmployeeRequestDTO {
    @NotBlank(message = "Le prenom est obligatoire")
    @Size(min = 2, max = 50, message = "Le prenom doit contenir entre 2 et 50 caracteres")
    private String firstName;

    @NotBlank(message = "Le nom est obligatoire")
    @Size(min = 2, max = 50, message = "Le nom doit contenir entre 2 et 50 caracteres")
    private String lastName;

    @NotBlank(message = "Le sexe est obligatoire")
    @Pattern(regexp = "^(Homme|Femme)$", message = "Sexe invalide")
    private String gender;

    @Past(message = "Date de naissance invalide")
    private LocalDate dateOfBirth;

    @Size(max = 50, message = "Numero d'identite trop long")
    private String nationalId;

    @NotBlank(message = "Le numero de telephone est obligatoire")
    @Pattern(
            regexp = "^(?:0[5-7]\\d{8}|(?:\\+?213)[5-7]\\d{8})$",
            message = "Numero de telephone algerien invalide (ex: 0550123456 ou +213550123456)"
    )
    private String phone;

    @Size(min = 4, max = 10, message = "Code SMS invalide")
    private String phoneVerificationCode;

    @Email(message = "Email invalide")
    @Size(max = 255, message = "Email trop long")
    private String email;

    @Size(max = 255, message = "Adresse trop longue")
    private String address;

    @PastOrPresent(message = "Date d'embauche invalide")
    private LocalDate hireDate;
    private LocalDate endDate;

    @NotNull(message = "Le statut est obligatoire")
    private EmployeeStatus status;

    @PositiveOrZero(message = "Salaire invalide")
    private Double salary;

    @Size(max = 50, message = "Type de contrat trop long")
    private String contractType;

    @Size(min = 8, max = 72, message = "Le mot de passe doit contenir entre 8 et 72 caracteres")
    private String password;
}
