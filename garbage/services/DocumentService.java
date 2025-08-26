package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.Document;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.repositories.DocumentRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;

    public DocumentService(DocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
    }

    public Document save(Document document) {
        return documentRepository.save(document);
    }

    public List<Document> findAll() {
        return documentRepository.findAll();
    }

    public Optional<Document> findById(Long id) {
        return documentRepository.findById(id);
    }

    public List<Document> findByPatient(Patient patient) {
        return documentRepository.findByPatient(patient);
    }

    public void delete(Long id) {
        documentRepository.deleteById(id);
    }
}
