package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Treatment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.enums.RecordStatus;

public interface TreatmentRepository extends JpaRepository<Treatment, Long> {

    // All treatments of a practitioner
    List<Treatment> findByPractitioner(User practitioner);
    List<Treatment> findByPractitionerAndRecordStatus(User practitioner, RecordStatus recordStatus);

    @Query("""
        select t
        from Treatment t
        where t.practitioner = :practitioner
          and t.recordStatus = :recordStatus
          and t.cancelledAt is null
          and upper(coalesce(t.status, 'PLANNED')) <> 'CANCELLED'
    """)
    List<Treatment> findActiveNotCancelledByPractitioner(
            @Param("practitioner") User practitioner,
            @Param("recordStatus") RecordStatus recordStatus
    );

    @Query("""
        select t
        from Treatment t
        where t.practitioner = :practitioner
          and t.recordStatus = :recordStatus
          and t.cancelledAt is null
          and upper(coalesce(t.status, 'PLANNED')) <> 'CANCELLED'
    """)
    Page<Treatment> findActiveNotCancelledByPractitioner(
            @Param("practitioner") User practitioner,
            @Param("recordStatus") RecordStatus recordStatus,
            Pageable pageable
    );

    @Query("""
        select t
        from Treatment t
        where t.practitioner = :practitioner
          and t.recordStatus = :recordStatus
          and t.cancelledAt is null
          and upper(coalesce(t.status, 'PLANNED')) <> 'CANCELLED'
          and (:fromEnabled = false or coalesce(t.date, t.updatedAt) >= :fromDateTime)
          and (:toEnabled = false or coalesce(t.date, t.updatedAt) < :toDateTimeExclusive)
        order by coalesce(t.date, t.updatedAt) desc, t.id desc
    """)
    List<Treatment> findActiveNotCancelledByPractitionerInRange(
            @Param("practitioner") User practitioner,
            @Param("recordStatus") RecordStatus recordStatus,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDateTimeExclusive") LocalDateTime toDateTimeExclusive
    );

    // Find treatment by ID scoped to practitioner
    Optional<Treatment> findByIdAndPractitioner(Long id, User practitioner);

    // Treatments for a patient scoped to practitioner
    List<Treatment> findByPatientAndPractitioner(Patient patient, User practitioner);
    List<Treatment> findByPatientAndPractitionerAndRecordStatus(Patient patient, User practitioner, RecordStatus recordStatus);

    @Query("""
        select t
        from Treatment t
        left join t.treatmentCatalog tc
        where t.patient.id = :patientId
          and t.practitioner = :practitioner
          and t.recordStatus = :recordStatus
          and (:statusNorm is null or :statusNorm = '' or upper(coalesce(t.status, 'PLANNED')) = :statusNorm)
          and (:fromEnabled = false or coalesce(t.date, t.updatedAt) >= :fromDateTime)
          and (:toEnabled = false or coalesce(t.date, t.updatedAt) < :toDateTimeExclusive)
          and (
                :qLike is null or :qLike = ''
                or (:fieldKey = 'name' and lower(coalesce(tc.name, '')) like :qLike)
                or (:fieldKey = 'notes' and lower(coalesce(t.notes, '')) like :qLike)
                or (:fieldKey = '' and (
                        lower(coalesce(tc.name, '')) like :qLike
                        or lower(coalesce(t.notes, '')) like :qLike
                ))
          )
    """)
    Page<Treatment> searchPatientTreatmentsByCatalogName(
            @Param("patientId") Long patientId,
            @Param("practitioner") User practitioner,
            @Param("recordStatus") RecordStatus recordStatus,
            @Param("statusNorm") String statusNorm,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDateTimeExclusive") LocalDateTime toDateTimeExclusive,
            @Param("qLike") String qLike,
            @Param("fieldKey") String fieldKey,
            Pageable pageable
    );

    @Query("""
        select t
        from Treatment t
        left join t.treatmentCatalog tc
        left join t.teeth tt
        where t.patient.id = :patientId
          and t.practitioner = :practitioner
          and t.recordStatus = :recordStatus
          and (:statusNorm is null or :statusNorm = '' or upper(coalesce(t.status, 'PLANNED')) = :statusNorm)
          and (:fromEnabled = false or coalesce(t.date, t.updatedAt) >= :fromDateTime)
          and (:toEnabled = false or coalesce(t.date, t.updatedAt) < :toDateTimeExclusive)
          and (
                :qLike is null or :qLike = ''
                or (:fieldKey = 'name' and lower(coalesce(tc.name, '')) like :qLike)
                or (:fieldKey = 'notes' and lower(coalesce(t.notes, '')) like :qLike)
                or (:fieldKey = '' and (
                        lower(coalesce(tc.name, '')) like :qLike
                        or lower(coalesce(t.notes, '')) like :qLike
                ))
          )
        group by t
        order by
            case when min(tt) is null then 1 else 0 end asc,
            min(tt) asc,
            t.id asc
    """)
    Page<Treatment> searchPatientTreatmentsSortByToothAsc(
            @Param("patientId") Long patientId,
            @Param("practitioner") User practitioner,
            @Param("recordStatus") RecordStatus recordStatus,
            @Param("statusNorm") String statusNorm,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDateTimeExclusive") LocalDateTime toDateTimeExclusive,
            @Param("qLike") String qLike,
            @Param("fieldKey") String fieldKey,
            Pageable pageable
    );

    @Query("""
        select t
        from Treatment t
        left join t.treatmentCatalog tc
        left join t.teeth tt
        where t.patient.id = :patientId
          and t.practitioner = :practitioner
          and t.recordStatus = :recordStatus
          and (:statusNorm is null or :statusNorm = '' or upper(coalesce(t.status, 'PLANNED')) = :statusNorm)
          and (:fromEnabled = false or coalesce(t.date, t.updatedAt) >= :fromDateTime)
          and (:toEnabled = false or coalesce(t.date, t.updatedAt) < :toDateTimeExclusive)
          and (
                :qLike is null or :qLike = ''
                or (:fieldKey = 'name' and lower(coalesce(tc.name, '')) like :qLike)
                or (:fieldKey = 'notes' and lower(coalesce(t.notes, '')) like :qLike)
                or (:fieldKey = '' and (
                        lower(coalesce(tc.name, '')) like :qLike
                        or lower(coalesce(t.notes, '')) like :qLike
                ))
          )
        group by t
        order by
            case when max(tt) is null then 1 else 0 end asc,
            max(tt) desc,
            t.id asc
    """)
    Page<Treatment> searchPatientTreatmentsSortByToothDesc(
            @Param("patientId") Long patientId,
            @Param("practitioner") User practitioner,
            @Param("recordStatus") RecordStatus recordStatus,
            @Param("statusNorm") String statusNorm,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDateTimeExclusive") LocalDateTime toDateTimeExclusive,
            @Param("qLike") String qLike,
            @Param("fieldKey") String fieldKey,
            Pageable pageable
    );

    // Price sum queries
    @Query("""
        SELECT SUM(t.price)
        FROM Treatment t
        WHERE t.recordStatus = 'ACTIVE'
          AND t.practitioner = :dentist
          AND t.date BETWEEN :start AND :end
          AND UPPER(COALESCE(t.status, 'PLANNED')) <> 'CANCELLED'
    """)
    Optional<Double> sumPriceByDentist(@Param("dentist") User dentist,
                                       @Param("start") LocalDateTime start,
                                       @Param("end") LocalDateTime end);

    @Query("""
        SELECT t
        FROM Treatment t
        WHERE t.recordStatus = 'ACTIVE'
          AND t.practitioner = :dentist
          AND t.date BETWEEN :start AND :end
          AND UPPER(COALESCE(t.status, 'PLANNED')) <> 'CANCELLED'
    """)
    List<Treatment> findByDentistAndDateBetween(@Param("dentist") User dentist,
                                                @Param("start") LocalDateTime start,
                                                @Param("end") LocalDateTime end);

    @Query("""
        SELECT t.treatmentCatalog.name, COALESCE(SUM(t.price), 0)
        FROM Treatment t
        WHERE t.recordStatus = 'ACTIVE'
          AND t.practitioner = :dentist
          AND t.date BETWEEN :start AND :end
          AND t.treatmentCatalog IS NOT NULL
          AND UPPER(COALESCE(t.status, 'PLANNED')) IN ('DONE', 'IN_PROGRESS')
        GROUP BY t.treatmentCatalog.name
    """)
    List<Object[]> sumPriceByCatalogForDentistBetween(@Param("dentist") User dentist,
                                                      @Param("start") LocalDateTime start,
                                                      @Param("end") LocalDateTime end);

    List<Treatment> findByPractitionerAndDateBetween(User dentist, LocalDateTime start, LocalDateTime end);
    List<Treatment> findByPatientId(Long patientId);

    long countByTreatmentCatalogIdAndPractitioner(Long treatmentCatalogId, User practitioner);

    @Query("""
        SELECT t.patient.id, COALESCE(SUM(t.price), 0)
        FROM Treatment t
        WHERE t.patient.id IN :patientIds
          AND t.recordStatus = 'ACTIVE'
          AND UPPER(COALESCE(t.status, 'PLANNED')) IN ('DONE', 'IN_PROGRESS')
        GROUP BY t.patient.id
    """)
    List<Object[]> sumCompletedPriceByPatientIds(@Param("patientIds") List<Long> patientIds);

    @Query("""
        SELECT COALESCE(SUM(t.price), 0)
        FROM Treatment t
        WHERE t.patient.id = :patientId
          AND t.recordStatus = 'ACTIVE'
          AND UPPER(COALESCE(t.status, 'PLANNED')) IN ('DONE', 'IN_PROGRESS')
    """)
    Double sumCompletedPriceByPatientId(@Param("patientId") Long patientId);

    @Query("""
        SELECT tt, tc.name, t.date
        FROM Treatment t
        JOIN t.teeth tt
        LEFT JOIN t.treatmentCatalog tc
        WHERE t.patient.id = :patientId
          AND t.practitioner = :practitioner
          AND t.recordStatus = 'ACTIVE'
          AND UPPER(COALESCE(t.status, 'PLANNED')) IN ('DONE', 'IN_PROGRESS')
    """)
    List<Object[]> findToothHistoryRowsByPatientAndPractitioner(
            @Param("patientId") Long patientId,
            @Param("practitioner") User practitioner
    );
}
