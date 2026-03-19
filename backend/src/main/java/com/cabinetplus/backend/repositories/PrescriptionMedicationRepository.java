package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.PrescriptionMedication;
import com.cabinetplus.backend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PrescriptionMedicationRepository extends JpaRepository<PrescriptionMedication, Long> {
    List<PrescriptionMedication> findByPrescription(Prescription prescription);

    Optional<PrescriptionMedication> findByIdAndPrescription_Patient_CreatedBy(Long id, User createdBy);
}
