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

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RevenueDTO {
        private Double revenuedu;   // revenue du jour
        private Double revenue;     // total revenue
        private Double revenuenet;  // net revenue
        private Double enattente;   // pending revenue
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExpenseDTO {
        private Double total;
        private Double depense;
        private Double inventaire;
    }
}
