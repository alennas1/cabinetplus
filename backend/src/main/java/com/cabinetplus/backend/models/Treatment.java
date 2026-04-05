package com.cabinetplus.backend.models;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.cabinetplus.backend.enums.RecordStatus;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "treatments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Treatment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "treatment_catalog_id")
    private TreatmentCatalog treatmentCatalog;

    @ManyToOne
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @ManyToOne
    @JoinColumn(name = "practitioner_id")
    private User practitioner;

    private LocalDateTime date;
    private Double price;

    @Column(columnDefinition = "TEXT")
    private String notes;
    private String status = "PLANNED";
    private LocalDateTime updatedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecordStatus recordStatus = RecordStatus.ACTIVE;

    private LocalDateTime cancelledAt;

    @ManyToOne
    @JoinColumn(name = "cancelled_by")
    private User cancelledBy;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    // 👇 store selected teeth as integers
    @ElementCollection(fetch = FetchType.EAGER)
@CollectionTable(
    name = "treatment_teeth",
    joinColumns = @JoinColumn(name = "treatment_id")
)
@Column(name = "tooth_number")
private List<Integer> teeth = new ArrayList<>();

    @PrePersist
    private void onCreate() {
        if (status == null || status.trim().isEmpty()) {
            status = "PLANNED";
        }
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    private void onUpdate() {
        if (status == null || status.trim().isEmpty()) {
            status = "PLANNED";
        }
        updatedAt = LocalDateTime.now();
    }
}
