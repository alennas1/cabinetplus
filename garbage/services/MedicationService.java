package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.Medication;
import com.cabinetplus.backend.repositories.MedicationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class MedicationService {

    private final MedicationRepository medicationRepository;

    public MedicationService(MedicationRepository medicationRepository) {
        this.medicationRepository = medicationRepository;
    }

    public Medication save(Medication medication) {
        return medicationRepository.save(medication);
    }

    public List<Medication> findAll() {
        return medicationRepository.findAll();
    }

    public Optional<Medication> findById(Long id) {
        return medicationRepository.findById(id);
    }

    public Optional<Medication> findByName(String name) {
        return medicationRepository.findByName(name);
    }

    public void delete(Long id) {
        medicationRepository.deleteById(id);
    }
}
