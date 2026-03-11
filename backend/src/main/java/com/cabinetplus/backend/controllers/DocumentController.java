package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.DocumentResponseDTO;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.DocumentService;
import com.cabinetplus.backend.services.UserService;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final UserService userService;

    public DocumentController(DocumentService documentService, UserService userService) {
        this.documentService = documentService;
        this.userService = userService;
    }

    @GetMapping("/patient/{patientId}")
    public List<DocumentResponseDTO> getDocumentsByPatient(@PathVariable Long patientId, Principal principal) {
        return documentService.findByPatientId(patientId, getClinicUser(principal));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DocumentResponseDTO uploadDocument(
            @RequestParam("patientId") Long patientId,
            @RequestParam("title") String title,
            @RequestParam("file") MultipartFile file,
            Principal principal
    ) {
        User currentUser = getCurrentUser(principal);
        User ownerDentist = userService.resolveClinicOwner(currentUser);
        return documentService.store(patientId, title, file, ownerDentist, currentUser);
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<Resource> openDocument(
            @PathVariable Long id,
            @RequestParam(name = "download", defaultValue = "false") boolean download,
            Principal principal
    ) {
        User ownerDentist = getClinicUser(principal);
        DocumentResponseDTO metadata = documentService.getDocumentMetadata(id, ownerDentist);
        Resource resource = documentService.getDocumentResource(id, ownerDentist);
        MediaType mediaType = documentService.resolveMediaType(id, ownerDentist);

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
        documentService.delete(id, getClinicUser(principal));
    }

    private User getCurrentUser(Principal principal) {
        return userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
    }

    private User getClinicUser(Principal principal) {
        return userService.resolveClinicOwner(getCurrentUser(principal));
    }
}
