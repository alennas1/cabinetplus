package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.PrescriptionMedication;
import com.cabinetplus.backend.repositories.PrescriptionMedicationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class PrescriptionMedicationService {

    private final PrescriptionMedicationRepository prescriptionMedicationRepository;

    public PrescriptionMedicationService(PrescriptionMedicationRepository prescriptionMedicationRepository) {
        this.prescriptionMedicationRepository = prescriptionMedicationRepository;
    }

    public PrescriptionMedication save(PrescriptionMedication prescriptionMedication) {
        return prescriptionMedicationRepository.save(prescriptionMedication);
    }

    public List<PrescriptionMedication> findAll() {
        return prescriptionMedicationRepository.findAll();
    }

    public Optional<PrescriptionMedication> findById(Long id) {
        return prescriptionMedicationRepository.findById(id);
    }

    public List<PrescriptionMedication> findByPrescription(Prescription prescription) {
        return prescriptionMedicationRepository.findByPrescription(prescription);
    }

    public void delete(Long id) {
        prescriptionMedicationRepository.deleteById(id);
    }
}
