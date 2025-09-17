package com.cabinetplus.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ItemDTO {

    private Long id;
    private Long itemDefaultId;
    private String itemDefaultName; // convenient
    private Integer quantity;
    private Double price;      // total price
    private Double unitPrice;  // add this
    private LocalDate expiryDate;
    private LocalDateTime createdAt; // use LocalDateTime here
}
