package com.cabinetplus.backend.models;

import java.time.LocalDateTime;

import com.cabinetplus.backend.enums.CancellationRequestDecision;
import com.cabinetplus.backend.enums.RecordStatus;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "laboratory_payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LaboratoryPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Min(0)
    private Double amount;

    @NotNull
    private LocalDateTime paymentDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(optional = false)
    @JoinColumn(name = "laboratory_id", nullable = false)
    private Laboratory laboratory;

    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecordStatus recordStatus = RecordStatus.ACTIVE;

    private LocalDateTime cancelledAt;

    // --- Cancellation confirmation (when connected to a lab account) ---
    @Column(name = "cancel_requested_at")
    private LocalDateTime cancelRequestedAt;

    @ManyToOne
    @JoinColumn(name = "cancel_requested_by")
    private User cancelRequestedBy;

    @Column(name = "cancel_request_reason", columnDefinition = "TEXT")
    private String cancelRequestReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "cancel_request_decision", length = 20)
    private CancellationRequestDecision cancelRequestDecision;

    @Column(name = "cancel_request_decided_at")
    private LocalDateTime cancelRequestDecidedAt;

    @ManyToOne
    @JoinColumn(name = "cancel_request_decided_by")
    private User cancelRequestDecidedBy;
}
