package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.LocalDate;
	import java.time.format.DateTimeFormatter;
	import java.util.Comparator;
	import java.util.List;
	import java.util.Map;

	import org.springframework.format.annotation.DateTimeFormat;
	import org.springframework.beans.factory.annotation.Value;
	import org.springframework.web.bind.annotation.DeleteMapping;
	import org.springframework.web.bind.annotation.GetMapping;
	import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.PatientCreateRequest;
import com.cabinetplus.backend.dto.PatientDto;
import com.cabinetplus.backend.dto.PatientUpdateRequest;
import com.cabinetplus.backend.dto.PageResponse;
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
        auditService.logSuccess(
                AuditEventType.PATIENT_READ,
                "PATIENT",
                null,
                "Patients consultes"
        );

        List<Patient> patients = patientRepository.findByCreatedByAndArchivedAtIsNull(currentUser);
        List<Long> patientIds = patients.stream().map(Patient::getId).toList();
        var metricsById = patientRiskService.getMetricsByPatientIds(patientIds);

        Integer cancelledThreshold = currentUser.getPatientCancelledAppointmentsThreshold();
        Double owedThreshold = currentUser.getPatientMoneyOwedThreshold();

        return patients.stream()
                .map(p -> toDtoWithMetrics(p, metricsById.get(p.getId()), cancelledThreshold, owedThreshold))
                .toList();
    }

	    @GetMapping("/paged")
	    public PageResponse<PatientDto> getAllPatientsPaged(
	            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) @RequestParam(name = "from", required = false) LocalDate from,
	            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) @RequestParam(name = "to", required = false) LocalDate to,
	            @RequestParam(name = "page", defaultValue = "0") int page,
	            @RequestParam(name = "size", defaultValue = "20") int size,
	            @RequestParam(name = "q", required = false) String q,
	            @RequestParam(name = "field", required = false) String field,
	            @RequestParam(name = "sortKey", required = false) String sortKey,
	            @RequestParam(name = "sortDirection", required = false) String sortDirection,
	            @RequestParam(name = "sex", required = false) String sex,
	            @RequestParam(name = "ageFrom", required = false) Integer ageFrom,
	            @RequestParam(name = "ageTo", required = false) Integer ageTo,
	            Principal principal
	    ) {
	        return listPatientsPaged(false, page, size, q, field, sortKey, sortDirection, sex, ageFrom, ageTo, from, to, principal);
	    }

    @GetMapping("/archived")
    public List<PatientDto> getArchivedPatients(Principal principal) {
        User currentUser = getClinicUser(principal);
        auditService.logSuccess(
                AuditEventType.PATIENT_READ,
                "PATIENT",
                null,
                "Patients archives consultes"
        );

        List<Patient> patients = patientRepository.findByCreatedByAndArchivedAtIsNotNull(currentUser);
        List<Long> patientIds = patients.stream().map(Patient::getId).toList();
        var metricsById = patientRiskService.getMetricsByPatientIds(patientIds);

        Integer cancelledThreshold = currentUser.getPatientCancelledAppointmentsThreshold();
        Double owedThreshold = currentUser.getPatientMoneyOwedThreshold();

        return patients.stream()
                .map(p -> toDtoWithMetrics(p, metricsById.get(p.getId()), cancelledThreshold, owedThreshold))
                .toList();
    }

	    @GetMapping("/archived/paged")
	    public PageResponse<PatientDto> getArchivedPatientsPaged(
	            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) @RequestParam(name = "from", required = false) LocalDate from,
	            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) @RequestParam(name = "to", required = false) LocalDate to,
	            @RequestParam(name = "page", defaultValue = "0") int page,
	            @RequestParam(name = "size", defaultValue = "20") int size,
	            @RequestParam(name = "q", required = false) String q,
	            @RequestParam(name = "field", required = false) String field,
	            @RequestParam(name = "sortKey", required = false) String sortKey,
	            @RequestParam(name = "sortDirection", required = false) String sortDirection,
	            @RequestParam(name = "sex", required = false) String sex,
	            @RequestParam(name = "ageFrom", required = false) Integer ageFrom,
	            @RequestParam(name = "ageTo", required = false) Integer ageTo,
	            Principal principal
	    ) {
	        return listPatientsPaged(true, page, size, q, field, sortKey, sortDirection, sex, ageFrom, ageTo, from, to, principal);
	    }
	
	    private PageResponse<PatientDto> listPatientsPaged(
	            boolean archived,
	            int page,
	            int size,
	            String q,
	            String field,
	            String sortKey,
	            String sortDirection,
	            String sex,
	            Integer ageFrom,
	            Integer ageTo,
	            LocalDate from,
	            LocalDate to,
            Principal principal
    ) {
        User currentUser = getClinicUser(principal);
        auditService.logSuccess(
                AuditEventType.PATIENT_READ,
                "PATIENT",
                null,
                archived ? "Patients archives consultes (page)" : "Patients consultes (page)"
        );
	
	        int safePage = Math.max(page, 0);
	        int safeSize = Math.min(Math.max(size, 1), 100);

	        // Avoid null timestamp query parameters on PostgreSQL (can cause "could not determine data type" errors).
	        boolean fromEnabled = from != null;
	        boolean toEnabled = to != null;
	        LocalDateTime fromCreatedAt = fromEnabled ? from.atStartOfDay() : LocalDate.of(1900, 1, 1).atStartOfDay();
        LocalDateTime toCreatedAtExclusive = toEnabled ? to.plusDays(1).atStartOfDay() : LocalDate.of(3000, 1, 1).atStartOfDay();

        List<Patient> base = patientRepository.searchPatientsList(
                currentUser,
                archived,
                ageFrom,
                ageTo,
                fromEnabled,
                fromCreatedAt,
                toEnabled,
                toCreatedAtExclusive
        );

	        String qNorm = q != null ? q.trim().toLowerCase() : "";
	        String sexNorm = sex != null ? sex.trim().toLowerCase() : "";
	        String fieldNorm = field != null ? field.trim().toLowerCase() : "";
	        String sortKeyNorm = sortKey != null ? sortKey.trim().toLowerCase() : "";
	        String sortDirNorm = sortDirection != null ? sortDirection.trim().toLowerCase() : "";
	        Comparator<Patient> sortComparator = buildPatientSortComparator(sortKeyNorm, sortDirNorm);

	        List<Patient> filtered = (base == null ? List.<Patient>of() : base).stream()
	                .filter(p -> {
	                    if (sexNorm.isBlank()) return true;
	                    String pSex = p.getSex() != null ? p.getSex().trim().toLowerCase() : "";
	                    return pSex.equals(sexNorm);
	                })
	                .filter(p -> matchesPatientQuery(p, qNorm, fieldNorm))
	                .sorted(sortComparator)
	                .toList();

        int fromIndex = safePage * safeSize;
        int toIndex = Math.min(fromIndex + safeSize, filtered.size());
        List<Patient> pageItems = fromIndex >= filtered.size() ? List.of() : filtered.subList(fromIndex, toIndex);

        List<Long> patientIds = pageItems.stream().map(Patient::getId).toList();
        var metricsById = patientRiskService.getMetricsByPatientIds(patientIds);

        Integer cancelledThreshold = currentUser.getPatientCancelledAppointmentsThreshold();
        Double owedThreshold = currentUser.getPatientMoneyOwedThreshold();

        var items = pageItems.stream()
                .map(p -> toDtoWithMetrics(p, metricsById.get(p.getId()), cancelledThreshold, owedThreshold))
                .toList();

        long totalElements = filtered.size();
        int totalPages = safeSize == 0 ? 0 : (int) Math.ceil(totalElements / (double) safeSize);

        return new PageResponse<>(items, safePage, safeSize, totalElements, totalPages);
    }

	    private static boolean matchesPatientQuery(Patient patient, String qNorm, String fieldNorm) {
	        if (patient == null) return false;
	        if (qNorm == null || qNorm.isBlank()) return true;

        String first = patient.getFirstname() != null ? patient.getFirstname().trim().toLowerCase() : "";
        String last = patient.getLastname() != null ? patient.getLastname().trim().toLowerCase() : "";
        String phone = patient.getPhone() != null ? patient.getPhone().trim().toLowerCase() : "";
        String age = patient.getAge() != null ? String.valueOf(patient.getAge()) : "";

	        return switch (fieldNorm) {
	            case "firstname" -> first.contains(qNorm);
	            case "lastname" -> last.contains(qNorm);
	            case "phone" -> phone.contains(qNorm);
	            case "age" -> age.contains(qNorm);
	            default -> first.contains(qNorm) || last.contains(qNorm) || phone.contains(qNorm) || age.contains(qNorm);
	        };
	    }

	    private static Comparator<Patient> buildPatientSortComparator(String sortKeyNorm, String sortDirNorm) {
	        boolean desc = "desc".equalsIgnoreCase(sortDirNorm);

	        Comparator<String> baseString = String.CASE_INSENSITIVE_ORDER;
	        if (desc) {
	            baseString = baseString.reversed();
	        }
	        Comparator<String> stringComparator = Comparator.nullsLast(baseString);

	        Comparator<Integer> baseInteger = Comparator.naturalOrder();
	        if (desc) {
	            baseInteger = Comparator.<Integer>reverseOrder();
	        }
	        Comparator<Integer> integerComparator = Comparator.nullsLast(baseInteger);

	        Comparator<LocalDateTime> baseDateTime = Comparator.naturalOrder();
	        if (desc) {
	            baseDateTime = Comparator.<LocalDateTime>reverseOrder();
	        }
	        Comparator<LocalDateTime> dateTimeComparator = Comparator.nullsLast(baseDateTime);

	        Comparator<Patient> comparator = switch (sortKeyNorm) {
	            case "firstname" -> Comparator.comparing(
	                    p -> normalizeTextForSort(p == null ? null : p.getFirstname()),
	                    stringComparator
	            );
	            case "lastname" -> Comparator.comparing(
	                    p -> normalizeTextForSort(p == null ? null : p.getLastname()),
	                    stringComparator
	            );
	            case "age" -> Comparator.comparing(Patient::getAge, integerComparator);
	            case "sex" -> Comparator.comparing(
	                    p -> normalizeTextForSort(p == null ? null : p.getSex()),
	                    stringComparator
	            );
	            case "phone" -> Comparator.comparing(
	                    p -> normalizeTextForSort(p == null ? null : p.getPhone()),
	                    stringComparator
	            );
	            case "createdat", "created_at", "created" -> Comparator.comparing(Patient::getCreatedAt, dateTimeComparator);
	            default -> Comparator.comparing(Patient::getCreatedAt, Comparator.nullsLast(Comparator.<LocalDateTime>reverseOrder()));
	        };

	        return comparator.thenComparing(Patient::getId, Comparator.nullsLast(Comparator.<Long>naturalOrder()));
	    }

	    private static String normalizeTextForSort(String value) {
	        if (value == null) return null;
	        String trimmed = value.trim();
	        return trimmed.isBlank() ? null : trimmed;
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
        patient.setDiseases(request.diseases() != null ? request.diseases().trim() : null);
        patient.setAllergies(request.allergies() != null ? request.allergies().trim() : null);
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
        patient.setDiseases(request.diseases() != null ? request.diseases().trim() : null);
        patient.setAllergies(request.allergies() != null ? request.allergies().trim() : null);

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
                AuditEventType.PATIENT_ARCHIVE,
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
        auditService.logSuccess(
                AuditEventType.PATIENT_PDF_LINK_CREATE,
                "PATIENT",
                patient.getId() != null ? String.valueOf(patient.getId()) : null,
                "Lien public fiche patient genere"
        );

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
        User currentUser = userService.findByPhoneNumber(principal.getName())
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

        String createdByName = null;
        if (patient != null && patient.getCreatedBy() != null) {
            String first = patient.getCreatedBy().getFirstname() != null ? patient.getCreatedBy().getFirstname().trim() : "";
            String last = patient.getCreatedBy().getLastname() != null ? patient.getCreatedBy().getLastname().trim() : "";
            String combined = (first + " " + last).trim();
            createdByName = combined.isBlank() ? null : combined;
        }

        return new PatientDto(
                patient.getId(),
                patient.getPublicId(),
                patient.getFirstname(),
                patient.getLastname(),
                patient.getAge(),
                patient.getSex(),
                patient.getPhone(),
                patient.getDiseases(),
                patient.getAllergies(),
                patient.getCreatedAt(),
                cancelledCount,
                moneyOwed,
                danger,
                dangerCancelled,
                dangerOwed,
                patient.getArchivedAt(),
                createdByName
        );
    }
}
