package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.PrescriptionMedication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrescriptionMedicationRepository extends JpaRepository<PrescriptionMedication, Long> {
    List<PrescriptionMedication> findByPrescription(Prescription prescription);
}
