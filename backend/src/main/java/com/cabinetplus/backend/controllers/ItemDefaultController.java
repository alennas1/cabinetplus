package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.ItemDefaultDTO;
import com.cabinetplus.backend.dto.ItemDefaultRequest;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.ItemDefault;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.ItemDefaultService;
import com.cabinetplus.backend.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/item-defaults")
@RequiredArgsConstructor
public class ItemDefaultController {

    private final ItemDefaultService itemDefaultService;
    private final UserService userService;
    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<List<ItemDefaultDTO>> getAll(Principal principal) {
        User dentist = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        auditService.logSuccess(AuditEventType.ITEM_DEFAULT_READ, "ITEM_DEFAULT", null, "Articles par defaut consultes");
        List<ItemDefaultDTO> dtos = itemDefaultService.getDefaultsForDentist(dentist)
                .stream()
                .map(itemDefaultService::toDTO)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/paged")
    public ResponseEntity<PageResponse<ItemDefaultDTO>> getAllPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            Principal principal) {

        User dentist = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        var pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.ASC, "name"));

        var itemsPage = itemDefaultService.searchDefaultsForDentist(dentist, q, pageable);
        var items = itemsPage.getContent().stream().map(itemDefaultService::toDTO).toList();

        auditService.logSuccess(AuditEventType.ITEM_DEFAULT_READ, "ITEM_DEFAULT", null, "Articles par defaut consultes (page)");
        return ResponseEntity.ok(new PageResponse<>(
                items,
                itemsPage.getNumber(),
                itemsPage.getSize(),
                itemsPage.getTotalElements(),
                itemsPage.getTotalPages()
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ItemDefaultDTO> getById(@PathVariable Long id, Principal principal) {
        User dentist = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        ItemDefault def = itemDefaultService.getDefaultByIdForDentist(id, dentist)
                .orElseThrow(() -> new NotFoundException("Article par defaut introuvable"));
        auditService.logSuccess(AuditEventType.ITEM_DEFAULT_READ, "ITEM_DEFAULT", String.valueOf(id), "Article par defaut consulte");
        return ResponseEntity.ok(itemDefaultService.toDTO(def));
    }

    @PostMapping
    public ResponseEntity<ItemDefaultDTO> create(@Valid @RequestBody ItemDefaultRequest request, Principal principal) {
        User dentist = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        ItemDefault itemDefault = new ItemDefault();
        itemDefault.setName(request.name() != null ? request.name().trim() : null);
        itemDefault.setCategory(request.category());
        itemDefault.setDefaultPrice(request.defaultPrice());
        itemDefault.setDescription(request.description() != null ? request.description().trim() : null);
        itemDefault.setCreatedBy(dentist);

        ItemDefault saved = itemDefaultService.createDefault(itemDefault, dentist);
        auditService.logSuccess(AuditEventType.ITEM_DEFAULT_CREATE, "ITEM_DEFAULT", String.valueOf(saved.getId()), "Article par défaut créé");
        return ResponseEntity.ok(itemDefaultService.toDTO(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ItemDefaultDTO> update(@PathVariable Long id,
                                                 @Valid @RequestBody ItemDefaultRequest request,
                                                 Principal principal) {
        User dentist = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        ItemDefault updated = new ItemDefault();
        updated.setName(request.name() != null ? request.name().trim() : null);
        updated.setCategory(request.category());
        updated.setDefaultPrice(request.defaultPrice());
        updated.setDescription(request.description() != null ? request.description().trim() : null);

        ItemDefault saved = itemDefaultService.updateDefault(id, updated, dentist);
        auditService.logSuccess(AuditEventType.ITEM_DEFAULT_UPDATE, "ITEM_DEFAULT", String.valueOf(saved.getId()), "Article par défaut modifié");
        return ResponseEntity.ok(itemDefaultService.toDTO(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        User dentist = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        if (id != null) {
            // Strict no-delete policy: item defaults are immutable history.
            return ResponseEntity.status(org.springframework.http.HttpStatus.METHOD_NOT_ALLOWED).build();
        }

        itemDefaultService.deleteDefault(id, dentist);
        auditService.logSuccess(AuditEventType.ITEM_DEFAULT_DELETE, "ITEM_DEFAULT", String.valueOf(id), "Article par défaut supprimé");
        return ResponseEntity.noContent().build();
    }
}

