package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.Medication;
import com.cabinetplus.backend.models.User;
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

    public List<Medication> findAllByUser(User user) {
        return medicationRepository.findByCreatedBy(user);
    }

    public Optional<Medication> findByIdAndUser(Long id, User user) {
        return medicationRepository.findByIdAndCreatedBy(id, user);
    }

    public Optional<Medication> findByNameAndUser(String name, User user) {
        return medicationRepository.findByNameAndCreatedBy(name, user);
    }

    public Optional<Medication> update(Long id, Medication updated, User user) {
        return medicationRepository.findByIdAndCreatedBy(id, user)
                .map(existing -> {
                    updated.setId(id);
                    updated.setCreatedBy(user);
                    return medicationRepository.save(updated);
                });
    }

    public boolean deleteByUser(Long id, User user) {
        return medicationRepository.findByIdAndCreatedBy(id, user)
                .map(medication -> {
                    medicationRepository.delete(medication);
                    return true;
                })
                .orElse(false);
    }
}
