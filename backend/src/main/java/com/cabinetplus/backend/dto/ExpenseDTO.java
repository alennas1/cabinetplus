package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ExpenseDTO {
    private Long id;
    private String type;        // "Item" or "Expense"
    private String title;       // Item name or Expense title
    private Double amount;
    private LocalDateTime date;
    private String createdBy;
}
