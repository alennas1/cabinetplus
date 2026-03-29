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

import com.cabinetplus.backend.dto.DiseaseCatalogRequest;
import com.cabinetplus.backend.dto.DiseaseCatalogResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.DiseaseCatalog;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.DiseaseCatalogService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/disease-catalog")
public class DiseaseCatalogController {

    private final DiseaseCatalogService diseaseCatalogService;
    private final UserService userService;
    private final AuditService auditService;

    public DiseaseCatalogController(
            DiseaseCatalogService diseaseCatalogService,
            UserService userService,
            AuditService auditService
    ) {
        this.diseaseCatalogService = diseaseCatalogService;
        this.userService = userService;
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<List<DiseaseCatalogResponse>> getAll(Principal principal) {
        User currentUser = getCurrentUser(principal);
        auditService.logSuccess(AuditEventType.DISEASE_CATALOG_READ, "DISEASE_CATALOG", null, "Catalogue maladies consulte");

        List<DiseaseCatalogResponse> response = diseaseCatalogService.findAllByUser(currentUser)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<DiseaseCatalogResponse> create(@Valid @RequestBody DiseaseCatalogRequest dto, Principal principal) {
        User currentUser = getCurrentUser(principal);

        DiseaseCatalog entity = new DiseaseCatalog();
        entity.setName(dto.name());
        entity.setDescription(dto.description());
        entity.setCreatedBy(currentUser);

        DiseaseCatalog saved = diseaseCatalogService.save(entity);
        auditService.logSuccess(AuditEventType.DISEASE_CATALOG_CREATE, "DISEASE_CATALOG", String.valueOf(saved.getId()), "Maladie ajoutee au catalogue");

        return ResponseEntity.ok(mapToResponse(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DiseaseCatalogResponse> update(@PathVariable Long id, @Valid @RequestBody DiseaseCatalogRequest dto, Principal principal) {
        User currentUser = getCurrentUser(principal);

        DiseaseCatalog entity = new DiseaseCatalog();
        entity.setId(id);
        entity.setName(dto.name());
        entity.setDescription(dto.description());
        entity.setCreatedBy(currentUser);

        DiseaseCatalog saved = diseaseCatalogService.update(id, entity, currentUser)
                .orElseThrow(() -> new NotFoundException("Element du catalogue introuvable"));
        auditService.logSuccess(AuditEventType.DISEASE_CATALOG_UPDATE, "DISEASE_CATALOG", String.valueOf(id), "Catalogue maladies modifie");

        return ResponseEntity.ok(mapToResponse(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        User currentUser = getCurrentUser(principal);
        boolean deleted = diseaseCatalogService.deleteByUser(id, currentUser);
        if (!deleted) {
            throw new NotFoundException("Element du catalogue introuvable");
        }
        auditService.logSuccess(AuditEventType.DISEASE_CATALOG_DELETE, "DISEASE_CATALOG", String.valueOf(id), "Maladie supprimee du catalogue");
        return ResponseEntity.noContent().build();
    }

    private User getCurrentUser(Principal principal) {
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
    }

    private DiseaseCatalogResponse mapToResponse(DiseaseCatalog entity) {
        return new DiseaseCatalogResponse(entity.getId(), entity.getName(), entity.getDescription());
    }
}

