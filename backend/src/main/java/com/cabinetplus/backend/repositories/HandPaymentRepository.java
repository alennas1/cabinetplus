package com.cabinetplus.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import com.cabinetplus.backend.enums.PaymentStatus;
import com.cabinetplus.backend.models.HandPayment;
import com.cabinetplus.backend.models.User;

import java.util.List;

@Repository
public interface HandPaymentRepository extends JpaRepository<HandPayment, Long> {

    // Find all payments by status (already exists)
    List<HandPayment> findByStatus(PaymentStatus status);

    @EntityGraph(attributePaths = {"user", "plan"})
    @Query("""
        select hp
        from HandPayment hp
        join hp.user u
        join hp.plan pl
        where (:status is null or hp.status = :status)
          and (coalesce(:qLike, '') = ''
               or lower(concat(coalesce(u.firstname, ''), ' ', coalesce(u.lastname, ''))) like :qLike
               or lower(coalesce(u.phoneNumber, '')) like :qLike
               or lower(coalesce(pl.name, '')) like :qLike
          )
    """)
    Page<HandPayment> searchAdminPayments(
            @Param("status") PaymentStatus status,
            @Param("qLike") String qLike,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"user", "plan"})
    @Query("""
        select hp
        from HandPayment hp
        join hp.user u
        join hp.plan pl
        where hp.user = :user
          and (:status is null or hp.status = :status)
          and (coalesce(:qLike, '') = ''
               or lower(coalesce(pl.name, '')) like :qLike
               or lower(coalesce(hp.notes, '')) like :qLike
               or lower(coalesce(u.phoneNumber, '')) like :qLike
               or (:statusMatchesEnabled = true and hp.status in :statusMatches)
          )
    """)
    Page<HandPayment> searchUserPayments(
            @Param("user") User user,
            @Param("status") PaymentStatus status,
            @Param("qLike") String qLike,
            @Param("statusMatchesEnabled") boolean statusMatchesEnabled,
            @Param("statusMatches") List<PaymentStatus> statusMatches,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"user", "plan"})
    @Query("""
        select hp
        from HandPayment hp
        join hp.plan pl
        where hp.user = :user
          and (coalesce(:qLike, '') = ''
               or lower(coalesce(pl.name, '')) like :qLike
               or lower(coalesce(hp.notes, '')) like :qLike
          )
    """)
    Page<HandPayment> searchMyPayments(
            @Param("user") User user,
            @Param("qLike") String qLike,
            Pageable pageable
    );

    // Find all payments for a specific user (dentist)
    List<HandPayment> findByUser(User user);

    // Optional: find by status and user
    List<HandPayment> findByUserAndStatus(User user, PaymentStatus status);

    List<HandPayment> findAll();

}
