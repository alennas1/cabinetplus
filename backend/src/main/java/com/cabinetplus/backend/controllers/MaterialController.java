package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.cabinetplus.backend.dto.MaterialRequest;
import com.cabinetplus.backend.dto.MaterialResponse;
import com.cabinetplus.backend.models.Material;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.MaterialService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/materials")
public class MaterialController {

    private final MaterialService materialService;
    private final UserService userService;

    public MaterialController(MaterialService materialService, UserService userService) {
        this.materialService = materialService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<MaterialResponse>> getAllMaterials(Principal principal) {
        User currentUser = getCurrentUser(principal);

        List<MaterialResponse> response = materialService.findAllByUser(currentUser)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<MaterialResponse> createMaterial(@Valid @RequestBody MaterialRequest dto,
                                                         Principal principal) {
        User currentUser = getCurrentUser(principal);

        Material entity = new Material();
        entity.setName(dto.name());
        entity.setCreatedBy(currentUser);

        Material saved = materialService.save(entity);

        return ResponseEntity.ok(mapToResponse(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMaterial(@PathVariable Long id, Principal principal) {
        User currentUser = getCurrentUser(principal);

        boolean deleted = materialService.deleteByUser(id, currentUser);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    // ðŸ”¹ Helpers
    private User getCurrentUser(Principal principal) {
        return userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
    }

    private MaterialResponse mapToResponse(Material m) {
        return new MaterialResponse(
                m.getId(),
                m.getName()
        );
    }
}
