package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.MedicationRequest;
import com.cabinetplus.backend.dto.MedicationResponse;
import com.cabinetplus.backend.models.Medication;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.MedicationService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/medications")
public class MedicationController {

    private final MedicationService medicationService;
    private final UserService userService;

    public MedicationController(MedicationService medicationService, UserService userService) {
        this.medicationService = medicationService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<MedicationResponse>> getAllMedications(Principal principal) {
        String username = principal.getName();
        User currentUser = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<MedicationResponse> response = medicationService.findAllByUser(currentUser)
                .stream()
                .map(m -> new MedicationResponse(
                        m.getId(),
                        m.getName(),
                        m.getGenericName(),
                        m.getDosageForm(),
                        m.getStrength(),
                        m.getDescription()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicationResponse> getMedicationById(@PathVariable Long id, Principal principal) {
        String username = principal.getName();
        User currentUser = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return medicationService.findByIdAndUser(id, currentUser)
                .map(m -> new MedicationResponse(
                        m.getId(),
                        m.getName(),
                        m.getGenericName(),
                        m.getDosageForm(),
                        m.getStrength(),
                        m.getDescription()
                ))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<MedicationResponse> createMedication(
            @Valid @RequestBody MedicationRequest dto,
            Principal principal) {

        String username = principal.getName();
        User currentUser = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Medication entity = new Medication();
        entity.setName(dto.getName());
        entity.setGenericName(dto.getGenericName());
        entity.setDosageForm(dto.getDosageForm());
        entity.setStrength(dto.getStrength());
        entity.setDescription(dto.getDescription());
        entity.setCreatedBy(currentUser);

        Medication saved = medicationService.save(entity);

        MedicationResponse response = new MedicationResponse(
                saved.getId(),
                saved.getName(),
                saved.getGenericName(),
                saved.getDosageForm(),
                saved.getStrength(),
                saved.getDescription()
        );

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MedicationResponse> updateMedication(
            @PathVariable Long id,
            @Valid @RequestBody MedicationRequest dto,
            Principal principal) {

        String username = principal.getName();
        User currentUser = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return medicationService.update(id, new Medication(
                id,
                dto.getName(),
                dto.getGenericName(),
                dto.getDosageForm(),
                dto.getStrength(),
                dto.getDescription(),
                currentUser
        ), currentUser).map(saved -> new MedicationResponse(
                saved.getId(),
                saved.getName(),
                saved.getGenericName(),
                saved.getDosageForm(),
                saved.getStrength(),
                saved.getDescription()
        )).map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMedication(@PathVariable Long id, Principal principal) {
        String username = principal.getName();
        User currentUser = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean deleted = medicationService.deleteByUser(id, currentUser);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
