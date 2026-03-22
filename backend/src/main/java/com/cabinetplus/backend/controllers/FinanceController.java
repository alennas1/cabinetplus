package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.cabinetplus.backend.dto.FinanceGraphResponseDTO;
import com.cabinetplus.backend.dto.FinanceCardsResponseDTO;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.FinanceService;
import com.cabinetplus.backend.services.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/finance")
@RequiredArgsConstructor
public class FinanceController {

    private final FinanceService financeService;
    private final UserService userService;
    private final AuditService auditService;

    /**
     * Graph data endpoint
     * Example:
     * GET /api/finance/graph?timeframe=daily
     * GET /api/finance/graph?timeframe=monthly
     * GET /api/finance/graph?timeframe=yearly
     *
     * - daily  → last 7 days
     * - monthly → last 6 months
     * - yearly  → last 6 years
     */
    @GetMapping("/graph")
    public ResponseEntity<FinanceGraphResponseDTO> getFinanceGraph(
            Principal principal,
            @RequestParam String timeframe // daily | monthly | yearly
    ) {
        User dentist = getClinicUser(principal);
        auditService.logSuccess(
                AuditEventType.FINANCE_READ,
                "USER",
                dentist != null && dentist.getId() != null ? String.valueOf(dentist.getId()) : null,
                "Finance graph consulte"
        );

        FinanceGraphResponseDTO graphData = financeService.getFinanceGraph(dentist, timeframe);
        return ResponseEntity.ok(graphData);
    }

    /**
     * Cards data endpoint
     * Example:
     * GET /api/finance/cards?timeframe=yesterday
     * GET /api/finance/cards?timeframe=today
     * GET /api/finance/cards?timeframe=custom&startDate=2025-01-01&endDate=2025-01-31
     */
    @GetMapping("/cards")
    public ResponseEntity<FinanceCardsResponseDTO> getFinanceCards(
            Principal principal,
            @RequestParam String timeframe, // yesterday | today | custom
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        User dentist = getClinicUser(principal);
        auditService.logSuccess(
                AuditEventType.FINANCE_READ,
                "USER",
                dentist != null && dentist.getId() != null ? String.valueOf(dentist.getId()) : null,
                "Finance cards consulte"
        );

        FinanceCardsResponseDTO cardsData = financeService.getFinanceCards(dentist, timeframe, startDate, endDate);
        return ResponseEntity.ok(cardsData);
    }

    private User getClinicUser(Principal principal) {
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
    }
}
