package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    List<Prescription> findByPatient(Patient patient);
    List<Prescription> findByPractitioner(User practitioner);
}
