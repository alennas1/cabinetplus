package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

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

    // Find treatment by ID scoped to practitioner
    Optional<Treatment> findByIdAndPractitioner(Long id, User practitioner);

    // Treatments for a patient scoped to practitioner
    List<Treatment> findByPatientAndPractitioner(Patient patient, User practitioner);
    List<Treatment> findByPatientAndPractitionerAndRecordStatus(Patient patient, User practitioner, RecordStatus recordStatus);

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
}
