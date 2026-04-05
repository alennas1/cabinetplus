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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

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

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 200);

        String sortKeyNorm = sortKey != null ? sortKey.trim() : "";
        boolean desc = direction != null && direction.trim().equalsIgnoreCase("desc");

        Sort sort = switch (sortKeyNorm) {
            case "materialName" -> Sort.by(Sort.Order.by("material.name").ignoreCase().with(desc ? Sort.Direction.DESC : Sort.Direction.ASC));
            case "defaultPrice" -> Sort.by((desc ? Sort.Order.desc("defaultPrice") : Sort.Order.asc("defaultPrice")).nullsLast());
            case "defaultLabCost" -> Sort.by((desc ? Sort.Order.desc("defaultLabCost") : Sort.Order.asc("defaultLabCost")).nullsLast());
            case "type" -> {
                if (desc) {
                    yield Sort.by(Sort.Order.asc("flatFee"), Sort.Order.asc("multiUnit"));
                }
                yield Sort.by(Sort.Order.desc("flatFee"), Sort.Order.desc("multiUnit"));
            }
            case "name" -> Sort.by(Sort.Order.by("name").ignoreCase().with(desc ? Sort.Direction.DESC : Sort.Direction.ASC));
            default -> Sort.by(Sort.Order.by("name").ignoreCase().with(desc ? Sort.Direction.DESC : Sort.Direction.ASC));
        };
        sort = sort.and(Sort.by(Sort.Order.asc("id")));

        var pageable = PageRequest.of(safePage, safeSize, sort);
        var paged = service.searchPagedByUser(user, q, pageable);

        List<ProthesisCatalogResponse> items = paged.getContent().stream().map(this::mapToResponse).toList();

        auditService.logSuccess(AuditEventType.PROTHESIS_CATALOG_READ, "PROTHESIS_CATALOG", null, "Catalogue protheses consulte (page)");
        return ResponseEntity.ok(new PageResponse<>(
                items,
                paged.getNumber(),
                paged.getSize(),
                paged.getTotalElements(),
                paged.getTotalPages()
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
