package com.cabinetplus.backend.services;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.*;
import com.cabinetplus.backend.models.*;
import com.cabinetplus.backend.repositories.*;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FinanceService {

    private final TreatmentRepository treatmentRepository;
    private final PaymentRepository paymentRepository;
    private final ItemRepository itemRepository;
    private final ExpenseRepository expenseRepository;

    // ========== Overview ==========
    public FinanceOverviewDTO getFinanceOverview(User dentist, LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate != null ? startDate.atStartOfDay() : LocalDateTime.of(2000,1,1,0,0);
        LocalDateTime end   = endDate != null ? endDate.atTime(23,59,59) : LocalDateTime.now();

        // Income
        double totalIncomeDue = treatmentRepository.sumPriceByDentist(dentist, start, end).orElse(0.0);
        double totalIncomeReceived = paymentRepository.sumAmountByDentist(dentist, start, end).orElse(0.0);
        double outstandingPayments = totalIncomeDue - totalIncomeReceived;

        // Expenses
        double totalItemExpenses = itemRepository.sumPriceByDentist(dentist, start, end).orElse(0.0);
        double totalOtherExpenses = expenseRepository.sumAmountByDentist(
                dentist, 
                startDate != null ? startDate : LocalDate.of(2000,1,1), 
                endDate != null ? endDate : LocalDate.now()
        ).orElse(0.0);
        double totalExpenses = totalItemExpenses + totalOtherExpenses;

        double netProfit = totalIncomeReceived - totalExpenses;

        return new FinanceOverviewDTO(totalIncomeDue, totalIncomeReceived, totalExpenses, netProfit, outstandingPayments);
    }

    // ========== Income ==========
    public List<IncomeDTO> getIncome(User dentist, LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate != null ? startDate.atStartOfDay() : LocalDateTime.of(2000,1,1,0,0);
        LocalDateTime end   = endDate != null ? endDate.atTime(23,59,59) : LocalDateTime.now();

        List<Treatment> treatments = treatmentRepository.findByDentistAndDateBetween(dentist, start, end);

        return treatments.stream().map(t -> {
            double paid = paymentRepository.sumByPatientAndTreatment(t.getPatient().getId(), t.getId()).orElse(0.0);
            double outstanding = t.getPrice() - paid;

            return new IncomeDTO(
                    t.getId(),
                    t.getPatient().getFirstname() + " " + t.getPatient().getLastname(),
                    t.getTreatmentCatalog().getName(),
                    t.getDate(),
                    t.getPrice(),
                    paid,
                    outstanding
            );
        }).collect(Collectors.toList());
    }

    // ========== Expenses ==========
    public List<ExpenseDTO> getExpenses(User dentist, LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate != null ? startDate.atStartOfDay() : LocalDateTime.of(2000,1,1,0,0);
        LocalDateTime end   = endDate != null ? endDate.atTime(23,59,59) : LocalDateTime.now();

        List<ExpenseDTO> expenseDTOs = new ArrayList<>();

        // Items
        List<Item> items = itemRepository.findByCreatedByAndCreatedAtBetween(dentist, start, end);
        items.forEach(item -> expenseDTOs.add(new ExpenseDTO(
                item.getId(),
                "Item",
                item.getItemDefault().getName(),
                item.getPrice(),
                item.getCreatedAt(),
                item.getCreatedBy().getFirstname() + " " + item.getCreatedBy().getLastname()
        )));

        // Expenses
        List<Expense> expenses = expenseRepository.findByCreatedByAndDateBetween(
                dentist,
                startDate != null ? startDate : LocalDate.of(2000,1,1),
                endDate != null ? endDate : LocalDate.now()
        );

        expenses.forEach(exp -> expenseDTOs.add(new ExpenseDTO(
                exp.getId(),
                "Expense",
                exp.getTitle(),
                exp.getAmount(),
                exp.getDate() != null ? exp.getDate().atStartOfDay() : start,
                exp.getCreatedBy().getFirstname() + " " + exp.getCreatedBy().getLastname()
        )));

        return expenseDTOs;
    }

    // ========== Outstanding Payments ==========
    public List<OutstandingPaymentDTO> getOutstandingPayments(User dentist) {
        List<Treatment> treatments = treatmentRepository.findByPractitioner(dentist);

        Map<Long, OutstandingPaymentDTO> map = new HashMap<>();
        for (Treatment t : treatments) {
            double paid = paymentRepository.sumByPatientAndTreatment(t.getPatient().getId(), t.getId()).orElse(0.0);
            double outstanding = t.getPrice() - paid;

            if (outstanding > 0) {
                map.compute(t.getPatient().getId(), (k, v) -> {
                    if (v == null) {
                        return new OutstandingPaymentDTO(
                                t.getPatient().getId(),
                                t.getPatient().getFirstname() + " " + t.getPatient().getLastname(),
                                t.getPrice(),
                                paid,
                                outstanding
                        );
                    } else {
                        v.setTotalDue(v.getTotalDue() + t.getPrice());
                        v.setTotalPaid(v.getTotalPaid() + paid);
                        v.setOutstanding(v.getOutstanding() + outstanding);
                        return v;
                    }
                });
            }
        }
        return new ArrayList<>(map.values());
    }
}
