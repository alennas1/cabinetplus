package com.cabinetplus.backend.services;

import com.cabinetplus.backend.dto.PrescriptionRequestDTO;
import com.cabinetplus.backend.dto.PrescriptionResponseDTO;
import com.cabinetplus.backend.dto.PrescriptionMedicationDTO;
import com.cabinetplus.backend.models.*;
import com.cabinetplus.backend.repositories.*;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final PatientRepository patientRepository;
    private final MedicationRepository medicationRepository;

    @Transactional
    public Prescription createPrescription(PrescriptionRequestDTO dto, User practitioner) {
        // 1. Find patient
       Patient patient = patientRepository.findById(Long.valueOf(dto.getPatientId()))
        .orElseThrow(() -> new RuntimeException("Patient not found"));

        // 2. Create prescription
        Prescription prescription = new Prescription();
        prescription.setDate(LocalDateTime.now());
        prescription.setNotes(dto.getNotes());
        prescription.setPatient(patient);
        prescription.setPractitioner(practitioner);

        // 3. Map medications
        List<PrescriptionMedication> prescriptionMedications = dto.getMedications().stream()
                .map(medDto -> mapToPrescriptionMedication(medDto, prescription))
                .collect(Collectors.toList());

        prescription.setMedications(prescriptionMedications);

        // 4. Save everything
        return prescriptionRepository.save(prescription);
    }

    private PrescriptionMedication mapToPrescriptionMedication(PrescriptionMedicationDTO medDto, Prescription prescription) {
        Medication medication = medicationRepository.findById(medDto.getMedicationId())
                .orElseThrow(() -> new RuntimeException("Medication not found"));

        PrescriptionMedication pm = new PrescriptionMedication();
        pm.setPrescription(prescription);
        pm.setMedication(medication);
        pm.setName(medication.getName());  // redundant but useful snapshot
        pm.setAmount(String.valueOf(medDto.getAmount()));
        pm.setUnit(medDto.getUnit());
        pm.setFrequency(medDto.getFrequency());
        pm.setDuration(medDto.getDuration());
        pm.setInstructions(medDto.getInstructions());

        return pm;
    }
    public PrescriptionResponseDTO mapToResponseDTO(Prescription prescription) {
    PrescriptionResponseDTO dto = new PrescriptionResponseDTO();
    dto.setId(prescription.getId());
    dto.setDate(prescription.getDate());
    dto.setNotes(prescription.getNotes());
    dto.setPatientName(prescription.getPatient().getFirstname() + " " + prescription.getPatient().getLastname());
    dto.setPatientAge(prescription.getPatient().getAge());
    dto.setPractitionerName(prescription.getPractitioner().getFirstname() + " " + prescription.getPractitioner().getLastname());
    dto.setMedications(
        prescription.getMedications().stream()
            .map(pm -> {
                PrescriptionMedicationDTO pmDto = new PrescriptionMedicationDTO();
                pmDto.setMedicationId(pm.getMedication().getId());
                pmDto.setAmount(Double.parseDouble(pm.getAmount()));
                pmDto.setUnit(pm.getUnit());
                pmDto.setFrequency(pm.getFrequency());
                pmDto.setDuration(pm.getDuration());
                pmDto.setInstructions(pm.getInstructions());
                return pmDto;
            }).collect(Collectors.toList())
    );
    return dto;
}

}
