package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.cabinetplus.backend.dto.FournisseurRequest;
import com.cabinetplus.backend.dto.FournisseurDetailsResponse;
import com.cabinetplus.backend.dto.FournisseurPaymentRequest;
import com.cabinetplus.backend.dto.FournisseurPaymentResponse;
import com.cabinetplus.backend.dto.FournisseurResponse;
import com.cabinetplus.backend.dto.FournisseurBillingEntryResponse;
import com.cabinetplus.backend.dto.FournisseurBillingSummaryResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Fournisseur;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.FournisseurDetailsService;
import com.cabinetplus.backend.services.FournisseurService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/fournisseurs")
public class FournisseurController {

    private final FournisseurService service;
    private final FournisseurDetailsService detailsService;
    private final UserService userService;
    private final PublicIdResolutionService publicIdResolutionService;
    private final AuditService auditService;

    public FournisseurController(
            FournisseurService service,
            FournisseurDetailsService detailsService,
            UserService userService,
            PublicIdResolutionService publicIdResolutionService,
            AuditService auditService
    ) {
        this.service = service;
        this.detailsService = detailsService;
        this.userService = userService;
        this.publicIdResolutionService = publicIdResolutionService;
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<List<FournisseurResponse>> getAll(Principal principal) {
        User user = getCurrentUser(principal);
        auditService.logSuccess(AuditEventType.SUPPLIER_READ, "SUPPLIER", null, "Fournisseurs consultés");
        return ResponseEntity.ok(service.findAllByUser(user).stream().map(this::mapToResponse).collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FournisseurResponse> getOne(@PathVariable String id, Principal principal) {
        User user = getCurrentUser(principal);
        Fournisseur fournisseur = publicIdResolutionService.requireFournisseurOwnedBy(id, user);
        auditService.logSuccess(
                AuditEventType.SUPPLIER_READ,
                "SUPPLIER",
                String.valueOf(fournisseur.getId()),
                "Fournisseur consulté"
        );
        return ResponseEntity.ok(mapToResponse(fournisseur));
    }

    @GetMapping("/{id}/details")
    public ResponseEntity<FournisseurDetailsResponse> getDetails(@PathVariable String id, Principal principal) {
        User user = getCurrentUser(principal);
        Fournisseur fournisseur = publicIdResolutionService.requireFournisseurOwnedBy(id, user);

        auditService.logSuccess(
                AuditEventType.SUPPLIER_READ,
                "SUPPLIER",
                String.valueOf(fournisseur.getId()),
                "Détails fournisseur consultés"
        );

        return ResponseEntity.ok(mapToDetailsResponse(fournisseur, user));
    }

    @PostMapping("/{id}/payments")
    public ResponseEntity<FournisseurDetailsResponse> addPayment(@PathVariable String id,
                                                                 @Valid @RequestBody FournisseurPaymentRequest dto,
                                                                 Principal principal) {
        User user = getCurrentUser(principal);
        Long internalId = publicIdResolutionService.requireFournisseurOwnedBy(id, user).getId();
        detailsService.addPayment(internalId, dto, user);
        auditService.logSuccess(
                AuditEventType.SUPPLIER_PAYMENT_CREATE,
                "SUPPLIER",
                String.valueOf(internalId),
                "Paiement fournisseur ajouté"
        );
        Fournisseur fournisseur = service.findByIdAndUser(internalId, user)
                .orElseThrow(() -> new NotFoundException("Fournisseur introuvable"));
        return ResponseEntity.ok(mapToDetailsResponse(fournisseur, user));
    }

    @DeleteMapping("/{id}/payments/{paymentId}")
    public ResponseEntity<Void> deletePayment(@PathVariable String id, @PathVariable Long paymentId, Principal principal) {
        User user = getCurrentUser(principal);
        Long internalId = publicIdResolutionService.requireFournisseurOwnedBy(id, user).getId();
        if (!detailsService.deletePayment(internalId, paymentId, user)) {
            throw new NotFoundException("Paiement introuvable");
        }
        auditService.logSuccess(
                AuditEventType.SUPPLIER_PAYMENT_DELETE,
                "SUPPLIER",
                String.valueOf(internalId),
                "Paiement fournisseur supprimé"
        );
        return ResponseEntity.noContent().build();
    }

    private FournisseurDetailsResponse mapToDetailsResponse(Fournisseur fournisseur, User user) {
        double totalOwed = detailsService.getTotalOwed(fournisseur, user);
        double totalPaid = detailsService.getTotalPaid(fournisseur, user);
        double remainingToPay = totalOwed - totalPaid;

        List<FournisseurPaymentResponse> payments = detailsService.getPaymentsForFournisseur(fournisseur, user).stream()
                .map(payment -> new FournisseurPaymentResponse(
                        payment.getId(),
                        payment.getAmount(),
                        payment.getPaymentDate(),
                        payment.getNotes()
                ))
                .toList();
        List<FournisseurBillingSummaryResponse> billingHistory = detailsService.getBillingHistoryForFournisseur(fournisseur, user);
        List<FournisseurBillingEntryResponse> billingEntries = detailsService.getBillingEntriesForFournisseur(fournisseur, user);

        return new FournisseurDetailsResponse(
                fournisseur.getId(),
                fournisseur.getPublicId(),
                fournisseur.getName(),
                fournisseur.getContactPerson(),
                fournisseur.getPhoneNumber(),
                fournisseur.getAddress(),
                totalOwed,
                totalPaid,
                remainingToPay,
                payments,
                billingHistory,
                billingEntries
        );
    }

    @PostMapping
    public ResponseEntity<FournisseurResponse> create(@Valid @RequestBody FournisseurRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        Fournisseur entity = new Fournisseur();
        entity.setName(dto.name());
        entity.setContactPerson(dto.contactPerson());
        entity.setPhoneNumber(dto.phoneNumber());
        entity.setAddress(dto.address());
        entity.setCreatedBy(user);
        Fournisseur saved = service.save(entity);
        auditService.logSuccess(
                AuditEventType.SUPPLIER_CREATE,
                "SUPPLIER",
                String.valueOf(saved.getId()),
                "Fournisseur créé"
        );
        return ResponseEntity.ok(mapToResponse(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FournisseurResponse> update(@PathVariable String id, @Valid @RequestBody FournisseurRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        Long internalId = publicIdResolutionService.requireFournisseurOwnedBy(id, user).getId();
        Fournisseur updateData = new Fournisseur();
        updateData.setName(dto.name());
        updateData.setContactPerson(dto.contactPerson());
        updateData.setPhoneNumber(dto.phoneNumber());
        updateData.setAddress(dto.address());

        return service.update(internalId, updateData, user)
                .map(this::mapToResponse)
                .map(resp -> {
                    auditService.logSuccess(
                            AuditEventType.SUPPLIER_UPDATE,
                            "SUPPLIER",
                            String.valueOf(internalId),
                            "Fournisseur modifié"
                    );
                    return resp;
                })
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new NotFoundException("Fournisseur introuvable"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Principal principal) {
        User user = getCurrentUser(principal);
        Long internalId = publicIdResolutionService.requireFournisseurOwnedBy(id, user).getId();
        if (!service.deleteByUser(internalId, user)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Suppression impossible: ce fournisseur est lie a des achats ou paiements");
        }
        auditService.logSuccess(
                AuditEventType.SUPPLIER_DELETE,
                "SUPPLIER",
                String.valueOf(internalId),
                "Fournisseur supprimé"
        );
        return ResponseEntity.noContent().build();
    }

    private User getCurrentUser(Principal principal) {
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
    }

    private FournisseurResponse mapToResponse(Fournisseur f) {
        return new FournisseurResponse(
                f.getId(),
                f.getPublicId(),
                f.getName(),
                f.getContactPerson(),
                f.getPhoneNumber(),
                f.getAddress()
        );
    }
}
