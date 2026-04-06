package com.cabinetplus.backend.models;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.cabinetplus.backend.enums.CancellationRequestDecision;
import com.cabinetplus.backend.enums.RecordStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "protheses")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Prothesis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "prothesis_catalog_id")
    private ProthesisCatalog prothesisCatalog;

    @ManyToOne
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @ManyToOne
    @JoinColumn(name = "practitioner_id")
    private User practitioner;

    // --- Laboratory & Workflow ---
    @ManyToOne
    @JoinColumn(name = "laboratory_id")
    private Laboratory laboratory; // Assigned when sent to lab

    private Double labCost; // Expense paid to the lab (DZD)
    
    // Status e.g., "PENDING", "SENT_TO_LAB", "RECEIVED", "FITTED"
    private String status = "PENDING"; 
    
    private LocalDateTime dateCreated = LocalDateTime.now();
    private LocalDateTime updatedAt;

    @ManyToOne
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    private LocalDateTime sentToLabDate;

    @ManyToOne
    @JoinColumn(name = "sent_to_lab_by")
    private User sentToLabBy;

    private LocalDateTime actualReturnDate;

    @ManyToOne
    @JoinColumn(name = "received_by")
    private User receivedBy;

    @Column(name = "posed_at")
    private LocalDateTime posedAt;

    @ManyToOne
    @JoinColumn(name = "posed_by")
    private User posedBy;

    // --- Pricing & Details ---
    private Double finalPrice; // Calculated: (catalog.price * teeth.size()) or flat fee
    private String code;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ElementCollection(fetch = FetchType.EAGER)
    @BatchSize(size = 50)
    @CollectionTable(
        name = "prothesis_teeth",
        joinColumns = @JoinColumn(name = "prothesis_id")
    )
    @Column(name = "tooth_number")
    private List<Integer> teeth = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecordStatus recordStatus = RecordStatus.ACTIVE;

    private LocalDateTime cancelledAt;

    @ManyToOne
    @JoinColumn(name = "cancelled_by")
    private User cancelledBy;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

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

    @PrePersist
    private void onCreate() {
        if (dateCreated == null) {
            dateCreated = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = dateCreated;
        }
    }

    @PreUpdate
    private void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
