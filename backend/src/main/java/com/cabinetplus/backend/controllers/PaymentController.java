package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.PaymentRequest;
import com.cabinetplus.backend.dto.PaymentResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Payment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.repositories.PaymentRepository;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.PaymentService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final AuditService auditService;
    private final PatientRepository patientRepository;
    private final PaymentRepository paymentRepository;
    private final UserService userService;
    private final PublicIdResolutionService publicIdResolutionService;

    @PostMapping("/payments")
    public ResponseEntity<PaymentResponse> create(@Valid @RequestBody PaymentRequest request, Principal principal) {
        User actor = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        PaymentResponse created = paymentService.create(request, actor);
        Patient patient = patientRepository.findById(request.patientId()).orElse(null);
        auditService.logSuccess(
                AuditEventType.PAYMENT_CREATE,
                "PATIENT",
                String.valueOf(request.patientId()),
                patient != null
                        ? "Paiement ajoute pour " + formatPatientName(patient)
                        : "Paiement ajoute pour le patient #" + request.patientId()
        );
        return ResponseEntity
                .created(URI.create("/api/payments/" + created.id()))
                .body(created);
    }

    @GetMapping("/patients/{patientId}/payments")
    public ResponseEntity<List<Payment>> listByPatient(@PathVariable String patientId, Principal principal) {
        User actor = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        User ownerDentist = userService.resolveClinicOwner(actor);
        Long internalPatientId = publicIdResolutionService.requirePatientOwnedBy(patientId, ownerDentist).getId();
        return ResponseEntity.ok(paymentService.listByPatient(internalPatientId, actor));
    }

    @DeleteMapping("/payments/{paymentId}")
    public ResponseEntity<Void> delete(@PathVariable Long paymentId, Principal principal) {
        User actor = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        Payment existing = paymentRepository.findById(paymentId).orElse(null);
        paymentService.delete(paymentId, actor);
        auditService.logSuccess(
                AuditEventType.PAYMENT_DELETE,
                "PATIENT",
                existing != null && existing.getPatient() != null
                        ? String.valueOf(existing.getPatient().getId())
                        : null,
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

    private User getClinicUser(Principal principal) {
        User currentUser = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(currentUser);
    }
}
