package com.cabinetplus.backend.models;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;

import com.cabinetplus.backend.enums.RecordStatus;

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
@Table(name = "items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "item_default_id", nullable = false)
    private ItemDefault itemDefault;

    @NotNull(message = "La quantite est obligatoire")
    @Column(nullable = false)
    private Integer quantity;

    @NotNull(message = "Le prix unitaire est obligatoire")
    @Column(nullable = false)
    private Double unitPrice; // user enters this

    @Column(nullable = false)
    private Double price; // quantity * unitPrice, for display only

    private LocalDate expiryDate;


    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt; // use LocalDateTime here
    
    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @ManyToOne(optional = true)
    @JoinColumn(name = "fournisseur_id")
    private Fournisseur fournisseur;

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

    
    // helper method to calculate total price
    public void calculatePrice() {
        if (quantity != null && unitPrice != null) {
            this.price = quantity * unitPrice;
        } else {
            this.price = 0.0;
        }
    }
}


