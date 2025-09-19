package com.cabinetplus.backend.services;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.FinanceCardsResponseDTO;
import com.cabinetplus.backend.dto.FinanceCardsResponseDTO.ValueComparisonDTO;
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

    // ==============================
    // ===== GRAPH DATA ============
    // ==============================
  public FinanceGraphResponseDTO getFinanceGraph(User dentist, String timeframe) {
    Map<String, Double> revenueAmounts = new LinkedHashMap<>();
    Map<String, Double> netAmounts = new LinkedHashMap<>();
    Map<String, Double> expenseAmounts = new LinkedHashMap<>();
    Map<String, Double> inventaireAmounts = new LinkedHashMap<>();

    Map<String, String> revenueTypes;
    Map<String, String> expenseTypes;

    LocalDate today = LocalDate.now();

    switch (timeframe.toLowerCase()) {
        case "daily":
            for (int i = 6; i >= 0; i--) {
                LocalDate date = today.minusDays(i);
                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.atTime(23, 59, 59);

                double income = paymentRepository.sumAmountByDentist(dentist, start, end).orElse(0.0);
                double totalInventaire = itemRepository.sumPriceByDentist(dentist, start, end).orElse(0.0);
                double totalOtherExpenses = expenseRepository.sumAmountByDentist(dentist, start.toLocalDate(), end.toLocalDate()).orElse(0.0);
                double netRevenue = income - (totalOtherExpenses + totalInventaire);

                String dayName = date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);

                revenueAmounts.put(dayName, income);
                netAmounts.put(dayName, netRevenue);

                expenseAmounts.put(dayName, totalOtherExpenses); // only non-inventaire expenses
                inventaireAmounts.put(dayName, totalInventaire); // separate
            }
            break;

        case "monthly":
            for (int i = 5; i >= 0; i--) {
                LocalDate date = today.minusMonths(i);
                LocalDateTime start = date.withDayOfMonth(1).atStartOfDay();
                LocalDateTime end = date.withDayOfMonth(date.lengthOfMonth()).atTime(23, 59, 59);

                double income = paymentRepository.sumAmountByDentist(dentist, start, end).orElse(0.0);
                double totalInventaire = itemRepository.sumPriceByDentist(dentist, start, end).orElse(0.0);
                double totalOtherExpenses = expenseRepository.sumAmountByDentist(dentist, start.toLocalDate(), end.toLocalDate()).orElse(0.0);
                double netRevenue = income - (totalOtherExpenses + totalInventaire);

                String monthName = date.getMonth().toString();

                revenueAmounts.put(monthName, income);
                netAmounts.put(monthName, netRevenue);

                expenseAmounts.put(monthName, totalOtherExpenses);
                inventaireAmounts.put(monthName, totalInventaire);
            }
            break;

        case "yearly":
            for (int i = 5; i >= 0; i--) {
                LocalDate date = today.minusYears(i);
                LocalDateTime start = date.withDayOfYear(1).atStartOfDay();
                LocalDateTime end = date.withDayOfYear(date.lengthOfYear()).atTime(23, 59, 59);

                double income = paymentRepository.sumAmountByDentist(dentist, start, end).orElse(0.0);
                double totalInventaire = itemRepository.sumPriceByDentist(dentist, start, end).orElse(0.0);
                double totalOtherExpenses = expenseRepository.sumAmountByDentist(dentist, start.toLocalDate(), end.toLocalDate()).orElse(0.0);
                double netRevenue = income - (totalOtherExpenses + totalInventaire);

                String yearName = String.valueOf(date.getYear());

                revenueAmounts.put(yearName, income);
                netAmounts.put(yearName, netRevenue);

                expenseAmounts.put(yearName, totalOtherExpenses);
                inventaireAmounts.put(yearName, totalInventaire);
            }
            break;

        default:
            throw new IllegalArgumentException("Invalid timeframe: " + timeframe);
    }

    revenueTypes = computeRevenueTypes(dentist, timeframe);
    expenseTypes = computeExpenseTypes(dentist, timeframe);

    return new FinanceGraphResponseDTO(
            new FinanceGraphResponseDTO.SectionDTO(revenueAmounts, netAmounts, revenueTypes),
            new FinanceGraphResponseDTO.SectionDTO(expenseAmounts, inventaireAmounts, expenseTypes)
    );
}

    // ==============================
    // ===== CARDS DATA ============
    // ==============================
   public FinanceCardsResponseDTO getFinanceCards(User dentist, String timeframe,
                                               LocalDate startDate, LocalDate endDate) {

    LocalDateTime start;
    LocalDateTime end;
    LocalDateTime prevStart;
    LocalDateTime prevEnd;

    LocalDate today = LocalDate.now();

    switch (timeframe.toLowerCase()) {
        case "today":
            start = today.atStartOfDay();
            end = today.atTime(23, 59, 59);

            // previous = yesterday
            prevStart = today.minusDays(1).atStartOfDay();
            prevEnd = today.minusDays(1).atTime(23, 59, 59);
            break;

        case "yesterday":
            LocalDate yesterday = today.minusDays(1);
            start = yesterday.atStartOfDay();
            end = yesterday.atTime(23, 59, 59);

            // previous = day before yesterday
            prevStart = yesterday.minusDays(1).atStartOfDay();
            prevEnd = yesterday.minusDays(1).atTime(23, 59, 59);
            break;

        case "custom":
            if (startDate == null || endDate == null) {
                throw new IllegalArgumentException("Custom timeframe requires startDate and endDate");
            }
            start = startDate.atStartOfDay();
            end = endDate.atTime(23, 59, 59);

            // previous = same length immediately before custom range
            long days = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + 1;
            prevStart = start.minusDays(days);
            prevEnd = end.minusDays(days);
            break;

        default:
            throw new IllegalArgumentException("Invalid timeframe: " + timeframe);
    }

    // ==== Revenue (current) ====
    double revenueduCurr = treatmentRepository.sumPriceByDentist(dentist, start, end).orElse(0.0);
    double revenueCurr   = paymentRepository.sumAmountByDentist(dentist, start, end).orElse(0.0);
    double enattenteCurr = revenueduCurr - revenueCurr;
    double revenuenetCurr = revenueCurr - getTotalExpenses(dentist, start, end);

    // ==== Revenue (previous) ====
    double revenueduPrev = treatmentRepository.sumPriceByDentist(dentist, prevStart, prevEnd).orElse(0.0);
    double revenuePrev   = paymentRepository.sumAmountByDentist(dentist, prevStart, prevEnd).orElse(0.0);
    double enattentePrev = revenueduPrev - revenuePrev;
    double revenuenetPrev = revenuePrev - getTotalExpenses(dentist, prevStart, prevEnd);

   FinanceCardsResponseDTO.RevenueDTO revenueDTO =
        new FinanceCardsResponseDTO.RevenueDTO(
                toValueComparison(revenueduCurr, revenueduPrev),
                toValueComparison(revenueCurr, revenuePrev),
                toValueComparison(revenuenetCurr, revenuenetPrev),
                toValueComparison(enattenteCurr, enattentePrev)
        );



    // ==== Expenses (current) ====
    double totalItemExpensesCurr = itemRepository.sumPriceByDentist(dentist, start, end).orElse(0.0);
    double totalOtherExpensesCurr = expenseRepository.sumAmountByDentist(dentist,
            start.toLocalDate(), end.toLocalDate()).orElse(0.0);
    double totalExpensesCurr = totalItemExpensesCurr + totalOtherExpensesCurr;

    // ==== Expenses (previous) ====
    double totalItemExpensesPrev = itemRepository.sumPriceByDentist(dentist, prevStart, prevEnd).orElse(0.0);
    double totalOtherExpensesPrev = expenseRepository.sumAmountByDentist(dentist,
            prevStart.toLocalDate(), prevEnd.toLocalDate()).orElse(0.0);
    double totalExpensesPrev = totalItemExpensesPrev + totalOtherExpensesPrev;

    FinanceCardsResponseDTO.ExpenseDTO expenseDTO =
        new FinanceCardsResponseDTO.ExpenseDTO(
                toValueComparison(totalExpensesCurr, totalExpensesPrev),
                toValueComparison(totalOtherExpensesCurr, totalOtherExpensesPrev),
                toValueComparison(totalItemExpensesCurr, totalItemExpensesPrev)
        );

    return new FinanceCardsResponseDTO(revenueDTO, expenseDTO);
}

    // Helper: wrap current/previous into ValueComparisonDTO
    private ValueComparisonDTO toValueComparison(double current, double previous) {
        return new ValueComparisonDTO(current, previous);
    }

    // ==============================
    // ===== HELPERS ===============
    // ==============================
    private double getTotalExpenses(User dentist, LocalDateTime start, LocalDateTime end) {
        double totalItemExpenses = itemRepository.sumPriceByDentist(dentist, start, end).orElse(0.0);
        double totalOtherExpenses = expenseRepository.sumAmountByDentist(dentist, start.toLocalDate(), end.toLocalDate()).orElse(0.0);
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
                        e -> total == 0 ? "0%" : String.format("%.2f%%", (e.getValue() / total) * 100)
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

        // Other expenses
        List<Expense> expenses = expenseRepository.findByCreatedByAndDateBetween(
                dentist, start.toLocalDate(), end.toLocalDate()
        );
        expenses.forEach(exp -> totals.merge(exp.getCategory().name(), exp.getAmount(), Double::sum));

        double total = totals.values().stream().mapToDouble(Double::doubleValue).sum();

        return totals.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> total == 0 ? "0%" : String.format("%.2f%%", (e.getValue() / total) * 100)
                ));
    }
}
