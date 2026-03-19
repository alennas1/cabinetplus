package com.cabinetplus.backend.controllers;

import java.util.List;
import java.util.Optional;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import com.cabinetplus.backend.dto.PrescriptionMedicationRequest;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.Medication;
import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.PrescriptionMedication;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.MedicationRepository;
import com.cabinetplus.backend.repositories.PrescriptionRepository;
import com.cabinetplus.backend.services.PrescriptionMedicationService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;
import java.security.Principal;

@RestController
@RequestMapping("/api/prescription-medications")
public class PrescriptionMedicationController {

    private final PrescriptionMedicationService prescriptionMedicationService;
    private final PrescriptionRepository prescriptionRepository;
    private final MedicationRepository medicationRepository;
    private final UserService userService;
    private final PublicIdResolutionService publicIdResolutionService;

    public PrescriptionMedicationController(
            PrescriptionMedicationService prescriptionMedicationService,
            PrescriptionRepository prescriptionRepository,
            MedicationRepository medicationRepository,
            UserService userService,
            PublicIdResolutionService publicIdResolutionService
    ) {
        this.prescriptionMedicationService = prescriptionMedicationService;
        this.prescriptionRepository = prescriptionRepository;
        this.medicationRepository = medicationRepository;
        this.userService = userService;
        this.publicIdResolutionService = publicIdResolutionService;
    }

    // ===================== GET =====================
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('DENTIST')")
    public List<PrescriptionMedication> getAllPrescriptionMedications(Principal principal) {
        User currentUser = getCurrentUser(principal);
        if (currentUser.getRole() != UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
        }
        return prescriptionMedicationService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DENTIST')")
    public PrescriptionMedication getPrescriptionMedicationById(@PathVariable Long id, Principal principal) {
        User currentUser = getCurrentUser(principal);
        if (currentUser.getRole() == UserRole.ADMIN) {
            return prescriptionMedicationService.findById(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ligne introuvable"));
        }

        User clinicOwner = userService.resolveClinicOwner(currentUser);
        return prescriptionMedicationService.findByIdForClinic(id, clinicOwner)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ligne introuvable"));
    }

    @GetMapping("/prescription/{prescriptionId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DENTIST')")
    public List<PrescriptionMedication> getByPrescription(@PathVariable String prescriptionId, Principal principal) {
        User currentUser = getCurrentUser(principal);
        Prescription prescription = publicIdResolutionService.requirePrescriptionForPractitionerWithMedications(prescriptionId, currentUser);
        return prescriptionMedicationService.findByPrescription(prescription);
    }

    // ===================== POST =====================
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('DENTIST')")
    public PrescriptionMedication createPrescriptionMedication(@Valid @RequestBody PrescriptionMedicationRequest request, Principal principal) {
        User currentUser = getCurrentUser(principal);
        User clinicOwner = userService.resolveClinicOwner(currentUser);

        Prescription prescription = publicIdResolutionService.requirePrescriptionForPractitionerWithMedications(
                String.valueOf(request.prescriptionId()),
                currentUser
        );

        Medication medication = medicationRepository.findByIdAndCreatedBy(request.medicationId(), clinicOwner)
                .orElseThrow(() -> new BadRequestException(java.util.Map.of("medicationId", "Medicament introuvable")));

        PrescriptionMedication med = new PrescriptionMedication();
        med.setPrescription(prescription);
        med.setMedication(medication);
        med.setName(medication.getName());
        med.setAmount(trimToNull(request.amount()));
        med.setUnit(trimToNull(request.unit()));
        med.setFrequency(trimToNull(request.frequency()));
        med.setDuration(trimToNull(request.duration()));
        med.setInstructions(trimToNull(request.instructions()));

        return prescriptionMedicationService.save(med);
    }

    // ===================== PUT =====================
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DENTIST')")
    public PrescriptionMedication updatePrescriptionMedication(@PathVariable Long id, @Valid @RequestBody PrescriptionMedicationRequest request, Principal principal) {
        User currentUser = getCurrentUser(principal);
        User clinicOwner = userService.resolveClinicOwner(currentUser);

        PrescriptionMedication existing = currentUser.getRole() == UserRole.ADMIN
                ? prescriptionMedicationService.findById(id)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ligne introuvable"))
                : prescriptionMedicationService.findByIdForClinic(id, clinicOwner)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ligne introuvable"));

        if (existing.getPrescription() == null
                || existing.getPrescription().getId() == null
                || !existing.getPrescription().getId().equals(request.prescriptionId())) {
            throw new BadRequestException(java.util.Map.of("prescriptionId", "Ordonnance invalide"));
        }

        Prescription prescription = publicIdResolutionService.requirePrescriptionForPractitionerWithMedications(
                String.valueOf(request.prescriptionId()),
                currentUser
        );

        Medication medication = medicationRepository.findByIdAndCreatedBy(request.medicationId(), clinicOwner)
                .orElseThrow(() -> new BadRequestException(java.util.Map.of("medicationId", "Medicament introuvable")));

        existing.setPrescription(prescription);
        existing.setMedication(medication);
        existing.setName(medication.getName());
        existing.setAmount(trimToNull(request.amount()));
        existing.setUnit(trimToNull(request.unit()));
        existing.setFrequency(trimToNull(request.frequency()));
        existing.setDuration(trimToNull(request.duration()));
        existing.setInstructions(trimToNull(request.instructions()));

        return prescriptionMedicationService.save(existing);
    }

    // ===================== DELETE =====================
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DENTIST')")
    public void deletePrescriptionMedication(@PathVariable Long id, Principal principal) {
        User currentUser = getCurrentUser(principal);
        if (currentUser.getRole() == UserRole.ADMIN) {
            prescriptionMedicationService.delete(id);
            return;
        }

        User clinicOwner = userService.resolveClinicOwner(currentUser);
        boolean deleted = prescriptionMedicationService.deleteForClinic(id, clinicOwner);
        if (!deleted) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ligne introuvable");
        }
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String v = value.trim();
        return v.isBlank() ? null : v;
    }

    private User getCurrentUser(Principal principal) {
        return userService.findByUsername(principal.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
    }

    private void assertPrescriptionInClinic(Prescription prescription, User clinicOwner) {
        if (prescription == null || prescription.getPractitioner() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordonnance introuvable");
        }
        User owner = userService.resolveClinicOwner(prescription.getPractitioner());
        if (owner == null
                || clinicOwner == null
                || clinicOwner.getId() == null
                || owner.getId() == null
                || !owner.getId().equals(clinicOwner.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordonnance introuvable");
        }
    }
}
