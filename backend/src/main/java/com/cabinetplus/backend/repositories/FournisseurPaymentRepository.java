package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.models.FournisseurPayment;
import com.cabinetplus.backend.models.User;

@Repository
public interface FournisseurPaymentRepository extends JpaRepository<FournisseurPayment, Long> {

    List<FournisseurPayment> findByFournisseurIdAndCreatedByAndRecordStatusOrderByPaymentDateDesc(Long fournisseurId,
                                                                                                  User createdBy,
                                                                                                  RecordStatus recordStatus);

    List<FournisseurPayment> findByFournisseurIdAndCreatedByOrderByPaymentDateDesc(Long fournisseurId, User createdBy);

    @EntityGraph(attributePaths = {"createdBy"})
    @Query("""
        select fp
        from FournisseurPayment fp
        where fp.fournisseur.id = :fournisseurId
          and fp.createdBy = :createdBy
          and fp.recordStatus <> :archivedStatus
          and (:fromEnabled = false or fp.paymentDate >= :fromDt)
          and (:toEnabled = false or fp.paymentDate <= :toDt)
    """)
    Page<FournisseurPayment> searchPaymentsPaged(
            @Param("fournisseurId") Long fournisseurId,
            @Param("createdBy") User createdBy,
            @Param("archivedStatus") RecordStatus archivedStatus,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDt") LocalDateTime fromDt,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDt") LocalDateTime toDt,
            Pageable pageable
    );

    @Query("""
        select count(fp),
               coalesce(sum(case when fp.recordStatus <> :cancelledStatus then fp.amount else 0 end), 0)
        from FournisseurPayment fp
        where fp.fournisseur.id = :fournisseurId
          and fp.createdBy = :createdBy
          and fp.recordStatus <> :archivedStatus
          and (:fromEnabled = false or fp.paymentDate >= :fromDt)
          and (:toEnabled = false or fp.paymentDate <= :toDt)
    """)
    Object[] getPaymentsSummary(
            @Param("fournisseurId") Long fournisseurId,
            @Param("createdBy") User createdBy,
            @Param("archivedStatus") RecordStatus archivedStatus,
            @Param("cancelledStatus") RecordStatus cancelledStatus,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDt") LocalDateTime fromDt,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDt") LocalDateTime toDt
    );

    long countByFournisseurIdAndCreatedByAndRecordStatus(Long fournisseurId, User createdBy, RecordStatus recordStatus);

    @Query("""
        select coalesce(sum(fp.amount), 0)
        from FournisseurPayment fp
        where fp.fournisseur.id = :fournisseurId
          and fp.createdBy = :createdBy
          and fp.recordStatus = com.cabinetplus.backend.enums.RecordStatus.ACTIVE
    """)
    Double sumAmountByFournisseurIdAndCreatedBy(@Param("fournisseurId") Long fournisseurId,
                                                @Param("createdBy") User createdBy);

    @Query("""
        select coalesce(sum(fp.amount), 0)
        from FournisseurPayment fp
        where fp.createdBy = :createdBy
          and fp.paymentDate between :start and :end
          and fp.recordStatus = com.cabinetplus.backend.enums.RecordStatus.ACTIVE
    """)
    Double sumAmountByCreatedByAndPaymentDateBetween(@Param("createdBy") User createdBy,
                                                     @Param("start") LocalDateTime start,
                                                     @Param("end") LocalDateTime end);

    Optional<FournisseurPayment> findByIdAndFournisseurIdAndCreatedBy(Long id, Long fournisseurId, User createdBy);
}
