package com.cabinetplus.backend.services;

import com.cabinetplus.backend.dto.PrescriptionRequestDTO;
import com.cabinetplus.backend.dto.PrescriptionResponseDTO;
import com.cabinetplus.backend.dto.PrescriptionSummaryDTO;
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
    dto.setRxId(prescription.getRxId());
    dto.setDate(prescription.getDate());
    dto.setNotes(prescription.getNotes());
    dto.setPatientName(prescription.getPatient().getFirstname() + " " + prescription.getPatient().getLastname());
    dto.setPatientAge(prescription.getPatient().getAge());
    dto.setPractitionerName(prescription.getPractitioner().getFirstname() + " " + prescription.getPractitioner().getLastname());

    dto.setMedications(
        prescription.getMedications().stream().map(pm -> {
            PrescriptionMedicationDTO pmDto = new PrescriptionMedicationDTO();
            Medication med = pm.getMedication();

            // ✅ Add this line to fix null ID
            pmDto.setPrescriptionMedicationId(pm.getId()); // ✅ updated

            pmDto.setMedicationId(med.getId());
            pmDto.setName(med.getName());
            pmDto.setForm(med.getDosageForm().name()); // TABLET, SYRUP, etc.
            pmDto.setStrength(med.getStrength());
            pmDto.setDescription(med.getDescription());
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

 public List<PrescriptionSummaryDTO> getPrescriptionsByPatientId(Long patientId) {
        List<Prescription> prescriptions = prescriptionRepository.findByPatientId(patientId);

        return prescriptions.stream()
                .map(p -> new PrescriptionSummaryDTO(p.getId(), p.getRxId(), p.getDate()))
                .collect(Collectors.toList());
    }

    public void deletePrescription(Long id) {
        if (!prescriptionRepository.existsById(id)) {
            throw new RuntimeException("Prescription not found");
        }
        prescriptionRepository.deleteById(id);
    }

    public PrescriptionResponseDTO getPrescriptionById(Long id, User practitioner) {
    Prescription prescription = prescriptionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Prescription not found"));

    // Optional: check that the prescription belongs to the practitioner
    if (!prescription.getPractitioner().getId().equals(practitioner.getId())) {
        throw new RuntimeException("Not authorized to view this prescription");
    }

    return mapToResponseDTO(prescription);
}


@Transactional
public Prescription updatePrescription(Long id, PrescriptionRequestDTO dto, User practitioner) {
    Prescription prescription = prescriptionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Prescription not found"));

    if (!prescription.getPractitioner().getId().equals(practitioner.getId())) {
        throw new RuntimeException("Not authorized to update this prescription");
    }

    // Update basic fields
    prescription.setNotes(dto.getNotes());

    // Update patient if needed
    Patient patient = patientRepository.findById(Long.valueOf(dto.getPatientId()))
            .orElseThrow(() -> new RuntimeException("Patient not found"));
    prescription.setPatient(patient);

    // Update medications smartly
    // 1. Remove medications not in the update request
    List<Long> incomingMedIds = dto.getMedications().stream()
            .map(PrescriptionMedicationDTO::getMedicationId)
            .collect(Collectors.toList());

    prescription.getMedications().removeIf(pm -> !incomingMedIds.contains(pm.getMedication().getId()));

    // 2. Add or update incoming medications
    for (PrescriptionMedicationDTO medDto : dto.getMedications()) {
        PrescriptionMedication existingMed = prescription.getMedications().stream()
                .filter(pm -> pm.getMedication().getId().equals(medDto.getMedicationId()))
                .findFirst()
                .orElse(null);

        if (existingMed != null) {
            // Update existing medication
            existingMed.setAmount(String.valueOf(medDto.getAmount()));
            existingMed.setUnit(medDto.getUnit());
            existingMed.setFrequency(medDto.getFrequency());
            existingMed.setDuration(medDto.getDuration());
            existingMed.setInstructions(medDto.getInstructions());
        } else {
            // Add new medication
            PrescriptionMedication newMed = mapToPrescriptionMedication(medDto, prescription);
            prescription.getMedications().add(newMed);
        }
    }

    return prescriptionRepository.save(prescription);
}



}
