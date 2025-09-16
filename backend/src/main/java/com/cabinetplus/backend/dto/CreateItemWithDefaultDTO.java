package com.cabinetplus.backend.dto;

import java.time.LocalDate;

import com.cabinetplus.backend.enums.ItemCategory;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateItemWithDefaultDTO {

    // 🔹 Fields for ItemDefault
    private String name;
    private ItemCategory category;
    private Double defaultPrice;
    private String description;

    // 🔹 Fields for Item
    private Double price;
    private Integer quantity;
    private LocalDate expiryDate;
}
