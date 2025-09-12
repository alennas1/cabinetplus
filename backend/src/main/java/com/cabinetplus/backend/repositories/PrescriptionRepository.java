package com.cabinetplus.backend.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.User;

public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    List<Prescription> findByPatient(Patient patient);
    List<Prescription> findByPractitioner(User practitioner);
    List<Prescription> findByPatientAndPractitioner(Patient patient, User practitioner);
    List<Prescription> findByPatientId(Long patientId);

}
