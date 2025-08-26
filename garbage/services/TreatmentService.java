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

    public Treatment save(Treatment treatment) {
        return treatmentRepository.save(treatment);
    }

    public List<Treatment> findAll() {
        return treatmentRepository.findAll();
    }

    public Optional<Treatment> findById(Long id) {
        return treatmentRepository.findById(id);
    }

    public List<Treatment> findByPatient(Patient patient) {
        return treatmentRepository.findByPatient(patient);
    }

    public List<Treatment> findByPractitioner(User practitioner) {
        return treatmentRepository.findByPractitioner(practitioner);
    }

    public void delete(Long id) {
        treatmentRepository.deleteById(id);
    }
}
