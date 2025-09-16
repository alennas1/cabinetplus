package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.CreateItemDTO;
import com.cabinetplus.backend.dto.ItemDTO;
import com.cabinetplus.backend.dto.UpdateItemDTO;
import com.cabinetplus.backend.models.Item;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.ItemService;
import com.cabinetplus.backend.services.UserService;

import lombok.RequiredArgsConstructor;

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
public ResponseEntity<ItemDTO> create(@RequestBody CreateItemDTO dto, Principal principal) {
    User dentist = userService.findByUsername(principal.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
    
    Item saved = itemService.createItemFromDTO(dto, dentist);
    return ResponseEntity.ok(itemService.toDTO(saved));
}

   @PutMapping("/{id}")
public ResponseEntity<ItemDTO> update(@PathVariable Long id,
                                      @RequestBody UpdateItemDTO dto,
                                      Principal principal) {
    User dentist = userService.findByUsername(principal.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));

    // fetch existing item
    Item existingItem = itemService.getItemByIdForDentist(id, dentist)
            .orElseThrow(() -> new RuntimeException("Item not found"));

    // update only editable fields
    existingItem.setQuantity(dto.getQuantity());
    existingItem.setUnitPrice(dto.getUnitPrice());
    existingItem.calculatePrice(); // recalc total price
existingItem.setExpiryDate(dto.getExpiryDate());
    Item saved = itemService.updateItem(id, existingItem, dentist);

    return ResponseEntity.ok(itemService.toDTO(saved));
}

    @DeleteMapping("/{id}")
public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
    User dentist = userService.findByUsername(principal.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));

    // Option 1: hard delete
    itemService.getItemByIdForDentist(id, dentist)
            .orElseThrow(() -> new RuntimeException("Item not found"));

    itemService.deleteItem(id, dentist);
    return ResponseEntity.noContent().build();
}
}
