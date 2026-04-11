package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Justification;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.enums.RecordStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface JustificationRepository extends JpaRepository<Justification, Long> {

    List<Justification> findByPractitioner(User practitioner);
    List<Justification> findByPractitionerAndRecordStatus(User practitioner, RecordStatus recordStatus);

    long countByPractitionerAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(User practitioner, LocalDateTime fromInclusive, LocalDateTime toExclusive);

    Optional<Justification> findByIdAndPractitioner(Long id, User practitioner);

    List<Justification> findByPatientAndPractitioner(Patient patient, User practitioner);
    List<Justification> findByPatientAndPractitionerAndRecordStatus(Patient patient, User practitioner, RecordStatus recordStatus);

    @Query("""
            select j
            from Justification j
            where j.patient.id = :patientId
              and j.practitioner = :practitioner
              and j.recordStatus = :recordStatus
              and (:fromEnabled = false or j.date >= :fromDateTime)
              and (:toEnabled = false or j.date < :toDateTimeExclusive)
              and (
                    :qLike is null or :qLike = ''
                    or (:fieldKey = 'title' and lower(coalesce(j.title, '')) like :qLike)
                    or (:fieldKey = '' and lower(coalesce(j.title, '')) like :qLike)
              )
            """)
    Page<Justification> searchPatientJustifications(
            @Param("patientId") Long patientId,
            @Param("practitioner") User practitioner,
            @Param("recordStatus") RecordStatus recordStatus,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDateTimeExclusive") LocalDateTime toDateTimeExclusive,
            @Param("qLike") String qLike,
            @Param("fieldKey") String fieldKey,
            Pageable pageable
    );
}
