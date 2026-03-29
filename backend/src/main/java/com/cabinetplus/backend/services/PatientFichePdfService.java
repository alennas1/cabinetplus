package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.models.Appointment;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Payment;
import com.cabinetplus.backend.models.Prothesis;
import com.cabinetplus.backend.models.Treatment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.AppointmentRepository;
import com.cabinetplus.backend.repositories.PaymentRepository;
import com.cabinetplus.backend.repositories.ProthesisRepository;
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

@Service
public class PatientFichePdfService {

    private final TreatmentRepository treatmentRepository;
    private final AppointmentRepository appointmentRepository;
    private final PaymentRepository paymentRepository;
    private final ProthesisRepository prothesisRepository;

    public PatientFichePdfService(
            TreatmentRepository treatmentRepository,
            AppointmentRepository appointmentRepository,
            PaymentRepository paymentRepository,
            ProthesisRepository prothesisRepository
    ) {
        this.treatmentRepository = treatmentRepository;
        this.appointmentRepository = appointmentRepository;
        this.paymentRepository = paymentRepository;
        this.prothesisRepository = prothesisRepository;
    }

    public void writePatientFichePdf(User clinicUser, Patient patient, String fileName, HttpServletResponse response) throws Exception {
        if (clinicUser == null) {
            throw new IllegalArgumentException("clinicUser is required");
        }
        if (patient == null || patient.getId() == null) {
            throw new IllegalArgumentException("patient is required");
        }

        Long patientId = patient.getId();

        List<Treatment> treatments = treatmentRepository.findByPatientId(patientId).stream()
                .filter(t -> "DONE".equalsIgnoreCase(t.getStatus()) || "IN_PROGRESS".equalsIgnoreCase(t.getStatus()))
                .collect(Collectors.toList());
        List<Appointment> appointments = appointmentRepository.findByPatientId(patientId);
        // Exclude cancelled payments from the PDF and balance calculations.
        List<Payment> payments = paymentRepository.findByPatientIdAndRecordStatusOrderByDateDesc(patientId, RecordStatus.ACTIVE);
        List<Prothesis> protheses = prothesisRepository.findByPatient(patient).stream()
                .filter(p -> p != null && p.getRecordStatus() == RecordStatus.ACTIVE)
                .filter(p -> p.getStatus() == null || !"CANCELLED".equalsIgnoreCase(p.getStatus()))
                .collect(Collectors.toList());

        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + (fileName != null ? fileName : "fiche_patient.pdf") + "\"");
        response.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

        com.lowagie.text.Document document = new com.lowagie.text.Document(PageSize.A4, 50, 50, 60, 60);
        PdfWriter.getInstance(document, response.getOutputStream());
        document.open();

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
        Font sectionHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
        Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
        Font bodyFontBold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        String clinicName = clinicUser.getClinicName();
        if (clinicName != null && !clinicName.isBlank()) {
            document.add(new Paragraph(clinicName.toUpperCase(), titleFont));
        }
        document.add(new Paragraph("Dr. " + safe(clinicUser.getFirstname()) + " " + safe(clinicUser.getLastname()), sectionHeaderFont));
        if (clinicUser.getAddress() != null) {
            document.add(new Paragraph(clinicUser.getAddress(), bodyFont));
        }
        String rawPhone = clinicUser.getPhoneNumber() != null ? clinicUser.getPhoneNumber() : "";
        if (rawPhone.length() == 10) {
            rawPhone = rawPhone.replaceFirst("(\\d{2})(\\d{2})(\\d{2})(\\d{2})(\\d{2})", "$1 $2 $3 $4 $5");
        }
        if (!rawPhone.isEmpty()) {
            document.add(new Paragraph("Tel: " + rawPhone, bodyFont));
        }

        document.add(new Paragraph(" "));
        document.add(new LineSeparator(0.5f, 100, java.awt.Color.BLACK, Element.ALIGN_CENTER, -2));
        document.add(new Paragraph(" "));

        Paragraph mainTitle = new Paragraph("Fiche de soins", titleFont);
        mainTitle.setAlignment(Element.ALIGN_CENTER);
        mainTitle.setSpacingAfter(25);
        document.add(mainTitle);

        String patientFirst = safe(patient.getFirstname());
        String patientLast = safe(patient.getLastname());

        PdfPTable patientInfo = new PdfPTable(2);
        patientInfo.setWidthPercentage(100);
        addKeyValueRow(patientInfo, "PATIENT:", (patientFirst + " " + patientLast).trim().toUpperCase(), bodyFontBold, bodyFont);
        addKeyValueRow(patientInfo, "AGE:", patient.getAge() != null ? patient.getAge() + " ans" : "-", bodyFontBold, bodyFont);
        addKeyValueRow(patientInfo, "TELEPHONE:", (patient.getPhone() != null ? patient.getPhone() : "N/A"), bodyFontBold, bodyFont);
        addKeyValueRow(patientInfo, "DATE DU RAPPORT:", LocalDateTime.now().format(dtf), bodyFontBold, bodyFont);
        document.add(patientInfo);

        document.add(new Paragraph(" "));
        document.add(new LineSeparator(0.5f, 100, java.awt.Color.BLACK, Element.ALIGN_CENTER, -2));
        document.add(new Paragraph(" "));

        document.add(new Paragraph("HISTORIQUE DES TRAITEMENTS", sectionHeaderFont));
        PdfPTable tTable = new PdfPTable(new float[] { 2, 5, 2 });
        tTable.setWidthPercentage(100);
        tTable.setSpacingBefore(10);
        tTable.setSplitRows(true);
        tTable.setHeaderRows(1);
        addCleanHeader(tTable, bodyFontBold, new String[] { "DATE", "TRAITEMENT", "MONTANT" });
        for (Treatment treatment : treatments) {
            addCleanRow(tTable, bodyFont, new String[] {
                    treatment.getDate() != null ? treatment.getDate().format(dtf) : "-",
                    treatment.getTreatmentCatalog() != null ? treatment.getTreatmentCatalog().getName() : "-",
                    treatment.getPrice() != null ? treatment.getPrice() + " DZD" : "-"
            });
        }
        document.add(tTable);
        document.add(new Paragraph(" "));

        document.add(new Paragraph("RENDEZ-VOUS", sectionHeaderFont));
        PdfPTable aTable = new PdfPTable(new float[] { 3, 3, 4 });
        aTable.setWidthPercentage(100);
        aTable.setSpacingBefore(10);
        aTable.setSplitRows(true);
        aTable.setHeaderRows(1);
        addCleanHeader(aTable, bodyFontBold, new String[] { "DATE & HEURE", "STATUT", "NOTES" });
        for (Appointment appointment : appointments) {
            addCleanRow(aTable, bodyFont, new String[] {
                    appointment.getDateTimeStart() != null
                            ? appointment.getDateTimeStart().format(DateTimeFormatter.ofPattern("dd/MM/yy HH:mm"))
                            : "-",
                    appointment.getStatus() != null ? translateStatus(appointment.getStatus().toString()) : "-",
                    appointment.getNotes() != null ? appointment.getNotes() : "-"
            });
        }
        document.add(aTable);
        document.add(new Paragraph(" "));

        if (!protheses.isEmpty()) {
            document.add(new Paragraph("HISTORIQUE DES PROTHESES", sectionHeaderFont));
            PdfPTable prTable = new PdfPTable(new float[] { 2, 4, 2 });
            prTable.setWidthPercentage(100);
            prTable.setSpacingBefore(10);
            prTable.setSplitRows(true);
            prTable.setHeaderRows(1);
            addCleanHeader(prTable, bodyFontBold, new String[] { "DATE", "PROTHESE", "MONTANT" });
            for (Prothesis prothesis : protheses) {
                addCleanRow(prTable, bodyFont, new String[] {
                        prothesis.getDateCreated() != null ? prothesis.getDateCreated().format(dtf) : "-",
                        prothesis.getProthesisCatalog() != null ? prothesis.getProthesisCatalog().getName() : "-",
                        prothesis.getFinalPrice() != null ? prothesis.getFinalPrice() + " DZD" : "-"
                });
            }
            document.add(prTable);
            document.add(new Paragraph(" "));
        }

        document.add(new Paragraph("VERSEMENTS", sectionHeaderFont));
        PdfPTable pTable = new PdfPTable(new float[] { 3, 4, 3 });
        pTable.setWidthPercentage(100);
        pTable.setSpacingBefore(10);
        pTable.setSplitRows(true);
        pTable.setHeaderRows(1);
        addCleanHeader(pTable, bodyFontBold, new String[] { "DATE", "METHODE", "MONTANT" });
        for (Payment pay : payments) {
            addCleanRow(pTable, bodyFont, new String[] {
                    pay.getDate() != null ? pay.getDate().format(dtf) : "-",
                    pay.getMethod() != null ? translatePaymentMethod(pay.getMethod().toString()) : "-",
                    pay.getAmount() != null ? pay.getAmount() + " DZD" : "-"
            });
        }
        document.add(pTable);

        double totalTreatments = treatments.stream().mapToDouble(t -> t.getPrice() != null ? t.getPrice() : 0).sum();
        double totalProthesis = protheses.stream().mapToDouble(p -> p.getFinalPrice() != null ? p.getFinalPrice() : 0).sum();
        double totalPaid = payments.stream().mapToDouble(p -> p.getAmount() != null ? p.getAmount() : 0).sum();
        double balance = (totalTreatments + totalProthesis) - totalPaid;

        document.add(new Paragraph(" "));
        PdfPTable totalTable = new PdfPTable(2);
        totalTable.setWidthPercentage(40);
        totalTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
        addKeyValueRow(totalTable, "TOTAL TRAITEMENTS:", totalTreatments + " DZD", bodyFont, bodyFont);
        addKeyValueRow(totalTable, "TOTAL PROTHESES:", totalProthesis + " DZD", bodyFont, bodyFont);
        addKeyValueRow(totalTable, "TOTAL PAYE:", totalPaid + " DZD", bodyFont, bodyFont);

        PdfPCell sKey = new PdfPCell(new Phrase("SOLDE RESTANT:", bodyFontBold));
        sKey.setBorder(Rectangle.TOP);
        sKey.setPaddingTop(5);
        totalTable.addCell(sKey);

        PdfPCell sVal = new PdfPCell(new Phrase(balance + " DZD", bodyFontBold));
        sVal.setBorder(Rectangle.TOP);
        sVal.setPaddingTop(5);
        totalTable.addCell(sVal);
        document.add(totalTable);

        Paragraph sig = new Paragraph("Signature & Cachet\n\n\n___________________", bodyFont);
        sig.setAlignment(Element.ALIGN_CENTER);
        document.add(sig);

        document.close();
    }

    private String translateStatus(String status) {
        if (status == null) return "-";
        return switch (status) {
            case "SCHEDULED" -> "Planifie";
            case "COMPLETED" -> "Termine";
            case "CANCELLED" -> "Annule";
            default -> status;
        };
    }

    private String translatePaymentMethod(String method) {
        if (method == null) return "-";
        return switch (method) {
            case "CASH" -> "Especes";
            case "CARD" -> "Carte";
            case "BANK_TRANSFER" -> "Virement";
            case "CHECK" -> "Cheque";
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

    private String safe(String value) {
        return value != null ? value : "";
    }
}
