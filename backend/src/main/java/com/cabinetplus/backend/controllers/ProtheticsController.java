package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.*;
import com.cabinetplus.backend.models.*;
import com.cabinetplus.backend.services.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/protheses")
@RequiredArgsConstructor
public class ProtheticsController {
    private final ProthesisService service;
    private final UserService userService;

    // --- MERGED GET ALL METHOD ---
    @GetMapping
    public ResponseEntity<List<ProthesisResponse>> getAll(
            @RequestParam(required = false) String status, 
            Principal principal) {
        
        User user = getCurrentUser(principal);
        List<Prothesis> results;

        if (status != null && !status.isEmpty()) {
            // Handles: GET /api/protheses?status=SENT_TO_LAB
            results = service.findByPractitionerAndStatus(user, status.toUpperCase());
        } else {
            // Handles: GET /api/protheses
            results = service.findAllByUser(user);
        }

        return ResponseEntity.ok(results.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<ProthesisResponse> create(@RequestBody ProthesisRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        return ResponseEntity.ok(mapToResponse(service.create(dto, user)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProthesisResponse> update(@PathVariable Long id, @RequestBody ProthesisRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        return ResponseEntity.ok(mapToResponse(service.update(id, dto, user)));
    }

    @PutMapping("/{id}/assign-lab")
    public ResponseEntity<ProthesisResponse> assignLab(@PathVariable Long id, @RequestBody LabAssignmentRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        return ResponseEntity.ok(mapToResponse(service.assignToLab(id, dto, user)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ProthesisResponse> changeStatus(
            @PathVariable Long id, 
            @RequestParam String status, 
            Principal principal) {
        User user = getCurrentUser(principal);
        Prothesis updated = service.updateStatus(id, status, user);
        return ResponseEntity.ok(mapToResponse(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        User user = getCurrentUser(principal);
        service.delete(id, user);
        return ResponseEntity.noContent().build();
    }

    private User getCurrentUser(Principal principal) {
        User user = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
    }

  private ProthesisResponse mapToResponse(Prothesis p) {
    String patientFullName = p.getPatient().getFirstname() + " " + p.getPatient().getLastname();
    
    return new ProthesisResponse(
        p.getId(),
        p.getProthesisCatalog().getId(),
        p.getPatient().getId(),
        patientFullName,
        p.getProthesisCatalog().getName(),
        (p.getProthesisCatalog().getMaterial() != null) ? p.getProthesisCatalog().getMaterial().getName() : "N/A",
        p.getTeeth(),
        p.getFinalPrice(),
        p.getLabCost(),
        p.getCode(),
        p.getNotes(),
        p.getStatus(),
        p.getLaboratory() != null ? p.getLaboratory().getName() : "Not Sent",
        p.getDateCreated(),
        p.getSentToLabDate(),
        p.getActualReturnDate()
    );
}

@GetMapping("/patient/{patientId}")
public ResponseEntity<List<ProthesisResponse>> getByPatient(
        @PathVariable Long patientId, 
        Principal principal) {
    
    User user = getCurrentUser(principal);
    List<Prothesis> results = service.findByPatientAndPractitioner(patientId, user);

    return ResponseEntity.ok(results.stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList()));
}
}

