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
import com.cabinetplus.backend.models.TreatmentCatalog;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.TreatmentCatalogService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/treatment-catalog")
public class TreatmentCatalogController {

    private final TreatmentCatalogService treatmentCatalogService;
    private final UserService userService;

    public TreatmentCatalogController(TreatmentCatalogService treatmentCatalogService,
                                      UserService userService) {
        this.treatmentCatalogService = treatmentCatalogService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<TreatmentCatalogResponse>> getAllTreatmentCatalogs(Principal principal) {
        User currentUser = getCurrentUser(principal);

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

        return treatmentCatalogService.findByIdAndUser(id, currentUser)
                .map(this::mapToResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<TreatmentCatalogResponse> createTreatmentCatalog(@Valid @RequestBody TreatmentCatalogRequest dto,
                                                                           Principal principal) {
        User currentUser = getCurrentUser(principal);

        TreatmentCatalog entity = new TreatmentCatalog();
        entity.setName(dto.getName());
        entity.setDescription(dto.getDescription());
        entity.setDefaultPrice(dto.getDefaultPrice());
        entity.setCreatedBy(currentUser);

        TreatmentCatalog saved = treatmentCatalogService.save(entity);

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
        toUpdate.setCreatedBy(currentUser);

        return treatmentCatalogService.update(id, toUpdate, currentUser)
                .map(this::mapToResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTreatmentCatalog(@PathVariable Long id,
                                                       Principal principal) {
        User currentUser = getCurrentUser(principal);

        boolean deleted = treatmentCatalogService.deleteByUser(id, currentUser);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    // 🔹 Helpers
    private User getCurrentUser(Principal principal) {
        return userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private TreatmentCatalogResponse mapToResponse(TreatmentCatalog c) {
        return new TreatmentCatalogResponse(
                c.getId(),
                c.getName(),
                c.getDescription(),
                c.getDefaultPrice()
        );
    }
}
