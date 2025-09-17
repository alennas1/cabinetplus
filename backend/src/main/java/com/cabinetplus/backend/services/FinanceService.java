package com.cabinetplus.backend.services;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.CategoryBreakdownDTO;
import com.cabinetplus.backend.dto.FinanceSummaryDTO;
import com.cabinetplus.backend.dto.MonthlyCashflowDTO;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.ExpenseRepository;
import com.cabinetplus.backend.repositories.ItemRepository;
import com.cabinetplus.backend.repositories.PaymentRepository;
import com.cabinetplus.backend.repositories.TreatmentRepository;

@Service
public class FinanceService {

    private final PaymentRepository paymentRepository;
    private final ExpenseRepository expenseRepository;
    private final ItemRepository itemRepository;
    private final TreatmentRepository treatmentRepository;

    public FinanceService(PaymentRepository paymentRepository,
                          ExpenseRepository expenseRepository,
                          ItemRepository itemRepository,
                          TreatmentRepository treatmentRepository) {
        this.paymentRepository = paymentRepository;
        this.expenseRepository = expenseRepository;
        this.itemRepository = itemRepository;
        this.treatmentRepository = treatmentRepository;
    }

    // --- Monthly cashflow ---
    public List<MonthlyCashflowDTO> getMonthlyCashflow(User user) {
        int year = java.time.Year.now().getValue();

        return IntStream.rangeClosed(1, 12)
                .mapToObj(month -> {
                    Double revenue = paymentRepository.sumByMonth(year, month);
                    if (revenue == null) revenue = 0.0;

                    Double expenses = 0.0;
                    Double exp1 = expenseRepository.sumByMonth(year, month);
                    Double exp2 = itemRepository.sumByMonth(year, month);
                    if (exp1 != null) expenses += exp1;
                    if (exp2 != null) expenses += exp2;

                    Double net = revenue - expenses;

                    return new MonthlyCashflowDTO(year, month, revenue, expenses, net);
                })
                .collect(Collectors.toList());
    }

    // --- Expense breakdown ---
    public List<CategoryBreakdownDTO> getExpenseBreakdown(User user) {
        return expenseRepository.sumByCategory(
                        java.time.LocalDate.now().withDayOfMonth(1),
                        java.time.LocalDate.now())
                .stream()
                .map(row -> new CategoryBreakdownDTO((String) row[0], (Double) row[1]))
                .collect(Collectors.toList());
    }

    // --- Finance summary ---
    // --- Finance summary ---
public FinanceSummaryDTO getFinanceSummary(User user) {
    double totalGeneralExpenses = expenseRepository.sumExpensesBetween(
            java.time.LocalDate.now().minusMonths(1),
            java.time.LocalDate.now()
    );

    double totalInventoryExpenses = itemRepository.sumInventoryBetween(
            java.time.LocalDate.now().minusMonths(1),
            java.time.LocalDate.now()
    );
    if (Double.isNaN(totalInventoryExpenses)) totalInventoryExpenses = 0.0;

    double totalExpenses = totalGeneralExpenses + totalInventoryExpenses;

    double totalPayments = paymentRepository.sumPaymentsBetween(
            java.time.LocalDateTime.now().minusMonths(1),
            java.time.LocalDateTime.now()
    );

    double treatmentRevenue = treatmentRepository.sumTreatmentsBetween(
            java.time.LocalDateTime.now().minusMonths(1),
            java.time.LocalDateTime.now()
    );

    return new FinanceSummaryDTO(totalExpenses, totalPayments, totalInventoryExpenses, treatmentRevenue);
}

}
