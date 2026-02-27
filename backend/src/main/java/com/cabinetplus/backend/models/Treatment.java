package com.cabinetplus.backend.models;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
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
    private String notes;

    // 👇 store selected teeth as integers
    @ElementCollection(fetch = FetchType.EAGER)
@CollectionTable(
    name = "treatment_teeth",
    joinColumns = @JoinColumn(name = "treatment_id")
)
@Column(name = "tooth_number")
private List<Integer> teeth = new ArrayList<>();
}
