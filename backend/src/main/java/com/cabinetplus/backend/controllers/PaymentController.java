package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.PaymentRequest;
import com.cabinetplus.backend.dto.PaymentResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.models.Payment;
import com.cabinetplus.backend.models.User;
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
    private final PaymentRepository paymentRepository;
    private final UserService userService;
    private final PublicIdResolutionService publicIdResolutionService;

    @PostMapping("/payments")
    public ResponseEntity<PaymentResponse> create(@Valid @RequestBody PaymentRequest request, Principal principal) {
        User actor = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        PaymentResponse created = paymentService.create(request, actor);
        auditService.logSuccess(
                AuditEventType.PAYMENT_CREATE,
                "PATIENT",
                String.valueOf(request.patientId()),
                "Paiement ajoute"
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
                existing != null
                        ? "Paiement supprime"
                        : "Paiement supprime: #" + paymentId
        );
        return ResponseEntity.noContent().build();
    }

    private User getClinicUser(Principal principal) {
        User currentUser = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(currentUser);
    }
}
