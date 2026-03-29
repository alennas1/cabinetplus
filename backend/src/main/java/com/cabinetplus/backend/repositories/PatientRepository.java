package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;

public interface PatientRepository extends JpaRepository<Patient, Long> {
      List<Patient> findByCreatedBy(User user);   // filter by dentist
    List<Patient> findByCreatedByAndArchivedAtIsNull(User user);
    List<Patient> findByCreatedByAndArchivedAtIsNotNull(User user);
    Page<Patient> findByCreatedByAndArchivedAtIsNull(User user, Pageable pageable);
    Page<Patient> findByCreatedByAndArchivedAtIsNotNull(User user, Pageable pageable);
    Optional<Patient> findByIdAndCreatedBy(Long id, User user); // optional for security
    List<Patient> findByIdInAndCreatedBy(List<Long> ids, User user);
    Optional<Patient> findByPublicIdAndCreatedBy(UUID publicId, User user);
    Optional<Patient> findByPublicId(UUID publicId);
    long countByCreatedBy(User user);
    long countByCreatedByAndArchivedAtIsNull(User user);

    @Query("""
            select p
            from Patient p
            where p.createdBy = :owner
              and ((:archived = false and p.archivedAt is null) or (:archived = true and p.archivedAt is not null))
              and (:ageFrom is null or p.age >= :ageFrom)
              and (:ageTo is null or p.age <= :ageTo)
              and (:fromEnabled = false or p.createdAt >= :fromCreatedAt)
              and (:toEnabled = false or p.createdAt < :toCreatedAtExclusive)
            """)
    Page<Patient> searchPatients(
            @Param("owner") User owner,
            @Param("archived") boolean archived,
            @Param("ageFrom") Integer ageFrom,
            @Param("ageTo") Integer ageTo,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromCreatedAt") LocalDateTime fromCreatedAt,
            @Param("toEnabled") boolean toEnabled,
            @Param("toCreatedAtExclusive") LocalDateTime toCreatedAtExclusive,
            Pageable pageable
    );

    @Query("""
            select p
            from Patient p
            where p.createdBy = :owner
              and ((:archived = false and p.archivedAt is null) or (:archived = true and p.archivedAt is not null))
              and (:ageFrom is null or p.age >= :ageFrom)
              and (:ageTo is null or p.age <= :ageTo)
              and (:fromEnabled = false or p.createdAt >= :fromCreatedAt)
              and (:toEnabled = false or p.createdAt < :toCreatedAtExclusive)
            """)
    List<Patient> searchPatientsList(
            @Param("owner") User owner,
            @Param("archived") boolean archived,
            @Param("ageFrom") Integer ageFrom,
            @Param("ageTo") Integer ageTo,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromCreatedAt") LocalDateTime fromCreatedAt,
            @Param("toEnabled") boolean toEnabled,
            @Param("toCreatedAtExclusive") LocalDateTime toCreatedAtExclusive
    );

    @Query("""
            select count(distinct p.id)
            from Patient p
            where p.createdBy = :owner
              and (
                   p.createdAt >= :cutoff
                   or exists (select 1 from Appointment a where a.patient = p and a.dateTimeStart >= :cutoff)
                   or exists (select 1 from Treatment t where t.patient = p and coalesce(t.updatedAt, t.date) >= :cutoff)
                   or exists (select 1 from Document d where d.patient = p and d.uploadedAt >= :cutoff)
                   or exists (select 1 from Payment pay where pay.patient = p and pay.date >= :cutoff)
                   or exists (select 1 from Prescription pr where pr.patient = p and pr.date >= :cutoff)
                   or exists (select 1 from Prothesis prt where prt.patient = p and prt.dateCreated >= :cutoff)
                   or exists (select 1 from Justification j where j.patient = p and j.date >= :cutoff)
              )
            """)
    long countActivePatientsByCreatedBy(@Param("owner") User owner, @Param("cutoff") LocalDateTime cutoff);

    @Query("""
            select count(p.id)
            from Patient p
            where p.id = :patientId
              and p.createdBy = :owner
              and (
                   p.createdAt >= :cutoff
                   or exists (select 1 from Appointment a where a.patient = p and a.dateTimeStart >= :cutoff)
                   or exists (select 1 from Treatment t where t.patient = p and coalesce(t.updatedAt, t.date) >= :cutoff)
                   or exists (select 1 from Document d where d.patient = p and d.uploadedAt >= :cutoff)
                   or exists (select 1 from Payment pay where pay.patient = p and pay.date >= :cutoff)
                   or exists (select 1 from Prescription pr where pr.patient = p and pr.date >= :cutoff)
                   or exists (select 1 from Prothesis prt where prt.patient = p and prt.dateCreated >= :cutoff)
                   or exists (select 1 from Justification j where j.patient = p and j.date >= :cutoff)
              )
            """)
    long countIfActiveByIdAndCreatedBy(@Param("patientId") Long patientId, @Param("owner") User owner, @Param("cutoff") LocalDateTime cutoff);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("update Patient p set p.age = p.age + 1 where p.age is not null")
    int incrementAllAges();
}

