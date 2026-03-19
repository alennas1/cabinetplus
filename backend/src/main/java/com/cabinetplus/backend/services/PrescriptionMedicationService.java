package com.cabinetplus.backend.services;

import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.PrescriptionMedication;
import com.cabinetplus.backend.models.User;
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
        if (prescriptionMedication == null) {
            throw new BadRequestException(java.util.Map.of("_", "Corps de requete invalide"));
        }
        Prescription prescription = prescriptionMedication.getPrescription();
        if (prescription == null) {
            throw new BadRequestException(java.util.Map.of("prescriptionId", "Ordonnance invalide"));
        }
        User clinicOwner = prescription.getPatient() != null ? prescription.getPatient().getCreatedBy() : null;
        if (clinicOwner == null || clinicOwner.getId() == null) {
            throw new BadRequestException(java.util.Map.of("prescriptionId", "Ordonnance invalide"));
        }
        if (prescriptionMedication.getMedication() == null
                || prescriptionMedication.getMedication().getCreatedBy() == null
                || prescriptionMedication.getMedication().getCreatedBy().getId() == null) {
            throw new BadRequestException(java.util.Map.of("medicationId", "Medicament invalide"));
        }
        if (!prescriptionMedication.getMedication().getCreatedBy().getId().equals(clinicOwner.getId())) {
            throw new BadRequestException(java.util.Map.of("medicationId", "Medicament introuvable"));
        }
        if (prescriptionMedication.getMedication().getName() != null) {
            prescriptionMedication.setName(prescriptionMedication.getMedication().getName());
        }
        return prescriptionMedicationRepository.save(prescriptionMedication);
    }

    public List<PrescriptionMedication> findAll() {
        return prescriptionMedicationRepository.findAll();
    }

    public Optional<PrescriptionMedication> findById(Long id) {
        return prescriptionMedicationRepository.findById(id);
    }

    public Optional<PrescriptionMedication> findByIdForClinic(Long id, User clinicOwner) {
        return prescriptionMedicationRepository.findByIdAndPrescription_Patient_CreatedBy(id, clinicOwner);
    }

    public List<PrescriptionMedication> findByPrescription(Prescription prescription) {
        return prescriptionMedicationRepository.findByPrescription(prescription);
    }

    public void delete(Long id) {
        prescriptionMedicationRepository.deleteById(id);
    }

    public boolean deleteForClinic(Long id, User clinicOwner) {
        return prescriptionMedicationRepository.findByIdAndPrescription_Patient_CreatedBy(id, clinicOwner)
                .map(pm -> {
                    prescriptionMedicationRepository.delete(pm);
                    return true;
                })
                .orElse(false);
    }
}
