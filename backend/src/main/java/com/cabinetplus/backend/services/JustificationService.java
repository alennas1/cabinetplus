package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.Justification;
import com.cabinetplus.backend.models.JustificationContent;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.repositories.JustificationRepository;
import com.cabinetplus.backend.repositories.JustificationContentRepository;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.exceptions.BadRequestException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private final ReferenceCodeGeneratorService referenceCodeGeneratorService;

    public JustificationService(
            JustificationRepository justificationRepository,
            PatientRepository patientRepository,
            JustificationContentRepository contentRepository,
            ReferenceCodeGeneratorService referenceCodeGeneratorService) {
        this.justificationRepository = justificationRepository;
        this.patientRepository = patientRepository;
        this.contentRepository = contentRepository;
        this.referenceCodeGeneratorService = referenceCodeGeneratorService;
    }

    @Transactional
    public Justification save(Justification justification) {
        assertPatientOwnedByClinic(justification != null ? justification.getPatient() : null,
                justification != null ? justification.getPractitioner() : null);
        if (justification != null
                && justification.getId() == null
                && (justification.getCode() == null || justification.getCode().isBlank())
                && justification.getPractitioner() != null) {
            LocalDateTime createdAt = justification.getCreatedAt() != null ? justification.getCreatedAt() : LocalDateTime.now();
            justification.setCreatedAt(createdAt);
            if (justification.getDate() == null) {
                justification.setDate(createdAt);
            }
            long count = justificationRepository.countByPractitionerAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                    justification.getPractitioner(),
                    referenceCodeGeneratorService.dayStart(createdAt),
                    referenceCodeGeneratorService.nextDayStart(createdAt)
            );
            justification.setCode(referenceCodeGeneratorService.generate("J", createdAt, count));
        }
        return justificationRepository.save(justification);
    }

    public List<Justification> findByPractitioner(User practitioner) {
        return justificationRepository.findByPractitionerAndRecordStatus(practitioner, RecordStatus.ACTIVE);
    }

    public Optional<Justification> findByIdAndPractitioner(Long id, User practitioner) {
        return justificationRepository.findByIdAndPractitioner(id, practitioner);
    }

    @Transactional
    public Optional<Justification> update(Long id, String title, String content, User practitioner) {
        return justificationRepository.findByIdAndPractitioner(id, practitioner)
                .map(existing -> {
                    if (existing.getRecordStatus() == RecordStatus.CANCELLED) {
                        throw new BadRequestException(java.util.Map.of("_", "Justificatif annulé : lecture seule."));
                    }
                    existing.setTitle(title);
                    existing.setFinalContent(content);
                    return justificationRepository.save(existing);
                });
    }

    @Transactional
    public boolean deleteByPractitioner(Long id, User practitioner) {
        return justificationRepository.findByIdAndPractitioner(id, practitioner)
                .map(j -> {
                    if (j.getRecordStatus() != RecordStatus.CANCELLED) {
                        j.setRecordStatus(RecordStatus.CANCELLED);
                        j.setCancelledAt(LocalDateTime.now());
                        justificationRepository.save(j);
                    }
                    return true;
                })
                .orElse(false);
    }

    public List<Justification> findByPatientAndPractitioner(Patient patient, User practitioner) {
        return justificationRepository.findByPatientAndPractitionerAndRecordStatus(patient, practitioner, RecordStatus.ACTIVE);
    }

    public Page<Justification> searchPatientJustifications(
            Long patientId,
            User practitioner,
            boolean fromEnabled,
            LocalDateTime fromDateTime,
            boolean toEnabled,
            LocalDateTime toDateTimeExclusive,
            String qLike,
            String fieldKey,
            Pageable pageable
    ) {
        if (patientId == null || practitioner == null) {
            return Page.empty(pageable);
        }
        return justificationRepository.searchPatientJustifications(
                patientId,
                practitioner,
                RecordStatus.ACTIVE,
                fromEnabled,
                fromDateTime,
                toEnabled,
                toDateTimeExclusive,
                qLike,
                fieldKey,
                pageable
        );
    }

    // ðŸ”µ GENERATE FROM JUSTIFICATION CONTENT (ID-BASED)
    public String generateFromContent(Long patientId, Long templateId, User practitioner) {

        User clinicOwner = resolveClinicOwner(practitioner);
        Patient patient = patientRepository.findByIdAndCreatedBy(patientId, clinicOwner)
                .orElseThrow(() -> new BadRequestException(java.util.Map.of("patientId", "Patient introuvable")));

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

    private void assertPatientOwnedByClinic(Patient patient, User practitioner) {
        if (patient == null || practitioner == null) {
            throw new BadRequestException(java.util.Map.of("patientId", "Patient introuvable"));
        }
        User clinicOwner = resolveClinicOwner(practitioner);
        Long ownerId = patient.getCreatedBy() != null ? patient.getCreatedBy().getId() : null;
        if (ownerId == null || clinicOwner == null || clinicOwner.getId() == null || !ownerId.equals(clinicOwner.getId())) {
            throw new BadRequestException(java.util.Map.of("patientId", "Patient introuvable"));
        }
    }

    private User resolveClinicOwner(User user) {
        if (user == null) return null;
        return user.getOwnerDentist() != null ? user.getOwnerDentist() : user;
    }

    private String safe(String value) {
        return value != null ? value : "";
    }
}

