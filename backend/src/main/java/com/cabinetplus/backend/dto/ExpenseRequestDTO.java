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

    @NotNull(message = "Title is required")
    private String title;

    @NotNull(message = "Amount is required")
    private Double amount;

    @NotNull(message = "Category is required")
    private ExpenseCategory category;

    private LocalDate date;

    private String description;

    // 👇 Added (optional except for SALARY)
    private Long employeeId;
}
