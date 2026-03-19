package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.PatientCreateRequest;
import com.cabinetplus.backend.dto.PatientDto;
import com.cabinetplus.backend.dto.PatientUpdateRequest;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.security.JwtUtil;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.PatientFichePdfService;
import com.cabinetplus.backend.services.PatientRiskService;
import com.cabinetplus.backend.services.PatientService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientService patientService;
    private final UserService userService;
    private final PatientRepository patientRepository;
    private final AuditService auditService;
    private final PatientRiskService patientRiskService;
    private final PublicIdResolutionService publicIdResolutionService;
    private final PatientFichePdfService patientFichePdfService;
    private final JwtUtil jwtUtil;
    private final long publicPdfLinkTtlSeconds;

    public PatientController(
            PatientService patientService,
            UserService userService,
            PatientRepository patientRepository,
            AuditService auditService,
            PatientRiskService patientRiskService,
            PublicIdResolutionService publicIdResolutionService,
            PatientFichePdfService patientFichePdfService,
            JwtUtil jwtUtil,
            @Value("${app.public-pdf-link.ttl-seconds:900}") long publicPdfLinkTtlSeconds
    ) {
        this.patientService = patientService;
        this.userService = userService;
        this.patientRepository = patientRepository;
        this.auditService = auditService;
        this.patientRiskService = patientRiskService;
        this.publicIdResolutionService = publicIdResolutionService;
        this.patientFichePdfService = patientFichePdfService;
        this.jwtUtil = jwtUtil;
        this.publicPdfLinkTtlSeconds = publicPdfLinkTtlSeconds;
    }

    @GetMapping
    public List<PatientDto> getAllPatients(Principal principal) {
        User currentUser = getClinicUser(principal);

        List<Patient> patients = patientRepository.findByCreatedByAndArchivedAtIsNull(currentUser);
        List<Long> patientIds = patients.stream().map(Patient::getId).toList();
        var metricsById = patientRiskService.getMetricsByPatientIds(patientIds);

        Integer cancelledThreshold = currentUser.getPatientCancelledAppointmentsThreshold();
        Double owedThreshold = currentUser.getPatientMoneyOwedThreshold();

        return patients.stream()
                .map(p -> toDtoWithMetrics(p, metricsById.get(p.getId()), cancelledThreshold, owedThreshold))
                .toList();
    }

    @GetMapping("/archived")
    public List<PatientDto> getArchivedPatients(Principal principal) {
        User currentUser = getClinicUser(principal);

        List<Patient> patients = patientRepository.findByCreatedByAndArchivedAtIsNotNull(currentUser);
        List<Long> patientIds = patients.stream().map(Patient::getId).toList();
        var metricsById = patientRiskService.getMetricsByPatientIds(patientIds);

        Integer cancelledThreshold = currentUser.getPatientCancelledAppointmentsThreshold();
        Double owedThreshold = currentUser.getPatientMoneyOwedThreshold();

        return patients.stream()
                .map(p -> toDtoWithMetrics(p, metricsById.get(p.getId()), cancelledThreshold, owedThreshold))
                .toList();
    }

    @GetMapping("/{id}")
    public PatientDto getPatientById(@PathVariable String id, Principal principal) {
        User currentUser = getClinicUser(principal);
        Integer cancelledThreshold = currentUser.getPatientCancelledAppointmentsThreshold();
        Double owedThreshold = currentUser.getPatientMoneyOwedThreshold();

        Patient patient = publicIdResolutionService.requirePatientOwnedBy(id, currentUser);
        auditService.logSuccess(
                AuditEventType.PATIENT_READ,
                "PATIENT",
                String.valueOf(patient.getId()),
                "Patient consulté"
        );

        var metricsById = patientRiskService.getMetricsByPatientIds(List.of(patient.getId()));
        return toDtoWithMetrics(patient, metricsById.get(patient.getId()), cancelledThreshold, owedThreshold);
    }

    @PutMapping("/{id}/archive")
    public PatientDto archivePatient(@PathVariable String id, Principal principal) {
        User currentUser = getClinicUser(principal);
        Patient patient = publicIdResolutionService.requirePatientOwnedBy(id, currentUser);

        patient.setArchivedAt(LocalDateTime.now());
        Patient saved = patientRepository.save(patient);
        auditService.logSuccess(
                AuditEventType.PATIENT_ARCHIVE,
                "PATIENT",
                String.valueOf(saved.getId()),
                "Patient archivé"
        );

        var metricsById = patientRiskService.getMetricsByPatientIds(List.of(saved.getId()));
        Integer cancelledThreshold = currentUser.getPatientCancelledAppointmentsThreshold();
        Double owedThreshold = currentUser.getPatientMoneyOwedThreshold();
        return toDtoWithMetrics(saved, metricsById.get(saved.getId()), cancelledThreshold, owedThreshold);
    }

    @PutMapping("/{id}/unarchive")
    public PatientDto unarchivePatient(@PathVariable String id, Principal principal) {
        User currentUser = getClinicUser(principal);
        Patient patient = publicIdResolutionService.requirePatientOwnedBy(id, currentUser);

        patient.setArchivedAt(null);
        Patient saved = patientRepository.save(patient);
        auditService.logSuccess(
                AuditEventType.PATIENT_UNARCHIVE,
                "PATIENT",
                String.valueOf(saved.getId()),
                "Patient restauré"
        );

        var metricsById = patientRiskService.getMetricsByPatientIds(List.of(saved.getId()));
        Integer cancelledThreshold = currentUser.getPatientCancelledAppointmentsThreshold();
        Double owedThreshold = currentUser.getPatientMoneyOwedThreshold();
        return toDtoWithMetrics(saved, metricsById.get(saved.getId()), cancelledThreshold, owedThreshold);
    }

    @PostMapping
    public PatientDto createPatient(@RequestBody @Valid PatientCreateRequest request, Principal principal) {
        User currentUser = getClinicUser(principal);

        Patient patient = new Patient();
        patient.setFirstname(request.firstname() != null ? request.firstname().trim() : null);
        patient.setLastname(request.lastname() != null ? request.lastname().trim() : null);
        patient.setAge(request.age());
        patient.setSex(request.sex() != null ? request.sex().trim() : null);
        patient.setPhone(request.phone() != null ? request.phone().trim() : null);
        patient.setCreatedBy(currentUser);
        patient.setCreatedAt(LocalDateTime.now());

        PatientDto saved = patientService.saveAndConvert(patient);
        auditService.logSuccess(
                AuditEventType.PATIENT_CREATE,
                "PATIENT",
                String.valueOf(saved.id()),
                "Patient ajouté"
        );
        return saved;
    }

    @PutMapping("/{id}")
    public PatientDto updatePatient(@PathVariable String id, @RequestBody @Valid PatientUpdateRequest request, Principal principal) {
        User currentUser = getClinicUser(principal);
        Patient existing = publicIdResolutionService.requirePatientOwnedBy(id, currentUser);

        Patient patient = new Patient();
        patient.setFirstname(request.firstname() != null ? request.firstname().trim() : null);
        patient.setLastname(request.lastname() != null ? request.lastname().trim() : null);
        patient.setAge(request.age());
        patient.setSex(request.sex() != null ? request.sex().trim() : null);
        patient.setPhone(request.phone() != null ? request.phone().trim() : null);

        PatientDto updated = patientService.update(existing.getId(), patient, currentUser);
        auditService.logSuccess(
                AuditEventType.PATIENT_UPDATE,
                "PATIENT",
                String.valueOf(updated.id()),
                "Patient modifié"
        );
        return updated;
    }

    @DeleteMapping("/{id}")
    public void deletePatient(@PathVariable String id, Principal principal) {
        User currentUser = getClinicUser(principal);
        Patient existing = publicIdResolutionService.requirePatientOwnedBy(id, currentUser);
        patientService.delete(existing.getId(), currentUser);
        auditService.logSuccess(
                AuditEventType.PATIENT_DELETE,
                "PATIENT",
                String.valueOf(existing.getId()),
                "Patient supprimé"
        );
    }

    @GetMapping("/{id}/fiche-pdf")
    public void generatePatientFiche(@PathVariable String id, HttpServletResponse response, Principal principal) throws Exception {
        User clinicUser = getClinicUser(principal);
        Patient patient = publicIdResolutionService.requirePatientOwnedBy(id, clinicUser);
        Long patientId = patient.getId();

        auditService.logSuccess(
                AuditEventType.PATIENT_PDF_DOWNLOAD,
                "PATIENT",
                String.valueOf(patientId),
                "Fiche patient PDF téléchargée"
        );

        String todayDate = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy"));
        String publicId = patient.getPublicId() != null ? patient.getPublicId().toString() : String.valueOf(patientId);
        String fileName = String.format("fiche_patient_%s_%s.pdf", publicId, todayDate);
        patientFichePdfService.writePatientFichePdf(clinicUser, patient, fileName, response);
    }

    @GetMapping("/{id}/fiche-pdf-link")
    public Map<String, Object> generatePublicFicheLink(@PathVariable String id, Principal principal) {
        User clinicUser = getClinicUser(principal);
        Patient patient = publicIdResolutionService.requirePatientOwnedBy(id, clinicUser);
        if (patient.getPublicId() == null) {
            throw new IllegalStateException("Patient publicId is missing");
        }

        String token = jwtUtil.generatePublicPatientFichePdfToken(patient.getPublicId(), clinicUser.getId(), publicPdfLinkTtlSeconds);
        LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(publicPdfLinkTtlSeconds);

        return Map.of(
                "token", token,
                "patientPublicId", patient.getPublicId().toString(),
                "expiresAt", expiresAt.toString(),
                "ttlSeconds", publicPdfLinkTtlSeconds
        );
    }

    private User getClinicUser(Principal principal) {
        User currentUser = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(currentUser);
    }

    private PatientDto toDtoWithMetrics(
            Patient patient,
            PatientRiskService.PatientRiskMetrics metrics,
            Integer cancelledThreshold,
            Double owedThreshold
    ) {
        long cancelledCount = metrics != null ? metrics.cancelledAppointmentsCount() : 0L;
        double moneyOwed = metrics != null ? metrics.moneyOwed() : 0.0;

        boolean cancelledRuleEnabled = cancelledThreshold != null && cancelledThreshold > 0;
        boolean owedRuleEnabled = owedThreshold != null && owedThreshold > 0.0;

        boolean dangerCancelled = cancelledRuleEnabled && cancelledCount >= cancelledThreshold;
        boolean dangerOwed = owedRuleEnabled && moneyOwed >= owedThreshold;
        boolean danger = dangerCancelled || dangerOwed;

        return new PatientDto(
                patient.getId(),
                patient.getPublicId(),
                patient.getFirstname(),
                patient.getLastname(),
                patient.getAge(),
                patient.getSex(),
                patient.getPhone(),
                patient.getCreatedAt(),
                cancelledCount,
                moneyOwed,
                danger,
                dangerCancelled,
                dangerOwed
        );
    }
}

