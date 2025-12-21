package com.cabinetplus.backend.controllers;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.models.Appointment;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Payment;
import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.Treatment;
import com.cabinetplus.backend.repositories.AppointmentRepository;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.repositories.PaymentRepository;
import com.cabinetplus.backend.repositories.PrescriptionRepository;
import com.cabinetplus.backend.repositories.TreatmentRepository;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.draw.LineSeparator;

import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/public/pdf")
@CrossOrigin("*") // Essential for phone access
public class PublicPdfController {

    private final PatientRepository patientRepository;
    private final TreatmentRepository treatmentRepository;
    private final PaymentRepository paymentRepository;
    private final AppointmentRepository appointmentRepository;
    private final PrescriptionRepository prescriptionRepository;

    public PublicPdfController(PatientRepository p, 
                               TreatmentRepository t, 
                               PaymentRepository pay, 
                               AppointmentRepository a,
                               PrescriptionRepository rx) {
        this.patientRepository = p;
        this.treatmentRepository = t;
        this.paymentRepository = pay;
        this.appointmentRepository = a;
        this.prescriptionRepository = rx;
    }

    @GetMapping("/{id}")
    public void downloadPublicPdf(@PathVariable Long id, HttpServletResponse response) throws Exception {
        // 1. Fetch Data (Public access - no User check)
        Patient patient = patientRepository.findById(id).orElseThrow(() -> new RuntimeException("Patient not found"));
        
        List<Treatment> treatments = treatmentRepository.findByPatientId(id);
        List<Appointment> appointments = appointmentRepository.findByPatientId(id);
        List<Payment> payments = paymentRepository.findByPatientId(id);
        // Note: Prescriptions are fetched to match your controller, even if not printed in the main logic
        List<Prescription> prescriptions = prescriptionRepository.findByPatientId(id);

        // 2. Setup Response Headers
        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition", "inline; filename=fiche_" + patient.getLastname() + ".pdf");

        // 3. Generate PDF (Logic copied EXACTLY from PatientController)
        com.lowagie.text.Document document = new com.lowagie.text.Document(PageSize.A4, 50, 50, 60, 60);
        PdfWriter.getInstance(document, response.getOutputStream());
        document.open();

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
        Font sectionHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
        Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
        Font bodyFontBold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        // Header
        Paragraph mainTitle = new Paragraph("FICHE DU PATIENT", titleFont);
        mainTitle.setAlignment(Element.ALIGN_CENTER);
        mainTitle.setSpacingAfter(25);
        document.add(mainTitle);

        PdfPTable patientInfo = new PdfPTable(2);
        patientInfo.setWidthPercentage(100);
        addKeyValueRow(patientInfo, "PATIENT:", patient.getFirstname() + " " + patient.getLastname().toUpperCase(), bodyFontBold, bodyFont);
        addKeyValueRow(patientInfo, "ÂGE:", patient.getAge() + " ans", bodyFontBold, bodyFont);
        addKeyValueRow(patientInfo, "TÉLÉPHONE:", (patient.getPhone() != null ? patient.getPhone() : "N/A"), bodyFontBold, bodyFont);
        addKeyValueRow(patientInfo, "DATE:", LocalDateTime.now().format(dtf), bodyFontBold, bodyFont);
        document.add(patientInfo);

        document.add(new Paragraph(" "));
        document.add(new LineSeparator(0.5f, 100, java.awt.Color.BLACK, Element.ALIGN_CENTER, -2));
        document.add(new Paragraph(" "));

        // Treatments Table
        document.add(new Paragraph("HISTORIQUE DES TRAITEMENTS", sectionHeaderFont));
        PdfPTable tTable = new PdfPTable(new float[]{2, 5, 2});
        tTable.setWidthPercentage(100);
        tTable.setSpacingBefore(10);
        addCleanHeader(tTable, bodyFontBold, new String[]{"DATE", "TRAITEMENT", "PRIX"});
        for (Treatment t : treatments) {
            addCleanRow(tTable, bodyFont, new String[]{t.getDate() != null ? t.getDate().format(dtf) : "-", t.getTreatmentCatalog().getName(), t.getPrice() + " DZD"});
        }
        document.add(tTable);
        document.add(new Paragraph(" "));

        // Appointments Table
        document.add(new Paragraph("RENDEZ-VOUS", sectionHeaderFont));
        PdfPTable aTable = new PdfPTable(new float[]{3, 3, 4});
        aTable.setWidthPercentage(100);
        aTable.setSpacingBefore(10);
        addCleanHeader(aTable, bodyFontBold, new String[]{"DATE & HEURE", "STATUT", "NOTES"});
        for (Appointment a : appointments) {
            addCleanRow(aTable, bodyFont, new String[]{
                a.getDateTimeStart().format(DateTimeFormatter.ofPattern("dd/MM/yy HH:mm")), 
                translateStatus(a.getStatus().toString()), 
                a.getNotes() != null ? a.getNotes() : "-"
            });
        }
        document.add(aTable);
        document.add(new Paragraph(" "));

        // Payments Table
        document.add(new Paragraph("PAIEMENTS", sectionHeaderFont));
        PdfPTable pTable = new PdfPTable(new float[]{3, 4, 3});
        pTable.setWidthPercentage(100);
        pTable.setSpacingBefore(10);
        addCleanHeader(pTable, bodyFontBold, new String[]{"DATE", "MÉTHODE", "MONTANT"});
        for (Payment pay : payments) {
            addCleanRow(pTable, bodyFont, new String[]{
                pay.getDate().format(dtf), 
                translatePaymentMethod(pay.getMethod().toString()), 
                pay.getAmount() + " DZD"
            });
        }
        document.add(pTable);

        // --- FINAL SUMMARY BLOCK ---
        double totalTreatments = treatments.stream().mapToDouble(Treatment::getPrice).sum();
        double totalPaid = payments.stream().mapToDouble(Payment::getAmount).sum();
        double balance = totalTreatments - totalPaid;

        document.add(new Paragraph(" "));
        PdfPTable totalTable = new PdfPTable(2);
        totalTable.setWidthPercentage(40);
        totalTable.setHorizontalAlignment(Element.ALIGN_RIGHT);

        addKeyValueRow(totalTable, "TOTAL TRAITEMENTS:", totalTreatments + " DZD", bodyFont, bodyFont);
        addKeyValueRow(totalTable, "TOTAL PAYÉ:", totalPaid + " DZD", bodyFont, bodyFont);
        
        PdfPCell sKey = new PdfPCell(new Phrase("SOLDE RESTANT:", bodyFontBold));
        sKey.setBorder(Rectangle.TOP);
        sKey.setPaddingTop(5);
        totalTable.addCell(sKey);

        PdfPCell sVal = new PdfPCell(new Phrase(balance + " DZD", bodyFontBold));
        sVal.setBorder(Rectangle.TOP);
        sVal.setPaddingTop(5);
        totalTable.addCell(sVal);

        document.add(totalTable);
        document.close();
    }

    // ==========================================
    // HELPERS (COPIED FROM PatientController)
    // ==========================================

    private String translateStatus(String status) {
        if (status == null) return "-";
        return switch (status) {
            case "SCHEDULED" -> "Planifié";
            case "COMPLETED" -> "Terminé";
            case "CANCELLED" -> "Annulé";
            default -> status;
        };
    }

    private String translatePaymentMethod(String method) {
        if (method == null) return "-";
        return switch (method) {
            case "CASH" -> "Espèces";
            case "CARD" -> "Carte";
            case "BANK_TRANSFER" -> "Virement";
            case "CHECK" -> "Chèque";
            default -> method;
        };
    }

    private void addKeyValueRow(PdfPTable table, String key, String value, Font keyFont, Font valueFont) {
        PdfPCell keyCell = new PdfPCell(new Phrase(key, keyFont));
        keyCell.setBorder(Rectangle.NO_BORDER);
        keyCell.setPaddingBottom(5);
        table.addCell(keyCell);
        PdfPCell valCell = new PdfPCell(new Phrase(value, valueFont));
        valCell.setBorder(Rectangle.NO_BORDER);
        valCell.setPaddingBottom(5);
        table.addCell(valCell);
    }

    private void addCleanHeader(PdfPTable table, Font font, String[] headers) {
        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, font));
            cell.setBorder(Rectangle.BOTTOM);
            cell.setBorderWidth(1.2f);
            cell.setPaddingBottom(8);
            table.addCell(cell);
        }
    }

    private void addCleanRow(PdfPTable table, Font font, String[] values) {
        for (String v : values) {
            PdfPCell cell = new PdfPCell(new Phrase(v, font));
            cell.setBorder(Rectangle.BOTTOM);
            cell.setBorderColor(java.awt.Color.LIGHT_GRAY);
            cell.setBorderWidth(0.5f);
            cell.setPaddingTop(6);
            cell.setPaddingBottom(6);
            table.addCell(cell);
        }
    }
}