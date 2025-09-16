package com.cabinetplus.backend.dto;

import java.time.LocalDate;

import com.cabinetplus.backend.enums.ExpenseCategory;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseResponseDTO {
    private Long id;
    private String title;
    private Double amount;
    private ExpenseCategory category;
    private LocalDate date;
    private String description;
}
