package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.User;  
import com.cabinetplus.backend.enums.RecordStatus;


public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    List<Prescription> findByPatient(Patient patient);
    List<Prescription> findByPractitioner(User practitioner);
    List<Prescription> findByPatientAndPractitioner(Patient patient, User practitioner);
    List<Prescription> findByPatientId(Long patientId);

    List<Prescription> findByPatientIdAndPractitionerInOrderByDateDesc(Long patientId, List<User> practitioners);
    List<Prescription> findByPatientIdAndPractitionerInAndRecordStatusOrderByDateDesc(Long patientId, List<User> practitioners, RecordStatus recordStatus);

    @Query("""
        select p
        from Prescription p
        where p.patient.id = :patientId
          and p.practitioner in :practitioners
          and p.recordStatus = :recordStatus
          and (:fromEnabled = false or p.date >= :fromDateTime)
          and (:toEnabled = false or p.date < :toDateTimeExclusive)
          and (:rxIdLike is null or :rxIdLike = '' or lower(p.rxId) like :rxIdLike)
    """)
    Page<Prescription> searchPatientPrescriptions(
            @Param("patientId") Long patientId,
            @Param("practitioners") List<User> practitioners,
            @Param("recordStatus") RecordStatus recordStatus,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDateTime") java.time.LocalDateTime fromDateTime,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDateTimeExclusive") java.time.LocalDateTime toDateTimeExclusive,
            @Param("rxIdLike") String rxIdLike,
            Pageable pageable
    );


    @Query("SELECT p FROM Prescription p LEFT JOIN FETCH p.medications WHERE p.id = :id")
Optional<Prescription> findByIdWithMedications(@Param("id") Long id);

    @Query("SELECT p FROM Prescription p LEFT JOIN FETCH p.medications WHERE p.publicId = :publicId")
    Optional<Prescription> findByPublicIdWithMedications(@Param("publicId") UUID publicId);
}
