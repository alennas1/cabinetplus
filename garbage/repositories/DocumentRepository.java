package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Document;
import com.cabinetplus.backend.models.Patient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByPatient(Patient patient);
}
