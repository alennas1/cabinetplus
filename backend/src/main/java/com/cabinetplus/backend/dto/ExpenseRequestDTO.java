package com.cabinetplus.backend.dto;

import java.time.LocalDate;

import com.cabinetplus.backend.enums.ExpenseCategory;
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseRequestDTO {

    @NotBlank(message = "Le titre est obligatoire")
    @Size(min = 2, max = 255, message = "Le titre doit contenir entre 2 et 255 caracteres")
    private String title;

    @NotNull(message = "Le montant est obligatoire")
    @Positive(message = "Le montant doit etre superieur a 0")
    private Double amount;

    @NotNull(message = "La categorie est obligatoire")
    private ExpenseCategory category;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDate date;

    @Size(max = 500, message = "La description ne doit pas depasser 500 caracteres")
    private String description;

    @Size(max = 80, message = "Le libelle de categorie ne doit pas depasser 80 caracteres")
    private String otherCategoryLabel;

    @Positive(message = "Fournisseur invalide")
    private Long fournisseurId;

    // ðŸ‘‡ Added (optional except for SALARY)
    @Positive(message = "Employe invalide")
    private Long employeeId;
}


