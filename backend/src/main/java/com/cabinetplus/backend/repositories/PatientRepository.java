package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;

public interface PatientRepository extends JpaRepository<Patient, Long> {
      List<Patient> findByCreatedBy(User user);   // filter by dentist
    Optional<Patient> findByIdAndCreatedBy(Long id, User user); // optional for security
}

