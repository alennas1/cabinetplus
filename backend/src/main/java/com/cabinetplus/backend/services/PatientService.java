package com.cabinetplus.backend.services;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.PatientDto;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PatientRepository;

@Service
public class PatientService {

    private final PatientRepository patientRepository;
    private final PlanLimitService planLimitService;

    public PatientService(PatientRepository patientRepository, PlanLimitService planLimitService) {
        this.patientRepository = patientRepository;
        this.planLimitService = planLimitService;
    }

    // Save + return DTO
    public PatientDto saveAndConvert(Patient patient) {
        if (patient == null) {
            throw new com.cabinetplus.backend.exceptions.BadRequestException(java.util.Map.of("_", "Corps de requete invalide"));
        }
        if (patient.getCreatedBy() == null) {
            throw new com.cabinetplus.backend.exceptions.BadRequestException(java.util.Map.of("createdBy", "Utilisateur invalide"));
        }

        planLimitService.assertPatientLimitNotReached(patient.getCreatedBy());
        Patient saved = patientRepository.save(patient);
        return toDto(saved);
    }

    // Update patient safely
    public PatientDto update(Long id, Patient updatedPatient, User ownerDentist) {
        Patient existing = patientRepository.findByIdAndCreatedBy(id, ownerDentist)
                .orElseThrow(() -> new RuntimeException("Patient introuvable"));
        if (existing.getArchivedAt() != null) {
            throw new com.cabinetplus.backend.exceptions.BadRequestException(java.util.Map.of("_", "Patient archivé : lecture seule."));
        }
        if (updatedPatient == null) {
            throw new com.cabinetplus.backend.exceptions.BadRequestException(java.util.Map.of("_", "Corps de requete invalide"));
        }

        // Partial update: apply only provided fields (null means "no change").
        if (updatedPatient.getFirstname() != null) existing.setFirstname(updatedPatient.getFirstname());
        if (updatedPatient.getLastname() != null) existing.setLastname(updatedPatient.getLastname());
        if (updatedPatient.getAge() != null) existing.setAge(updatedPatient.getAge());
        if (updatedPatient.getSex() != null) existing.setSex(updatedPatient.getSex());
        if (updatedPatient.getPhone() != null) existing.setPhone(updatedPatient.getPhone());
        if (updatedPatient.getDiseases() != null) existing.setDiseases(updatedPatient.getDiseases());
        if (updatedPatient.getAllergies() != null) existing.setAllergies(updatedPatient.getAllergies());

        Patient saved = patientRepository.save(existing);
        return toDto(saved);
    }

    public void delete(Long id, User ownerDentist) {
        Patient existing = patientRepository.findByIdAndCreatedBy(id, ownerDentist)
                .orElseThrow(() -> new RuntimeException("Patient introuvable"));
        if (existing.getArchivedAt() != null) {
            throw new com.cabinetplus.backend.exceptions.BadRequestException(java.util.Map.of("_", "Patient archivé : lecture seule."));
        }
        existing.setArchivedAt(LocalDateTime.now());
        patientRepository.save(existing);
    }

    private PatientDto toDto(Patient patient) {
        String createdByName = null;
        if (patient.getCreatedBy() != null) {
            String first = patient.getCreatedBy().getFirstname() != null ? patient.getCreatedBy().getFirstname().trim() : "";
            String last = patient.getCreatedBy().getLastname() != null ? patient.getCreatedBy().getLastname().trim() : "";
            String combined = (first + " " + last).trim();
            createdByName = combined.isBlank() ? null : combined;
        }
        return new PatientDto(
                patient.getId(),
                patient.getPublicId(),
                patient.getFirstname(),
                patient.getLastname(),
                patient.getAge(),
                patient.getSex(),    //  added
                patient.getPhone(),
                patient.getDiseases(),
                patient.getAllergies(),
                patient.getCreatedAt(),
                0L,
                0.0,
                false,
                false,
                false,
                patient.getArchivedAt(),
                createdByName
        );
    }

      public List<PatientDto> findByCreatedBy(User user) {
        List<Patient> patients = patientRepository.findByCreatedBy(user);
        return patients.stream().map(this::toDto).toList(); // convert to DTO
    }

    public PatientDto findByIdAndUser(Long id, User user) {
    Patient patient = patientRepository.findByIdAndCreatedBy(id, user)
            .orElseThrow(() -> new RuntimeException("Patient introuvable"));
    return toDto(patient);  // use your existing mapping method
}
}

