package com.cabinetplus.backend.services;

import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.Medication;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.MedicationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class MedicationService {

    private final MedicationRepository medicationRepository;

    public MedicationService(MedicationRepository medicationRepository) {
        this.medicationRepository = medicationRepository;
    }

    public Medication save(Medication medication) {
        if (medication == null) {
            throw new BadRequestException(java.util.Map.of("_", "Corps de requete invalide"));
        }
        if (medication.getCreatedBy() == null) {
            throw new BadRequestException(java.util.Map.of("createdBy", "Utilisateur invalide"));
        }
        assertUniqueNameStrength(medication.getName(), medication.getStrength(), medication.getCreatedBy(), medication.getId());
        return medicationRepository.save(medication);
    }

    public List<Medication> findAllByUser(User user) {
        return medicationRepository.findByCreatedBy(user);
    }

    public Optional<Medication> findByIdAndUser(Long id, User user) {
        return medicationRepository.findByIdAndCreatedBy(id, user);
    }

    public Optional<Medication> findByNameAndUser(String name, User user) {
        return medicationRepository.findByNameAndCreatedBy(name, user);
    }

    public Optional<Medication> update(Long id, Medication updated, User user) {
        return medicationRepository.findByIdAndCreatedBy(id, user)
                .map(existing -> {
                    assertUniqueNameStrength(updated.getName(), updated.getStrength(), user, id);
                    updated.setId(id);
                    updated.setCreatedBy(user);
                    return medicationRepository.save(updated);
                });
    }

    public boolean deleteByUser(Long id, User user) {
        return medicationRepository.findByIdAndCreatedBy(id, user)
                .map(medication -> {
                    medicationRepository.delete(medication);
                    return true;
                })
                .orElse(false);
    }

    private void assertUniqueNameStrength(String name, String strength, User user, Long excludeId) {
        String normalizedName = name != null ? name.trim() : "";
        if (normalizedName.isBlank()) return;

        String normalizedStrength = strength != null ? strength.trim() : null;
        boolean exists;
        if (excludeId == null) {
            exists = normalizedStrength == null || normalizedStrength.isBlank()
                    ? medicationRepository.existsByCreatedByAndNameIgnoreCaseAndStrengthIsNull(user, normalizedName)
                    : medicationRepository.existsByCreatedByAndNameIgnoreCaseAndStrengthIgnoreCase(user, normalizedName, normalizedStrength);
        } else {
            exists = normalizedStrength == null || normalizedStrength.isBlank()
                    ? medicationRepository.existsByCreatedByAndNameIgnoreCaseAndStrengthIsNullAndIdNot(user, normalizedName, excludeId)
                    : medicationRepository.existsByCreatedByAndNameIgnoreCaseAndStrengthIgnoreCaseAndIdNot(user, normalizedName, normalizedStrength, excludeId);
        }

        if (exists) {
            throw new BadRequestException(java.util.Map.of("name", "Ce medicament existe deja"));
        }
    }
}
