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

import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.dto.MedicationRequest;
import com.cabinetplus.backend.dto.MedicationResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.models.Medication;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.MedicationService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/medications")
public class MedicationController {

    private final MedicationService medicationService;
    private final UserService userService;
    private final AuditService auditService;

    public MedicationController(MedicationService medicationService, UserService userService, AuditService auditService) {
        this.medicationService = medicationService;
        this.userService = userService;
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<List<MedicationResponse>> getAllMedications(Principal principal) {
        User currentUser = getCurrentUser(principal);

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

        auditService.logSuccess(AuditEventType.MEDICATION_READ, "MEDICATION", null, "Médicaments consultés");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicationResponse> getMedicationById(@PathVariable Long id, Principal principal) {
        User currentUser = getCurrentUser(principal);

        Medication m = medicationService.findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new NotFoundException("Medicament introuvable"));
        auditService.logSuccess(AuditEventType.MEDICATION_READ, "MEDICATION", String.valueOf(m.getId()), "Médicament consulté");

        return ResponseEntity.ok(new MedicationResponse(
                m.getId(),
                m.getName(),
                m.getGenericName(),
                m.getDosageForm(),
                m.getStrength(),
                m.getDescription()
        ));
    }

    @PostMapping
    public ResponseEntity<MedicationResponse> createMedication(
        @Valid @RequestBody MedicationRequest dto,
            Principal principal) {

        User currentUser = getCurrentUser(principal);

        Medication entity = new Medication();
        entity.setName(dto.getName());
        entity.setGenericName(dto.getGenericName());
        entity.setDosageForm(dto.getDosageForm());
        entity.setStrength(dto.getStrength());
        entity.setDescription(dto.getDescription());
        entity.setCreatedBy(currentUser);

        Medication saved = medicationService.save(entity);
        auditService.logSuccess(AuditEventType.MEDICATION_CREATE, "MEDICATION", String.valueOf(saved.getId()), "Médicament créé");

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

        User currentUser = getCurrentUser(principal);

        Medication saved = medicationService.update(id, new Medication(
                id,
                dto.getName(),
                dto.getGenericName(),
                dto.getDosageForm(),
                dto.getStrength(),
                dto.getDescription(),
                currentUser
        ), currentUser).orElseThrow(() -> new NotFoundException("Medicament introuvable"));
        auditService.logSuccess(AuditEventType.MEDICATION_UPDATE, "MEDICATION", String.valueOf(saved.getId()), "Médicament modifié");

        return ResponseEntity.ok(new MedicationResponse(
                saved.getId(),
                saved.getName(),
                saved.getGenericName(),
                saved.getDosageForm(),
                saved.getStrength(),
                saved.getDescription()
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMedication(@PathVariable Long id, Principal principal) {
        User currentUser = getCurrentUser(principal);

        boolean deleted = medicationService.deleteByUser(id, currentUser);
        if (!deleted) {
            throw new NotFoundException("Medicament introuvable");
        }
        auditService.logSuccess(AuditEventType.MEDICATION_DELETE, "MEDICATION", String.valueOf(id), "Médicament supprimé");
        return ResponseEntity.noContent().build();
    }

    private User getCurrentUser(Principal principal) {
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
    }
}

