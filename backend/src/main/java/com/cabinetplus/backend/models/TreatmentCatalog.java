package com.cabinetplus.backend.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "treatment_catalog")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TreatmentCatalog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Le nom est obligatoire")
    @Column(nullable = false)
    private String name;

    private String description;

    @NotNull(message = "Le prix par defaut est obligatoire")
    @Positive(message = "Le prix par defaut doit etre superieur a 0")
    @Column(nullable = false)
    private Double defaultPrice;

    private boolean isFlatFee = false;

    @Column(name = "is_multi_unit", nullable = false)
    private boolean isMultiUnit = false;

    // ðŸ”¹ Makes the catalog private to a dentist/user
    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;
}


