package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.HandPaymentDTO;
import com.cabinetplus.backend.dto.HandPaymentResponseDTO;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.BillingCycle;
import com.cabinetplus.backend.models.HandPayment;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PlanRepository;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.HandPaymentService;
import com.cabinetplus.backend.services.PublicIdResolutionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/hand-payments")
@RequiredArgsConstructor
public class HandPaymentController {

    private final HandPaymentService handPaymentService;
    private final UserRepository userRepository;
    private final PlanRepository planRepository;
    private final AuditService auditService;
    private final PublicIdResolutionService publicIdResolutionService;

    /**
     * Get all pending hand payments
     */

    @GetMapping("/all")
public ResponseEntity<List<HandPaymentResponseDTO>> getAllPayments() {
    return ResponseEntity.ok(handPaymentService.getAllPayments());
}

    @GetMapping("/pending")
    public ResponseEntity<List<HandPaymentResponseDTO>> getPendingPayments() {
    return ResponseEntity.ok(handPaymentService.getAllPendingPayments());
}

@GetMapping("/user/{userId}")
public ResponseEntity<List<HandPaymentResponseDTO>> getPaymentsByUserId(@PathVariable String userId) {
    User user = publicIdResolutionService.requireUserByIdOrPublicId(userId);

    return ResponseEntity.ok(handPaymentService.getPaymentsByUser(user));
}

@GetMapping("/my-payments")
public ResponseEntity<List<HandPaymentResponseDTO>> getMyPayments(Principal principal) {
    User user = userRepository.findByUsername(principal.getName())
            .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

    return ResponseEntity.ok(handPaymentService.getPaymentsByUser(user));
}

    /**
     * Create a new hand payment for the authenticated user
     */
   @PostMapping("/create")
public ResponseEntity<HandPayment> createPayment(@RequestBody HandPaymentDTO dto, Principal principal) {
    User user = userRepository.findByUsername(principal.getName())
            .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

    Plan plan = planRepository.findById(dto.getPlanId())
            .orElseThrow(() -> new RuntimeException("Plan introuvable"));

    HandPayment payment = new HandPayment();
    payment.setUser(user);
    payment.setPlan(plan);
    payment.setAmount(dto.getAmount());
    payment.setNotes(dto.getNotes());

    // IMPORTANT: Map the billing cycle from DTO to Entity
    if (dto.getBillingCycle() != null) {
        try {
            payment.setBillingCycle(BillingCycle.valueOf(dto.getBillingCycle().toUpperCase()));
        } catch (IllegalArgumentException e) {
            // Fallback if string doesn't match Enum
            payment.setBillingCycle(BillingCycle.MONTHLY);
        }
    } else {
        payment.setBillingCycle(BillingCycle.MONTHLY);
    }

    HandPayment savedPayment = handPaymentService.createHandPayment(payment);
    return ResponseEntity.ok(savedPayment);
}

    /**
     * Confirm a pending hand payment
     */
    @PostMapping("/confirm/{id}")
    public ResponseEntity<HandPayment> confirmPayment(@PathVariable Long id, Principal principal) {
        User admin = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        try {
            HandPayment payment = handPaymentService.confirmPayment(id);
            auditService.logSuccessAsUser(admin, AuditEventType.HAND_PAYMENT_CONFIRM, "HAND_PAYMENT", String.valueOf(id), "Paiement confirme");
            return ResponseEntity.ok(payment);
        } catch (RuntimeException ex) {
            auditService.logFailureAsUser(admin, AuditEventType.HAND_PAYMENT_CONFIRM, "HAND_PAYMENT", String.valueOf(id), ex.getMessage());
            throw ex;
        }
    }

    /**
     * Reject a pending hand payment
     */
    @PostMapping("/reject/{id}")
    public ResponseEntity<HandPayment> rejectPayment(@PathVariable Long id, Principal principal) {
        User admin = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        try {
            HandPayment payment = handPaymentService.rejectPayment(id);
            auditService.logSuccessAsUser(admin, AuditEventType.HAND_PAYMENT_REJECT, "HAND_PAYMENT", String.valueOf(id), "Paiement rejete");
            return ResponseEntity.ok(payment);
        } catch (RuntimeException ex) {
            auditService.logFailureAsUser(admin, AuditEventType.HAND_PAYMENT_REJECT, "HAND_PAYMENT", String.valueOf(id), ex.getMessage());
            throw ex;
        }
    }
}
