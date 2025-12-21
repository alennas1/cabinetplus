package com.cabinetplus.backend.models;

import java.time.LocalDateTime;
import com.cabinetplus.backend.enums.PaymentMethod;
import com.cabinetplus.backend.enums.PaymentStatus;
import com.cabinetplus.backend.enums.BillingCycle; // Import the new Enum

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "hand_payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HandPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "plan_id", nullable = false)
    private Plan plan;

    private Integer amount;

    // --- NEW ATTRIBUTE ---
    @Enumerated(EnumType.STRING)
    private BillingCycle billingCycle; 
    // ---------------------

    private LocalDateTime paymentDate = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    private PaymentStatus status = PaymentStatus.PENDING;

    @Enumerated(EnumType.STRING)
    private PaymentMethod paymentMethod = PaymentMethod.HAND;

    private String notes;
}