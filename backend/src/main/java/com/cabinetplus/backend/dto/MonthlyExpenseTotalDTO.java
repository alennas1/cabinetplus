package com.cabinetplus.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MonthlyExpenseTotalDTO {
    private int year;
    private int month;
    private Double total;
}

