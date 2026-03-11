package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.cabinetplus.backend.dto.*;
import com.cabinetplus.backend.models.*;
import com.cabinetplus.backend.services.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/laboratories")
public class LaboratoryController {
    private final LaboratoryService service;
    private final UserService userService;

    public LaboratoryController(LaboratoryService service, UserService userService) {
        this.service = service;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<LaboratoryResponse>> getAll(Principal principal) {
        User user = getCurrentUser(principal);
        return ResponseEntity.ok(service.findAllByUser(user).stream().map(this::mapToResponse).collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LaboratoryResponse> getOne(@PathVariable Long id, Principal principal) {
        User user = getCurrentUser(principal);
        return service.findByIdAndUser(id, user)
                .map(this::mapToResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<LaboratoryResponse> create(@Valid @RequestBody LaboratoryRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        Laboratory entity = new Laboratory();
        entity.setName(dto.name());
        entity.setContactPerson(dto.contactPerson());
        entity.setPhoneNumber(dto.phoneNumber());
        entity.setAddress(dto.address());
        entity.setCreatedBy(user);
        return ResponseEntity.ok(mapToResponse(service.save(entity)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LaboratoryResponse> update(@PathVariable Long id, @Valid @RequestBody LaboratoryRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        Laboratory updateData = new Laboratory();
        updateData.setName(dto.name());
        updateData.setContactPerson(dto.contactPerson());
        updateData.setPhoneNumber(dto.phoneNumber());
        updateData.setAddress(dto.address());
        return service.update(id, updateData, user).map(this::mapToResponse).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/payments")
    public ResponseEntity<LaboratoryResponse> addPayment(@PathVariable Long id,
                                                         @Valid @RequestBody LaboratoryPaymentRequest dto,
                                                         Principal principal) {
        User user = getCurrentUser(principal);
        Laboratory laboratory = service.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Laboratoire introuvable"));
        service.addPayment(id, dto, user);
        return ResponseEntity.ok(mapToResponse(laboratory));
    }

    @DeleteMapping("/{id}/payments/{paymentId}")
    public ResponseEntity<Void> deletePayment(@PathVariable Long id, @PathVariable Long paymentId, Principal principal) {
        User user = getCurrentUser(principal);
        Laboratory laboratory = service.findByIdAndUser(id, user).orElse(null);
        if (laboratory == null) {
            return ResponseEntity.notFound().build();
        }

        return service.deletePayment(id, paymentId, user)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        User user = getCurrentUser(principal);
        Laboratory laboratory = service.findByIdAndUser(id, user).orElse(null);
        if (laboratory == null) {
            return ResponseEntity.notFound().build();
        }

        if (!service.deleteByUser(id, user)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Suppression impossible: ce laboratoire est lie a des paiements ou protheses");
        }

        return ResponseEntity.noContent().build();
    }

    private User getCurrentUser(Principal principal) {
        User user = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
    }

    private LaboratoryResponse mapToResponse(Laboratory l) {
        User user = l.getCreatedBy();
        double totalOwed = service.getTotalOwed(l, user);
        double totalPaid = service.getTotalPaid(l, user);
        double remainingToPay = Math.max(totalOwed - totalPaid, 0.0);
        List<LaboratoryPaymentResponse> payments = service.getPaymentsForLaboratory(l, user).stream()
                .map(payment -> new LaboratoryPaymentResponse(
                        payment.getId(),
                        payment.getAmount(),
                        payment.getPaymentDate(),
                        payment.getNotes()
                ))
                .collect(Collectors.toList());
        List<LaboratoryBillingSummaryResponse> billingHistory = service.getBillingHistoryForLaboratory(l, user);
        List<LaboratoryBillingEntryResponse> billingEntries = service.getBillingEntriesForLaboratory(l, user);

        return new LaboratoryResponse(
                l.getId(),
                l.getName(),
                l.getContactPerson(),
                l.getPhoneNumber(),
                l.getAddress(),
                totalOwed,
                totalPaid,
                remainingToPay,
                payments,
                billingHistory,
                billingEntries
        );
    }
}
