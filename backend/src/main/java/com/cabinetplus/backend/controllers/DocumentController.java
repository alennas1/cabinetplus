package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.DocumentResponseDTO;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.DocumentService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;
import com.cabinetplus.backend.util.PagedQueryUtil;
import com.cabinetplus.backend.util.PaginationUtil;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final UserService userService;
    private final PublicIdResolutionService publicIdResolutionService;
    private final AuditService auditService;

    public DocumentController(
            DocumentService documentService,
            UserService userService,
            PublicIdResolutionService publicIdResolutionService,
            AuditService auditService
    ) {
        this.documentService = documentService;
        this.userService = userService;
        this.publicIdResolutionService = publicIdResolutionService;
        this.auditService = auditService;
    }

    @GetMapping("/patient/{patientId}")
    public List<DocumentResponseDTO> getDocumentsByPatient(@PathVariable String patientId, Principal principal) {
        User ownerDentist = getClinicUser(principal);
        Long internalPatientId = publicIdResolutionService.requirePatientOwnedBy(patientId, ownerDentist).getId();
        auditService.logSuccess(
                AuditEventType.DOCUMENT_READ,
                "PATIENT",
                internalPatientId != null ? String.valueOf(internalPatientId) : null,
                "Documents consultés"
        );
        return documentService.findByPatientId(internalPatientId, ownerDentist);
    }

    @GetMapping("/patient/{patientId}/paged")
    public PageResponse<DocumentResponseDTO> getDocumentsByPatientPaged(
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
        User ownerDentist = getClinicUser(principal);
        Long internalPatientId = publicIdResolutionService.requirePatientOwnedBy(patientId, ownerDentist).getId();

        final String fieldNorm = field != null ? field.trim().toLowerCase() : "";
        final String fieldKey = fieldNorm.isBlank() ? "title" : fieldNorm;
        String sortKeyNorm = sortKey != null ? sortKey.trim().toLowerCase() : "";
        boolean desc = "desc".equalsIgnoreCase(sortDirection);

        Comparator<DocumentResponseDTO> comparator = buildDocumentSortComparator(sortKeyNorm, desc);

        List<DocumentResponseDTO> filtered = documentService.findByPatientId(internalPatientId, ownerDentist).stream()
                .filter(d -> {
                    if (d == null) return false;
                    if (!PagedQueryUtil.isInDateRange(d.uploadedAt(), from, to)) return false;

                    if (q != null && !q.isBlank()) {
                        String hay = switch (fieldKey) {
                            case "filename" -> d.filename();
                            case "title" -> d.title();
                            default -> {
                                String title = d.title() != null ? d.title() : "";
                                String filename = d.filename() != null ? d.filename() : "";
                                yield title + " " + filename;
                            }
                        };
                        if (!PagedQueryUtil.matchesSearch(hay, q)) return false;
                    }

                    return true;
                })
                .sorted(comparator)
                .toList();

        return PaginationUtil.toPageResponse(filtered, page, size);
    }

    private static Comparator<DocumentResponseDTO> buildDocumentSortComparator(String sortKeyNorm, boolean desc) {
        Comparator<String> stringComparator = PagedQueryUtil.stringComparator(desc);
        var dateTimeComparator = PagedQueryUtil.dateTimeComparator(desc);

        Comparator<DocumentResponseDTO> comparator = switch (sortKeyNorm) {
            case "title" -> Comparator.comparing(DocumentResponseDTO::title, stringComparator);
            case "date" -> Comparator.comparing(DocumentResponseDTO::uploadedAt, dateTimeComparator);
            default -> Comparator.comparing(DocumentResponseDTO::uploadedAt, PagedQueryUtil.dateTimeComparator(true));
        };

        return comparator.thenComparing(DocumentResponseDTO::id, PagedQueryUtil.longComparator(false));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DocumentResponseDTO uploadDocument(
            @RequestParam("patientId") String patientId,
            @RequestParam("title") String title,
            @RequestParam("file") MultipartFile file,
            Principal principal
    ) {
        User currentUser = getCurrentUser(principal);
        User ownerDentist = userService.resolveClinicOwner(currentUser);
        Long internalPatientId = publicIdResolutionService.requirePatientOwnedBy(patientId, ownerDentist).getId();
        DocumentResponseDTO saved = documentService.store(internalPatientId, title, file, ownerDentist, currentUser);
        auditService.logSuccess(
                AuditEventType.DOCUMENT_CREATE,
                "PATIENT",
                internalPatientId != null ? String.valueOf(internalPatientId) : null,
                "Document ajouté"
        );
        return saved;
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<Resource> openDocument(
            @PathVariable Long id,
            @RequestParam(name = "download", defaultValue = "false") boolean download,
            Principal principal
    ) {
        User ownerDentist = getClinicUser(principal);
        Long internalPatientId = documentService.getDocumentPatientId(id, ownerDentist);
        DocumentResponseDTO metadata = documentService.getDocumentMetadata(id, ownerDentist);
        Resource resource = documentService.getDocumentResource(id, ownerDentist);
        MediaType mediaType = documentService.resolveMediaType(id, ownerDentist);

        auditService.logSuccess(
                AuditEventType.DOCUMENT_READ,
                "PATIENT",
                internalPatientId != null ? String.valueOf(internalPatientId) : null,
                download ? "Document telecharge" : "Document consulte"
        );

        ContentDisposition disposition = (download
                ? ContentDisposition.attachment()
                : ContentDisposition.inline())
                .filename(metadata.filename(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(resource);
    }

    @DeleteMapping("/{id}")
    public void deleteDocument(@PathVariable Long id, Principal principal) {
        if (id != null) {
            // Strict no-delete/no-cancel policy: patient attachments are immutable history.
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.METHOD_NOT_ALLOWED);
        }
        User ownerDentist = getClinicUser(principal);
        Long internalPatientId = documentService.getDocumentPatientId(id, ownerDentist);
        documentService.delete(id, ownerDentist);
        auditService.logSuccess(
                AuditEventType.DOCUMENT_CANCEL,
                "PATIENT",
                internalPatientId != null ? String.valueOf(internalPatientId) : null,
                "Document annulé"
        );
    }

    private User getCurrentUser(Principal principal) {
        return userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
    }

    private User getClinicUser(Principal principal) {
        return userService.resolveClinicOwner(getCurrentUser(principal));
    }
}
