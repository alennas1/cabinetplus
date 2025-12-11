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
import com.cabinetplus.backend.models.HandPayment;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PlanRepository;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.services.HandPaymentService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/hand-payments")
@RequiredArgsConstructor
public class HandPaymentController {

    private final HandPaymentService handPaymentService;
    private final UserRepository userRepository;
    private final PlanRepository planRepository;

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

@GetMapping("/my-payments")
public ResponseEntity<List<HandPaymentResponseDTO>> getMyPayments(Principal principal) {
    User user = userRepository.findByUsername(principal.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));

    return ResponseEntity.ok(handPaymentService.getPaymentsByUser(user));
}

    /**
     * Create a new hand payment for the authenticated user
     */
    @PostMapping("/create")
    public ResponseEntity<HandPayment> createPayment(@RequestBody HandPaymentDTO dto, Principal principal) {
        // Get the logged-in user
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Load the plan from DB
        Plan plan = planRepository.findById(dto.getPlanId())
                .orElseThrow(() -> new RuntimeException("Plan not found"));

        // Create hand payment and set all fields
        HandPayment payment = new HandPayment();
        payment.setUser(user);
        payment.setPlan(plan);
        payment.setAmount(dto.getAmount());
        payment.setNotes(dto.getNotes());

        // Delegate to service to save and return
        HandPayment savedPayment = handPaymentService.createHandPayment(payment);
        return ResponseEntity.ok(savedPayment);
    }

    /**
     * Confirm a pending hand payment
     */
    @PostMapping("/confirm/{id}")
    public ResponseEntity<HandPayment> confirmPayment(@PathVariable Long id) {
        return ResponseEntity.ok(handPaymentService.confirmPayment(id));
    }

    /**
     * Reject a pending hand payment
     */
    @PostMapping("/reject/{id}")
    public ResponseEntity<HandPayment> rejectPayment(@PathVariable Long id) {
        return ResponseEntity.ok(handPaymentService.rejectPayment(id));
    }
}