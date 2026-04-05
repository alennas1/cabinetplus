package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.dto.JustificationDTO;
import com.cabinetplus.backend.dto.JustificationRequest;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Justification;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.JustificationService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;
import com.cabinetplus.backend.util.PagedQueryUtil;
import com.cabinetplus.backend.util.PaginationUtil;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.lowagie.text.pdf.draw.LineSeparator;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/justifications")
public class JustificationController {

    private static final String ARCHIVED_PATIENT_READONLY_MESSAGE = "Patient archivé : lecture seule.";

    private final JustificationService justificationService;
    private final UserService userService;
    private final PatientRepository patientRepository;
    private final PublicIdResolutionService publicIdResolutionService;
    private final AuditService auditService;

    public JustificationController(
            JustificationService justificationService,
            UserService userService,
            PatientRepository patientRepository,
            PublicIdResolutionService publicIdResolutionService,
            AuditService auditService) {
        this.justificationService = justificationService;
        this.userService = userService;
        this.patientRepository = patientRepository;
        this.publicIdResolutionService = publicIdResolutionService;
        this.auditService = auditService;
    }

    private User getCurrentUser(Principal principal) {
        return userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
    }

    private static JustificationDTO mapToDTO(Justification j) {
        return JustificationDTO.builder()
                .id(j.getId())
                .title(j.getTitle())
                .finalContent(j.getFinalContent())
                .date(j.getDate() != null ? j.getDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) : null)
                .patientId(j.getPatient().getId())
                .patientName(j.getPatient().getFirstname() + " " + j.getPatient().getLastname())
                .practitionerName(j.getPractitioner().getFirstname() + " " + j.getPractitioner().getLastname())
                .build();
    }

    @GetMapping("/generate/{patientId}")
    public ResponseEntity<String> generateJustification(
            @PathVariable String patientId,
            @RequestParam String templateId,
            Principal principal) {
        User currentUser = getCurrentUser(principal);
        User ownerDentist = userService.resolveClinicOwner(currentUser);
        Long internalPatientId = publicIdResolutionService.requirePatientOwnedBy(patientId, ownerDentist).getId();
        Long internalTemplateId = publicIdResolutionService.requireJustificationTemplateForPractitioner(templateId, ownerDentist).getId();
        String generated = justificationService.generateFromContent(internalPatientId, internalTemplateId, ownerDentist);
        auditService.logSuccess(
                AuditEventType.JUSTIFICATION_GENERATE,
                "PATIENT",
                internalPatientId != null ? String.valueOf(internalPatientId) : null,
                "Justificatif généré"
        );
        return ResponseEntity.ok(generated);
    }
    
@GetMapping("/patient/{patientId}")
public ResponseEntity<List<JustificationDTO>> getByPatient(
        @PathVariable String patientId,
        Principal principal) {

    User currentUser = getCurrentUser(principal);
    User ownerDentist = userService.resolveClinicOwner(currentUser);

    Patient patient = publicIdResolutionService.requirePatientOwnedBy(patientId, ownerDentist);
    auditService.logSuccess(
            AuditEventType.JUSTIFICATION_READ,
            "PATIENT",
            patient != null && patient.getId() != null ? String.valueOf(patient.getId()) : null,
            "Justificatifs consultes"
    );

    List<Justification> list =
            justificationService.findByPatientAndPractitioner(patient, currentUser);

    List<JustificationDTO> dtos = list.stream()
            .map(JustificationController::mapToDTO)
            .toList();

    return ResponseEntity.ok(dtos);
}

    @GetMapping("/patient/{patientId}/paged")
    public PageResponse<JustificationDTO> getByPatientPaged(
            @PathVariable String patientId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "field", required = false) String field,
            @RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "sortKey", required = false) String sortKey,
            @RequestParam(name = "sortDirection", required = false) String sortDirection,
            Principal principal
    ) {
        User currentUser = getCurrentUser(principal);
        User ownerDentist = userService.resolveClinicOwner(currentUser);

        Patient patient = publicIdResolutionService.requirePatientOwnedBy(patientId, ownerDentist);

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        final String fieldNorm = field != null ? field.trim().toLowerCase() : "";
        final String fieldKey = fieldNorm.isBlank() ? "" : fieldNorm;
        String sortKeyNorm = sortKey != null ? sortKey.trim().toLowerCase() : "";
        boolean desc = "desc".equalsIgnoreCase(sortDirection);

        String qNorm = q != null ? q.trim() : "";
        boolean hasQuery = !qNorm.isBlank();

        LocalDate effectiveFrom = from;
        LocalDate effectiveTo = to;
        if (hasQuery && "date".equalsIgnoreCase(fieldKey)) {
            try {
                LocalDate parsed = LocalDate.parse(qNorm.trim());
                if (effectiveFrom == null) effectiveFrom = parsed;
                if (effectiveTo == null) effectiveTo = parsed;
                hasQuery = false;
            } catch (Exception ignored) {
                effectiveFrom = LocalDate.of(3000, 1, 1);
                effectiveTo = LocalDate.of(3000, 1, 1);
                hasQuery = false;
            }
        }

        String qLike = hasQuery ? ("%" + qNorm.trim().toLowerCase() + "%") : "";
        String searchFieldKey = "title".equalsIgnoreCase(fieldKey) ? "title" : "";

        boolean fromEnabled = effectiveFrom != null;
        boolean toEnabled = effectiveTo != null;
        LocalDateTime fromDateTime = fromEnabled ? effectiveFrom.atStartOfDay() : LocalDate.of(1900, 1, 1).atStartOfDay();
        LocalDateTime toDateTimeExclusive = toEnabled ? effectiveTo.plusDays(1).atStartOfDay() : LocalDate.of(3000, 1, 1).atStartOfDay();

        Sort.Direction direction = desc ? Sort.Direction.DESC : Sort.Direction.ASC;
        Sort sort = switch (sortKeyNorm) {
            case "title" -> Sort.by(direction, "title");
            case "date" -> Sort.by(direction, "date");
            default -> Sort.by(Sort.Direction.DESC, "date");
        };
        sort = sort.and(Sort.by(Sort.Direction.ASC, "id"));

        PageRequest pageable = PageRequest.of(safePage, safeSize, sort);
        var dtoPage = justificationService.searchPatientJustifications(
                        patient.getId(),
                        currentUser,
                        fromEnabled,
                        fromDateTime,
                        toEnabled,
                        toDateTimeExclusive,
                        qLike,
                        searchFieldKey,
                        pageable
                )
                .map(JustificationController::mapToDTO);

        return PaginationUtil.toPageResponse(dtoPage);
    }

    private static LocalDateTime parseJustificationDate(String yyyyMmDd) {
        if (yyyyMmDd == null || yyyyMmDd.isBlank()) return null;
        try {
            return LocalDate.parse(yyyyMmDd.trim()).atStartOfDay();
        } catch (Exception ex) {
            return null;
        }
    }

    private static Comparator<JustificationDTO> buildJustificationSortComparator(String sortKeyNorm, boolean desc) {
        Comparator<String> stringComparator = PagedQueryUtil.stringComparator(desc);

        Comparator<JustificationDTO> comparator = switch (sortKeyNorm) {
            case "title" -> Comparator.comparing(JustificationDTO::getTitle, stringComparator);
            case "date" -> Comparator.comparing(
                    dto -> parseJustificationDate(dto != null ? dto.getDate() : null),
                    PagedQueryUtil.dateTimeComparator(desc)
            );
            default -> Comparator.comparing(
                    dto -> parseJustificationDate(dto != null ? dto.getDate() : null),
                    PagedQueryUtil.dateTimeComparator(true)
            );
        };

        return comparator.thenComparing(JustificationDTO::getId, PagedQueryUtil.longComparator(false));
    }

    @PostMapping
    public ResponseEntity<JustificationDTO> create(
            @Valid @RequestBody JustificationRequest request,
            Principal principal) {

        User currentUser = getCurrentUser(principal);
        User ownerDentist = userService.resolveClinicOwner(currentUser);
        Patient patient = patientRepository.findByIdAndCreatedBy(request.getPatientId(), ownerDentist)
                .orElseThrow(() -> new NotFoundException("Patient introuvable"));
        if (patient.getArchivedAt() != null) {
            throw new BadRequestException(Map.of("_", ARCHIVED_PATIENT_READONLY_MESSAGE));
        }

        Justification justification = new Justification();
        justification.setPatient(patient);
        justification.setTitle(request.getTitle());
        justification.setFinalContent(request.getContent());
        justification.setPractitioner(currentUser);

        Justification saved = justificationService.save(justification);
        auditService.logSuccess(
                AuditEventType.JUSTIFICATION_CREATE,
                "PATIENT",
                patient.getId() != null ? String.valueOf(patient.getId()) : null,
                "Justificatif créé"
        );
        return ResponseEntity.ok(mapToDTO(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<JustificationDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody JustificationRequest request,
            Principal principal) {

        User currentUser = getCurrentUser(principal);

        return justificationService.findByIdAndPractitioner(id, currentUser)
                .map(existing -> {
                    if (existing.getPatient() != null && existing.getPatient().getArchivedAt() != null) {
                        throw new BadRequestException(Map.of("_", ARCHIVED_PATIENT_READONLY_MESSAGE));
                    }
                    existing.setTitle(request.getTitle());
                    existing.setFinalContent(request.getContent());
                    Justification saved = justificationService.save(existing);
                    auditService.logSuccess(
                            AuditEventType.JUSTIFICATION_UPDATE,
                            "PATIENT",
                            saved != null && saved.getPatient() != null ? String.valueOf(saved.getPatient().getId()) : null,
                            "Justificatif modifié"
                    );
                    return ResponseEntity.ok(mapToDTO(saved));
                })
                .orElseThrow(() -> new NotFoundException("Justificatif introuvable"));
    }
@DeleteMapping("/{id}")
     public ResponseEntity<Void> delete(
             @PathVariable Long id,
             Principal principal) {
        if (id != null) {
            // Strict no-delete policy: justifications are immutable history.
            return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).build();
        }
 
         User currentUser = getCurrentUser(principal);
 
         // Uses the same security check as your update method
         return justificationService.findByIdAndPractitioner(id, currentUser)
                 .map(justification -> {
                     if (justification.getPatient() != null && justification.getPatient().getArchivedAt() != null) {
                         throw new BadRequestException(Map.of("_", ARCHIVED_PATIENT_READONLY_MESSAGE));
                     }
                     justificationService.deleteByPractitioner(justification.getId(), currentUser);
                     auditService.logSuccess(
                             AuditEventType.JUSTIFICATION_CANCEL,
                             "PATIENT",
                             justification.getPatient() != null ? String.valueOf(justification.getPatient().getId()) : null,
                            "Justificatif annulé"
                    );
                    return ResponseEntity.noContent().<Void>build(); 
                })
                .orElseThrow(() -> new NotFoundException("Justificatif introuvable"));
    }
    @GetMapping("/{id}/pdf")
public void generateJustificationPdf(
        @PathVariable Long id,
        Principal principal,
        HttpServletResponse response) throws Exception {

    User practitioner = getCurrentUser(principal);
    Justification justification = justificationService.findByIdAndPractitioner(id, practitioner)
            .orElseThrow(() -> new NotFoundException("Justificatif introuvable"));

    auditService.logSuccess(
            AuditEventType.JUSTIFICATION_PDF_DOWNLOAD,
            "PATIENT",
            justification.getPatient() != null ? String.valueOf(justification.getPatient().getId()) : null,
            "Justificatif PDF téléchargé"
    );

    // Set response headers
    response.setContentType("application/pdf");
    // Use the new title in the filename (slugified for safety)
    String fileNameTitle = (justification.getTitle() != null) 
            ? justification.getTitle().toLowerCase().replace(" ", "_") 
            : "justification";
    
    response.setHeader("Content-Disposition",
            "inline; filename=" + fileNameTitle + "_" + justification.getId() + ".pdf");

    // PDF setup
    Document document = new Document(PageSize.A4, 50, 50, 60, 60);
    PdfWriter writer = PdfWriter.getInstance(document, response.getOutputStream());
    document.open();

    // Fonts
    Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20);
    Font subTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
    Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 11);
    Font italicFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 10, java.awt.Color.GRAY);

    // Header
    String clinicName = practitioner.getClinicName();
    if (clinicName != null && !clinicName.isBlank()) {
        document.add(new Paragraph(clinicName.toUpperCase(), titleFont));
    }
    document.add(new Paragraph("Dr. " + practitioner.getFirstname() + " " + practitioner.getLastname(), subTitleFont));

    if (practitioner.getAddress() != null) {
        document.add(new Paragraph(practitioner.getAddress(), normalFont));
    }

    String rawPhone = practitioner.getPhoneNumber() != null ? practitioner.getPhoneNumber() : "";
    if (rawPhone.length() == 10) {
        // Formats as 0X XX XX XX XX
        rawPhone = rawPhone.replaceFirst("(\\d{2})(\\d{2})(\\d{2})(\\d{2})(\\d{2})", "$1 $2 $3 $4 $5");
    }
    if (!rawPhone.isEmpty()) {
        document.add(new Paragraph("Tel: " + rawPhone, normalFont));
    }

    document.add(new Paragraph(" "));
    document.add(new LineSeparator(1f, 100, java.awt.Color.LIGHT_GRAY, Element.ALIGN_CENTER, -2));
    document.add(new Paragraph(" "));

    // Patient & Date info table
    PdfPTable infoTable = new PdfPTable(2);
    infoTable.setWidthPercentage(100);

    PdfPCell pCell = new PdfPCell();
    pCell.setBorder(Rectangle.NO_BORDER);
    Patient patient = justification.getPatient();
    pCell.addElement(new Phrase("Patient: " + patient.getFirstname() + " " + patient.getLastname(), subTitleFont));
    pCell.addElement(new Phrase("Age: " + patient.getAge() + " ans", normalFont));
    infoTable.addCell(pCell);

    PdfPCell dCell = new PdfPCell();
    dCell.setBorder(Rectangle.NO_BORDER);
    Paragraph dateP = new Paragraph("Date: " + justification.getDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")), normalFont);
    dateP.setAlignment(Element.ALIGN_RIGHT);
    dCell.addElement(dateP);
    infoTable.addCell(dCell);

    document.add(infoTable);
    document.add(new Paragraph(" "));

    // UPDATED TITLE SECTION: Now uses the 'title' variable instead of the Enum name
    String displayTitle;
    if (justification.getTitle() != null && !justification.getTitle().isBlank()) {
        displayTitle = justification.getTitle();
    } else if (justification.getTitle() != null) {
        // Fallback to Enum name only if title is null
        displayTitle = justification.getTitle().replace("_", " ");
    } else {
        displayTitle = "JUSTIFICATION MEDICALE";
    }

    Paragraph titleParagraph = new Paragraph(displayTitle.toUpperCase(), titleFont);
    titleParagraph.setAlignment(Element.ALIGN_CENTER);
    titleParagraph.setSpacingBefore(20);
    titleParagraph.setSpacingAfter(20);
    document.add(titleParagraph);

    // Main content
    Paragraph content = new Paragraph(justification.getFinalContent(), normalFont);
    content.setLeading(16f); // Adds some line spacing for better readability
    document.add(content);
    document.add(new Paragraph(" "));

    // Signature
    PdfPTable sigTable = new PdfPTable(1);
    sigTable.setTotalWidth(180);
    PdfPCell sCell = new PdfPCell(new Phrase("Signature & Cachet\n\n\n___________________", normalFont));
    sCell.setBorder(Rectangle.NO_BORDER);
    sCell.setHorizontalAlignment(Element.ALIGN_CENTER);
    sigTable.addCell(sCell);
    sigTable.writeSelectedRows(0, -1, 380, 120, writer.getDirectContent());

    document.close();
}
}


