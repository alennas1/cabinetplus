package com.cabinetplus.backend.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "devise_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeviseItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "devise_id")
    private Devise devise;

    // Nullable because an item is EITHER a treatment OR a prosthesis
    @ManyToOne
    @JoinColumn(name = "treatment_catalog_id")
    private TreatmentCatalog treatmentCatalog;

    @ManyToOne
    @JoinColumn(name = "prothesis_catalog_id")
    private ProthesisCatalog prothesisCatalog;

    private Double unitPrice; // Price at the moment of adding to devise
    private Integer quantity = 1;
}