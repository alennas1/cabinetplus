package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.models.LaboratoryPayment;
import com.cabinetplus.backend.models.User;

@Repository
public interface LaboratoryPaymentRepository extends JpaRepository<LaboratoryPayment, Long> {
    List<LaboratoryPayment> findByLaboratoryIdAndCreatedByAndRecordStatusOrderByPaymentDateDesc(Long laboratoryId,
                                                                                                User createdBy,
                                                                                                RecordStatus recordStatus);

    List<LaboratoryPayment> findByLaboratoryIdAndCreatedByOrderByPaymentDateDesc(Long laboratoryId, User createdBy);

    @EntityGraph(attributePaths = {"createdBy.firstname", "createdBy.lastname"})
    @Query("""
        select lp
        from LaboratoryPayment lp
        where lp.laboratory.id = :laboratoryId
          and lp.createdBy = :createdBy
          and lp.recordStatus <> :archivedStatus
          and (:fromEnabled = false or lp.paymentDate >= :fromDt)
          and (:toEnabled = false or lp.paymentDate <= :toDt)
    """)
    Page<LaboratoryPayment> searchPaymentsPaged(
            @Param("laboratoryId") Long laboratoryId,
            @Param("createdBy") User createdBy,
            @Param("archivedStatus") RecordStatus archivedStatus,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDt") LocalDateTime fromDt,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDt") LocalDateTime toDt,
            Pageable pageable
    );

    @Query("""
        select count(lp),
               coalesce(sum(case when lp.recordStatus <> :cancelledStatus then lp.amount else 0 end), 0)
        from LaboratoryPayment lp
        where lp.laboratory.id = :laboratoryId
          and lp.createdBy = :createdBy
          and lp.recordStatus <> :archivedStatus
          and (:fromEnabled = false or lp.paymentDate >= :fromDt)
          and (:toEnabled = false or lp.paymentDate <= :toDt)
    """)
    Object[] getPaymentsSummary(
            @Param("laboratoryId") Long laboratoryId,
            @Param("createdBy") User createdBy,
            @Param("archivedStatus") RecordStatus archivedStatus,
            @Param("cancelledStatus") RecordStatus cancelledStatus,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDt") LocalDateTime fromDt,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDt") LocalDateTime toDt
    );

    long countByLaboratoryIdAndCreatedByAndRecordStatus(Long laboratoryId, User createdBy, RecordStatus recordStatus);

    @Query("""
        select coalesce(sum(lp.amount), 0)
        from LaboratoryPayment lp
        where lp.laboratory.id = :laboratoryId
          and lp.createdBy = :createdBy
          and lp.recordStatus = com.cabinetplus.backend.enums.RecordStatus.ACTIVE
    """)
    Double sumAmountByLaboratoryIdAndCreatedBy(@Param("laboratoryId") Long laboratoryId,
                                               @Param("createdBy") User createdBy);

    @Query("""
        select coalesce(sum(lp.amount), 0)
        from LaboratoryPayment lp
        where lp.createdBy = :createdBy
          and lp.paymentDate between :start and :end
          and lp.recordStatus = com.cabinetplus.backend.enums.RecordStatus.ACTIVE
    """)
    Double sumAmountByCreatedByAndPaymentDateBetween(@Param("createdBy") User createdBy,
                                                     @Param("start") LocalDateTime start,
                                                     @Param("end") LocalDateTime end);

    java.util.Optional<LaboratoryPayment> findByIdAndLaboratoryIdAndCreatedBy(Long id, Long laboratoryId, User createdBy);

    @EntityGraph(attributePaths = {
            "createdBy.firstname",
            "createdBy.lastname",
            "cancelRequestedBy.firstname",
            "cancelRequestedBy.lastname",
            "cancelRequestDecidedBy.firstname",
            "cancelRequestDecidedBy.lastname"
    })
    @Query("""
        select lp
        from LaboratoryPayment lp
        left join lp.createdBy dentist
        where lp.laboratory = :laboratory
          and lp.recordStatus <> :archivedStatus
          and (:dentistPublicId is null or dentist.publicId = :dentistPublicId)
          and (:fromEnabled = false or lp.paymentDate >= :fromDt)
          and (:toEnabled = false or lp.paymentDate <= :toDt)
          and (
            :qLike = ''
            or lower(coalesce(lp.notes, '')) like :qLike
            or lower(concat(coalesce(dentist.firstname, ''), ' ', coalesce(dentist.lastname, ''))) like :qLike
          )
    """)
    Page<LaboratoryPayment> searchForLabPortal(
            @Param("laboratory") com.cabinetplus.backend.models.Laboratory laboratory,
            @Param("archivedStatus") RecordStatus archivedStatus,
            @Param("dentistPublicId") UUID dentistPublicId,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDt") LocalDateTime fromDt,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDt") LocalDateTime toDt,
            @Param("qLike") String qLike,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"createdBy.publicId", "createdBy.firstname", "createdBy.lastname"})
    @Query("""
            select lp
            from LaboratoryPayment lp
            left join lp.createdBy dentist
            where lp.laboratory = :laboratory
              and lp.recordStatus <> :archivedStatus
              and lp.cancelRequestDecision = com.cabinetplus.backend.enums.CancellationRequestDecision.PENDING
            order by lp.cancelRequestedAt desc nulls last, lp.id desc
            """)
    List<LaboratoryPayment> findPendingCancellationForLabPortal(
            @Param("laboratory") com.cabinetplus.backend.models.Laboratory laboratory,
            @Param("archivedStatus") RecordStatus archivedStatus
    );

    @Query("""
        select count(lp),
               coalesce(sum(lp.amount), 0)
        from LaboratoryPayment lp
        left join lp.createdBy dentist
        where lp.laboratory = :laboratory
          and lp.recordStatus <> :archivedStatus
          and (:dentistPublicId is null or dentist.publicId = :dentistPublicId)
          and (:fromEnabled = false or lp.paymentDate >= :fromDt)
          and (:toEnabled = false or lp.paymentDate <= :toDt)
          and (
            :qLike = ''
            or lower(coalesce(lp.notes, '')) like :qLike
            or lower(concat(coalesce(dentist.firstname, ''), ' ', coalesce(dentist.lastname, ''))) like :qLike
          )
    """)
    Object[] getPaymentsSummaryForLabPortal(
            @Param("laboratory") com.cabinetplus.backend.models.Laboratory laboratory,
            @Param("archivedStatus") RecordStatus archivedStatus,
            @Param("dentistPublicId") UUID dentistPublicId,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDt") LocalDateTime fromDt,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDt") LocalDateTime toDt,
            @Param("qLike") String qLike
    );

    @Modifying
    @Transactional
    @Query("""
        update LaboratoryPayment lp
        set lp.laboratory = :target
        where lp.createdBy = :dentist
          and lp.laboratory = :source
    """)
    int migrateLaboratoryForDentist(@Param("dentist") User dentist,
                                    @Param("source") com.cabinetplus.backend.models.Laboratory source,
                                    @Param("target") com.cabinetplus.backend.models.Laboratory target);
}
