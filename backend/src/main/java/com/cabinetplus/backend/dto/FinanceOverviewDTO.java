package com.cabinetplus.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FinanceOverviewDTO {
    private Double totalIncomeDue;        // sum of Treatment.price
    private Double totalIncomeReceived;   // sum of Payment.amount
    private Double totalExpenses;         // sum of Item.price + Expense.amount
    private Double netProfit;             // totalIncomeReceived - totalExpenses
    private Double outstandingPayments;   // totalIncomeDue - totalIncomeReceived
}
