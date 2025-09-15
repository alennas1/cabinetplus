package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.ItemDTO;
import com.cabinetplus.backend.models.Item;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.ItemService;
import com.cabinetplus.backend.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/items")
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;
    private final UserService userService; // to fetch User from JWT Principal

    @GetMapping
    public ResponseEntity<List<ItemDTO>> getAll(Principal principal) {
        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<ItemDTO> dtos = itemService.getItemsForDentist(dentist)
                .stream()
                .map(itemService::toDTO)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ItemDTO> getById(@PathVariable Long id, Principal principal) {
        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return itemService.getItemByIdForDentist(id, dentist)
                .map(itemService::toDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ItemDTO> create(@RequestBody Item item, Principal principal) {
        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        item.setCreatedBy(dentist);
        Item saved = itemService.createItem(item, dentist);
        return ResponseEntity.ok(itemService.toDTO(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ItemDTO> update(@PathVariable Long id,
                                          @RequestBody Item updated,
                                          Principal principal) {
        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        Item saved = itemService.updateItem(id, updated, dentist);
        return ResponseEntity.ok(itemService.toDTO(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        itemService.deleteItem(id, dentist);
        return ResponseEntity.noContent().build();
    }
}
