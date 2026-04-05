package com.cabinetplus.backend.services;

import java.text.DecimalFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import com.cabinetplus.backend.dto.PrescriptionMedicationDTO;
import com.cabinetplus.backend.dto.PrescriptionRequestDTO;
import com.cabinetplus.backend.dto.PrescriptionResponseDTO;
import com.cabinetplus.backend.dto.PrescriptionSummaryDTO;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.models.Medication;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.PrescriptionMedication;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.repositories.MedicationRepository;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.repositories.PrescriptionRepository;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.util.PaginationUtil;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final PatientRepository patientRepository;
    private final MedicationRepository medicationRepository;
    private final UserRepository userRepository;
    
    // Formatter to remove trailing .0 but keep other decimals
    private final DecimalFormat df = new DecimalFormat("###.##");

    @Transactional
    public Prescription createPrescription(PrescriptionRequestDTO dto, User practitioner) {
        User clinicOwner = resolveClinicOwner(practitioner);
        Patient patient = patientRepository.findByIdAndCreatedBy(dto.getPatientId(), clinicOwner)
                .orElseThrow(() -> new BadRequestException(java.util.Map.of("patientId", "Patient introuvable")));
        if (patient.getArchivedAt() != null) {
            throw new BadRequestException(java.util.Map.of("_", "Patient archivé : lecture seule."));
        }

        Prescription prescription = new Prescription();
        prescription.setDate(LocalDateTime.now());
        prescription.setNotes(dto.getNotes());
        prescription.setPatient(patient);
        prescription.setPractitioner(practitioner);

        List<PrescriptionMedication> medications = dto.getMedications().stream()
                .map(m -> mapToPrescriptionMedication(m, prescription, clinicOwner))
                .collect(Collectors.toList());

        prescription.setMedications(medications);
        return prescriptionRepository.save(prescription);
    }

    private PrescriptionMedication mapToPrescriptionMedication(PrescriptionMedicationDTO medDto, Prescription prescription, User clinicOwner) {
        Medication medication = medicationRepository.findByIdAndCreatedBy(medDto.getMedicationId(), clinicOwner)
                .orElseThrow(() -> new BadRequestException(java.util.Map.of("medicationId", "Medicament introuvable")));

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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordonnance introuvable"));

        if (!prescription.getPractitioner().getId().equals(practitioner.getId())) {
            throw new AccessDeniedException("Acces refuse a cette ordonnance");
        }
        return prescription;
    }

    public PrescriptionResponseDTO mapToResponseDTO(Prescription prescription) {
        PrescriptionResponseDTO dto = new PrescriptionResponseDTO();
        dto.setId(prescription.getId());
        dto.setPublicId(prescription.getPublicId());
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

    public PrescriptionResponseDTO getPrescriptionById(Long id, User practitioner) {
        return mapToResponseDTO(getPrescriptionEntity(id, practitioner));
    }

  @Transactional
public Prescription updatePrescription(Long id, PrescriptionRequestDTO dto, User practitioner) {
    // 1. Fetch the existing prescription and check ownership
    Prescription prescription = getPrescriptionEntity(id, practitioner);
    if (prescription.getRecordStatus() == RecordStatus.CANCELLED) {
        throw new BadRequestException(java.util.Map.of("_", "Ordonnance annulée : lecture seule."));
    }
    
    // 2. Update basic fields
    prescription.setNotes(dto.getNotes());
    User clinicOwner = resolveClinicOwner(practitioner);
    Patient patient = patientRepository.findByIdAndCreatedBy(dto.getPatientId(), clinicOwner)
            .orElseThrow(() -> new BadRequestException(java.util.Map.of("patientId", "Patient introuvable")));
    if (patient.getArchivedAt() != null) {
        throw new BadRequestException(java.util.Map.of("_", "Patient archivé : lecture seule."));
    }
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
            prescription.getMedications().add(mapToPrescriptionMedication(medDto, prescription, clinicOwner));
        }
    }

    return prescriptionRepository.save(prescription);
}

    public List<PrescriptionSummaryDTO> getPrescriptionsByPatientId(Long patientId, User requester) {
        User clinicOwner = resolveClinicOwner(requester);
        boolean owned = patientRepository.findByIdAndCreatedBy(patientId, clinicOwner).isPresent();
        if (!owned) {
            throw new NotFoundException("Patient introuvable");
        }

        List<User> practitioners = userRepository.findByOwnerDentist(clinicOwner);
        java.util.ArrayList<User> allowed = new java.util.ArrayList<>(practitioners.size() + 1);
        allowed.add(clinicOwner);
        allowed.addAll(practitioners);

        return prescriptionRepository.findByPatientIdAndPractitionerInAndRecordStatusOrderByDateDesc(patientId, allowed, RecordStatus.ACTIVE).stream()
                .map(p -> {
                    String createdByName = null;
                    if (p.getPractitioner() != null) {
                        String first = p.getPractitioner().getFirstname() != null ? p.getPractitioner().getFirstname().trim() : "";
                        String last = p.getPractitioner().getLastname() != null ? p.getPractitioner().getLastname().trim() : "";
                        String combined = (first + " " + last).trim();
                        createdByName = combined.isBlank() ? null : combined;
                    }
                    return new PrescriptionSummaryDTO(p.getId(), p.getPublicId(), p.getRxId(), p.getDate(), createdByName);
                })
                .collect(Collectors.toList());
    }

    public PageResponse<PrescriptionSummaryDTO> getPrescriptionsByPatientIdPaged(
            Long patientId,
            User requester,
            int page,
            int size,
            LocalDate from,
            LocalDate to,
            String q,
            String field,
            String sortKey,
            String sortDirection
    ) {
        User clinicOwner = resolveClinicOwner(requester);
        boolean owned = patientRepository.findByIdAndCreatedBy(patientId, clinicOwner).isPresent();
        if (!owned) {
            throw new NotFoundException("Patient introuvable");
        }

        List<User> practitioners = userRepository.findByOwnerDentist(clinicOwner);
        java.util.ArrayList<User> allowed = new java.util.ArrayList<>(practitioners.size() + 1);
        allowed.add(clinicOwner);
        allowed.addAll(practitioners);

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        String qNorm = q != null ? q.trim() : "";
        String fieldNorm = field != null ? field.trim().toLowerCase() : "";
        String sortKeyNorm = sortKey != null ? sortKey.trim().toLowerCase() : "";
        boolean desc = "desc".equalsIgnoreCase(sortDirection);

        LocalDate effectiveFrom = from;
        LocalDate effectiveTo = to;
        if (!qNorm.isBlank() && "date".equals(fieldNorm)) {
            try {
                LocalDate parsed = LocalDate.parse(qNorm);
                if (effectiveFrom == null) effectiveFrom = parsed;
                if (effectiveTo == null) effectiveTo = parsed;
                qNorm = "";
            } catch (Exception ignored) {
                throw new BadRequestException(java.util.Map.of(
                        "q",
                        "Date invalide. Format attendu: yyyy-MM-dd"
                ));
            }
        }

        boolean fromEnabled = effectiveFrom != null;
        boolean toEnabled = effectiveTo != null;
        LocalDateTime fromDateTime = fromEnabled ? effectiveFrom.atStartOfDay() : LocalDate.of(1900, 1, 1).atStartOfDay();
        LocalDateTime toDateTimeExclusive = toEnabled ? effectiveTo.plusDays(1).atStartOfDay() : LocalDate.of(3000, 1, 1).atStartOfDay();

        String rxIdLike = null;
        if (!qNorm.isBlank() && ("".equals(fieldNorm) || "rxid".equals(fieldNorm) || "rx_id".equals(fieldNorm))) {
            rxIdLike = "%" + qNorm.toLowerCase() + "%";
        }

        Sort sort = switch (sortKeyNorm) {
            case "rxid", "rx_id" -> Sort.by(desc ? Sort.Direction.DESC : Sort.Direction.ASC, "rxId");
            case "date" -> Sort.by(desc ? Sort.Direction.DESC : Sort.Direction.ASC, "date");
            default -> Sort.by(Sort.Direction.DESC, "date");
        };
        sort = sort.and(Sort.by(Sort.Direction.ASC, "id"));

        PageRequest pageable = PageRequest.of(safePage, safeSize, sort);

        Page<PrescriptionSummaryDTO> dtoPage = prescriptionRepository.searchPatientPrescriptions(
                        patientId,
                        allowed,
                        RecordStatus.ACTIVE,
                        fromEnabled,
                        fromDateTime,
                        toEnabled,
                        toDateTimeExclusive,
                        rxIdLike,
                        pageable
                )
                .map(p -> {
                    String createdByName = null;
                    if (p != null && p.getPractitioner() != null) {
                        String first = p.getPractitioner().getFirstname() != null ? p.getPractitioner().getFirstname().trim() : "";
                        String last = p.getPractitioner().getLastname() != null ? p.getPractitioner().getLastname().trim() : "";
                        String combined = (first + " " + last).trim();
                        createdByName = combined.isBlank() ? null : combined;
                    }
                    return new PrescriptionSummaryDTO(
                            p != null ? p.getId() : null,
                            p != null ? p.getPublicId() : null,
                            p != null ? p.getRxId() : null,
                            p != null ? p.getDate() : null,
                            createdByName
                    );
                });

        return PaginationUtil.toPageResponse(dtoPage);
    }

    public void deletePrescription(Long id, User requester) {
        User clinicOwner = resolveClinicOwner(requester);
        Prescription existing = prescriptionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Ordonnance introuvable"));
        if (existing.getPatient() != null && existing.getPatient().getArchivedAt() != null) {
            throw new BadRequestException(java.util.Map.of("_", "Patient archivé : lecture seule."));
        }

        if (!isUserInClinic(existing.getPractitioner(), clinicOwner)) {
            throw new NotFoundException("Ordonnance introuvable");
        }

        if (existing.getRecordStatus() != RecordStatus.CANCELLED) {
            existing.setRecordStatus(RecordStatus.CANCELLED);
            existing.setCancelledAt(LocalDateTime.now());
            prescriptionRepository.save(existing);
        }
    }

    private User resolveClinicOwner(User user) {
        if (user == null) return null;
        return user.getOwnerDentist() != null ? user.getOwnerDentist() : user;
    }

    private boolean isUserInClinic(User user, User clinicOwner) {
        if (user == null || clinicOwner == null) return false;
        if (user.getId() != null && user.getId().equals(clinicOwner.getId())) return true;
        return user.getOwnerDentist() != null
                && user.getOwnerDentist().getId() != null
                && user.getOwnerDentist().getId().equals(clinicOwner.getId());
    }
}
