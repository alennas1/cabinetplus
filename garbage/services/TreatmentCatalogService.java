package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.TreatmentCatalog;
import com.cabinetplus.backend.repositories.TreatmentCatalogRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TreatmentCatalogService {

    private final TreatmentCatalogRepository treatmentCatalogRepository;

    public TreatmentCatalogService(TreatmentCatalogRepository treatmentCatalogRepository) {
        this.treatmentCatalogRepository = treatmentCatalogRepository;
    }

    public TreatmentCatalog save(TreatmentCatalog catalog) {
        return treatmentCatalogRepository.save(catalog);
    }

    public List<TreatmentCatalog> findAll() {
        return treatmentCatalogRepository.findAll();
    }

    public Optional<TreatmentCatalog> findById(Long id) {
        return treatmentCatalogRepository.findById(id);
    }

    public Optional<TreatmentCatalog> findByCode(String code) {
        return treatmentCatalogRepository.findByCode(code);
    }

    public void delete(Long id) {
        treatmentCatalogRepository.deleteById(id);
    }
}
