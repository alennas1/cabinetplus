package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class IncomeDTO {
    private Long treatmentId;
    private String patientName;
    private String treatmentName;
    private LocalDateTime treatmentDate;
    private Double treatmentPrice;
    private Double amountPaid;
    private Double outstandingAmount;
}
