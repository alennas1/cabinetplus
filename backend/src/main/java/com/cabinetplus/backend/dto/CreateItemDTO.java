package com.cabinetplus.backend.dto;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateItemDTO {
    private Long itemDefaultId;
    private Integer quantity;
    private Double unitPrice;
    private Double price;
    private LocalDate expiryDate;
}
