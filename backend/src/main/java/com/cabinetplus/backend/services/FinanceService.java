package com.cabinetplus.backend.services;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.FinanceCardsResponseDTO;
import com.cabinetplus.backend.dto.FinanceGraphResponseDTO;
import com.cabinetplus.backend.models.Expense;
import com.cabinetplus.backend.models.Item;
import com.cabinetplus.backend.models.Treatment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.ExpenseRepository;
import com.cabinetplus.backend.repositories.ItemRepository;
import com.cabinetplus.backend.repositories.PaymentRepository;
import com.cabinetplus.backend.repositories.TreatmentRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FinanceService {

    private final TreatmentRepository treatmentRepository;
    private final PaymentRepository paymentRepository;
    private final ItemRepository itemRepository;
    private final ExpenseRepository expenseRepository;

    // ======================================
    // ========== GRAPH DATA ================
    // ======================================
    public FinanceGraphResponseDTO getFinanceGraph(User dentist, String timeframe) {
        Map<String, Double> revenueAmounts = new LinkedHashMap<>();
        Map<String, Double> expenseAmounts = new LinkedHashMap<>();

        Map<String, String> revenueTypes;
        Map<String, String> expenseTypes;

        LocalDate today = LocalDate.now();

        switch (timeframe.toLowerCase()) {
            case "daily":
                // last 7 days
                for (int i = 6; i >= 0; i--) {
                    LocalDate date = today.minusDays(i);
                    LocalDateTime start = date.atStartOfDay();
                    LocalDateTime end = date.atTime(23, 59, 59);

                    double income = paymentRepository.sumAmountByDentist(dentist, start, end).orElse(0.0);
                    double expenses = getTotalExpenses(dentist, start, end);

                    revenueAmounts.put(date.toString(), income);
                    expenseAmounts.put(date.toString(), expenses);
                }
                break;

            case "monthly":
                // last 6 months
                for (int i = 5; i >= 0; i--) {
                    LocalDate date = today.minusMonths(i);
                    LocalDateTime start = date.withDayOfMonth(1).atStartOfDay();
                    LocalDateTime end = date.withDayOfMonth(date.lengthOfMonth()).atTime(23, 59, 59);

                    double income = paymentRepository.sumAmountByDentist(dentist, start, end).orElse(0.0);
                    double expenses = getTotalExpenses(dentist, start, end);

                    revenueAmounts.put(date.getMonth().toString(), income);
                    expenseAmounts.put(date.getMonth().toString(), expenses);
                }
                break;

            case "yearly":
                // last 6 years
                for (int i = 5; i >= 0; i--) {
                    LocalDate date = today.minusYears(i);
                    LocalDateTime start = date.withDayOfYear(1).atStartOfDay();
                    LocalDateTime end = date.withDayOfYear(date.lengthOfYear()).atTime(23, 59, 59);

                    double income = paymentRepository.sumAmountByDentist(dentist, start, end).orElse(0.0);
                    double expenses = getTotalExpenses(dentist, start, end);

                    revenueAmounts.put(String.valueOf(date.getYear()), income);
                    expenseAmounts.put(String.valueOf(date.getYear()), expenses);
                }
                break;

            default:
                throw new IllegalArgumentException("Invalid timeframe: " + timeframe);
        }

        // 🔹 Compute revenue type breakdown
        revenueTypes = computeRevenueTypes(dentist, timeframe);

        // 🔹 Compute expense type breakdown
        expenseTypes = computeExpenseTypes(dentist, timeframe);

        return new FinanceGraphResponseDTO(
                new FinanceGraphResponseDTO.SectionDTO(revenueAmounts, revenueTypes),
                new FinanceGraphResponseDTO.SectionDTO(expenseAmounts, expenseTypes)
        );
    }

    // ======================================
    // ========== CARDS DATA ================
    // ======================================
    public FinanceCardsResponseDTO getFinanceCards(User dentist, String timeframe,
                                                   LocalDate startDate, LocalDate endDate) {
        LocalDateTime start;
        LocalDateTime end;

        LocalDate today = LocalDate.now();

        switch (timeframe.toLowerCase()) {
            case "today":
                start = today.atStartOfDay();
                end = today.atTime(23, 59, 59);
                break;

            case "yesterday":
                LocalDate yesterday = today.minusDays(1);
                start = yesterday.atStartOfDay();
                end = yesterday.atTime(23, 59, 59);
                break;

            case "custom":
                if (startDate == null || endDate == null) {
                    throw new IllegalArgumentException("Custom timeframe requires startDate and endDate");
                }
                start = startDate.atStartOfDay();
                end = endDate.atTime(23, 59, 59);
                break;

            default:
                throw new IllegalArgumentException("Invalid timeframe: " + timeframe);
        }

        // Revenue
        double revenuedu = treatmentRepository.sumPriceByDentist(dentist, start, end).orElse(0.0);
        double revenue = paymentRepository.sumAmountByDentist(dentist, start, end).orElse(0.0);
        double enattente = revenuedu - revenue;
        double revenuenet = revenue - getTotalExpenses(dentist, start, end);

        FinanceCardsResponseDTO.RevenueDTO revenueDTO =
                new FinanceCardsResponseDTO.RevenueDTO(revenuedu, revenue, revenuenet, enattente);

        // Expenses
        double totalItemExpenses = itemRepository.sumPriceByDentist(dentist, start, end).orElse(0.0);
        double totalOtherExpenses = expenseRepository.sumAmountByDentist(dentist,
                start.toLocalDate(), end.toLocalDate()).orElse(0.0);
        double totalExpenses = totalItemExpenses + totalOtherExpenses;

        FinanceCardsResponseDTO.ExpenseDTO expenseDTO =
                new FinanceCardsResponseDTO.ExpenseDTO(totalExpenses, totalOtherExpenses, totalItemExpenses);

        return new FinanceCardsResponseDTO(revenueDTO, expenseDTO);
    }

    // ======================================
    // ========== Helpers ===================
    // ======================================
    private double getTotalExpenses(User dentist, LocalDateTime start, LocalDateTime end) {
        double totalItemExpenses = itemRepository.sumPriceByDentist(dentist, start, end).orElse(0.0);
        double totalOtherExpenses = expenseRepository.sumAmountByDentist(
                dentist, start.toLocalDate(), end.toLocalDate()).orElse(0.0);
        return totalItemExpenses + totalOtherExpenses;
    }

    private Map<String, String> computeRevenueTypes(User dentist, String timeframe) {
        LocalDateTime start;
        LocalDateTime end;
        LocalDate today = LocalDate.now();

        switch (timeframe.toLowerCase()) {
            case "daily":
                start = today.minusDays(6).atStartOfDay();
                end = today.atTime(23, 59, 59);
                break;
            case "monthly":
                start = today.minusMonths(5).withDayOfMonth(1).atStartOfDay();
                end = today.withDayOfMonth(today.lengthOfMonth()).atTime(23, 59, 59);
                break;
            case "yearly":
                start = today.minusYears(5).withDayOfYear(1).atStartOfDay();
                end = today.withDayOfYear(today.lengthOfYear()).atTime(23, 59, 59);
                break;
            default:
                throw new IllegalArgumentException("Invalid timeframe: " + timeframe);
        }

        List<Treatment> treatments = treatmentRepository.findByDentistAndDateBetween(dentist, start, end);

        Map<String, Double> totalsByCatalog = treatments.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getTreatmentCatalog().getName(),
                        Collectors.summingDouble(Treatment::getPrice)
                ));

        double total = totalsByCatalog.values().stream().mapToDouble(Double::doubleValue).sum();

        return totalsByCatalog.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> String.format("%.2f%%", (e.getValue() / total) * 100)
                ));
    }

    private Map<String, String> computeExpenseTypes(User dentist, String timeframe) {
        LocalDateTime start;
        LocalDateTime end;
        LocalDate today = LocalDate.now();

        switch (timeframe.toLowerCase()) {
            case "daily":
                start = today.minusDays(6).atStartOfDay();
                end = today.atTime(23, 59, 59);
                break;
            case "monthly":
                start = today.minusMonths(5).withDayOfMonth(1).atStartOfDay();
                end = today.withDayOfMonth(today.lengthOfMonth()).atTime(23, 59, 59);
                break;
            case "yearly":
                start = today.minusYears(5).withDayOfYear(1).atStartOfDay();
                end = today.withDayOfYear(today.lengthOfYear()).atTime(23, 59, 59);
                break;
            default:
                throw new IllegalArgumentException("Invalid timeframe: " + timeframe);
        }

        Map<String, Double> totals = new HashMap<>();

        // Items = Inventaire
        List<Item> items = itemRepository.findByCreatedByAndCreatedAtBetween(dentist, start, end);
        double totalItems = items.stream().mapToDouble(Item::getPrice).sum();
        totals.put("Inventaire", totalItems);

        // Other expenses = ExpenseCategory
        List<Expense> expenses = expenseRepository.findByCreatedByAndDateBetween(dentist, start.toLocalDate(), end.toLocalDate());
        expenses.forEach(exp -> totals.merge(exp.getCategory().name(), exp.getAmount(), Double::sum));

        double total = totals.values().stream().mapToDouble(Double::doubleValue).sum();

        return totals.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> String.format("%.2f%%", (e.getValue() / total) * 100)
                ));
    }
}
