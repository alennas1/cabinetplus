package com.cabinetplus.backend.dto;

public record ProthesisCatalogResponse(
    Long id,
    String name,
    String materialName, 
    Double defaultPrice,
    Double defaultLabCost,
    boolean isFlatFee
) {}
