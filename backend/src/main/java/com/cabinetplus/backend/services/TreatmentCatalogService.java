package com.cabinetplus.backend.services;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.models.TreatmentCatalog;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.ConflictException;
import com.cabinetplus.backend.repositories.TreatmentCatalogRepository;
import com.cabinetplus.backend.repositories.TreatmentRepository;

@Service
public class TreatmentCatalogService {

    private final TreatmentCatalogRepository treatmentCatalogRepository;
    private final TreatmentRepository treatmentRepository;

    public TreatmentCatalogService(TreatmentCatalogRepository treatmentCatalogRepository, TreatmentRepository treatmentRepository) {
        this.treatmentCatalogRepository = treatmentCatalogRepository;
        this.treatmentRepository = treatmentRepository;
    }

    public TreatmentCatalog save(TreatmentCatalog catalog) {
        if (catalog == null) {
            throw new BadRequestException(java.util.Map.of("_", "Corps de requete invalide"));
        }
        if (catalog.getCreatedBy() == null) {
            throw new BadRequestException(java.util.Map.of("createdBy", "Utilisateur invalide"));
        }
        assertUniqueName(catalog.getName(), catalog.getCreatedBy(), catalog.getId());
        if (catalog.isFlatFee()) {
            catalog.setMultiUnit(false);
        }
        return treatmentCatalogRepository.save(catalog);
    }

    public List<TreatmentCatalog> findAllByUser(User user) {
        return treatmentCatalogRepository.findByCreatedBy(user);
    }

    public Optional<TreatmentCatalog> findByIdAndUser(Long id, User user) {
        return treatmentCatalogRepository.findByIdAndCreatedBy(id, user);
    }

    public Optional<TreatmentCatalog> update(Long id, TreatmentCatalog updated, User user) {
        return treatmentCatalogRepository.findByIdAndCreatedBy(id, user)
                .map(existing -> {
                    assertUniqueName(updated.getName(), user, id);
                    updated.setId(id);
                    updated.setCreatedBy(user);
                    if (updated.isFlatFee()) {
                        updated.setMultiUnit(false);
                    }
                    return treatmentCatalogRepository.save(updated);
                });
    }

    public boolean deleteByUser(Long id, User user) {
        return treatmentCatalogRepository.findByIdAndCreatedBy(id, user)
                .map(catalog -> {
                    long usageCount = treatmentRepository.countByTreatmentCatalogIdAndPractitioner(id, user);
                    if (usageCount > 0) {
                        throw new ConflictException("Suppression impossible: ce traitement du catalogue est utilise");
                    }
                    treatmentCatalogRepository.delete(catalog);
                    return true;
                })
                .orElse(false);
    }

    private void assertUniqueName(String name, User user, Long excludeId) {
        String normalized = name != null ? name.trim() : "";
        if (normalized.isBlank()) return;
        boolean exists = excludeId == null
                ? treatmentCatalogRepository.existsByCreatedByAndNameIgnoreCase(user, normalized)
                : treatmentCatalogRepository.existsByCreatedByAndNameIgnoreCaseAndIdNot(user, normalized, excludeId);
        if (exists) {
            throw new BadRequestException(java.util.Map.of("name", "Un element avec ce nom existe deja"));
        }
    }
}
