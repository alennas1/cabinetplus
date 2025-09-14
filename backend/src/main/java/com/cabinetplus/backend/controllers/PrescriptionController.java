package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.PrescriptionRequestDTO;
import com.cabinetplus.backend.dto.PrescriptionResponseDTO;
import com.cabinetplus.backend.dto.PrescriptionSummaryDTO;
import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.PrescriptionService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/prescriptions")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionService prescriptionService;
    private final UserService userService;

 @PostMapping
public ResponseEntity<PrescriptionResponseDTO> createPrescription(
        @Valid @RequestBody PrescriptionRequestDTO dto,
        Principal principal
) {
    String username = principal.getName();
    User practitioner = userService.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Practitioner not found"));

    Prescription prescription = prescriptionService.createPrescription(dto, practitioner);

    PrescriptionResponseDTO response = prescriptionService.mapToResponseDTO(prescription);
    return ResponseEntity.ok(response);
}

@GetMapping("/patient/{patientId}")
public ResponseEntity<List<PrescriptionSummaryDTO>> getPrescriptionsByPatient(
        @PathVariable Long patientId
) {
    List<PrescriptionSummaryDTO> prescriptions = prescriptionService.getPrescriptionsByPatientId(patientId);
    return ResponseEntity.ok(prescriptions);
}
@DeleteMapping("/{id}")
    public ResponseEntity<?> deletePrescription(@PathVariable Long id) {
        try {
            prescriptionService.deletePrescription(id);
            return ResponseEntity.ok().body("Prescription deleted successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        }
    }
    
    @GetMapping("/{id}")
public ResponseEntity<PrescriptionResponseDTO> getPrescriptionById(
        @PathVariable Long id,
        Principal principal
) {
    String username = principal.getName();
    User practitioner = userService.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Practitioner not found"));

    try {
        PrescriptionResponseDTO prescription = prescriptionService.getPrescriptionById(id, practitioner);
        return ResponseEntity.ok(prescription);
    } catch (RuntimeException e) {
        return ResponseEntity.status(404).body(null);
    }
}

@PutMapping("/{id}")
public ResponseEntity<PrescriptionResponseDTO> updatePrescription(
        @PathVariable Long id,
        @Valid @RequestBody PrescriptionRequestDTO dto,
        Principal principal
) {
    String username = principal.getName();
    User practitioner = userService.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Practitioner not found"));

    try {
        Prescription updatedPrescription = prescriptionService.updatePrescription(id, dto, practitioner);
        PrescriptionResponseDTO response = prescriptionService.mapToResponseDTO(updatedPrescription);
        return ResponseEntity.ok(response);
    } catch (RuntimeException e) {
        return ResponseEntity.status(404).body(null);
    }
}
}
