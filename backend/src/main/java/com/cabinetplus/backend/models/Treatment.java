package com.cabinetplus.backend.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;


@Entity
@Table(name = "treatments")
@Data @NoArgsConstructor @AllArgsConstructor
public class Treatment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
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
    private String notes;
}
