package com.cabinetplus.backend.models;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.util.UuidV7;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.persistence.PrePersist;


@Entity
@Table(name = "prescriptions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", nullable = false, unique = true, updatable = false)
    private UUID publicId;

    @Column(name = "rx_id", unique = true, nullable = false)
    private String rxId;

    private LocalDateTime date;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne
    @JoinColumn(name = "practitioner_id", nullable = false)
    private User practitioner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecordStatus recordStatus = RecordStatus.ACTIVE;

    private LocalDateTime cancelledAt;

   @OneToMany(mappedBy = "prescription", cascade = CascadeType.ALL, orphanRemoval = true)
private List<PrescriptionMedication> medications = new ArrayList<>();


@PrePersist
private void generateRxId() {
    if (this.publicId == null) {
        this.publicId = UuidV7.randomUuidV7();
    }
    if (this.rxId == null || this.rxId.isEmpty()) {
        // Format: RX-<year>-<random 5 digits>
        int randomDigits = (int)(Math.random() * 90000) + 10000; // 10000-99999
        this.rxId = "RX-" + java.time.Year.now().getValue() + "-" + randomDigits;
    }
}

}
