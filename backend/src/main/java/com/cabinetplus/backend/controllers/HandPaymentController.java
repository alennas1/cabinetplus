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
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.HandPayment;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PlanRepository;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.HandPaymentService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.util.PhoneNumberUtil;
import com.cabinetplus.backend.exceptions.BadRequestException;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;

@RestController
@RequestMapping("/api/hand-payments")
@RequiredArgsConstructor
public class HandPaymentController {

    private final HandPaymentService handPaymentService;
    private final UserRepository userRepository;
    private final PlanRepository planRepository;
    private final AuditService auditService;
    private final PublicIdResolutionService publicIdResolutionService;
    private final PasswordEncoder passwordEncoder;

    /**
     * Get all pending hand payments
     */

    @GetMapping("/all")
public ResponseEntity<List<HandPaymentResponseDTO>> getAllPayments(Principal principal) {
    User admin = requireUser(principal);
    if (admin.getRole() != UserRole.ADMIN) {
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Acces refuse");
    }
    auditService.logSuccessAsUser(admin, AuditEventType.HAND_PAYMENT_READ, "HAND_PAYMENT", null, "Paiements manuels consultes (tous)");
    return ResponseEntity.ok(handPaymentService.getAllPayments());
}

    @GetMapping("/pending")
    public ResponseEntity<List<HandPaymentResponseDTO>> getPendingPayments(Principal principal) {
    User admin = requireUser(principal);
    if (admin.getRole() != UserRole.ADMIN) {
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Acces refuse");
    }
    auditService.logSuccessAsUser(admin, AuditEventType.HAND_PAYMENT_READ, "HAND_PAYMENT", null, "Paiements manuels consultes (en attente)");
    return ResponseEntity.ok(handPaymentService.getAllPendingPayments());
}

@GetMapping("/user/{userId}")
public ResponseEntity<List<HandPaymentResponseDTO>> getPaymentsByUserId(@PathVariable String userId, Principal principal) {
    User admin = requireUser(principal);
    if (admin.getRole() != UserRole.ADMIN) {
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Acces refuse");
    }
    User user = publicIdResolutionService.requireUserByIdOrPublicId(userId);
    auditService.logSuccessAsUser(admin, AuditEventType.HAND_PAYMENT_READ, "USER", user != null && user.getId() != null ? String.valueOf(user.getId()) : null, "Paiements manuels utilisateur consultes");

    return ResponseEntity.ok(handPaymentService.getPaymentsByUser(user));
}

@GetMapping("/my-payments")
public ResponseEntity<List<HandPaymentResponseDTO>> getMyPayments(Principal principal) {
    User user = requireUser(principal);
    auditService.logSuccessAsUser(user, AuditEventType.HAND_PAYMENT_READ, "USER", user.getId() != null ? String.valueOf(user.getId()) : null, "Mes paiements manuels consultes");

    return ResponseEntity.ok(handPaymentService.getPaymentsByUser(user));
}

    /**
     * Create a new hand payment for the authenticated user
     */
    @PostMapping("/create")
 public ResponseEntity<HandPayment> createPayment(@Valid @RequestBody HandPaymentDTO dto, Principal principal) {
     User user = requireUser(principal);

     if (!passwordEncoder.matches(dto.getPassword(), user.getPasswordHash())) {
         throw new BadRequestException(java.util.Map.of("password", "Mot de passe incorrect"));
     }
 
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
    auditService.logSuccessAsUser(
            user,
            AuditEventType.HAND_PAYMENT_CREATE,
            "USER",
            user.getId() != null ? String.valueOf(user.getId()) : null,
            "Paiement manuel cree"
    );
    return ResponseEntity.ok(savedPayment);
}

    /**
     * Confirm a pending hand payment
     */
    @PostMapping("/confirm/{id}")
    public ResponseEntity<HandPayment> confirmPayment(@PathVariable Long id, Principal principal) {
        User admin = requireUser(principal);
        if (admin.getRole() != UserRole.ADMIN) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Acces refuse");
        }
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
        User admin = requireUser(principal);
        if (admin.getRole() != UserRole.ADMIN) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Acces refuse");
        }
        try {
            HandPayment payment = handPaymentService.rejectPayment(id);
            auditService.logSuccessAsUser(admin, AuditEventType.HAND_PAYMENT_REJECT, "HAND_PAYMENT", String.valueOf(id), "Paiement rejete");
            return ResponseEntity.ok(payment);
        } catch (RuntimeException ex) {
            auditService.logFailureAsUser(admin, AuditEventType.HAND_PAYMENT_REJECT, "HAND_PAYMENT", String.valueOf(id), ex.getMessage());
            throw ex;
        }
    }

    private User requireUser(Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            throw new RuntimeException("Utilisateur introuvable");
        }
        var candidates = PhoneNumberUtil.algeriaStoredCandidates(principal.getName());
        if (candidates.isEmpty()) {
            throw new RuntimeException("Utilisateur introuvable");
        }
        return userRepository.findFirstByPhoneNumberInOrderByIdAsc(candidates)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
    }
}
