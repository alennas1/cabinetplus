package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.PrescriptionRequestDTO;
import com.cabinetplus.backend.dto.PrescriptionResponseDTO;
import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.PrescriptionService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

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

}
