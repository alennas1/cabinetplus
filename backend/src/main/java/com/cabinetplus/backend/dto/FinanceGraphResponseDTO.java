package com.cabinetplus.backend.dto;

import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinanceGraphResponseDTO {

    private SectionDTO revenue;
    private SectionDTO expense;

@Data
@AllArgsConstructor
public static class SectionDTO {
    private Map<String, Double> amounts;          // total expenses / revenue
    private Map<String, Double> secondaryAmounts; // inventaire or net revenue
    private Map<String, String> types;            // percentages by type/category
}

}
