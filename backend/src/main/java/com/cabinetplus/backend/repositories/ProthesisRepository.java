package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Prothesis;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProthesisRepository extends JpaRepository<Prothesis, Long> {

    // Filter by the logged-in dentist
    List<Prothesis> findByPractitioner(User practitioner);

    // Simple status filter
    List<Prothesis> findByStatus(String status);

    // Find all protheses currently at a specific laboratory
    List<Prothesis> findByLaboratoryIdAndStatus(Long laboratoryId, String status);

    // History for a specific patient
    List<Prothesis> findByPatient(Patient patient);

    // Filter by both the dentist and the current workflow state
    List<Prothesis> findByPractitionerAndStatus(User practitioner, String status);

// In ProthesisRepository.java
List<Prothesis> findByPatientIdAndPractitioner(Long patientId, User practitioner);
List<Prothesis> findByPatientId(Long patientId);
}
