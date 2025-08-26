package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.models.Document;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.services.DocumentService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping
    public List<Document> getAllDocuments() {
        return documentService.findAll();
    }

    @GetMapping("/{id}")
    public Optional<Document> getDocumentById(@PathVariable Long id) {
        return documentService.findById(id);
    }

    @PostMapping
    public Document createDocument(@RequestBody Document document) {
        return documentService.save(document);
    }

    @PutMapping("/{id}")
    public Document updateDocument(@PathVariable Long id, @RequestBody Document document) {
        document.setId(id);
        return documentService.save(document);
    }

    @DeleteMapping("/{id}")
    public void deleteDocument(@PathVariable Long id) {
        documentService.delete(id);
    }

    // 🔍 Extra endpoint: documents by patient
    @GetMapping("/patient/{patientId}")
    public List<Document> getDocumentsByPatient(@PathVariable Long patientId) {
        Patient patient = new Patient();
        patient.setId(patientId);
        return documentService.findByPatient(patient);
    }
}
