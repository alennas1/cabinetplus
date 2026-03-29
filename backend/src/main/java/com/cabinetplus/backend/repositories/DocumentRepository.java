package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Document;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.enums.RecordStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByPatient(Patient patient);
    List<Document> findByPatientOrderByUploadedAtDesc(Patient patient);
    List<Document> findByPatientAndRecordStatusOrderByUploadedAtDesc(Patient patient, RecordStatus recordStatus);

    @Query("""
            select coalesce(sum(d.fileSizeBytes), 0)
            from Document d
            where d.patient.createdBy = :owner
              and d.recordStatus = 'ACTIVE'
            """)
    long sumFileSizeBytesByOwner(@Param("owner") User owner);

    @Query("""
            select coalesce(d.fileSizeBytes, 0)
            from Document d
            where d.id = :documentId
            """)
    Optional<Long> findFileSizeBytesById(@Param("documentId") Long documentId);
}
