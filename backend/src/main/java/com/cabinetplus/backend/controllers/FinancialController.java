package com.cabinetplus.backend.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.FinancialSummaryResponse;
import com.cabinetplus.backend.services.FinancialService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FinancialController {

    private final FinancialService financialService;

    @GetMapping("/patients/{patientId}/financials")
    public ResponseEntity<FinancialSummaryResponse> summary(@PathVariable Long patientId) {
        return ResponseEntity.ok(financialService.getPatientSummary(patientId));
    }
}
