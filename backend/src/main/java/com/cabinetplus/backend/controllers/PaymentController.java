package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.PaymentRequest;
import com.cabinetplus.backend.dto.PaymentResponse;
import com.cabinetplus.backend.models.Payment;
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

    @PostMapping("/payments")
    public ResponseEntity<PaymentResponse> create(@Valid @RequestBody PaymentRequest request) {
        PaymentResponse created = paymentService.create(request);
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
        paymentService.delete(paymentId);
        return ResponseEntity.noContent().build();
    }
}
