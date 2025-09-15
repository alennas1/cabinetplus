package com.cabinetplus.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ItemDTO {

    private Long id;
    private Long itemDefaultId;
    private String itemDefaultName; // convenient
    private Integer quantity;
    private Double price; // new field
    private LocalDate expiryDate;
}
