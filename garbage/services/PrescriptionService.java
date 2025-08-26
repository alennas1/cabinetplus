package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PrescriptionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;

    public PrescriptionService(PrescriptionRepository prescriptionRepository) {
        this.prescriptionRepository = prescriptionRepository;
    }

    public Prescription save(Prescription prescription) {
        return prescriptionRepository.save(prescription);
    }

    public List<Prescription> findAll() {
        return prescriptionRepository.findAll();
    }

    public Optional<Prescription> findById(Long id) {
        return prescriptionRepository.findById(id);
    }

    public List<Prescription> findByPatient(Patient patient) {
        return prescriptionRepository.findByPatient(patient);
    }

    public List<Prescription> findByPractitioner(User practitioner) {
        return prescriptionRepository.findByPractitioner(practitioner);
    }

    public void delete(Long id) {
        prescriptionRepository.deleteById(id);
    }
}
