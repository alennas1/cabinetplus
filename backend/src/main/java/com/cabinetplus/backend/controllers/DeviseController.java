package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.DeviseItemResponse;
import com.cabinetplus.backend.dto.DeviseRequest;
import com.cabinetplus.backend.dto.DeviseResponse;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.models.Devise;
import com.cabinetplus.backend.models.DeviseItem;
import com.cabinetplus.backend.models.Material;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.DeviseService;
import com.cabinetplus.backend.services.UserService;
import com.cabinetplus.backend.util.PaginationUtil;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.draw.LineSeparator;

import jakarta.servlet.http.HttpServletResponse;
import com.lowagie.text.Document;
import com.lowagie.text.PageSize;
import com.lowagie.text.Font;
import com.lowagie.text.Element;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;
import org.springframework.format.annotation.DateTimeFormat;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/devises")
@RequiredArgsConstructor
public class DeviseController {

    private final DeviseService deviseService;
    private final UserService userService;
    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<List<DeviseResponse>> getAll(Principal principal) {
        User currentUser = getCurrentUser(principal);
        List<DeviseResponse> response = deviseService.findAllByUser(currentUser)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        auditService.logSuccess(AuditEventType.DEVISE_READ, "DEVISE", null, "Devis consultés");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/paged")
    public ResponseEntity<PageResponse<DeviseResponse>> getAllPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "amountFrom", required = false) Double amountFrom,
            @RequestParam(name = "amountTo", required = false) Double amountTo,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) @RequestParam(name = "from", required = false) LocalDate from,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) @RequestParam(name = "to", required = false) LocalDate to,
            @RequestParam(name = "sortKey", required = false) String sortKey,
            @RequestParam(name = "sortDirection", required = false) String sortDirection,
            Principal principal
    ) {
        User currentUser = getCurrentUser(principal);

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 200);

        String sortKeyNorm = sortKey != null ? sortKey.trim().toLowerCase() : "";
        boolean desc = sortDirection != null && sortDirection.trim().equalsIgnoreCase("desc");

        Sort sort = switch (sortKeyNorm) {
            case "title" -> Sort.by(Sort.Order.by("title").ignoreCase().with(desc ? Sort.Direction.DESC : Sort.Direction.ASC));
            case "totalamount", "total_amount", "amount" -> Sort.by((desc ? Sort.Order.desc("totalAmount") : Sort.Order.asc("totalAmount")).nullsLast());
            case "createdat", "created_at", "created" -> Sort.by((desc ? Sort.Order.desc("createdAt") : Sort.Order.asc("createdAt")).nullsLast());
            default -> Sort.by(Sort.Order.desc("createdAt").nullsLast());
        };
        sort = sort.and(Sort.by(Sort.Order.asc("id")));

        LocalDateTime fromDt = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDt = to != null ? to.atTime(23, 59, 59, 999_999_999) : null;

        var pageable = PageRequest.of(safePage, safeSize, sort);
        var paged = deviseService.searchPagedByUser(currentUser, q, amountFrom, amountTo, fromDt, toDt, pageable);

        List<DeviseResponse> items = paged.getContent().stream().map(this::mapToResponse).toList();

        auditService.logSuccess(AuditEventType.DEVISE_READ, "DEVISE", null, "Devis consultes (page)");
        return ResponseEntity.ok(new PageResponse<>(
                items,
                paged.getNumber(),
                paged.getSize(),
                paged.getTotalElements(),
                paged.getTotalPages()
        ));
    }

    @GetMapping("/{id}")
 public ResponseEntity<DeviseResponse> getById(@PathVariable Long id, Principal principal) {
     User currentUser = getCurrentUser(principal);
     
     return deviseService.findById(id)
             .filter(d -> d.getPractitioner().equals(currentUser))
             .map(d -> {
                 auditService.logSuccess(AuditEventType.DEVISE_READ, "DEVISE", String.valueOf(d.getId()), "Devis consulté");
                 return d;
             })
             .map(this::mapToResponse)
             .map(ResponseEntity::ok)
             .orElseThrow(() -> new NotFoundException("Devis introuvable"));
 }

    @PostMapping
    public ResponseEntity<DeviseResponse> create(@Valid @RequestBody DeviseRequest dto, Principal principal) {
        User currentUser = getCurrentUser(principal);
        Devise saved = deviseService.save(dto, currentUser);
        auditService.logSuccess(AuditEventType.DEVISE_CREATE, "DEVISE", String.valueOf(saved.getId()), "Devis créé");
        return ResponseEntity.ok(mapToResponse(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        User currentUser = getCurrentUser(principal);
        boolean deleted = deviseService.deleteByUser(id, currentUser);
        if (!deleted) {
            throw new NotFoundException("Devis introuvable");
        }
        auditService.logSuccess(AuditEventType.DEVISE_DELETE, "DEVISE", String.valueOf(id), "Devis supprimé");
        return ResponseEntity.noContent().build();
    }

    // Helpers (Consistent with your MaterialController)
    private User getCurrentUser(Principal principal) {
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
    }

    private DeviseResponse mapToResponse(Devise d) {
        List<DeviseItemResponse> itemResponses = d.getItems().stream()
                .map(this::mapItemToResponse)
                .collect(Collectors.toList());

        String createdByName = null;
        if (d.getPractitioner() != null) {
            String first = d.getPractitioner().getFirstname() != null ? d.getPractitioner().getFirstname().trim() : "";
            String last = d.getPractitioner().getLastname() != null ? d.getPractitioner().getLastname().trim() : "";
            String combined = (first + " " + last).trim();
            createdByName = combined.isBlank() ? null : combined;
        }

        return new DeviseResponse(
                d.getId(),
                d.getTitle(),
                d.getCreatedAt(),
                d.getTotalAmount(),
                itemResponses,
                createdByName
        );
    }

    private DeviseItemResponse mapItemToResponse(DeviseItem item) {
        boolean isTreatment = item.getTreatmentCatalog() != null;
        String name = isTreatment ? item.getTreatmentCatalog().getName() : item.getProthesisCatalog().getName();
        String type = isTreatment ? "TREATMENT" : "PROTHESIS";

        return new DeviseItemResponse(
                item.getId(),
                name,
                type,
                item.getUnitPrice(),
                item.getQuantity(),
                item.getUnitPrice() * item.getQuantity()
        );
    }
      @GetMapping("/{id}/pdf")
public void generateDevisePdf(
        @PathVariable Long id,
        Principal principal,
        HttpServletResponse response) throws Exception {

    User practitioner = getCurrentUser(principal);
    // Assuming you add a findById method in service that checks the practitioner
    Devise devise = deviseService.findById(id)
            .filter(d -> d.getPractitioner().equals(practitioner))
            .orElseThrow(() -> new NotFoundException("Devis introuvable"));

    auditService.logSuccess(AuditEventType.DEVISE_PDF_DOWNLOAD, "DEVISE", String.valueOf(devise.getId()), "Devis PDF téléchargé");
 
    response.setContentType("application/pdf");
    String fileNameTitle = (devise.getTitle() != null) 
            ? devise.getTitle().toLowerCase().replace(" ", "_") 
            : "devise";
    
    response.setHeader("Content-Disposition",
            "inline; filename=devise_" + fileNameTitle + "_" + devise.getId() + ".pdf");

    Document document = new Document(PageSize.A4, 50, 50, 60, 60);
    PdfWriter writer = PdfWriter.getInstance(document, response.getOutputStream());
    document.open();

    // Fonts
    Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20);
    Font subTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
    Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 11);
    Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);

    // Header (Practitioner Info)
    String clinicName = practitioner.getClinicName();
    if (clinicName != null && !clinicName.isBlank()) {
        document.add(new Paragraph(clinicName.toUpperCase(), titleFont));
    }
    document.add(new Paragraph("Dr. " + practitioner.getFirstname() + " " + practitioner.getLastname(), subTitleFont));

    if (practitioner.getAddress() != null) {
        document.add(new Paragraph(practitioner.getAddress(), normalFont));
    }
    
    document.add(new Paragraph(" "));
    document.add(new LineSeparator(1f, 100, java.awt.Color.LIGHT_GRAY, Element.ALIGN_CENTER, -2));
    document.add(new Paragraph(" "));

    // Devise Title & Date
    PdfPTable headerTable = new PdfPTable(2);
    headerTable.setWidthPercentage(100);
    
    PdfPCell titleCell = new PdfPCell(new Phrase("DEVIS: " + devise.getTitle().toUpperCase(), subTitleFont));
    titleCell.setBorder(Rectangle.NO_BORDER);
    headerTable.addCell(titleCell);

    PdfPCell dateCell = new PdfPCell(new Phrase("Date: " + java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy").format(devise.getCreatedAt()), normalFont));
    dateCell.setBorder(Rectangle.NO_BORDER);
    dateCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
    headerTable.addCell(dateCell);
    
    document.add(headerTable);
    document.add(new Paragraph(" "));

    // Items Table
    PdfPTable table = new PdfPTable(new float[]{4, 1, 2, 2}); // Weights for columns
    table.setWidthPercentage(100);
    table.setSpacingBefore(10);

    // Table Headers
    String[] headers = {"Designation", "Qte", "Prix Unitaire", "Total"};
    for (String columnHeader : headers) {
        PdfPCell cell = new PdfPCell(new Phrase(columnHeader, boldFont));
        cell.setBackgroundColor(java.awt.Color.LIGHT_GRAY);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setPadding(5);
        table.addCell(cell);
    }

    // Table Rows
    for (DeviseItem item : devise.getItems()) {
        String name = (item.getTreatmentCatalog() != null) 
                      ? item.getTreatmentCatalog().getName() 
                      : item.getProthesisCatalog().getName();
        
        table.addCell(new PdfPCell(new Phrase(name, normalFont)));
        
        PdfPCell qtyCell = new PdfPCell(new Phrase(String.valueOf(item.getQuantity()), normalFont));
        qtyCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        table.addCell(qtyCell);

        table.addCell(new PdfPCell(new Phrase(String.format("%,.2f DA", item.getUnitPrice()), normalFont)));
        
        double subtotal = item.getUnitPrice() * item.getQuantity();
        table.addCell(new PdfPCell(new Phrase(String.format("%,.2f DA", subtotal), boldFont)));
    }

    document.add(table);

    // Total Section
    Paragraph totalP = new Paragraph("\nTOTAL GENERAL: " + String.format("%,.2f DZD", devise.getTotalAmount()), subTitleFont);
    totalP.setAlignment(Element.ALIGN_RIGHT);
    document.add(totalP);

    // Signature Area
    PdfPTable sigTable = new PdfPTable(1);
    sigTable.setTotalWidth(180);
    PdfPCell sCell = new PdfPCell(new Phrase("Cachet et Signature\n\n\n___________________", normalFont));
    sCell.setBorder(Rectangle.NO_BORDER);
    sCell.setHorizontalAlignment(Element.ALIGN_CENTER);
    sigTable.addCell(sCell);
    sigTable.writeSelectedRows(0, -1, 380, 120, writer.getDirectContent());

    document.close();
}

  }


