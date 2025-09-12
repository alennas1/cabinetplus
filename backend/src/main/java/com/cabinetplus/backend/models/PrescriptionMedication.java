package com.cabinetplus.backend.models;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "prescription_medications")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionMedication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

   @ManyToOne(optional = false)
@JoinColumn(name = "prescription_id", nullable = false)
private Prescription prescription;

@ManyToOne(optional = false)
@JoinColumn(name = "medication_id", nullable = false)
private Medication medication;
    private String name;          // medication name (e.g. "Amoxicillin")
    private String amount;        // e.g. "500"
    private String unit;          // "mg" or "ml"
    private String frequency;     // e.g. "3 fois/jour"
    private String duration;      // e.g. "7 jours"
    private String instructions;  // e.g. "Prendre après repas"
}
