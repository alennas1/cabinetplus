package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Prothesis;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.dto.LaboratoryBillingSummaryResponse;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ProthesisRepository extends JpaRepository<Prothesis, Long> {

    // Filter by the logged-in dentist
    List<Prothesis> findByPractitioner(User practitioner);

    // Simple status filter
    List<Prothesis> findByStatus(String status);

    // Find all protheses currently at a specific laboratory
    List<Prothesis> findByLaboratoryIdAndStatus(Long laboratoryId, String status);

    // History for a specific patient
    List<Prothesis> findByPatient(Patient patient);

    // Filter by both the dentist and the current workflow state
    List<Prothesis> findByPractitionerAndStatus(User practitioner, String status);

    List<Prothesis> findByPatientIdAndPractitioner(Long patientId, User practitioner);

    List<Prothesis> findByPatientId(Long patientId);

    boolean existsByPractitionerAndCodeIgnoreCase(User practitioner, String code);

    boolean existsByPractitionerAndCodeIgnoreCaseAndIdNot(User practitioner, String code, Long id);

    @Query("""
        SELECT p.patient.id, COALESCE(SUM(p.finalPrice), 0)
        FROM Prothesis p
        WHERE p.patient.id IN :patientIds
          AND p.recordStatus = 'ACTIVE'
        GROUP BY p.patient.id
    """)
    List<Object[]> sumFinalPriceByPatientIds(@Param("patientIds") List<Long> patientIds);

    @Query("""
        select coalesce(sum(p.labCost), 0)
        from Prothesis p
        where p.practitioner = :practitioner
          and p.recordStatus = 'ACTIVE'
          and p.laboratory.id = :laboratoryId
          and p.labCost is not null
    """)
    Double sumLabCostByPractitionerAndLaboratory(@Param("practitioner") User practitioner,
                                                 @Param("laboratoryId") Long laboratoryId);

    @Query("""
        select coalesce(sum(p.finalPrice), 0)
        from Prothesis p
        where p.practitioner = :practitioner
          and p.recordStatus = 'ACTIVE'
          and p.dateCreated between :start and :end
          and upper(coalesce(p.status, 'PENDING')) <> 'CANCELLED'
    """)
    Double sumFinalPriceByPractitionerAndDateCreatedBetween(@Param("practitioner") User practitioner,
                                                            @Param("start") LocalDateTime start,
                                                            @Param("end") LocalDateTime end);

    @Query("""
        select coalesce(sum(p.labCost), 0)
        from Prothesis p
        where p.practitioner = :practitioner
          and p.recordStatus = 'ACTIVE'
          and p.dateCreated between :start and :end
          and upper(coalesce(p.status, 'PENDING')) <> 'CANCELLED'
    """)
    Double sumLabCostByPractitionerAndDateCreatedBetween(@Param("practitioner") User practitioner,
                                                         @Param("start") LocalDateTime start,
                                                         @Param("end") LocalDateTime end);

    long countByLaboratoryIdAndPractitioner(Long laboratoryId, User practitioner);

    long countByPractitionerAndProthesisCatalog_Id(User practitioner, Long prothesisCatalogId);

    @Query("""
        select new com.cabinetplus.backend.dto.LaboratoryBillingSummaryResponse(
            year(coalesce(p.sentToLabDate, p.dateCreated)),
            month(coalesce(p.sentToLabDate, p.dateCreated)),
            coalesce(sum(p.labCost), 0)
        )
        from Prothesis p
        where p.practitioner = :practitioner
          and p.recordStatus = 'ACTIVE'
          and p.laboratory.id = :laboratoryId
          and p.labCost is not null
        group by year(coalesce(p.sentToLabDate, p.dateCreated)), month(coalesce(p.sentToLabDate, p.dateCreated))
        order by year(coalesce(p.sentToLabDate, p.dateCreated)) desc, month(coalesce(p.sentToLabDate, p.dateCreated)) desc
    """)
    List<LaboratoryBillingSummaryResponse> getMonthlyBillingByPractitionerAndLaboratory(
        @Param("practitioner") User practitioner,
        @Param("laboratoryId") Long laboratoryId
    );

    @Query("""
        select p
        from Prothesis p
        left join fetch p.patient patient
        left join fetch p.prothesisCatalog catalog
        where p.practitioner = :practitioner
          and p.recordStatus = 'ACTIVE'
          and p.laboratory.id = :laboratoryId
          and p.labCost is not null
        order by coalesce(p.sentToLabDate, p.dateCreated) desc
    """)
    List<Prothesis> findBillingProthesesByPractitionerAndLaboratory(
        @Param("practitioner") User practitioner,
        @Param("laboratoryId") Long laboratoryId
    );
}
