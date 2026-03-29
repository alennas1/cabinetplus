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

import com.cabinetplus.backend.dto.AllergyCatalogRequest;
import com.cabinetplus.backend.dto.AllergyCatalogResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.AllergyCatalog;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AllergyCatalogService;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/allergy-catalog")
public class AllergyCatalogController {

    private final AllergyCatalogService allergyCatalogService;
    private final UserService userService;
    private final AuditService auditService;

    public AllergyCatalogController(
            AllergyCatalogService allergyCatalogService,
            UserService userService,
            AuditService auditService
    ) {
        this.allergyCatalogService = allergyCatalogService;
        this.userService = userService;
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<List<AllergyCatalogResponse>> getAll(Principal principal) {
        User currentUser = getCurrentUser(principal);
        auditService.logSuccess(AuditEventType.ALLERGY_CATALOG_READ, "ALLERGY_CATALOG", null, "Catalogue allergies consulte");

        List<AllergyCatalogResponse> response = allergyCatalogService.findAllByUser(currentUser)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<AllergyCatalogResponse> create(@Valid @RequestBody AllergyCatalogRequest dto, Principal principal) {
        User currentUser = getCurrentUser(principal);

        AllergyCatalog entity = new AllergyCatalog();
        entity.setName(dto.name());
        entity.setDescription(dto.description());
        entity.setCreatedBy(currentUser);

        AllergyCatalog saved = allergyCatalogService.save(entity);
        auditService.logSuccess(AuditEventType.ALLERGY_CATALOG_CREATE, "ALLERGY_CATALOG", String.valueOf(saved.getId()), "Allergie ajoutee au catalogue");

        return ResponseEntity.ok(mapToResponse(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AllergyCatalogResponse> update(@PathVariable Long id, @Valid @RequestBody AllergyCatalogRequest dto, Principal principal) {
        User currentUser = getCurrentUser(principal);

        AllergyCatalog entity = new AllergyCatalog();
        entity.setId(id);
        entity.setName(dto.name());
        entity.setDescription(dto.description());
        entity.setCreatedBy(currentUser);

        AllergyCatalog saved = allergyCatalogService.update(id, entity, currentUser)
                .orElseThrow(() -> new NotFoundException("Element du catalogue introuvable"));
        auditService.logSuccess(AuditEventType.ALLERGY_CATALOG_UPDATE, "ALLERGY_CATALOG", String.valueOf(id), "Catalogue allergies modifie");

        return ResponseEntity.ok(mapToResponse(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        User currentUser = getCurrentUser(principal);
        boolean deleted = allergyCatalogService.deleteByUser(id, currentUser);
        if (!deleted) {
            throw new NotFoundException("Element du catalogue introuvable");
        }
        auditService.logSuccess(AuditEventType.ALLERGY_CATALOG_DELETE, "ALLERGY_CATALOG", String.valueOf(id), "Allergie supprimee du catalogue");
        return ResponseEntity.noContent().build();
    }

    private User getCurrentUser(Principal principal) {
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
    }

    private AllergyCatalogResponse mapToResponse(AllergyCatalog entity) {
        return new AllergyCatalogResponse(entity.getId(), entity.getName(), entity.getDescription());
    }
}

