package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.cabinetplus.backend.dto.MaterialRequest;
import com.cabinetplus.backend.dto.MaterialResponse;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Material;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.MaterialService;
import com.cabinetplus.backend.services.UserService;
import com.cabinetplus.backend.util.PaginationUtil;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/materials")
public class MaterialController {

    private final MaterialService materialService;
    private final UserService userService;
    private final AuditService auditService;

    public MaterialController(MaterialService materialService, UserService userService, AuditService auditService) {
        this.materialService = materialService;
        this.userService = userService;
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<List<MaterialResponse>> getAllMaterials(Principal principal) {
        User currentUser = getCurrentUser(principal);
        auditService.logSuccess(AuditEventType.MATERIAL_READ, "MATERIAL", null, "Materiaux consultes");

        List<MaterialResponse> response = materialService.findAllByUser(currentUser)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/paged")
    public ResponseEntity<PageResponse<MaterialResponse>> getAllMaterialsPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            Principal principal
    ) {
        User currentUser = getCurrentUser(principal);
        String qNorm = q != null ? q.trim().toLowerCase() : "";

        List<Material> all = materialService.findAllByUser(currentUser);
        List<Material> filtered = (all == null ? List.<Material>of() : all).stream()
                .filter(m -> {
                    if (qNorm.isBlank()) return true;
                    String name = m.getName() != null ? m.getName().trim().toLowerCase() : "";
                    return name.contains(qNorm);
                })
                .sorted(Comparator.comparing(m -> m.getName() != null ? m.getName().toLowerCase() : ""))
                .toList();

        PageResponse<Material> pageResponse = PaginationUtil.toPageResponse(filtered, page, size);
        List<MaterialResponse> items = pageResponse.items().stream().map(this::mapToResponse).toList();

        auditService.logSuccess(AuditEventType.MATERIAL_READ, "MATERIAL", null, "Materiaux consultes (page)");
        return ResponseEntity.ok(new PageResponse<>(
                items,
                pageResponse.page(),
                pageResponse.size(),
                pageResponse.totalElements(),
                pageResponse.totalPages()
        ));
    }

    @PostMapping
    public ResponseEntity<MaterialResponse> createMaterial(@Valid @RequestBody MaterialRequest dto,
                                                         Principal principal) {
        User currentUser = getCurrentUser(principal);

        Material entity = new Material();
        entity.setName(dto.name());
        entity.setCreatedBy(currentUser);

        Material saved = materialService.save(entity);
        auditService.logSuccess(AuditEventType.MATERIAL_CREATE, "MATERIAL", String.valueOf(saved.getId()), "Matériau créé");

        return ResponseEntity.ok(mapToResponse(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMaterial(@PathVariable Long id, Principal principal) {
        User currentUser = getCurrentUser(principal);

        boolean deleted = materialService.deleteByUser(id, currentUser);
        if (!deleted) {
            throw new NotFoundException("Materiau introuvable");
        }
        auditService.logSuccess(AuditEventType.MATERIAL_DELETE, "MATERIAL", String.valueOf(id), "Matériau supprimé");
        return ResponseEntity.noContent().build();
    }

    // ðŸ”¹ Helpers
    private User getCurrentUser(Principal principal) {
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
    }

    private MaterialResponse mapToResponse(Material m) {
        return new MaterialResponse(
                m.getId(),
                m.getName()
        );
    }
}
