package com.cabinetplus.backend.dto;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateItemDTO {

    @NotNull(message = "La quantite est obligatoire")
    @Min(value = 1, message = "La quantite doit etre superieure a 0")
    private Integer quantity;

    @NotNull(message = "Le prix unitaire est obligatoire")
    @Positive(message = "Le prix unitaire doit etre superieur a 0")
    private Double unitPrice;

    // Use LocalDate for proper date handling; format JSON as yyyy-MM-dd
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate expiryDate;
}
