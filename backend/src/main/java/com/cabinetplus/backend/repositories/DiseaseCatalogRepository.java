package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.models.DiseaseCatalog;
import com.cabinetplus.backend.models.User;

public interface DiseaseCatalogRepository extends JpaRepository<DiseaseCatalog, Long> {
    List<DiseaseCatalog> findByCreatedBy(User user);
    Optional<DiseaseCatalog> findByIdAndCreatedBy(Long id, User user);

    boolean existsByCreatedByAndNameIgnoreCase(User user, String name);
    boolean existsByCreatedByAndNameIgnoreCaseAndIdNot(User user, String name, Long id);
}

