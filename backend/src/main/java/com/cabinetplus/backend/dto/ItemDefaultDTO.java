package com.cabinetplus.backend.dto;

import com.cabinetplus.backend.enums.ItemCategory;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ItemDefaultDTO {

    private Long id;
    private String name;
    private ItemCategory category;
    private Double defaultPrice;
    private String description;
}
