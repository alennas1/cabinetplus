package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Treatment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.TreatmentRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TreatmentService {

    private final TreatmentRepository treatmentRepository;

    public TreatmentService(TreatmentRepository treatmentRepository) {
        this.treatmentRepository = treatmentRepository;
    }

    // Save treatment (create or update)
    public Treatment save(Treatment treatment) {
        return treatmentRepository.save(treatment);
    }

    // All treatments of a practitioner
    public List<Treatment> findByPractitioner(User practitioner) {
        return treatmentRepository.findByPractitioner(practitioner);
    }

    // Treatment by ID scoped to practitioner
    public Optional<Treatment> findByIdAndPractitioner(Long id, User practitioner) {
        return treatmentRepository.findByIdAndPractitioner(id, practitioner);
    }

    // Update scoped to practitioner
    public Optional<Treatment> update(Long id, Treatment updated, User practitioner) {
        return treatmentRepository.findByIdAndPractitioner(id, practitioner)
                .map(existing -> {
                    updated.setId(id);
                    updated.setPractitioner(practitioner);
                    return treatmentRepository.save(updated);
                });
    }

    // Delete scoped to practitioner
    public boolean deleteByPractitioner(Long id, User practitioner) {
        return treatmentRepository.findByIdAndPractitioner(id, practitioner)
                .map(treatment -> {
                    treatmentRepository.delete(treatment);
                    return true;
                })
                .orElse(false);
    }

    // Treatments of a patient scoped to practitioner
    public List<Treatment> findByPatientAndPractitioner(Patient patient, User practitioner) {
        return treatmentRepository.findByPatientAndPractitioner(patient, practitioner);
    }
}
