package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.cabinetplus.backend.dto.*;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.*;
import com.cabinetplus.backend.services.*;
import com.cabinetplus.backend.util.PaginationUtil;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/prothesis-catalog")
public class ProthesisCatalogController {
    private final ProthesisCatalogService service;
    private final UserService userService;
    private final AuditService auditService;

    public ProthesisCatalogController(ProthesisCatalogService service, UserService userService, AuditService auditService) {
        this.service = service;
        this.userService = userService;
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<List<ProthesisCatalogResponse>> getAll(Principal principal) {
        User user = getCurrentUser(principal);
        auditService.logSuccess(AuditEventType.PROTHESIS_CATALOG_READ, "PROTHESIS_CATALOG", null, "Catalogue protheses consulte");
        return ResponseEntity.ok(service.findAllByUser(user).stream().map(this::mapToResponse).collect(Collectors.toList()));
    }

    @GetMapping("/paged")
    public ResponseEntity<PageResponse<ProthesisCatalogResponse>> getAllPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "sortKey", required = false) String sortKey,
            @RequestParam(name = "direction", required = false) String direction,
            Principal principal
    ) {
        User user = getCurrentUser(principal);
        String qNorm = q != null ? q.trim().toLowerCase() : "";
        String sortKeyNorm = sortKey != null ? sortKey.trim() : "";
        String directionNorm = direction != null ? direction.trim() : "";

        Comparator<ProthesisCatalog> comparator = switch (sortKeyNorm) {
            case "materialName" -> Comparator.comparing(
                    p -> p.getMaterial() != null && p.getMaterial().getName() != null ? p.getMaterial().getName().trim().toLowerCase() : "",
                    Comparator.nullsLast(Comparator.naturalOrder())
            );
            case "defaultPrice" -> Comparator.comparing(ProthesisCatalog::getDefaultPrice, Comparator.nullsLast(Comparator.naturalOrder()));
            case "defaultLabCost" -> Comparator.comparing(ProthesisCatalog::getDefaultLabCost, Comparator.nullsLast(Comparator.naturalOrder()));
            case "type" -> Comparator.comparing(
                    p -> p.isFlatFee() ? "0-flat" : p.isMultiUnit() ? "1-multi" : "2-unit",
                    Comparator.nullsLast(Comparator.naturalOrder())
            );
            case "name" -> Comparator.comparing(
                    p -> p.getName() != null ? p.getName().trim().toLowerCase() : "",
                    Comparator.nullsLast(Comparator.naturalOrder())
            );
            default -> Comparator.comparing(
                    p -> p.getName() != null ? p.getName().trim().toLowerCase() : "",
                    Comparator.nullsLast(Comparator.naturalOrder())
            );
        };

        if ("DESC".equalsIgnoreCase(directionNorm)) {
            comparator = comparator.reversed();
        }

        comparator = comparator.thenComparing(ProthesisCatalog::getId, Comparator.nullsLast(Comparator.naturalOrder()));

        List<ProthesisCatalog> all = service.findAllByUser(user);
        List<ProthesisCatalog> filtered = (all == null ? List.<ProthesisCatalog>of() : all).stream()
                .filter(p -> {
                    if (qNorm.isBlank()) return true;
                    String name = p.getName() != null ? p.getName().trim().toLowerCase() : "";
                    String material = p.getMaterial() != null && p.getMaterial().getName() != null
                            ? p.getMaterial().getName().trim().toLowerCase()
                            : "";
                    String price = p.getDefaultPrice() != null ? String.valueOf(p.getDefaultPrice()) : "";
                    return name.contains(qNorm) || material.contains(qNorm) || price.contains(qNorm);
                })
                .sorted(comparator)
                .toList();

        PageResponse<ProthesisCatalog> pageResponse = PaginationUtil.toPageResponse(filtered, page, size);
        List<ProthesisCatalogResponse> items = pageResponse.items().stream().map(this::mapToResponse).toList();

        auditService.logSuccess(AuditEventType.PROTHESIS_CATALOG_READ, "PROTHESIS_CATALOG", null, "Catalogue protheses consulte (page)");
        return ResponseEntity.ok(new PageResponse<>(
                items,
                pageResponse.page(),
                pageResponse.size(),
                pageResponse.totalElements(),
                pageResponse.totalPages()
        ));
    }

    @PostMapping
    public ResponseEntity<ProthesisCatalogResponse> create(@Valid @RequestBody ProthesisCatalogRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        ProthesisCatalog entity = new ProthesisCatalog();
        entity.setName(dto.name());
        entity.setDefaultPrice(dto.defaultPrice());
        entity.setDefaultLabCost(dto.defaultLabCost() != null ? dto.defaultLabCost() : 0.0);
        entity.setFlatFee(dto.isFlatFee());
        entity.setMultiUnit(!dto.isFlatFee() && dto.isMultiUnit());
        ProthesisCatalog saved = service.save(entity, dto.materialId(), user);
        auditService.logSuccess(AuditEventType.PROTHESIS_CATALOG_CREATE, "PROTHESIS_CATALOG", String.valueOf(saved.getId()), "Catalogue prothèse créé");
        return ResponseEntity.ok(mapToResponse(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProthesisCatalogResponse> update(@PathVariable Long id, @Valid @RequestBody ProthesisCatalogRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        ProthesisCatalog updateData = new ProthesisCatalog();
        updateData.setName(dto.name());
        updateData.setDefaultPrice(dto.defaultPrice());
        updateData.setDefaultLabCost(dto.defaultLabCost() != null ? dto.defaultLabCost() : 0.0);
        updateData.setFlatFee(dto.isFlatFee());
        updateData.setMultiUnit(!dto.isFlatFee() && dto.isMultiUnit());
        return service.update(id, updateData, dto.materialId(), user)
                .map(saved -> {
                    auditService.logSuccess(AuditEventType.PROTHESIS_CATALOG_UPDATE, "PROTHESIS_CATALOG", String.valueOf(id), "Catalogue prothèse modifié");
                    return saved;
                })
                .map(this::mapToResponse)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new NotFoundException("Prothese introuvable"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        if (!service.deleteByUser(id, getCurrentUser(principal))) {
            throw new NotFoundException("Prothese introuvable");
        }
        auditService.logSuccess(AuditEventType.PROTHESIS_CATALOG_DELETE, "PROTHESIS_CATALOG", String.valueOf(id), "Catalogue prothèse supprimé");
        return ResponseEntity.noContent().build();
    }

    private User getCurrentUser(Principal principal) {
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
    }

    private ProthesisCatalogResponse mapToResponse(ProthesisCatalog c) {
        String materialName = (c.getMaterial() != null) ? c.getMaterial().getName() : "Unknown";
        return new ProthesisCatalogResponse(
                c.getId(),
                c.getName(),
                materialName,
                c.getDefaultPrice(),
                c.getDefaultLabCost(),
                c.isFlatFee(),
                c.isMultiUnit()
        );
    }
}
