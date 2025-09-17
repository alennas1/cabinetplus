package com.cabinetplus.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MonthlyCashflowDTO {
    private int year;
    private int month;
    private Double revenue;
    private Double expenses;
    private Double net;
}
