package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.PaymentRequest;
import com.cabinetplus.backend.dto.PaymentResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Payment;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.repositories.PaymentRepository;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final AuditService auditService;
    private final PatientRepository patientRepository;
    private final PaymentRepository paymentRepository;

    @PostMapping("/payments")
    public ResponseEntity<PaymentResponse> create(@Valid @RequestBody PaymentRequest request) {
        PaymentResponse created = paymentService.create(request);
        Patient patient = patientRepository.findById(request.patientId()).orElse(null);
        auditService.logSuccess(
                AuditEventType.PAYMENT_CREATE,
                "PAYMENT",
                String.valueOf(created.id()),
                patient != null
                        ? "Paiement ajoute pour " + formatPatientName(patient)
                        : "Paiement ajoute pour le patient #" + request.patientId()
        );
        return ResponseEntity
                .created(URI.create("/api/payments/" + created.id()))
                .body(created);
    }

    @GetMapping("/patients/{patientId}/payments")
    public ResponseEntity<List<Payment>> listByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(paymentService.listByPatient(patientId));
    }

    @DeleteMapping("/payments/{paymentId}")
    public ResponseEntity<Void> delete(@PathVariable Long paymentId) {
        Payment existing = paymentRepository.findById(paymentId).orElse(null);
        paymentService.delete(paymentId);
        auditService.logSuccess(
                AuditEventType.PAYMENT_DELETE,
                "PAYMENT",
                String.valueOf(paymentId),
                existing != null && existing.getPatient() != null
                        ? "Paiement supprime pour " + formatPatientName(existing.getPatient())
                        : "Paiement supprime: #" + paymentId
        );
        return ResponseEntity.noContent().build();
    }

    private String formatPatientName(Patient patient) {
        String first = patient.getFirstname() != null ? patient.getFirstname().trim() : "";
        String last = patient.getLastname() != null ? patient.getLastname().trim() : "";
        String fullName = (first + " " + last).trim();
        return fullName.isEmpty() ? "patient inconnu" : fullName;
    }
}
