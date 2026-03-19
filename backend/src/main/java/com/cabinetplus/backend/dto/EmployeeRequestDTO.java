package com.cabinetplus.backend.dto;

import java.time.LocalDate;

import com.cabinetplus.backend.enums.ClinicAccessRole;

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
    @Pattern(regexp = "^0\\d{9}$", message = "Numero de telephone invalide")
    private String phone;

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

    @Size(max = 100, message = "Nom d'utilisateur trop long")
    private String username;

    @Size(min = 8, max = 72, message = "Le mot de passe doit contenir entre 8 et 72 caracteres")
    private String password;

    @NotNull(message = "Le role d'acces est obligatoire")
    private ClinicAccessRole accessRole;
}
