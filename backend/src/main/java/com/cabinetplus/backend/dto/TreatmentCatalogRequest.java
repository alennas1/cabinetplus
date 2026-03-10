package com.cabinetplus.backend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

//  Used for creating/updating treatment catalog
@Data
public class TreatmentCatalogRequest {

    @NotBlank(message = "Le nom est obligatoire")
    private String name;

    private String description;

    @NotNull(message = "Le prix par defaut est obligatoire")
    @Positive(message = "Le prix par defaut doit etre superieur a 0")
    private Double defaultPrice;

    @JsonProperty("isFlatFee")
    @JsonAlias("flatFee")
    private boolean isFlatFee = false;
}


