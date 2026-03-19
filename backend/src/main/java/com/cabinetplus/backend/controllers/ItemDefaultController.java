package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.ItemDefaultDTO;
import com.cabinetplus.backend.dto.ItemDefaultRequest;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.ItemDefault;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.ItemDefaultService;
import com.cabinetplus.backend.services.UserService;
import lombok.RequiredArgsConstructor;
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

    @GetMapping
    public ResponseEntity<List<ItemDefaultDTO>> getAll(Principal principal) {
        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        List<ItemDefaultDTO> dtos = itemDefaultService.getDefaultsForDentist(dentist)
                .stream()
                .map(itemDefaultService::toDTO)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ItemDefaultDTO> getById(@PathVariable Long id, Principal principal) {
        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        ItemDefault def = itemDefaultService.getDefaultByIdForDentist(id, dentist)
                .orElseThrow(() -> new NotFoundException("Article par defaut introuvable"));
        return ResponseEntity.ok(itemDefaultService.toDTO(def));
    }

    @PostMapping
    public ResponseEntity<ItemDefaultDTO> create(@Valid @RequestBody ItemDefaultRequest request, Principal principal) {
        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        ItemDefault itemDefault = new ItemDefault();
        itemDefault.setName(request.name() != null ? request.name().trim() : null);
        itemDefault.setCategory(request.category());
        itemDefault.setDefaultPrice(request.defaultPrice());
        itemDefault.setDescription(request.description() != null ? request.description().trim() : null);
        itemDefault.setCreatedBy(dentist);

        ItemDefault saved = itemDefaultService.createDefault(itemDefault, dentist);
        return ResponseEntity.ok(itemDefaultService.toDTO(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ItemDefaultDTO> update(@PathVariable Long id,
                                                 @Valid @RequestBody ItemDefaultRequest request,
                                                 Principal principal) {
        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        ItemDefault updated = new ItemDefault();
        updated.setName(request.name() != null ? request.name().trim() : null);
        updated.setCategory(request.category());
        updated.setDefaultPrice(request.defaultPrice());
        updated.setDescription(request.description() != null ? request.description().trim() : null);

        ItemDefault saved = itemDefaultService.updateDefault(id, updated, dentist);
        return ResponseEntity.ok(itemDefaultService.toDTO(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        itemDefaultService.deleteDefault(id, dentist);
        return ResponseEntity.noContent().build();
    }
}

