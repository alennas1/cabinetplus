package com.cabinetplus.backend.services;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.FinancialSummaryResponse;
import com.cabinetplus.backend.repositories.InvoiceRepository;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.repositories.PaymentRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FinancialService {

    private final PatientRepository patientRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;

    public FinancialSummaryResponse getPatientSummary(Long patientId) {
        // Ensure patient exists (also good place for auth checks)
        patientRepository.findById(patientId)
                .orElseThrow(() -> new IllegalArgumentException("Patient not found: " + patientId));

        Double totalInvoiced = invoiceRepository.sumTotalsByPatientId(patientId);
        Double totalPaid = paymentRepository.sumByPatientId(patientId);
        Double balance = (totalInvoiced != null ? totalInvoiced : 0d) - (totalPaid != null ? totalPaid : 0d);

        return new FinancialSummaryResponse(patientId, totalInvoiced, totalPaid, balance);
    }
}
