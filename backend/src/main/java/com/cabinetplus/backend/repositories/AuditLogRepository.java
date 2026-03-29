package com.cabinetplus.backend.repositories;

import java.util.Collection;
import java.util.List;
import java.time.LocalDateTime;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.cabinetplus.backend.models.AuditLog;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findTop200ByActorUserIdOrderByOccurredAtDesc(Long actorUserId);
    List<AuditLog> findTop200ByActorUserIdInOrderByOccurredAtDesc(Collection<Long> actorUserIds);
    List<AuditLog> findTop200ByActorRoleInOrderByOccurredAtDesc(Collection<String> roles);

    @Query("""
            SELECT l FROM AuditLog l
            WHERE l.actorUserId IN :actorUserIds
              AND l.eventType NOT LIKE '%\\_READ' ESCAPE '\\'
              AND l.eventType NOT LIKE '%\\_PDF_DOWNLOAD' ESCAPE '\\'
              AND LOWER(COALESCE(l.targetType, '')) = 'patient'
              AND l.targetId = :patientId
              AND (COALESCE(:status, '') = '' OR l.status = :status)
              AND l.occurredAt >= :from
              AND l.occurredAt < :toExclusive
              AND (
                COALESCE(:entity, '') = '' OR :entity = 'ALL' OR
                (:entity = 'PATIENT' AND l.eventType LIKE 'PATIENT_%') OR
                (:entity = 'APPOINTMENT' AND l.eventType LIKE 'APPOINTMENT_%') OR
                (:entity = 'TREATMENT' AND l.eventType LIKE 'TREATMENT_%') OR
                (:entity = 'PAYMENT' AND l.eventType LIKE 'PAYMENT_%') OR
                (:entity = 'DOCUMENT' AND l.eventType LIKE 'DOCUMENT_%') OR
                (:entity = 'PRESCRIPTION' AND l.eventType LIKE 'PRESCRIPTION_%') OR
                (:entity = 'PROTHESIS' AND l.eventType LIKE 'PROTHESIS_%') OR
                (:entity = 'LABORATORY' AND (l.eventType LIKE 'LABORATORY_%' OR l.eventType LIKE 'LAB_PAYMENT_%')) OR
                (:entity = 'SUPPLIER' AND l.eventType LIKE 'SUPPLIER_%') OR
                (:entity = 'JUSTIFICATION' AND l.eventType LIKE 'JUSTIFICATION_%') OR
                (:entity = 'EXPENSE' AND l.eventType LIKE 'EXPENSE_%') OR
                (:entity = 'ITEM' AND l.eventType LIKE 'ITEM_%') OR
                (:entity = 'MATERIAL' AND l.eventType LIKE 'MATERIAL_%') OR
                (:entity = 'MEDICATION' AND l.eventType LIKE 'MEDICATION_%') OR
                (:entity = 'PLAN' AND l.eventType LIKE 'PLAN_%') OR
                (:entity = 'SETTINGS' AND l.eventType LIKE 'SETTINGS_%') OR
                (:entity = 'SECURITY' AND (l.eventType LIKE 'AUTH_%' OR l.eventType LIKE 'SECURITY_%' OR l.eventType LIKE 'USER_%' OR l.eventType LIKE 'VERIFY_%' OR l.eventType LIKE 'PHONE_%'))
              )
              AND (
                COALESCE(:action, '') = '' OR :action = 'ALL' OR
                (:action = 'CREATE' AND l.eventType LIKE '%CREATE%') OR
                (:action = 'UPDATE' AND (l.eventType LIKE '%UPDATE%' OR l.eventType LIKE '%CHANGE%' OR l.eventType LIKE '%ASSIGN%')) OR
                (:action = 'CANCEL' AND l.eventType LIKE '%CANCEL%') OR
                (:action = 'DELETE' AND l.eventType LIKE '%DELETE%') OR
                (:action = 'ARCHIVE' AND (l.eventType LIKE '%ARCHIVE%' OR l.eventType LIKE '%UNARCHIVE%')) OR
                (:action = 'SECURITY' AND (l.eventType LIKE 'AUTH_%' OR l.eventType LIKE 'SECURITY_%' OR l.eventType LIKE 'USER_%' OR l.eventType LIKE 'VERIFY_%' OR l.eventType LIKE 'PHONE_%'))
              )
              AND (
                COALESCE(:q, '') = '' OR
                LOWER(COALESCE(l.eventType, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(l.message, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(l.actorUsername, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(l.path, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(l.ipAddress, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(l.location, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<AuditLog> searchPatientLogs(
            @Param("actorUserIds") Collection<Long> actorUserIds,
            @Param("patientId") String patientId,
            @Param("q") String q,
            @Param("status") String status,
            @Param("entity") String entity,
            @Param("action") String action,
            @Param("from") LocalDateTime from,
            @Param("toExclusive") LocalDateTime toExclusive,
            Pageable pageable
    );

    @Query("""
            SELECT l FROM AuditLog l
            WHERE l.actorUserId IN :actorUserIds
              AND l.eventType NOT LIKE '%\\_READ' ESCAPE '\\'
              AND l.eventType NOT LIKE '%\\_PDF_DOWNLOAD' ESCAPE '\\'
              AND (COALESCE(:status, '') = '' OR l.status = :status)
              AND l.occurredAt >= :from
              AND l.occurredAt < :toExclusive
              AND (
                COALESCE(:entity, '') = '' OR :entity = 'ALL' OR
                (:entity = 'PATIENT' AND l.eventType LIKE 'PATIENT_%') OR
                (:entity = 'APPOINTMENT' AND l.eventType LIKE 'APPOINTMENT_%') OR
                (:entity = 'TREATMENT' AND l.eventType LIKE 'TREATMENT_%') OR
                (:entity = 'PAYMENT' AND l.eventType LIKE 'PAYMENT_%') OR
                (:entity = 'DOCUMENT' AND l.eventType LIKE 'DOCUMENT_%') OR
                (:entity = 'PRESCRIPTION' AND l.eventType LIKE 'PRESCRIPTION_%') OR
                (:entity = 'PROTHESIS' AND l.eventType LIKE 'PROTHESIS_%') OR
                (:entity = 'LABORATORY' AND (l.eventType LIKE 'LABORATORY_%' OR l.eventType LIKE 'LAB_PAYMENT_%')) OR
                (:entity = 'SUPPLIER' AND l.eventType LIKE 'SUPPLIER_%') OR
                (:entity = 'JUSTIFICATION' AND l.eventType LIKE 'JUSTIFICATION_%') OR
                (:entity = 'EXPENSE' AND l.eventType LIKE 'EXPENSE_%') OR
                (:entity = 'ITEM' AND l.eventType LIKE 'ITEM_%') OR
                (:entity = 'MATERIAL' AND l.eventType LIKE 'MATERIAL_%') OR
                (:entity = 'MEDICATION' AND l.eventType LIKE 'MEDICATION_%') OR
                (:entity = 'PLAN' AND l.eventType LIKE 'PLAN_%') OR
                (:entity = 'SETTINGS' AND l.eventType LIKE 'SETTINGS_%') OR
                (:entity = 'SECURITY' AND (l.eventType LIKE 'AUTH_%' OR l.eventType LIKE 'SECURITY_%' OR l.eventType LIKE 'USER_%' OR l.eventType LIKE 'VERIFY_%' OR l.eventType LIKE 'PHONE_%'))
              )
              AND (
                COALESCE(:action, '') = '' OR :action = 'ALL' OR
                (:action = 'CREATE' AND l.eventType LIKE '%CREATE%') OR
                (:action = 'UPDATE' AND (l.eventType LIKE '%UPDATE%' OR l.eventType LIKE '%CHANGE%' OR l.eventType LIKE '%ASSIGN%')) OR
                (:action = 'CANCEL' AND l.eventType LIKE '%CANCEL%') OR
                (:action = 'DELETE' AND l.eventType LIKE '%DELETE%') OR
                (:action = 'ARCHIVE' AND (l.eventType LIKE '%ARCHIVE%' OR l.eventType LIKE '%UNARCHIVE%')) OR
                (:action = 'SECURITY' AND (l.eventType LIKE 'AUTH_%' OR l.eventType LIKE 'SECURITY_%' OR l.eventType LIKE 'USER_%' OR l.eventType LIKE 'VERIFY_%' OR l.eventType LIKE 'PHONE_%'))
              )
              AND (
                COALESCE(:q, '') = '' OR
                LOWER(COALESCE(l.eventType, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(l.message, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(l.actorUsername, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(l.path, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(l.ipAddress, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(l.location, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<AuditLog> searchMyLogs(
            @Param("actorUserIds") Collection<Long> actorUserIds,
            @Param("q") String q,
            @Param("status") String status,
            @Param("entity") String entity,
            @Param("action") String action,
            @Param("from") LocalDateTime from,
            @Param("toExclusive") LocalDateTime toExclusive,
            Pageable pageable
    );

    @Query("""
            SELECT l FROM AuditLog l
            WHERE l.actorRole IN :roles
              AND l.eventType IN :eventTypes
              AND l.eventType NOT LIKE '%\\_READ' ESCAPE '\\'
              AND l.eventType NOT LIKE '%\\_PDF_DOWNLOAD' ESCAPE '\\'
              AND (COALESCE(:status, '') = '' OR l.status = :status)
              AND l.occurredAt >= :from
              AND l.occurredAt < :toExclusive
              AND (
                COALESCE(:q, '') = '' OR
                LOWER(COALESCE(l.eventType, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(l.message, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(l.ipAddress, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(l.location, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<AuditLog> searchAdminSecurityLogs(
            @Param("roles") Collection<String> roles,
            @Param("eventTypes") Collection<String> eventTypes,
            @Param("q") String q,
            @Param("status") String status,
            @Param("from") LocalDateTime from,
            @Param("toExclusive") LocalDateTime toExclusive,
            Pageable pageable
    );
}
