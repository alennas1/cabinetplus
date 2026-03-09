package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record DeviseRequest(
    @NotBlank(message = "Title is required")
    String title,
    
    @NotEmpty(message = "Devise must have at least one item")
    List<DeviseItemRequest> items
) {}