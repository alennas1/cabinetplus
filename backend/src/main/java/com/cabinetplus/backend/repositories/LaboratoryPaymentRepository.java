package com.cabinetplus.backend.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.cabinetplus.backend.models.LaboratoryPayment;
import com.cabinetplus.backend.models.User;

@Repository
public interface LaboratoryPaymentRepository extends JpaRepository<LaboratoryPayment, Long> {
    List<LaboratoryPayment> findByLaboratoryIdAndCreatedByOrderByPaymentDateDesc(Long laboratoryId, User createdBy);

    List<LaboratoryPayment> findByCreatedByOrderByPaymentDateDesc(User createdBy);

    long countByLaboratoryIdAndCreatedBy(Long laboratoryId, User createdBy);

    @Query("""
        select coalesce(sum(lp.amount), 0)
        from LaboratoryPayment lp
        where lp.laboratory.id = :laboratoryId
          and lp.createdBy = :createdBy
    """)
    Double sumAmountByLaboratoryIdAndCreatedBy(@Param("laboratoryId") Long laboratoryId,
                                               @Param("createdBy") User createdBy);

    java.util.Optional<LaboratoryPayment> findByIdAndLaboratoryIdAndCreatedBy(Long id, Long laboratoryId, User createdBy);
}
