package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.PrescriptionRequestDTO;
import com.cabinetplus.backend.dto.PrescriptionResponseDTO;
import com.cabinetplus.backend.dto.PrescriptionSummaryDTO;
import com.cabinetplus.backend.models.*;
import com.cabinetplus.backend.services.PrescriptionService;
import com.cabinetplus.backend.services.UserService;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.lowagie.text.pdf.draw.LineSeparator;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/prescriptions")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionService prescriptionService;
    private final UserService userService;

    @PostMapping
    public ResponseEntity<PrescriptionResponseDTO> createPrescription(@Valid @RequestBody PrescriptionRequestDTO dto, Principal principal) {
        User practitioner = getPractitioner(principal);
        Prescription prescription = prescriptionService.createPrescription(dto, practitioner);
        return ResponseEntity.ok(prescriptionService.mapToResponseDTO(prescription));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<PrescriptionSummaryDTO>> getPrescriptionsByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(prescriptionService.getPrescriptionsByPatientId(patientId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PrescriptionResponseDTO> getPrescriptionById(@PathVariable Long id, Principal principal) {
        User practitioner = getPractitioner(principal);
        return ResponseEntity.ok(prescriptionService.getPrescriptionById(id, practitioner));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PrescriptionResponseDTO> updatePrescription(@PathVariable Long id, @Valid @RequestBody PrescriptionRequestDTO dto, Principal principal) {
        User practitioner = getPractitioner(principal);
        Prescription updated = prescriptionService.updatePrescription(id, dto, practitioner);
        return ResponseEntity.ok(prescriptionService.mapToResponseDTO(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePrescription(@PathVariable Long id) {
        prescriptionService.deletePrescription(id);
        return ResponseEntity.ok("Prescription deleted successfully");
    }

    /* ===================== CLEAN & PROFESSIONAL PDF ===================== */
@GetMapping("/{id}/pdf")
public void generatePrescriptionPdf(@PathVariable Long id, Principal principal, HttpServletResponse response) throws Exception {

    User practitioner = getPractitioner(principal);
    Prescription rx = prescriptionService.getPrescriptionEntity(id, practitioner);

    response.setContentType("application/pdf");
    response.setHeader("Content-Disposition", "inline; filename=ordonnance_" + rx.getRxId() + ".pdf");

    com.lowagie.text.Document document = new com.lowagie.text.Document(PageSize.A4, 50, 50, 60, 60);
    PdfWriter writer = PdfWriter.getInstance(document, response.getOutputStream());
    document.open();

    // Fonts
    Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20);
    Font subTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
    Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 11);
    Font medFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
    Font italicFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 10, java.awt.Color.GRAY);
    Font genericFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 10, new java.awt.Color(70, 70, 70));

    // 1. DYNAMIC HEADER
    String clinicName = (practitioner.getClinicName() != null) ? practitioner.getClinicName() : "CABINET MÉDICAL";
    document.add(new Paragraph(clinicName.toUpperCase(), titleFont));
    document.add(new Paragraph("Dr. " + practitioner.getFirstname() + " " + practitioner.getLastname(), subTitleFont));
    
    if (practitioner.getAddress() != null) {
        document.add(new Paragraph(practitioner.getAddress(), normalFont));
    }
    
    String rawPhone = (practitioner.getPhoneNumber() != null) ? practitioner.getPhoneNumber() : "";
    String formattedPhone = rawPhone;
    if (rawPhone.length() == 10) {
        formattedPhone = rawPhone.replaceFirst("(\\d{4})(\\d{2})(\\d{2})(\\d{2})", "$1 $2 $3 $4");
    }
    
    if (!formattedPhone.isEmpty()) {
        document.add(new Paragraph("Tél: " + formattedPhone, normalFont));
    }
    if (practitioner.getEmail() != null) {
        document.add(new Paragraph("Email: " + practitioner.getEmail(), normalFont));
    }
    
    document.add(new Paragraph(" "));
    document.add(new LineSeparator(1f, 100, java.awt.Color.LIGHT_GRAY, Element.ALIGN_CENTER, -2));
    document.add(new Paragraph(" "));

    // 2. PATIENT & DATE INFO
    PdfPTable infoTable = new PdfPTable(2);
    infoTable.setWidthPercentage(100);
    
    PdfPCell pCell = new PdfPCell();
    pCell.setBorder(Rectangle.NO_BORDER);
    pCell.addElement(new Phrase("Patient: " + rx.getPatient().getFirstname() + " " + rx.getPatient().getLastname(), subTitleFont));
    pCell.addElement(new Phrase("Age: " + rx.getPatient().getAge() + " ans", normalFont));
    infoTable.addCell(pCell);

    PdfPCell dCell = new PdfPCell();
    dCell.setBorder(Rectangle.NO_BORDER);
    Paragraph dateP = new Paragraph("Date: " + rx.getDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")), normalFont);
    dateP.setAlignment(Element.ALIGN_RIGHT);
    dCell.addElement(dateP);
    infoTable.addCell(dCell);
    
    document.add(infoTable);
    document.add(new Paragraph(" "));
    
    Paragraph title = new Paragraph("ORDONNANCE", titleFont);
    title.setAlignment(Element.ALIGN_CENTER);
    title.setSpacingAfter(20);
    document.add(title);

    // 3. MEDICATIONS LIST (UPDATED WITH STRENGTH)
    for (PrescriptionMedication med : rx.getMedications()) {
        // Build the header string: NAME + STRENGTH
        String medHeaderStr = "- " + med.getMedication().getName().toUpperCase();
        
        // Add strength if it exists
        if (med.getMedication().getStrength() != null && !med.getMedication().getStrength().isEmpty()) {
            medHeaderStr += " " + med.getMedication().getStrength();
        }

        Paragraph mHeader = new Paragraph(medHeaderStr, medFont);
        
        if (med.getMedication().getDosageForm() != null) {
            mHeader.add(new Chunk(" (" + med.getMedication().getDosageForm().toString() + ")", italicFont));
        }
        document.add(mHeader);

        if (med.getMedication().getGenericName() != null && !med.getMedication().getGenericName().isEmpty()) {
            Paragraph gName = new Paragraph("  " + med.getMedication().getGenericName(), genericFont);
            gName.setSpacingBefore(-2f); 
            document.add(gName);
        }

        String rawAmount = med.getAmount();
        String formattedAmount;
        try {
            double val = Double.parseDouble(rawAmount);
            formattedAmount = (val == (long) val) ? String.format("%d", (long) val) : String.valueOf(val);
        } catch (Exception e) {
            formattedAmount = rawAmount;
        }

        String detailStr = String.format("  %s %s, %s pendant %s", 
            formattedAmount, med.getUnit(), med.getFrequency(), med.getDuration());
        
        document.add(new Paragraph(detailStr, normalFont));

        if (med.getInstructions() != null && !med.getInstructions().isEmpty()) {
            document.add(new Paragraph("  Note: " + med.getInstructions(), italicFont));
        }
        document.add(new Paragraph(" "));
    }

    // 4. NOTES
    if (rx.getNotes() != null && !rx.getNotes().isEmpty()) {
        document.add(new Paragraph("Notes:", subTitleFont));
        document.add(new Paragraph(rx.getNotes(), normalFont));
    }

    // 5. SIGNATURE
    PdfPTable sigTable = new PdfPTable(1);
    sigTable.setTotalWidth(180);
    PdfPCell sCell = new PdfPCell(new Phrase("Signature & Cachet\n\n\n___________________", normalFont));
    sCell.setBorder(Rectangle.NO_BORDER);
    sCell.setHorizontalAlignment(Element.ALIGN_CENTER);
    sigTable.addCell(sCell);
    sigTable.writeSelectedRows(0, -1, 380, 120, writer.getDirectContent());

    document.close();
}
  private User getPractitioner(Principal principal) {
        return userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Practitioner not found"));
    }
}