package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.cabinetplus.backend.models.FournisseurPayment;
import com.cabinetplus.backend.models.User;

@Repository
public interface FournisseurPaymentRepository extends JpaRepository<FournisseurPayment, Long> {

    List<FournisseurPayment> findByFournisseurIdAndCreatedByOrderByPaymentDateDesc(Long fournisseurId, User createdBy);

    long countByFournisseurIdAndCreatedBy(Long fournisseurId, User createdBy);

    @Query("""
        select coalesce(sum(fp.amount), 0)
        from FournisseurPayment fp
        where fp.fournisseur.id = :fournisseurId
          and fp.createdBy = :createdBy
    """)
    Double sumAmountByFournisseurIdAndCreatedBy(@Param("fournisseurId") Long fournisseurId,
                                                @Param("createdBy") User createdBy);

    @Query("""
        select coalesce(sum(fp.amount), 0)
        from FournisseurPayment fp
        where fp.createdBy = :createdBy
          and fp.paymentDate between :start and :end
    """)
    Double sumAmountByCreatedByAndPaymentDateBetween(@Param("createdBy") User createdBy,
                                                     @Param("start") LocalDateTime start,
                                                     @Param("end") LocalDateTime end);

    Optional<FournisseurPayment> findByIdAndFournisseurIdAndCreatedBy(Long id, Long fournisseurId, User createdBy);
}

