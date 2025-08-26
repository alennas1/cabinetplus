package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.TreatmentCatalog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TreatmentCatalogRepository extends JpaRepository<TreatmentCatalog, Long> {
    Optional<TreatmentCatalog> findByCode(String code);
}
