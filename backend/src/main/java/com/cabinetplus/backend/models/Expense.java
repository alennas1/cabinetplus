package com.cabinetplus.backend.models;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.enums.ExpenseCategory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "expenses")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Le titre est obligatoire")
    @Column(nullable = false, columnDefinition = "TEXT")
    private String title;

    @NotNull(message = "Le montant est obligatoire")
    @Column(nullable = false)
    private Double amount;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "La categorie est obligatoire")
    @Column(nullable = false)
    private ExpenseCategory category;

    private LocalDate date;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "other_category_label", columnDefinition = "TEXT")
    private String otherCategoryLabel;

    @ManyToOne(optional = true)
    @JoinColumn(name = "fournisseur_id")
    private Fournisseur fournisseur;

    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    // ðŸ‘‡ Added relation with Employee (optional)
    @ManyToOne(optional = true)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecordStatus recordStatus = RecordStatus.ACTIVE;

    private LocalDateTime cancelledAt;

    @ManyToOne
    @JoinColumn(name = "cancelled_by")
    private User cancelledBy;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    @PrePersist
    private void ensureRecordStatus() {
        if (recordStatus == null) {
            recordStatus = RecordStatus.ACTIVE;
        }
    }
}


