package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.TreatmentCatalogRequest;
import com.cabinetplus.backend.dto.TreatmentCatalogResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.TreatmentCatalog;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.TreatmentCatalogService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/treatment-catalog")
public class TreatmentCatalogController {

    private final TreatmentCatalogService treatmentCatalogService;
    private final UserService userService;
    private final AuditService auditService;

    public TreatmentCatalogController(TreatmentCatalogService treatmentCatalogService,
                                      UserService userService,
                                      AuditService auditService) {
        this.treatmentCatalogService = treatmentCatalogService;
        this.userService = userService;
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<List<TreatmentCatalogResponse>> getAllTreatmentCatalogs(Principal principal) {
        User currentUser = getCurrentUser(principal);
        auditService.logSuccess(AuditEventType.TREATMENT_CATALOG_READ, "TREATMENT_CATALOG", null, "Catalogue traitements consulte");

        List<TreatmentCatalogResponse> response = treatmentCatalogService.findAllByUser(currentUser)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TreatmentCatalogResponse> getTreatmentCatalogById(@PathVariable Long id,
                                                                            Principal principal) {
        User currentUser = getCurrentUser(principal);

        TreatmentCatalog catalog = treatmentCatalogService.findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new NotFoundException("Element du catalogue introuvable"));
        auditService.logSuccess(AuditEventType.TREATMENT_CATALOG_READ, "TREATMENT_CATALOG", String.valueOf(id), "Element catalogue traitement consulte");
        return ResponseEntity.ok(mapToResponse(catalog));
    }

    @PostMapping
    public ResponseEntity<TreatmentCatalogResponse> createTreatmentCatalog(@Valid @RequestBody TreatmentCatalogRequest dto,
                                                                           Principal principal) {
        User currentUser = getCurrentUser(principal);

        TreatmentCatalog entity = new TreatmentCatalog();
        entity.setName(dto.getName());
        entity.setDescription(dto.getDescription());
        entity.setDefaultPrice(dto.getDefaultPrice());
        entity.setFlatFee(dto.isFlatFee());
        entity.setMultiUnit(!dto.isFlatFee() && dto.isMultiUnit());
        entity.setCreatedBy(currentUser);

        TreatmentCatalog saved = treatmentCatalogService.save(entity);
        auditService.logSuccess(AuditEventType.TREATMENT_CATALOG_CREATE, "TREATMENT_CATALOG", String.valueOf(saved.getId()), "Catalogue traitement créé");

        return ResponseEntity.ok(mapToResponse(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TreatmentCatalogResponse> updateTreatmentCatalog(@PathVariable Long id,
                                                                           @Valid @RequestBody TreatmentCatalogRequest dto,
                                                                           Principal principal) {
        User currentUser = getCurrentUser(principal);

        TreatmentCatalog toUpdate = new TreatmentCatalog();
        toUpdate.setId(id);
        toUpdate.setName(dto.getName());
        toUpdate.setDescription(dto.getDescription());
        toUpdate.setDefaultPrice(dto.getDefaultPrice());
        toUpdate.setFlatFee(dto.isFlatFee());
        toUpdate.setMultiUnit(!dto.isFlatFee() && dto.isMultiUnit());
        toUpdate.setCreatedBy(currentUser);

        TreatmentCatalog saved = treatmentCatalogService.update(id, toUpdate, currentUser)
                .orElseThrow(() -> new NotFoundException("Element du catalogue introuvable"));
        auditService.logSuccess(AuditEventType.TREATMENT_CATALOG_UPDATE, "TREATMENT_CATALOG", String.valueOf(saved.getId()), "Catalogue traitement modifié");
        return ResponseEntity.ok(mapToResponse(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTreatmentCatalog(@PathVariable Long id,
                                                       Principal principal) {
        User currentUser = getCurrentUser(principal);

        boolean deleted = treatmentCatalogService.deleteByUser(id, currentUser);
        if (!deleted) {
            throw new NotFoundException("Element du catalogue introuvable");
        }
        auditService.logSuccess(AuditEventType.TREATMENT_CATALOG_DELETE, "TREATMENT_CATALOG", String.valueOf(id), "Catalogue traitement supprimé");
        return ResponseEntity.noContent().build();
    }

    // ðŸ”¹ Helpers
    private User getCurrentUser(Principal principal) {
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
    }

    private TreatmentCatalogResponse mapToResponse(TreatmentCatalog c) {
        return new TreatmentCatalogResponse(
                c.getId(),
                c.getName(),
                c.getDescription(),
                c.getDefaultPrice(),
                c.isFlatFee(),
                c.isMultiUnit()
        );
    }
}

