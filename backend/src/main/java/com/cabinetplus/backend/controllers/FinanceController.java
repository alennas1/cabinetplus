package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.CategoryBreakdownDTO;
import com.cabinetplus.backend.dto.FinanceSummaryDTO;
import com.cabinetplus.backend.dto.MonthlyCashflowDTO;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.FinanceService;
import com.cabinetplus.backend.services.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/finance")
@RequiredArgsConstructor
public class FinanceController {

    private final FinanceService financeService;
    private final UserService userService;

    private User getCurrentUser(Principal principal) {
        return userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    /**
     * Monthly cashflow: revenues, expenses, net for each month of the year
     */
    @GetMapping("/cashflow/monthly")
    public ResponseEntity<List<MonthlyCashflowDTO>> getMonthlyCashflow(Principal principal) {
        User user = getCurrentUser(principal);
        return ResponseEntity.ok(financeService.getMonthlyCashflow(user));
    }

    /**
     * Expense breakdown by category
     */
    @GetMapping("/expenses/breakdown")
    public ResponseEntity<List<CategoryBreakdownDTO>> getExpenseBreakdown(Principal principal) {
        User user = getCurrentUser(principal);
        return ResponseEntity.ok(financeService.getExpenseBreakdown(user));
    }

    /**
     * Finance summary: totals for expenses, payments, stock value, treatment revenue
     */
    @GetMapping("/summary")
    public ResponseEntity<FinanceSummaryDTO> getFinanceSummary(Principal principal) {
        User user = getCurrentUser(principal);
        return ResponseEntity.ok(financeService.getFinanceSummary(user));
    }
}
