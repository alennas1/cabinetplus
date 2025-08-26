package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Patient;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PatientRepository extends JpaRepository<Patient, Long> {
}
