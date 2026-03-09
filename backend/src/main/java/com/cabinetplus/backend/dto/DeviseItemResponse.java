package com.cabinetplus.backend.dto;

public record DeviseItemResponse(
    Long id,
    String itemName,   // The name from the catalog
    String type,       // "TREATMENT" or "PROTHESIS"
    Double unitPrice,
    Integer quantity,
    Double subTotal    // (unitPrice * quantity)
) {}