package com.cabinetplus.backend.dto;

import java.time.LocalDate;

import com.cabinetplus.backend.enums.ExpenseCategory;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseRequestDTO {

    @NotNull(message = "Le titre est obligatoire")
    private String title;

    @NotNull(message = "Le montant est obligatoire")
    private Double amount;

    @NotNull(message = "La categorie est obligatoire")
    private ExpenseCategory category;

    private LocalDate date;

    private String description;

    // ðŸ‘‡ Added (optional except for SALARY)
    private Long employeeId;
}


