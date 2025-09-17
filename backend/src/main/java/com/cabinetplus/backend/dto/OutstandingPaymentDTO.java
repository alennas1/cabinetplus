package com.cabinetplus.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class OutstandingPaymentDTO {
    private Long patientId;
    private String patientName;
    private Double totalDue;
    private Double totalPaid;
    private Double outstanding;
}
