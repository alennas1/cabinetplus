package com.cabinetplus.backend.services;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.models.TreatmentCatalog;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.TreatmentCatalogRepository;

@Service
public class TreatmentCatalogService {

    private final TreatmentCatalogRepository treatmentCatalogRepository;

    public TreatmentCatalogService(TreatmentCatalogRepository treatmentCatalogRepository) {
        this.treatmentCatalogRepository = treatmentCatalogRepository;
    }

    public TreatmentCatalog save(TreatmentCatalog catalog) {
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
                    updated.setId(id);
                    updated.setCreatedBy(user);
                    return treatmentCatalogRepository.save(updated);
                });
    }

    public boolean deleteByUser(Long id, User user) {
        return treatmentCatalogRepository.findByIdAndCreatedBy(id, user)
                .map(catalog -> {
                    treatmentCatalogRepository.delete(catalog);
                    return true;
                })
                .orElse(false);
    }
}
