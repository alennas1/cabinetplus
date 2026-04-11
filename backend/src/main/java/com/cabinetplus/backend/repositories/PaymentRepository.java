package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.models.Payment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.enums.RecordStatus;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    // Existing methods
    List<Payment> findByPatientIdOrderByDateDesc(Long patientId);
List<Payment> findByPatientId(Long patientId);
    List<Payment> findByPatientIdAndRecordStatusOrderByDateDesc(Long patientId, RecordStatus recordStatus);

    @Query("""
        select p
        from Payment p
        where p.patient.id = :patientId
          and p.recordStatus <> :archivedStatus
          and (:method is null or p.method = :method)
          and (:fromEnabled = false or p.date >= :fromDateTime)
          and (:toEnabled = false or p.date < :toDateTimeExclusive)
          and (
                :qLike is null or :qLike = ''
                or (:fieldKey = 'method' and lower(concat('', p.method)) like :qLike)
                or (:fieldKey = 'amount' and lower(concat('', p.amount)) like :qLike)
                or (:fieldKey = '' and (
                        lower(concat('', p.method)) like :qLike
                        or lower(concat('', p.amount)) like :qLike
                ))
          )
    """)
    Page<Payment> searchPatientPayments(
            @Param("patientId") Long patientId,
            @Param("archivedStatus") RecordStatus archivedStatus,
            @Param("method") Payment.Method method,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDateTimeExclusive") LocalDateTime toDateTimeExclusive,
            @Param("qLike") String qLike,
            @Param("fieldKey") String fieldKey,
            Pageable pageable
    );
    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.recordStatus = 'ACTIVE' and p.patient.id = :patientId")
    Double sumByPatientId(@Param("patientId") Long patientId);

     @Query("SELECT SUM(p.amount) FROM Payment p WHERE p.recordStatus = 'ACTIVE' AND p.patient IN " +
           "(SELECT t.patient FROM Treatment t WHERE t.practitioner = :dentist) " +
           "AND p.date BETWEEN :start AND :end")
    Optional<Double> sumAmountByDentist(@Param("dentist") User dentist,
                                        @Param("start") LocalDateTime start,
                                        @Param("end") LocalDateTime end);

    @Query("SELECT SUM(p.amount) FROM Payment p WHERE p.recordStatus = 'ACTIVE' AND p.patient.id = :patientId AND p.patient IN " +
           "(SELECT t.patient FROM Treatment t WHERE t.id = :treatmentId)")
    Optional<Double> sumByPatientAndTreatment(@Param("patientId") Long patientId,
                                              @Param("treatmentId") Long treatmentId);
                                              
    @Query("""
        SELECT p.patient.id, COALESCE(SUM(p.amount), 0)
        FROM Payment p
        WHERE p.recordStatus = 'ACTIVE' AND p.patient.id IN :patientIds
        GROUP BY p.patient.id
    """)
    List<Object[]> sumAmountByPatientIds(@Param("patientIds") List<Long> patientIds);

    long countByPatientCreatedByAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(User owner, LocalDateTime fromInclusive, LocalDateTime toExclusive);


}

