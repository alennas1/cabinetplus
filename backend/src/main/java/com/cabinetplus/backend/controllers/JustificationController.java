package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.cabinetplus.backend.dto.JustificationDTO;
import com.cabinetplus.backend.dto.JustificationRequest;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Justification;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.JustificationService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.lowagie.text.pdf.draw.LineSeparator;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/justifications")
public class JustificationController {

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

    @PostMapping
    public ResponseEntity<JustificationDTO> create(
            @Valid @RequestBody JustificationRequest request,
            Principal principal) {

        User currentUser = getCurrentUser(principal);
        User ownerDentist = userService.resolveClinicOwner(currentUser);
        Patient patient = patientRepository.findByIdAndCreatedBy(request.getPatientId(), ownerDentist)
                .orElseThrow(() -> new NotFoundException("Patient introuvable"));

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

        User currentUser = getCurrentUser(principal);

        // Uses the same security check as your update method
        return justificationService.findByIdAndPractitioner(id, currentUser)
                .map(justification -> {
                    justificationService.deleteByPractitioner(justification.getId(), currentUser);
                    auditService.logSuccess(
                            AuditEventType.JUSTIFICATION_DELETE,
                            "PATIENT",
                            justification.getPatient() != null ? String.valueOf(justification.getPatient().getId()) : null,
                            "Justificatif supprimé"
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


