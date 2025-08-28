package com.cabinetplus.backend.models;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "payments")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Payment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull @Min(0)
    private Double amount;

    @NotNull
    private LocalDateTime date; // when money was received

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Method method;

    public enum Method {
        CASH, CARD, BANK_TRANSFER, CHECK, OTHER
    }

    @ManyToOne(optional = false)
    @JoinColumn(name = "patient_id")
    private Patient patient;

    // Optional: track staff who received it
    @ManyToOne
    @JoinColumn(name = "received_by")
    private User receivedBy;
}
