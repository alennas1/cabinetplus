package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.models.Medication;
import com.cabinetplus.backend.models.User;

public interface MedicationRepository extends JpaRepository<Medication, Long> {
    List<Medication> findByCreatedBy(User user);
    Optional<Medication> findByIdAndCreatedBy(Long id, User user);
    Optional<Medication> findByNameAndCreatedBy(String name, User user);
}
