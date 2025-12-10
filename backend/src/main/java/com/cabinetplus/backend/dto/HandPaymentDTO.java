package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

import com.cabinetplus.backend.enums.PaymentMethod;
import com.cabinetplus.backend.enums.PaymentStatus;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HandPaymentDTO {
    private Long id;
    private Long planId;             // just the ID, not full Plan
    private Integer amount;
    private LocalDateTime paymentDate;
    private PaymentStatus status;
    private PaymentMethod paymentMethod;
    private String notes;
}
