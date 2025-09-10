package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cabinetplus.backend.dto.PrescriptionDTO;
import com.cabinetplus.backend.dto.PrescriptionMedicationDTO;
import com.cabinetplus.backend.models.Medication;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.PrescriptionMedication;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.MedicationRepository;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.repositories.PrescriptionMedicationRepository;
import com.cabinetplus.backend.repositories.PrescriptionRepository;
import com.cabinetplus.backend.repositories.UserRepository;

@Service
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionMedicationRepository pmRepo;
    private final PatientRepository patientRepo;
    private final UserRepository userRepo;
    private final MedicationRepository medicationRepo;

    public PrescriptionService(
            PrescriptionRepository prescriptionRepository,
            PrescriptionMedicationRepository pmRepo,
            PatientRepository patientRepo,
            UserRepository userRepo,
            MedicationRepository medicationRepo
    ) {
        this.prescriptionRepository = prescriptionRepository;
        this.pmRepo = pmRepo;
        this.patientRepo = patientRepo;
        this.userRepo = userRepo;
        this.medicationRepo = medicationRepo;
    }

    public Prescription save(Prescription prescription) {
        return prescriptionRepository.save(prescription);
    }

    @Transactional
    public Prescription createPrescription(PrescriptionDTO dto) {
        // ✅ Fetch patient and practitioner
        Patient patient = patientRepo.findById(dto.patientId())
                .orElseThrow(() -> new RuntimeException("Patient not found"));
        User practitioner = userRepo.findById(dto.practitionerId())
                .orElseThrow(() -> new RuntimeException("Practitioner not found"));

        // ✅ Create prescription
        Prescription prescription = new Prescription();
        prescription.setPatient(patient);
        prescription.setPractitioner(practitioner);
        prescription.setDate(LocalDateTime.now());
        prescription.setNotes(dto.notes());
        prescription = prescriptionRepository.save(prescription);

        // ✅ Add medications
        for (PrescriptionMedicationDTO medDto : dto.medications()) {
            Medication medication = medicationRepo.findById(medDto.medicationId())
                    .orElseThrow(() -> new RuntimeException("Medication not found"));

            PrescriptionMedication pm = new PrescriptionMedication();
            pm.setPrescription(prescription);
            pm.setMedication(medication);
            pm.setDosage(medDto.dosage());
            pm.setFrequency(medDto.frequency());
            pm.setDuration(medDto.duration());
            pm.setInstructions(medDto.instructions());

            pmRepo.save(pm);
        }

        return prescription;
    }

    public List<Prescription> findByPatientAndPractitioner(Patient patient, User practitioner) {
    return prescriptionRepository.findByPatientAndPractitioner(patient, practitioner);
}

@Transactional
public Prescription updatePrescription(Long id, PrescriptionDTO dto) {
    // Fetch existing prescription
    Prescription prescription = prescriptionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Prescription not found"));

    // Update patient/practitioner if needed
    if (!prescription.getPatient().getId().equals(dto.patientId())) {
        Patient patient = patientRepo.findById(dto.patientId())
                .orElseThrow(() -> new RuntimeException("Patient not found"));
        prescription.setPatient(patient);
    }

    if (!prescription.getPractitioner().getId().equals(dto.practitionerId())) {
        User practitioner = userRepo.findById(dto.practitionerId())
                .orElseThrow(() -> new RuntimeException("Practitioner not found"));
        prescription.setPractitioner(practitioner);
    }

    prescription.setNotes(dto.notes());

    // Save the updated prescription
    prescription = prescriptionRepository.save(prescription);

    // ✅ Update medications: delete old ones and add new ones
    List<PrescriptionMedication> existingMeds = pmRepo.findByPrescription(prescription);
    pmRepo.deleteAll(existingMeds);

    for (PrescriptionMedicationDTO medDto : dto.medications()) {
        Medication medication = medicationRepo.findById(medDto.medicationId())
                .orElseThrow(() -> new RuntimeException("Medication not found"));

        PrescriptionMedication pm = new PrescriptionMedication();
        pm.setPrescription(prescription);
        pm.setMedication(medication);
        pm.setDosage(medDto.dosage());
        pm.setFrequency(medDto.frequency());
        pm.setDuration(medDto.duration());
        pm.setInstructions(medDto.instructions());

        pmRepo.save(pm);
    }

    return prescription;
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
