package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Justification;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JustificationRepository extends JpaRepository<Justification, Long> {

    List<Justification> findByPractitioner(User practitioner);

    Optional<Justification> findByIdAndPractitioner(Long id, User practitioner);

    List<Justification> findByPatientAndPractitioner(Patient patient, User practitioner);
}