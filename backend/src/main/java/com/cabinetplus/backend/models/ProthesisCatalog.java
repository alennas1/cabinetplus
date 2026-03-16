package com.cabinetplus.backend.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "prothesis_catalog")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProthesisCatalog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Le nom de la prothese est obligatoire")
    private String name;

    @ManyToOne
    @JoinColumn(name = "material_id")
    private Material material; 

    @NotNull @Positive
    private Double defaultPrice;

    @NotNull
    @PositiveOrZero
    @Column(nullable = false)
    private Double defaultLabCost = 0.0;

    private boolean isFlatFee = false;

    @Column(name = "is_multi_unit", nullable = false)
    private boolean isMultiUnit = false;

    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;
}

