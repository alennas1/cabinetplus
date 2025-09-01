package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.models.TreatmentCatalog;
import com.cabinetplus.backend.models.User;

public interface TreatmentCatalogRepository extends JpaRepository<TreatmentCatalog, Long> {
    List<TreatmentCatalog> findByCreatedBy(User user);
    Optional<TreatmentCatalog> findByIdAndCreatedBy(Long id, User user);
}
