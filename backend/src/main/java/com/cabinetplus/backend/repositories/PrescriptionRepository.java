package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.User;  


public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    List<Prescription> findByPatient(Patient patient);
    List<Prescription> findByPractitioner(User practitioner);
    List<Prescription> findByPatientAndPractitioner(Patient patient, User practitioner);
    List<Prescription> findByPatientId(Long patientId);


    @Query("SELECT p FROM Prescription p LEFT JOIN FETCH p.medications WHERE p.id = :id")
Optional<Prescription> findByIdWithMedications(@Param("id") Long id);
}
