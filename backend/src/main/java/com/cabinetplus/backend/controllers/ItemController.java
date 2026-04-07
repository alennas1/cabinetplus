package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.CancellationRequest;
import com.cabinetplus.backend.dto.CreateItemDTO;
import com.cabinetplus.backend.dto.ItemDTO;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.dto.UpdateItemDTO;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Item;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.CancellationSecurityService;
import com.cabinetplus.backend.services.ItemService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/items")
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;
    private final UserService userService; // to fetch User from JWT Principal
    private final AuditService auditService;
    private final CancellationSecurityService cancellationSecurityService;

    @GetMapping
    public ResponseEntity<List<ItemDTO>> getAll(Principal principal) {
        User dentist = getClinicUser(principal);
        List<ItemDTO> dtos = itemService.getItemsForDentist(dentist)
                .stream()
                .map(itemService::toDTO)
                .toList();
        auditService.logSuccess(AuditEventType.ITEM_READ, "ITEM", null, "Articles consultés");
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/paged")
    public ResponseEntity<PageResponse<ItemDTO>> getAllPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            Principal principal) {

        User dentist = getClinicUser(principal);

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        var pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        var itemsPage = itemService.searchItemsForDentist(dentist, q, pageable);
        var items = itemsPage.getContent().stream().map(itemService::toDTO).toList();

        auditService.logSuccess(AuditEventType.ITEM_READ, "ITEM", null, "Articles consultés (page)");
        return ResponseEntity.ok(new PageResponse<>(
                items,
                itemsPage.getNumber(),
                itemsPage.getSize(),
                itemsPage.getTotalElements(),
                itemsPage.getTotalPages()
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ItemDTO> getById(@PathVariable Long id, Principal principal) {
        User dentist = getClinicUser(principal);
        Item item = itemService.getItemByIdForDentist(id, dentist)
                .orElseThrow(() -> new NotFoundException("Article introuvable"));
        auditService.logSuccess(AuditEventType.ITEM_READ, "ITEM", String.valueOf(item.getId()), "Article consulté");
        return ResponseEntity.ok(itemService.toDTO(item));
    }

    @PostMapping
 public ResponseEntity<ItemDTO> create(@Valid @RequestBody CreateItemDTO dto, Principal principal) {
     User dentist = getClinicUser(principal);
     
     Item saved = itemService.createItemFromDTO(dto, dentist);
     auditService.logSuccess(AuditEventType.ITEM_CREATE, "ITEM", String.valueOf(saved.getId()), "Article créé");
     return ResponseEntity.ok(itemService.toDTO(saved));
 }

   @PutMapping("/{id}")
public ResponseEntity<ItemDTO> update(@PathVariable Long id,
                                      @Valid @RequestBody UpdateItemDTO dto,
                                      Principal principal) {
     User dentist = getClinicUser(principal);
     Item saved = itemService.updateItemFromDTO(id, dto, dentist);

     auditService.logSuccess(AuditEventType.ITEM_UPDATE, "ITEM", String.valueOf(saved.getId()), "Article modifié");
     return ResponseEntity.ok(itemService.toDTO(saved));
 }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ItemDTO> cancel(@PathVariable Long id, @Valid @RequestBody CancellationRequest payload, Principal principal) {
        User actor = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        User clinicOwner = userService.resolveClinicOwner(actor);
        String reason = cancellationSecurityService.requirePinAndReason(actor, payload.pin(), payload.reason());

        Item cancelled = itemService.cancelItem(id, clinicOwner, actor, reason);
        auditService.logSuccess(
                AuditEventType.ITEM_CANCEL,
                "ITEM",
                String.valueOf(cancelled.getId()),
                "Article annulé. Motif: " + reason
        );
        return ResponseEntity.ok(itemService.toDTO(cancelled));
    }

    @DeleteMapping("/{id}")
public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
    User dentist = getClinicUser(principal);

    if (id != null) {
        // Strict no-delete policy: inventory items are immutable history.
        return ResponseEntity.status(org.springframework.http.HttpStatus.METHOD_NOT_ALLOWED).build();
    }

    // Option 1: hard delete
    itemService.getItemByIdForDentist(id, dentist)
            .orElseThrow(() -> new NotFoundException("Article introuvable"));

     itemService.deleteItem(id, dentist);
     auditService.logSuccess(AuditEventType.ITEM_DELETE, "ITEM", String.valueOf(id), "Article supprimé");
     return ResponseEntity.noContent().build();
 }

private User getClinicUser(Principal principal) {
    User user = userService.findByPhoneNumber(principal.getName())
            .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
    return userService.resolveClinicOwner(user);
}
}


