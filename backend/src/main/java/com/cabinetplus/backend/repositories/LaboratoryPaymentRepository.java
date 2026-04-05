package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.models.LaboratoryPayment;
import com.cabinetplus.backend.models.User;

@Repository
public interface LaboratoryPaymentRepository extends JpaRepository<LaboratoryPayment, Long> {
    List<LaboratoryPayment> findByLaboratoryIdAndCreatedByAndRecordStatusOrderByPaymentDateDesc(Long laboratoryId,
                                                                                                User createdBy,
                                                                                                RecordStatus recordStatus);

    List<LaboratoryPayment> findByLaboratoryIdAndCreatedByOrderByPaymentDateDesc(Long laboratoryId, User createdBy);

    @EntityGraph(attributePaths = {"createdBy"})
    @Query("""
        select lp
        from LaboratoryPayment lp
        where lp.laboratory.id = :laboratoryId
          and lp.createdBy = :createdBy
          and lp.recordStatus <> :archivedStatus
          and (:fromDt is null or lp.paymentDate >= :fromDt)
          and (:toDt is null or lp.paymentDate <= :toDt)
    """)
    Page<LaboratoryPayment> searchPaymentsPaged(
            @Param("laboratoryId") Long laboratoryId,
            @Param("createdBy") User createdBy,
            @Param("archivedStatus") RecordStatus archivedStatus,
            @Param("fromDt") LocalDateTime fromDt,
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
          and (:fromDt is null or lp.paymentDate >= :fromDt)
          and (:toDt is null or lp.paymentDate <= :toDt)
    """)
    Object[] getPaymentsSummary(
            @Param("laboratoryId") Long laboratoryId,
            @Param("createdBy") User createdBy,
            @Param("archivedStatus") RecordStatus archivedStatus,
            @Param("cancelledStatus") RecordStatus cancelledStatus,
            @Param("fromDt") LocalDateTime fromDt,
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
}
