package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.cabinetplus.backend.dto.*;
import com.cabinetplus.backend.models.*;
import com.cabinetplus.backend.services.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/prothesis-catalog")
public class ProthesisCatalogController {
    private final ProthesisCatalogService service;
    private final UserService userService;

    public ProthesisCatalogController(ProthesisCatalogService service, UserService userService) {
        this.service = service;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<ProthesisCatalogResponse>> getAll(Principal principal) {
        User user = getCurrentUser(principal);
        return ResponseEntity.ok(service.findAllByUser(user).stream().map(this::mapToResponse).collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<ProthesisCatalogResponse> create(@Valid @RequestBody ProthesisCatalogRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        ProthesisCatalog entity = new ProthesisCatalog();
        entity.setName(dto.name());
        entity.setDefaultPrice(dto.defaultPrice());
        entity.setDefaultLabCost(dto.defaultLabCost() != null ? dto.defaultLabCost() : 0.0);
        entity.setFlatFee(dto.isFlatFee());
        return ResponseEntity.ok(mapToResponse(service.save(entity, dto.materialId(), user)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProthesisCatalogResponse> update(@PathVariable Long id, @Valid @RequestBody ProthesisCatalogRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        ProthesisCatalog updateData = new ProthesisCatalog();
        updateData.setName(dto.name());
        updateData.setDefaultPrice(dto.defaultPrice());
        updateData.setDefaultLabCost(dto.defaultLabCost() != null ? dto.defaultLabCost() : 0.0);
        updateData.setFlatFee(dto.isFlatFee());
        return service.update(id, updateData, dto.materialId(), user)
                .map(this::mapToResponse).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        return service.deleteByUser(id, getCurrentUser(principal)) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    private User getCurrentUser(Principal principal) {
        return userService.findByUsername(principal.getName()).orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
    }

    private ProthesisCatalogResponse mapToResponse(ProthesisCatalog c) {
        String materialName = (c.getMaterial() != null) ? c.getMaterial().getName() : "Unknown";
        return new ProthesisCatalogResponse(
                c.getId(),
                c.getName(),
                materialName,
                c.getDefaultPrice(),
                c.getDefaultLabCost(),
                c.isFlatFee()
        );
    }
}
