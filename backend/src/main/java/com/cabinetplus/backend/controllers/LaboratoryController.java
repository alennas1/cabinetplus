package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.cabinetplus.backend.dto.*;
import com.cabinetplus.backend.models.*;
import com.cabinetplus.backend.services.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/laboratories")
public class LaboratoryController {
    private final LaboratoryService service;
    private final UserService userService;

    public LaboratoryController(LaboratoryService service, UserService userService) {
        this.service = service;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<LaboratoryResponse>> getAll(Principal principal) {
        User user = getCurrentUser(principal);
        return ResponseEntity.ok(service.findAllByUser(user).stream().map(this::mapToResponse).collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<LaboratoryResponse> create(@Valid @RequestBody LaboratoryRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        Laboratory entity = new Laboratory();
        entity.setName(dto.name());
        entity.setContactPerson(dto.contactPerson());
        entity.setPhoneNumber(dto.phoneNumber());
        entity.setAddress(dto.address());
        entity.setCreatedBy(user);
        return ResponseEntity.ok(mapToResponse(service.save(entity)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LaboratoryResponse> update(@PathVariable Long id, @Valid @RequestBody LaboratoryRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        Laboratory updateData = new Laboratory();
        updateData.setName(dto.name());
        updateData.setContactPerson(dto.contactPerson());
        updateData.setPhoneNumber(dto.phoneNumber());
        updateData.setAddress(dto.address());
        return service.update(id, updateData, user).map(this::mapToResponse).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        return service.deleteByUser(id, getCurrentUser(principal)) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    private User getCurrentUser(Principal principal) {
        return userService.findByUsername(principal.getName()).orElseThrow(() -> new RuntimeException("User not found"));
    }

    private LaboratoryResponse mapToResponse(Laboratory l) {
        return new LaboratoryResponse(l.getId(), l.getName(), l.getContactPerson(), l.getPhoneNumber(), l.getAddress());
    }
}