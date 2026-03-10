package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.ItemDefaultDTO;
import com.cabinetplus.backend.models.ItemDefault;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.ItemDefaultService;
import com.cabinetplus.backend.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
        return itemDefaultService.getDefaultByIdForDentist(id, dentist)
                .map(itemDefaultService::toDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ItemDefaultDTO> create(@RequestBody ItemDefault itemDefault, Principal principal) {
        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        itemDefault.setCreatedBy(dentist);
        ItemDefault saved = itemDefaultService.createDefault(itemDefault, dentist);
        return ResponseEntity.ok(itemDefaultService.toDTO(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ItemDefaultDTO> update(@PathVariable Long id,
                                                 @RequestBody ItemDefault updated,
                                                 Principal principal) {
        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
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

