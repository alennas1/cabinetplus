package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.Justification;
import com.cabinetplus.backend.models.JustificationContent;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.JustificationRepository;
import com.cabinetplus.backend.repositories.JustificationContentRepository;
import com.cabinetplus.backend.repositories.PatientRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class JustificationService {

    private final JustificationRepository justificationRepository;
    private final PatientRepository patientRepository;
    private final JustificationContentRepository contentRepository;

    public JustificationService(
            JustificationRepository justificationRepository,
            PatientRepository patientRepository,
            JustificationContentRepository contentRepository) {
        this.justificationRepository = justificationRepository;
        this.patientRepository = patientRepository;
        this.contentRepository = contentRepository;
    }

    @Transactional
    public Justification save(Justification justification) {
        return justificationRepository.save(justification);
    }

    public List<Justification> findByPractitioner(User practitioner) {
        return justificationRepository.findByPractitioner(practitioner);
    }

    public Optional<Justification> findByIdAndPractitioner(Long id, User practitioner) {
        return justificationRepository.findByIdAndPractitioner(id, practitioner);
    }

    @Transactional
    public Optional<Justification> update(Long id, String title, String content, User practitioner) {
        return justificationRepository.findByIdAndPractitioner(id, practitioner)
                .map(existing -> {
                    existing.setTitle(title);
                    existing.setFinalContent(content);
                    return justificationRepository.save(existing);
                });
    }

    @Transactional
    public boolean deleteByPractitioner(Long id, User practitioner) {
        return justificationRepository.findByIdAndPractitioner(id, practitioner)
                .map(j -> {
                    justificationRepository.delete(j);
                    return true;
                })
                .orElse(false);
    }

    public List<Justification> findByPatientAndPractitioner(Patient patient, User practitioner) {
        return justificationRepository.findByPatientAndPractitioner(patient, practitioner);
    }

    // ðŸ”µ GENERATE FROM JUSTIFICATION CONTENT (ID-BASED)
    public String generateFromContent(Long patientId, Long templateId, User practitioner) {

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient introuvable"));

        JustificationContent contentEntity = contentRepository.findById(templateId)
                .filter(c -> c.getPractitioner().getId().equals(practitioner.getId()))
                .orElseThrow(() -> new RuntimeException("Modele introuvable"));

        String content = contentEntity.getContent();
        if (content == null) return "";

        Map<String, String> values = new HashMap<>();
       // Patient info
values.put("{{patientFirstname}}", safe(patient.getFirstname()));
values.put("{{patientLastname}}", safe(patient.getLastname()));
values.put("{{patientFullName}}", safe(patient.getFirstname()) + " " + safe(patient.getLastname()));
values.put("{{patientAge}}", patient.getAge() != null ? patient.getAge().toString() : "");
values.put("{{patientSex}}", safe(patient.getSex()));
values.put("{{patientPhone}}", safe(patient.getPhone()));
values.put("{{patientCreatedAt}}",
        patient.getCreatedAt() != null 
            ? patient.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) 
            : "");// Practitioner / clinic info
values.put("{{practitionerFullName}}", safe(practitioner.getFirstname()) + " " + safe(practitioner.getLastname()));
values.put("{{clinicName}}", safe(practitioner.getClinicName()));
values.put("{{practitionerAddress}}", safe(practitioner.getAddress())); // added
values.put("{{practitionerPhone}}", safe(practitioner.getPhoneNumber())); // added

// Dates / metadata
values.put("{{todayDate}}", LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        for (Map.Entry<String, String> entry : values.entrySet()) {
            content = content.replace(entry.getKey(), entry.getValue());
        }

        return content;
    }

    private String safe(String value) {
        return value != null ? value : "";
    }
}

