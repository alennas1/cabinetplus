package com.cabinetplus.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinanceCardsResponseDTO {

    private RevenueDTO revenue;
    private ExpenseDTO expense;

    // ----------------------------
    // Wrapper to hold current & previous
    // ----------------------------
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValueComparisonDTO {
        private Double current;
        private Double previous;
    }

    // ----------------------------
    // Revenue DTO
    // ----------------------------
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RevenueDTO {
        private ValueComparisonDTO revenuedu;   // revenue du jour
        private ValueComparisonDTO revenue;     // total revenue
        private ValueComparisonDTO revenuenet;  // net revenue
        private ValueComparisonDTO enattente;   // pending revenue
    }

    // ----------------------------
    // Expense DTO
    // ----------------------------
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExpenseDTO {
        private ValueComparisonDTO total;
        private ValueComparisonDTO depense;
        private ValueComparisonDTO inventaire;
    }
}
