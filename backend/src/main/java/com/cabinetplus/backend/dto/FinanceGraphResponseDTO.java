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
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SectionDTO {
        private Map<String, Double> amounts; // d1, d2, ... (amounts over timeframe)
        private Map<String, String> types;   // category → percentage (e.g. consultations: "58%")
    }
}
