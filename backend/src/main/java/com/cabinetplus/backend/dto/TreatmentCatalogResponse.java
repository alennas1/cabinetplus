package com.cabinetplus.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

// ✅ Used when sending data back to frontend
@Data
@AllArgsConstructor
public class TreatmentCatalogResponse {
    private Long id;
    private String name;
    private String description;
    private Double defaultPrice;
}
