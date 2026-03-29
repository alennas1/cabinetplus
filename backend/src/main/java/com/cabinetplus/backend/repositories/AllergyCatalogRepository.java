package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.models.AllergyCatalog;
import com.cabinetplus.backend.models.User;

public interface AllergyCatalogRepository extends JpaRepository<AllergyCatalog, Long> {
    List<AllergyCatalog> findByCreatedBy(User user);
    Optional<AllergyCatalog> findByIdAndCreatedBy(Long id, User user);

    boolean existsByCreatedByAndNameIgnoreCase(User user, String name);
    boolean existsByCreatedByAndNameIgnoreCaseAndIdNot(User user, String name, Long id);
}

