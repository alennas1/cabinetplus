package com.cabinetplus.backend.services;

import java.text.DecimalFormat;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.PrescriptionMedicationDTO;
import com.cabinetplus.backend.dto.PrescriptionRequestDTO;
import com.cabinetplus.backend.dto.PrescriptionResponseDTO;
import com.cabinetplus.backend.dto.PrescriptionSummaryDTO;
import com.cabinetplus.backend.models.Medication;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.PrescriptionMedication;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.MedicationRepository;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.repositories.PrescriptionRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final PatientRepository patientRepository;
    private final MedicationRepository medicationRepository;
    
    // Formatter to remove trailing .0 but keep other decimals
    private final DecimalFormat df = new DecimalFormat("###.##");

    @Transactional
    public Prescription createPrescription(PrescriptionRequestDTO dto, User practitioner) {
        Patient patient = patientRepository.findById(dto.getPatientId())
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        Prescription prescription = new Prescription();
        prescription.setDate(LocalDateTime.now());
        prescription.setNotes(dto.getNotes());
        prescription.setPatient(patient);
        prescription.setPractitioner(practitioner);

        List<PrescriptionMedication> medications = dto.getMedications().stream()
                .map(m -> mapToPrescriptionMedication(m, prescription))
                .collect(Collectors.toList());

        prescription.setMedications(medications);
        return prescriptionRepository.save(prescription);
    }

    private PrescriptionMedication mapToPrescriptionMedication(PrescriptionMedicationDTO medDto, Prescription prescription) {
        Medication medication = medicationRepository.findById(medDto.getMedicationId())
                .orElseThrow(() -> new RuntimeException("Medication not found"));

        PrescriptionMedication pm = new PrescriptionMedication();
        pm.setPrescription(prescription);
        pm.setMedication(medication);
        pm.setName(medication.getName());
        
        // Clean formatting: 1000.0 -> "1000", 1.5 -> "1.5"
        pm.setAmount(df.format(medDto.getAmount()));
        
        pm.setUnit(medDto.getUnit());
        pm.setFrequency(medDto.getFrequency());
        pm.setDuration(medDto.getDuration());
        pm.setInstructions(medDto.getInstructions());
        return pm;
    }

    public Prescription getPrescriptionEntity(Long id, User practitioner) {
        Prescription prescription = prescriptionRepository.findByIdWithMedications(id)
                .orElseThrow(() -> new RuntimeException("Prescription not found"));

        if (!prescription.getPractitioner().getId().equals(practitioner.getId())) {
            throw new RuntimeException("Not authorized to access this prescription");
        }
        return prescription;
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

        dto.setMedications(prescription.getMedications().stream().map(pm -> {
            PrescriptionMedicationDTO pmDto = new PrescriptionMedicationDTO();
            pmDto.setPrescriptionMedicationId(pm.getId());
            pmDto.setMedicationId(pm.getMedication().getId());
            pmDto.setName(pm.getName());
            pmDto.setAmount(Double.parseDouble(pm.getAmount()));
            pmDto.setUnit(pm.getUnit());
            pmDto.setGenericName(pm.getMedication().getGenericName());
            pmDto.setStrength(pm.getMedication().getStrength());
            pmDto.setFrequency(pm.getFrequency());
            pmDto.setDuration(pm.getDuration());
            pmDto.setInstructions(pm.getInstructions());
            return pmDto;
        }).collect(Collectors.toList()));

        return dto;
    }

    public List<PrescriptionSummaryDTO> getPrescriptionsByPatientId(Long patientId) {
        return prescriptionRepository.findByPatientId(patientId).stream()
                .map(p -> new PrescriptionSummaryDTO(p.getId(), p.getRxId(), p.getDate()))
                .collect(Collectors.toList());
    }

    public void deletePrescription(Long id) {
        if (!prescriptionRepository.existsById(id)) throw new RuntimeException("Prescription not found");
        prescriptionRepository.deleteById(id);
    }

    public PrescriptionResponseDTO getPrescriptionById(Long id, User practitioner) {
        return mapToResponseDTO(getPrescriptionEntity(id, practitioner));
    }

  @Transactional
public Prescription updatePrescription(Long id, PrescriptionRequestDTO dto, User practitioner) {
    // 1. Fetch the existing prescription and check ownership
    Prescription prescription = getPrescriptionEntity(id, practitioner);
    
    // 2. Update basic fields
    prescription.setNotes(dto.getNotes());
    Patient patient = patientRepository.findById(dto.getPatientId())
            .orElseThrow(() -> new RuntimeException("Patient not found"));
    prescription.setPatient(patient);

    // 3. Identify which items to KEEP vs. which to DELETE
    // We collect the IDs of medications that are coming from the frontend
    List<Long> incomingPrescriptionMedIds = dto.getMedications().stream()
            .map(PrescriptionMedicationDTO::getPrescriptionMedicationId)
            .filter(nodeId -> nodeId != null) // New items won't have an ID yet
            .collect(Collectors.toList());

    // Remove medications from the database that are NOT in the incoming list
    prescription.getMedications().removeIf(pm -> 
        pm.getId() != null && !incomingPrescriptionMedIds.contains(pm.getId())
    );

    // 4. Update existing items or Add new ones
    for (PrescriptionMedicationDTO medDto : dto.getMedications()) {
        if (medDto.getPrescriptionMedicationId() != null) {
            // CASE: Update existing line
            prescription.getMedications().stream()
                .filter(pm -> pm.getId().equals(medDto.getPrescriptionMedicationId()))
                .findFirst()
                .ifPresent(existing -> {
                    existing.setAmount(df.format(medDto.getAmount()));
                    existing.setUnit(medDto.getUnit());
                    existing.setFrequency(medDto.getFrequency());
                    existing.setDuration(medDto.getDuration());
                    existing.setInstructions(medDto.getInstructions());
                    // Update name in case it changed in the medication DB
                    existing.setName(existing.getMedication().getName()); 
                });
        } else {
            // CASE: This is a brand new medication added during the edit session
            prescription.getMedications().add(mapToPrescriptionMedication(medDto, prescription));
        }
    }

    return prescriptionRepository.save(prescription);
}
}