package com.cabinetplus.backend.services;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.PatientDto;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PatientRepository;

@Service
public class PatientService {

    private final PatientRepository patientRepository;

    public PatientService(PatientRepository patientRepository) {
        this.patientRepository = patientRepository;
    }

    // Save + return DTO
    public PatientDto saveAndConvert(Patient patient) {
        Patient saved = patientRepository.save(patient);
        return toDto(saved);
    }

    // Update patient safely
    public PatientDto update(Long id, Patient updatedPatient) {
        Patient existing = patientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        existing.setFirstname(updatedPatient.getFirstname());
        existing.setLastname(updatedPatient.getLastname());
        existing.setAge(updatedPatient.getAge());
        existing.setSex(updatedPatient.getSex());   // ✅ added
        existing.setPhone(updatedPatient.getPhone());

        Patient saved = patientRepository.save(existing);
        return toDto(saved);
    }

    public List<PatientDto> findAll() {
        return patientRepository.findAll()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public Optional<PatientDto> findById(Long id) {
        return patientRepository.findById(id).map(this::toDto);
    }

    public void delete(Long id) {
        patientRepository.deleteById(id);
    }

    private PatientDto toDto(Patient patient) {
        return new PatientDto(
                patient.getId(),
                patient.getFirstname(),
                patient.getLastname(),
                patient.getAge(),
                patient.getSex(),    // ✅ added
                patient.getPhone(),
                patient.getCreatedAt()
        );
    }

      public List<PatientDto> findByCreatedBy(User user) {
        List<Patient> patients = patientRepository.findByCreatedBy(user);
        return patients.stream().map(this::toDto).toList(); // convert to DTO
    }

    public PatientDto findByIdAndUser(Long id, User user) {
    Patient patient = patientRepository.findByIdAndCreatedBy(id, user)
            .orElseThrow(() -> new RuntimeException("Patient not found"));
    return toDto(patient);  // use your existing mapping method
}
}
