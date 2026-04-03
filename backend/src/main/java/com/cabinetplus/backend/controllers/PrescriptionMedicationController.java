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
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.Medication;
import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.PrescriptionMedication;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.MedicationRepository;
import com.cabinetplus.backend.repositories.PrescriptionRepository;
import com.cabinetplus.backend.services.AuditService;
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
    private final AuditService auditService;

    public PrescriptionMedicationController(
            PrescriptionMedicationService prescriptionMedicationService,
            PrescriptionRepository prescriptionRepository,
            MedicationRepository medicationRepository,
            UserService userService,
            PublicIdResolutionService publicIdResolutionService,
            AuditService auditService
    ) {
        this.prescriptionMedicationService = prescriptionMedicationService;
        this.prescriptionRepository = prescriptionRepository;
        this.medicationRepository = medicationRepository;
        this.userService = userService;
        this.publicIdResolutionService = publicIdResolutionService;
        this.auditService = auditService;
    }

    // ===================== GET =====================
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('DENTIST') or hasRole('EMPLOYEE')")
    public List<PrescriptionMedication> getAllPrescriptionMedications(Principal principal) {
        User currentUser = getCurrentUser(principal);
        if (currentUser.getRole() != UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
        }
        auditService.logSuccess(
                AuditEventType.PRESCRIPTION_READ,
                "PRESCRIPTION_MEDICATION",
                null,
                "Lignes ordonnance consultees (admin)"
        );
        return prescriptionMedicationService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DENTIST') or hasRole('EMPLOYEE')")
    public PrescriptionMedication getPrescriptionMedicationById(@PathVariable Long id, Principal principal) {
        User currentUser = getCurrentUser(principal);
        if (currentUser.getRole() == UserRole.ADMIN) {
            PrescriptionMedication pm = prescriptionMedicationService.findById(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ligne introuvable"));
            auditService.logSuccess(
                    AuditEventType.PRESCRIPTION_READ,
                    "PATIENT",
                    pm.getPrescription() != null && pm.getPrescription().getPatient() != null ? String.valueOf(pm.getPrescription().getPatient().getId()) : null,
                    "Ligne ordonnance consultee"
            );
            return pm;
        }

        User clinicOwner = userService.resolveClinicOwner(currentUser);
        PrescriptionMedication pm = prescriptionMedicationService.findByIdForClinic(id, clinicOwner)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ligne introuvable"));
        auditService.logSuccess(
                AuditEventType.PRESCRIPTION_READ,
                "PATIENT",
                pm.getPrescription() != null && pm.getPrescription().getPatient() != null ? String.valueOf(pm.getPrescription().getPatient().getId()) : null,
                "Ligne ordonnance consultee"
        );
        return pm;
    }

    @GetMapping("/prescription/{prescriptionId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DENTIST') or hasRole('EMPLOYEE')")
    public List<PrescriptionMedication> getByPrescription(@PathVariable String prescriptionId, Principal principal) {
        User currentUser = getCurrentUser(principal);
        Prescription prescription = publicIdResolutionService.requirePrescriptionForPractitionerWithMedications(prescriptionId, currentUser);
        auditService.logSuccess(
                AuditEventType.PRESCRIPTION_READ,
                "PATIENT",
                prescription != null && prescription.getPatient() != null ? String.valueOf(prescription.getPatient().getId()) : null,
                "Lignes ordonnance consultees"
        );
        return prescriptionMedicationService.findByPrescription(prescription);
    }

    // ===================== POST =====================
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('DENTIST') or hasRole('EMPLOYEE')")
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

        PrescriptionMedication saved = prescriptionMedicationService.save(med);
        auditService.logSuccess(
                AuditEventType.PRESCRIPTION_UPDATE,
                "PATIENT",
                prescription.getPatient() != null ? String.valueOf(prescription.getPatient().getId()) : null,
                "Médicament ajouté à une ordonnance"
        );
        return saved;
    }

    // ===================== PUT =====================
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DENTIST') or hasRole('EMPLOYEE')")
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

        PrescriptionMedication saved = prescriptionMedicationService.save(existing);
        auditService.logSuccess(
                AuditEventType.PRESCRIPTION_UPDATE,
                "PATIENT",
                saved.getPrescription() != null && saved.getPrescription().getPatient() != null ? String.valueOf(saved.getPrescription().getPatient().getId()) : null,
                "Médicament modifié dans une ordonnance"
        );
        return saved;
    }

    // ===================== DELETE =====================
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DENTIST') or hasRole('EMPLOYEE')")
    public void deletePrescriptionMedication(@PathVariable Long id, Principal principal) {
        User currentUser = getCurrentUser(principal);
        if (currentUser.getRole() == UserRole.ADMIN) {
            PrescriptionMedication existing = prescriptionMedicationService.findById(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ligne introuvable"));
            prescriptionMedicationService.delete(id);
            auditService.logSuccess(
                    AuditEventType.PRESCRIPTION_UPDATE,
                    "PATIENT",
                    existing.getPrescription() != null && existing.getPrescription().getPatient() != null ? String.valueOf(existing.getPrescription().getPatient().getId()) : null,
                    "Médicament supprimé d'une ordonnance"
            );
            return;
        }

        User clinicOwner = userService.resolveClinicOwner(currentUser);
        PrescriptionMedication existing = prescriptionMedicationService.findByIdForClinic(id, clinicOwner)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ligne introuvable"));
        boolean deleted = prescriptionMedicationService.deleteForClinic(id, clinicOwner);
        if (!deleted) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ligne introuvable");
        }
        auditService.logSuccess(
                AuditEventType.PRESCRIPTION_UPDATE,
                "PATIENT",
                existing.getPrescription() != null && existing.getPrescription().getPatient() != null ? String.valueOf(existing.getPrescription().getPatient().getId()) : null,
                "Médicament supprimé d'une ordonnance"
        );
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String v = value.trim();
        return v.isBlank() ? null : v;
    }

    private User getCurrentUser(Principal principal) {
        return userService.findByPhoneNumber(principal.getName())
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
