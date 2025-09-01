package com.cabinetplus.backend.models;

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
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "medications")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Medication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Name is required")
    @Column(nullable = false)
    private String name;

    @NotNull(message = "Dosage form is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DosageForm dosageForm;

    @NotBlank(message = "Strength is required (e.g., 500mg, 10ml)")
    @Column(nullable = false)
    private String strength;

    private String description;

    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;   // 👈 ensures each medication belongs to a dentist

    public enum DosageForm {
        TABLET,
        CAPSULE,
        SYRUP,
        INJECTION,
        OINTMENT
    }
}
