package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.cabinetplus.backend.models.Fournisseur;
import com.cabinetplus.backend.models.User;

@Repository
public interface FournisseurRepository extends JpaRepository<Fournisseur, Long> {

    List<Fournisseur> findByCreatedBy(User user);

    Optional<Fournisseur> findByIdAndCreatedBy(Long id, User user);

    Optional<Fournisseur> findByPublicIdAndCreatedBy(UUID publicId, User user);

    boolean existsByCreatedByAndNameIgnoreCase(User user, String name);

    boolean existsByCreatedByAndNameIgnoreCaseAndIdNot(User user, String name, Long id);

    List<Fournisseur> findByNameContainingIgnoreCase(String name);
}

