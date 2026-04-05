package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Document;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.enums.RecordStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByPatient(Patient patient);
    List<Document> findByPatientOrderByUploadedAtDesc(Patient patient);
    List<Document> findByPatientAndRecordStatusOrderByUploadedAtDesc(Patient patient, RecordStatus recordStatus);

    @Query("""
            select d
            from Document d
            where d.patient.id = :patientId
              and d.recordStatus = :recordStatus
              and (:fromEnabled = false or d.uploadedAt >= :fromDateTime)
              and (:toEnabled = false or d.uploadedAt < :toDateTimeExclusive)
              and (
                    :qLike is null or :qLike = ''
                    or (:fieldKey = 'title' and lower(coalesce(d.title, '')) like :qLike)
                    or (:fieldKey = 'filename' and lower(coalesce(d.filename, '')) like :qLike)
                    or (:fieldKey = '' and (
                        lower(coalesce(d.title, '')) like :qLike
                        or lower(coalesce(d.filename, '')) like :qLike
                    ))
              )
            """)
    Page<Document> searchPatientDocuments(
            @Param("patientId") Long patientId,
            @Param("recordStatus") RecordStatus recordStatus,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDateTimeExclusive") LocalDateTime toDateTimeExclusive,
            @Param("qLike") String qLike,
            @Param("fieldKey") String fieldKey,
            Pageable pageable
    );

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
