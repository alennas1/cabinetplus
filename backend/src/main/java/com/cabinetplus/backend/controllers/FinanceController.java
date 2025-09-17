package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.FinanceOverviewDTO;
import com.cabinetplus.backend.dto.IncomeDTO;
import com.cabinetplus.backend.dto.ExpenseDTO;
import com.cabinetplus.backend.dto.OutstandingPaymentDTO;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.FinanceService;
import com.cabinetplus.backend.services.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/finances")
@RequiredArgsConstructor
public class FinanceController {

    private final FinanceService financeService;
    private final UserService userService;

    @GetMapping("/over")
    public ResponseEntity<FinanceOverviewDTO> getOverview(
            Principal principal,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate) {

        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        FinanceOverviewDTO overview = financeService.getFinanceOverview(dentist, startDate, endDate);
        return ResponseEntity.ok(overview);
    }

    @GetMapping("/income")
    public ResponseEntity<List<IncomeDTO>> getIncome(
            Principal principal,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate) {

        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<IncomeDTO> income = financeService.getIncome(dentist, startDate, endDate);
        return ResponseEntity.ok(income);
    }

    @GetMapping("/expenses")
    public ResponseEntity<List<ExpenseDTO>> getExpenses(
            Principal principal,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate) {

        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<ExpenseDTO> expenses = financeService.getExpenses(dentist, startDate, endDate);
        return ResponseEntity.ok(expenses);
    }

    @GetMapping("/outstanding")
    public ResponseEntity<List<OutstandingPaymentDTO>> getOutstandingPayments(
            Principal principal) {

        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<OutstandingPaymentDTO> outstanding = financeService.getOutstandingPayments(dentist);
        return ResponseEntity.ok(outstanding);
    }
}
