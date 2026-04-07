package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Prothesis;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.dto.LaboratoryBillingSummaryResponse;
import com.cabinetplus.backend.enums.RecordStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

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

    // Avoid Hibernate eager-join explosion (open-in-view=false). This graph fetches only what ProtheticsController
    // needs to build ProthesisResponse, while keeping nested User/DentistProfile/Subscription graphs lazy.
    @EntityGraph(attributePaths = {
            "patient.firstname",
            "patient.lastname",
            "prothesisCatalog.name",
            "prothesisCatalog.material.name",
            "laboratory.name",
            "teeth",
            "practitioner.firstname",
            "practitioner.lastname",
            "updatedBy.firstname",
            "updatedBy.lastname",
            "sentToLabBy.firstname",
            "sentToLabBy.lastname",
            "receivedBy.firstname",
            "receivedBy.lastname",
            "posedBy.firstname",
            "posedBy.lastname",
            "cancelledBy.firstname",
            "cancelledBy.lastname"
    })
    @Query("""
        select p
        from Prothesis p
        where p.id = :id
    """)
    java.util.Optional<Prothesis> findForResponseById(@Param("id") Long id);

    @EntityGraph(attributePaths = {
            "patient.firstname",
            "patient.lastname",
            "prothesisCatalog.name",
            "prothesisCatalog.material.name",
            "laboratory.name",
            "teeth",
            "practitioner.firstname",
            "practitioner.lastname",
            "updatedBy.firstname",
            "updatedBy.lastname",
            "sentToLabBy.firstname",
            "sentToLabBy.lastname",
            "receivedBy.firstname",
            "receivedBy.lastname",
            "posedBy.firstname",
            "posedBy.lastname",
            "cancelledBy.firstname",
            "cancelledBy.lastname"
    })
    @Query("""
        select p
        from Prothesis p
        left join p.patient patient
        left join p.prothesisCatalog pc
        left join pc.material material
        left join p.laboratory lab
        where (:practitioner is null or p.practitioner = :practitioner)
          and p.recordStatus = :activeStatus
          and (:statusNorm is null or :statusNorm = '' or upper(coalesce(p.status, 'PENDING')) = :statusNorm)
          and (
                :fromEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate >= :fromDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate >= :fromDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated >= :fromDateTime)
          )
          and (
                :toEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate <= :toDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate <= :toDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated <= :toDateTime)
          )
          and (
                :qLike is null or :qLike = ''
                or (:filterKey = 'prothesisname' and lower(coalesce(pc.name, '')) like :qLike)
                or (:filterKey = 'materialname' and lower(coalesce(material.name, '')) like :qLike)
                or (:filterKey = '' and (
                        lower(coalesce(patient.firstname, '')) like :qLike
                        or lower(coalesce(patient.lastname, '')) like :qLike
                        or lower(concat(coalesce(patient.firstname, ''), ' ', coalesce(patient.lastname, ''))) like :qLike
                        or lower(coalesce(pc.name, '')) like :qLike
                        or lower(coalesce(material.name, '')) like :qLike
                        or lower(coalesce(p.code, '')) like :qLike
                        or lower(coalesce(lab.name, '')) like :qLike
                        or lower(coalesce(p.status, '')) like :qLike
                        or (:qToothEnabled = true and :qTooth member of p.teeth)
                ))
          )
    """)
    Page<Prothesis> searchActiveProtheses(
            @Param("practitioner") User practitioner,
            @Param("activeStatus") RecordStatus activeStatus,
            @Param("statusNorm") String statusNorm,
            @Param("filterKey") String filterKey,
            @Param("dateType") String dateType,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDateTime") LocalDateTime toDateTime,
            @Param("qLike") String qLike,
            @Param("qToothEnabled") boolean qToothEnabled,
            @Param("qTooth") Integer qTooth,
            Pageable pageable
    );

    @Query("""
        select p.id
        from Prothesis p
        left join p.patient patient
        left join p.prothesisCatalog pc
        left join pc.material material
        left join p.laboratory lab
        where (:practitioner is null or p.practitioner = :practitioner)
          and p.recordStatus = :activeStatus
          and (:statusNorm is null or :statusNorm = '' or upper(coalesce(p.status, 'PENDING')) = :statusNorm)
          and (
                :fromEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate >= :fromDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate >= :fromDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated >= :fromDateTime)
          )
          and (
                :toEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate <= :toDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate <= :toDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated <= :toDateTime)
          )
          and (
                :qLike is null or :qLike = ''
                or (:filterKey = 'prothesisname' and lower(coalesce(pc.name, '')) like :qLike)
                or (:filterKey = 'materialname' and lower(coalesce(material.name, '')) like :qLike)
                or (:filterKey = '' and (
                        lower(coalesce(patient.firstname, '')) like :qLike
                        or lower(coalesce(patient.lastname, '')) like :qLike
                        or lower(concat(coalesce(patient.firstname, ''), ' ', coalesce(patient.lastname, ''))) like :qLike
                        or lower(coalesce(pc.name, '')) like :qLike
                        or lower(coalesce(material.name, '')) like :qLike
                        or lower(coalesce(p.code, '')) like :qLike
                        or lower(coalesce(lab.name, '')) like :qLike
                        or lower(coalesce(p.status, '')) like :qLike
                        or (:qToothEnabled = true and :qTooth member of p.teeth)
                ))
          )
    """)
    Page<Long> searchActiveProthesisIds(
            @Param("practitioner") User practitioner,
            @Param("activeStatus") RecordStatus activeStatus,
            @Param("statusNorm") String statusNorm,
            @Param("filterKey") String filterKey,
            @Param("dateType") String dateType,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDateTime") LocalDateTime toDateTime,
            @Param("qLike") String qLike,
            @Param("qToothEnabled") boolean qToothEnabled,
            @Param("qTooth") Integer qTooth,
            Pageable pageable
    );

    @Query("""
            select coalesce(sum(p.stlFileSizeBytes), 0)
            from Prothesis p
            where p.practitioner = :owner
              and p.recordStatus = 'ACTIVE'
              and p.stlFileSizeBytes is not null
            """)
    long sumStlFileSizeBytesByOwner(@Param("owner") User owner);

    @EntityGraph(attributePaths = {
            "patient.firstname",
            "patient.lastname",
            "prothesisCatalog.name",
            "prothesisCatalog.material.name",
            "laboratory.name",
            "teeth",
            "practitioner.firstname",
            "practitioner.lastname",
            "updatedBy.firstname",
            "updatedBy.lastname",
            "sentToLabBy.firstname",
            "sentToLabBy.lastname",
            "receivedBy.firstname",
            "receivedBy.lastname",
            "posedBy.firstname",
            "posedBy.lastname",
            "cancelledBy.firstname",
            "cancelledBy.lastname"
    })
    @Query(
            value = """
        select p
        from Prothesis p
        left join p.patient patient
        left join p.prothesisCatalog pc
        left join pc.material material
        left join p.laboratory lab
        left join p.teeth tt
        where (:practitioner is null or p.practitioner = :practitioner)
          and p.recordStatus = :activeStatus
          and (:statusNorm is null or :statusNorm = '' or upper(coalesce(p.status, 'PENDING')) = :statusNorm)
          and (
                :fromEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate >= :fromDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate >= :fromDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated >= :fromDateTime)
          )
          and (
                :toEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate <= :toDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate <= :toDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated <= :toDateTime)
          )
          and (
                :qLike is null or :qLike = ''
                or (:filterKey = 'prothesisname' and lower(coalesce(pc.name, '')) like :qLike)
                or (:filterKey = 'materialname' and lower(coalesce(material.name, '')) like :qLike)
                or (:filterKey = '' and (
                        lower(coalesce(patient.firstname, '')) like :qLike
                        or lower(coalesce(patient.lastname, '')) like :qLike
                        or lower(concat(coalesce(patient.firstname, ''), ' ', coalesce(patient.lastname, ''))) like :qLike
                        or lower(coalesce(pc.name, '')) like :qLike
                        or lower(coalesce(material.name, '')) like :qLike
                        or lower(coalesce(p.code, '')) like :qLike
                        or lower(coalesce(lab.name, '')) like :qLike
                        or lower(coalesce(p.status, '')) like :qLike
                        or (:qToothEnabled = true and tt = :qTooth)
                ))
          )
        group by p
        order by
            case when min(tt) is null then 1 else 0 end asc,
            min(tt) asc,
            p.id asc
      """,
            countQuery = """
        select count(distinct p.id)
        from Prothesis p
        left join p.patient patient
        left join p.prothesisCatalog pc
        left join pc.material material
        left join p.laboratory lab
        left join p.teeth tt
        where (:practitioner is null or p.practitioner = :practitioner)
          and p.recordStatus = :activeStatus
          and (:statusNorm is null or :statusNorm = '' or upper(coalesce(p.status, 'PENDING')) = :statusNorm)
          and (
                :fromEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate >= :fromDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate >= :fromDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated >= :fromDateTime)
          )
          and (
                :toEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate <= :toDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate <= :toDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated <= :toDateTime)
          )
          and (
                :qLike is null or :qLike = ''
                or (:filterKey = 'prothesisname' and lower(coalesce(pc.name, '')) like :qLike)
                or (:filterKey = 'materialname' and lower(coalesce(material.name, '')) like :qLike)
                or (:filterKey = '' and (
                        lower(coalesce(patient.firstname, '')) like :qLike
                        or lower(coalesce(patient.lastname, '')) like :qLike
                        or lower(concat(coalesce(patient.firstname, ''), ' ', coalesce(patient.lastname, ''))) like :qLike
                        or lower(coalesce(pc.name, '')) like :qLike
                        or lower(coalesce(material.name, '')) like :qLike
                        or lower(coalesce(p.code, '')) like :qLike
                        or lower(coalesce(lab.name, '')) like :qLike
                        or lower(coalesce(p.status, '')) like :qLike
                        or (:qToothEnabled = true and tt = :qTooth)
                ))
          )
      """
    )
    Page<Prothesis> searchActiveProthesesSortByToothAsc(
            @Param("practitioner") User practitioner,
            @Param("activeStatus") RecordStatus activeStatus,
            @Param("statusNorm") String statusNorm,
            @Param("filterKey") String filterKey,
            @Param("dateType") String dateType,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDateTime") LocalDateTime toDateTime,
            @Param("qLike") String qLike,
            @Param("qToothEnabled") boolean qToothEnabled,
            @Param("qTooth") Integer qTooth,
            Pageable pageable
    );

    @Query(
            value = """
        select p.id
        from Prothesis p
        left join p.patient patient
        left join p.prothesisCatalog pc
        left join pc.material material
        left join p.laboratory lab
        left join p.teeth tt
        where (:practitioner is null or p.practitioner = :practitioner)
          and p.recordStatus = :activeStatus
          and (:statusNorm is null or :statusNorm = '' or upper(coalesce(p.status, 'PENDING')) = :statusNorm)
          and (
                :fromEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate >= :fromDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate >= :fromDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated >= :fromDateTime)
          )
          and (
                :toEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate <= :toDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate <= :toDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated <= :toDateTime)
          )
          and (
                :qLike is null or :qLike = ''
                or (:filterKey = 'prothesisname' and lower(coalesce(pc.name, '')) like :qLike)
                or (:filterKey = 'materialname' and lower(coalesce(material.name, '')) like :qLike)
                or (:filterKey = '' and (
                        lower(coalesce(patient.firstname, '')) like :qLike
                        or lower(coalesce(patient.lastname, '')) like :qLike
                        or lower(concat(coalesce(patient.firstname, ''), ' ', coalesce(patient.lastname, ''))) like :qLike
                        or lower(coalesce(pc.name, '')) like :qLike
                        or lower(coalesce(material.name, '')) like :qLike
                        or lower(coalesce(p.code, '')) like :qLike
                        or lower(coalesce(lab.name, '')) like :qLike
                        or lower(coalesce(p.status, '')) like :qLike
                        or (:qToothEnabled = true and tt = :qTooth)
                ))
          )
        group by p
        order by
            case when min(tt) is null then 1 else 0 end asc,
            min(tt) asc,
            p.id asc
      """,
            countQuery = """
        select count(distinct p.id)
        from Prothesis p
        left join p.patient patient
        left join p.prothesisCatalog pc
        left join pc.material material
        left join p.laboratory lab
        left join p.teeth tt
        where (:practitioner is null or p.practitioner = :practitioner)
          and p.recordStatus = :activeStatus
          and (:statusNorm is null or :statusNorm = '' or upper(coalesce(p.status, 'PENDING')) = :statusNorm)
          and (
                :fromEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate >= :fromDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate >= :fromDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated >= :fromDateTime)
          )
          and (
                :toEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate <= :toDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate <= :toDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated <= :toDateTime)
          )
          and (
                :qLike is null or :qLike = ''
                or (:filterKey = 'prothesisname' and lower(coalesce(pc.name, '')) like :qLike)
                or (:filterKey = 'materialname' and lower(coalesce(material.name, '')) like :qLike)
                or (:filterKey = '' and (
                        lower(coalesce(patient.firstname, '')) like :qLike
                        or lower(coalesce(patient.lastname, '')) like :qLike
                        or lower(concat(coalesce(patient.firstname, ''), ' ', coalesce(patient.lastname, ''))) like :qLike
                        or lower(coalesce(pc.name, '')) like :qLike
                        or lower(coalesce(material.name, '')) like :qLike
                        or lower(coalesce(p.code, '')) like :qLike
                        or lower(coalesce(lab.name, '')) like :qLike
                        or lower(coalesce(p.status, '')) like :qLike
                        or (:qToothEnabled = true and tt = :qTooth)
                ))
          )
      """
    )
    Page<Long> searchActiveProthesisIdsSortByToothAsc(
            @Param("practitioner") User practitioner,
            @Param("activeStatus") RecordStatus activeStatus,
            @Param("statusNorm") String statusNorm,
            @Param("filterKey") String filterKey,
            @Param("dateType") String dateType,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDateTime") LocalDateTime toDateTime,
            @Param("qLike") String qLike,
            @Param("qToothEnabled") boolean qToothEnabled,
            @Param("qTooth") Integer qTooth,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {
            "patient.firstname",
            "patient.lastname",
            "prothesisCatalog.name",
            "prothesisCatalog.material.name",
            "laboratory.name",
            "teeth",
            "practitioner.firstname",
            "practitioner.lastname",
            "updatedBy.firstname",
            "updatedBy.lastname",
            "sentToLabBy.firstname",
            "sentToLabBy.lastname",
            "receivedBy.firstname",
            "receivedBy.lastname",
            "posedBy.firstname",
            "posedBy.lastname",
            "cancelledBy.firstname",
            "cancelledBy.lastname"
    })
    @Query(
            value = """
        select p
        from Prothesis p
        left join p.patient patient
        left join p.prothesisCatalog pc
        left join pc.material material
        left join p.laboratory lab
        left join p.teeth tt
        where (:practitioner is null or p.practitioner = :practitioner)
          and p.recordStatus = :activeStatus
          and (:statusNorm is null or :statusNorm = '' or upper(coalesce(p.status, 'PENDING')) = :statusNorm)
          and (
                :fromEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate >= :fromDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate >= :fromDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated >= :fromDateTime)
          )
          and (
                :toEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate <= :toDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate <= :toDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated <= :toDateTime)
          )
          and (
                :qLike is null or :qLike = ''
                or (:filterKey = 'prothesisname' and lower(coalesce(pc.name, '')) like :qLike)
                or (:filterKey = 'materialname' and lower(coalesce(material.name, '')) like :qLike)
                or (:filterKey = '' and (
                        lower(coalesce(patient.firstname, '')) like :qLike
                        or lower(coalesce(patient.lastname, '')) like :qLike
                        or lower(concat(coalesce(patient.firstname, ''), ' ', coalesce(patient.lastname, ''))) like :qLike
                        or lower(coalesce(pc.name, '')) like :qLike
                        or lower(coalesce(material.name, '')) like :qLike
                        or lower(coalesce(p.code, '')) like :qLike
                        or lower(coalesce(lab.name, '')) like :qLike
                        or lower(coalesce(p.status, '')) like :qLike
                        or (:qToothEnabled = true and tt = :qTooth)
                ))
          )
        group by p
        order by
            case when min(tt) is null then 1 else 0 end asc,
            min(tt) desc,
            p.id asc
      """,
            countQuery = """
        select count(distinct p.id)
        from Prothesis p
        left join p.patient patient
        left join p.prothesisCatalog pc
        left join pc.material material
        left join p.laboratory lab
        left join p.teeth tt
        where (:practitioner is null or p.practitioner = :practitioner)
          and p.recordStatus = :activeStatus
          and (:statusNorm is null or :statusNorm = '' or upper(coalesce(p.status, 'PENDING')) = :statusNorm)
          and (
                :fromEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate >= :fromDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate >= :fromDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated >= :fromDateTime)
          )
          and (
                :toEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate <= :toDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate <= :toDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated <= :toDateTime)
          )
          and (
                :qLike is null or :qLike = ''
                or (:filterKey = 'prothesisname' and lower(coalesce(pc.name, '')) like :qLike)
                or (:filterKey = 'materialname' and lower(coalesce(material.name, '')) like :qLike)
                or (:filterKey = '' and (
                        lower(coalesce(patient.firstname, '')) like :qLike
                        or lower(coalesce(patient.lastname, '')) like :qLike
                        or lower(concat(coalesce(patient.firstname, ''), ' ', coalesce(patient.lastname, ''))) like :qLike
                        or lower(coalesce(pc.name, '')) like :qLike
                        or lower(coalesce(material.name, '')) like :qLike
                        or lower(coalesce(p.code, '')) like :qLike
                        or lower(coalesce(lab.name, '')) like :qLike
                        or lower(coalesce(p.status, '')) like :qLike
                        or (:qToothEnabled = true and tt = :qTooth)
                ))
          )
      """
    )
    Page<Prothesis> searchActiveProthesesSortByToothDesc(
            @Param("practitioner") User practitioner,
            @Param("activeStatus") RecordStatus activeStatus,
            @Param("statusNorm") String statusNorm,
            @Param("filterKey") String filterKey,
            @Param("dateType") String dateType,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDateTime") LocalDateTime toDateTime,
            @Param("qLike") String qLike,
            @Param("qToothEnabled") boolean qToothEnabled,
            @Param("qTooth") Integer qTooth,
            Pageable pageable
    );

    @Query(
            value = """
        select p.id
        from Prothesis p
        left join p.patient patient
        left join p.prothesisCatalog pc
        left join pc.material material
        left join p.laboratory lab
        left join p.teeth tt
        where (:practitioner is null or p.practitioner = :practitioner)
          and p.recordStatus = :activeStatus
          and (:statusNorm is null or :statusNorm = '' or upper(coalesce(p.status, 'PENDING')) = :statusNorm)
          and (
                :fromEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate >= :fromDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate >= :fromDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated >= :fromDateTime)
          )
          and (
                :toEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate <= :toDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate <= :toDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated <= :toDateTime)
          )
          and (
                :qLike is null or :qLike = ''
                or (:filterKey = 'prothesisname' and lower(coalesce(pc.name, '')) like :qLike)
                or (:filterKey = 'materialname' and lower(coalesce(material.name, '')) like :qLike)
                or (:filterKey = '' and (
                        lower(coalesce(patient.firstname, '')) like :qLike
                        or lower(coalesce(patient.lastname, '')) like :qLike
                        or lower(concat(coalesce(patient.firstname, ''), ' ', coalesce(patient.lastname, ''))) like :qLike
                        or lower(coalesce(pc.name, '')) like :qLike
                        or lower(coalesce(material.name, '')) like :qLike
                        or lower(coalesce(p.code, '')) like :qLike
                        or lower(coalesce(lab.name, '')) like :qLike
                        or lower(coalesce(p.status, '')) like :qLike
                        or (:qToothEnabled = true and tt = :qTooth)
                ))
          )
        group by p
        order by
            case when min(tt) is null then 1 else 0 end asc,
            min(tt) desc,
            p.id asc
      """,
            countQuery = """
        select count(distinct p.id)
        from Prothesis p
        left join p.patient patient
        left join p.prothesisCatalog pc
        left join pc.material material
        left join p.laboratory lab
        left join p.teeth tt
        where (:practitioner is null or p.practitioner = :practitioner)
          and p.recordStatus = :activeStatus
          and (:statusNorm is null or :statusNorm = '' or upper(coalesce(p.status, 'PENDING')) = :statusNorm)
          and (
                :fromEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate >= :fromDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate >= :fromDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated >= :fromDateTime)
          )
          and (
                :toEnabled = false
                or (:dateType = 'sentToLabDate' and p.sentToLabDate <= :toDateTime)
                or (:dateType = 'actualReturnDate' and p.actualReturnDate <= :toDateTime)
                or ((:dateType is null or :dateType = '' or :dateType = 'dateCreated') and p.dateCreated <= :toDateTime)
          )
          and (
                :qLike is null or :qLike = ''
                or (:filterKey = 'prothesisname' and lower(coalesce(pc.name, '')) like :qLike)
                or (:filterKey = 'materialname' and lower(coalesce(material.name, '')) like :qLike)
                or (:filterKey = '' and (
                        lower(coalesce(patient.firstname, '')) like :qLike
                        or lower(coalesce(patient.lastname, '')) like :qLike
                        or lower(concat(coalesce(patient.firstname, ''), ' ', coalesce(patient.lastname, ''))) like :qLike
                        or lower(coalesce(pc.name, '')) like :qLike
                        or lower(coalesce(material.name, '')) like :qLike
                        or lower(coalesce(p.code, '')) like :qLike
                        or lower(coalesce(lab.name, '')) like :qLike
                        or lower(coalesce(p.status, '')) like :qLike
                        or (:qToothEnabled = true and tt = :qTooth)
                ))
          )
      """
    )
    Page<Long> searchActiveProthesisIdsSortByToothDesc(
            @Param("practitioner") User practitioner,
            @Param("activeStatus") RecordStatus activeStatus,
            @Param("statusNorm") String statusNorm,
            @Param("filterKey") String filterKey,
            @Param("dateType") String dateType,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDateTime") LocalDateTime toDateTime,
            @Param("qLike") String qLike,
            @Param("qToothEnabled") boolean qToothEnabled,
            @Param("qTooth") Integer qTooth,
            Pageable pageable
    );

    @Query("""
        select p
        from Prothesis p
        left join p.prothesisCatalog pc
        left join pc.material m
        where p.patient.id = :patientId
          and (:practitioner is null or p.practitioner = :practitioner)
          and p.recordStatus <> :archivedStatus
          and (:statusNorm is null or :statusNorm = '' or upper(coalesce(p.status, 'PENDING')) = :statusNorm)
          and (:fromEnabled = false or p.dateCreated >= :fromDateTime)
          and (:toEnabled = false or p.dateCreated < :toDateTimeExclusive)
          and (
                :qLike is null or :qLike = ''
                or (:fieldKey = 'materialname' and lower(coalesce(m.name, '')) like :qLike)
                or (:fieldKey = 'prothesisname' and lower(coalesce(pc.name, '')) like :qLike)
                or (:fieldKey = '' and (
                        lower(coalesce(m.name, '')) like :qLike
                        or lower(coalesce(pc.name, '')) like :qLike
                ))
          )
    """)
    Page<Prothesis> searchPatientProtheses(
            @Param("patientId") Long patientId,
            @Param("practitioner") User practitioner,
            @Param("archivedStatus") com.cabinetplus.backend.enums.RecordStatus archivedStatus,
            @Param("statusNorm") String statusNorm,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDateTimeExclusive") LocalDateTime toDateTimeExclusive,
            @Param("qLike") String qLike,
            @Param("fieldKey") String fieldKey,
            Pageable pageable
    );

    @Query("""
        select p
        from Prothesis p
        left join p.prothesisCatalog pc
        left join pc.material m
        left join p.teeth tt
        where p.patient.id = :patientId
          and (:practitioner is null or p.practitioner = :practitioner)
          and p.recordStatus <> :archivedStatus
          and (:statusNorm is null or :statusNorm = '' or upper(coalesce(p.status, 'PENDING')) = :statusNorm)
          and (:fromEnabled = false or p.dateCreated >= :fromDateTime)
          and (:toEnabled = false or p.dateCreated < :toDateTimeExclusive)
          and (
                :qLike is null or :qLike = ''
                or (:fieldKey = 'materialname' and lower(coalesce(m.name, '')) like :qLike)
                or (:fieldKey = 'prothesisname' and lower(coalesce(pc.name, '')) like :qLike)
                or (:fieldKey = '' and (
                        lower(coalesce(m.name, '')) like :qLike
                        or lower(coalesce(pc.name, '')) like :qLike
                ))
          )
        group by p
        order by
            case when min(tt) is null then 1 else 0 end asc,
            min(tt) asc,
            p.id asc
    """)
    Page<Prothesis> searchPatientProthesesSortByToothAsc(
            @Param("patientId") Long patientId,
            @Param("practitioner") User practitioner,
            @Param("archivedStatus") com.cabinetplus.backend.enums.RecordStatus archivedStatus,
            @Param("statusNorm") String statusNorm,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDateTimeExclusive") LocalDateTime toDateTimeExclusive,
            @Param("qLike") String qLike,
            @Param("fieldKey") String fieldKey,
            Pageable pageable
    );

    @Query("""
        select p
        from Prothesis p
        left join p.prothesisCatalog pc
        left join pc.material m
        left join p.teeth tt
        where p.patient.id = :patientId
          and (:practitioner is null or p.practitioner = :practitioner)
          and p.recordStatus <> :archivedStatus
          and (:statusNorm is null or :statusNorm = '' or upper(coalesce(p.status, 'PENDING')) = :statusNorm)
          and (:fromEnabled = false or p.dateCreated >= :fromDateTime)
          and (:toEnabled = false or p.dateCreated < :toDateTimeExclusive)
          and (
                :qLike is null or :qLike = ''
                or (:fieldKey = 'materialname' and lower(coalesce(m.name, '')) like :qLike)
                or (:fieldKey = 'prothesisname' and lower(coalesce(pc.name, '')) like :qLike)
                or (:fieldKey = '' and (
                        lower(coalesce(m.name, '')) like :qLike
                        or lower(coalesce(pc.name, '')) like :qLike
                ))
          )
        group by p
        order by
            case when max(tt) is null then 1 else 0 end asc,
            max(tt) desc,
            p.id asc
    """)
    Page<Prothesis> searchPatientProthesesSortByToothDesc(
            @Param("patientId") Long patientId,
            @Param("practitioner") User practitioner,
            @Param("archivedStatus") com.cabinetplus.backend.enums.RecordStatus archivedStatus,
            @Param("statusNorm") String statusNorm,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDateTimeExclusive") LocalDateTime toDateTimeExclusive,
            @Param("qLike") String qLike,
            @Param("fieldKey") String fieldKey,
            Pageable pageable
    );

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
        SELECT COALESCE(SUM(p.finalPrice), 0)
        FROM Prothesis p
        WHERE p.patient.id = :patientId
          AND p.recordStatus = 'ACTIVE'
    """)
    Double sumFinalPriceByPatientId(@Param("patientId") Long patientId);

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

    @EntityGraph(attributePaths = {
            "patient.firstname",
            "patient.lastname",
            "prothesisCatalog.name"
    })
    @Query("""
        select p
        from Prothesis p
        left join p.patient patient
        left join p.prothesisCatalog catalog
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

    @EntityGraph(attributePaths = {
            "patient.firstname",
            "patient.lastname",
            "prothesisCatalog.name"
    })
    @Query("""
        select p
        from Prothesis p
        left join p.patient patient
        left join p.prothesisCatalog catalog
        where p.practitioner = :practitioner
          and p.recordStatus = 'ACTIVE'
          and p.laboratory.id = :laboratoryId
          and p.labCost is not null
          and (:fromEnabled = false or coalesce(p.sentToLabDate, p.dateCreated) >= :fromDt)
          and (:toEnabled = false or coalesce(p.sentToLabDate, p.dateCreated) <= :toDt)
    """)
    Page<Prothesis> searchBillingProthesesByPractitionerAndLaboratory(
            @Param("practitioner") User practitioner,
            @Param("laboratoryId") Long laboratoryId,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDt") LocalDateTime fromDt,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDt") LocalDateTime toDt,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {
            "patient.firstname",
            "patient.lastname",
            "prothesisCatalog.name"
    })
    @Query("""
        select p
        from Prothesis p
        left join p.patient patient
        left join p.prothesisCatalog catalog
        where p.practitioner = :practitioner
          and p.recordStatus = 'ACTIVE'
          and p.laboratory.id = :laboratoryId
          and p.labCost is not null
          and (:fromEnabled = false or coalesce(p.sentToLabDate, p.dateCreated) >= :fromDt)
          and (:toEnabled = false or coalesce(p.sentToLabDate, p.dateCreated) <= :toDt)
        order by coalesce(p.sentToLabDate, p.dateCreated) asc, p.id asc
    """)
    Page<Prothesis> searchBillingProthesesByPractitionerAndLaboratoryOrderByBillingDateAsc(
            @Param("practitioner") User practitioner,
            @Param("laboratoryId") Long laboratoryId,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDt") LocalDateTime fromDt,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDt") LocalDateTime toDt,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {
            "patient.firstname",
            "patient.lastname",
            "prothesisCatalog.name"
    })
    @Query("""
        select p
        from Prothesis p
        left join p.patient patient
        left join p.prothesisCatalog catalog
        where p.practitioner = :practitioner
          and p.recordStatus = 'ACTIVE'
          and p.laboratory.id = :laboratoryId
          and p.labCost is not null
          and (:fromEnabled = false or coalesce(p.sentToLabDate, p.dateCreated) >= :fromDt)
          and (:toEnabled = false or coalesce(p.sentToLabDate, p.dateCreated) <= :toDt)
        order by coalesce(p.sentToLabDate, p.dateCreated) desc, p.id asc
    """)
    Page<Prothesis> searchBillingProthesesByPractitionerAndLaboratoryOrderByBillingDateDesc(
            @Param("practitioner") User practitioner,
            @Param("laboratoryId") Long laboratoryId,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDt") LocalDateTime fromDt,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDt") LocalDateTime toDt,
            Pageable pageable
    );

    @Query("""
        select count(p), coalesce(sum(p.labCost), 0)
        from Prothesis p
        where p.practitioner = :practitioner
          and p.recordStatus = 'ACTIVE'
          and p.laboratory.id = :laboratoryId
          and p.labCost is not null
          and (:fromEnabled = false or coalesce(p.sentToLabDate, p.dateCreated) >= :fromDt)
          and (:toEnabled = false or coalesce(p.sentToLabDate, p.dateCreated) <= :toDt)
    """)
    Object[] getBillingEntriesSummaryByPractitionerAndLaboratory(
            @Param("practitioner") User practitioner,
            @Param("laboratoryId") Long laboratoryId,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDt") LocalDateTime fromDt,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDt") LocalDateTime toDt
    );

    @EntityGraph(attributePaths = {
            "patient.firstname",
            "patient.lastname",
            "prothesisCatalog.name",
            "practitioner.firstname",
            "practitioner.lastname"
    })
    @Query("""
        select p
        from Prothesis p
        left join p.prothesisCatalog catalog
        left join p.practitioner pract
        where p.laboratory = :laboratory
          and p.recordStatus <> :archivedStatus
          and (:dentistPublicId is null or pract.publicId = :dentistPublicId)
           and (:statusNorm = '' or upper(coalesce(p.status, 'PENDING')) = :statusNorm)
           and (
                 :fromEnabled = false
                 or ((:dateType is null or :dateType = '' or :dateType = 'sentToLabDate') and p.sentToLabDate >= :fromDt)
                 or (:dateType = 'readyAt' and p.readyAt >= :fromDt)
                 or (:dateType = 'actualReturnDate' and p.actualReturnDate >= :fromDt)
           )
           and (
                 :toEnabled = false
                 or ((:dateType is null or :dateType = '' or :dateType = 'sentToLabDate') and p.sentToLabDate <= :toDt)
                 or (:dateType = 'readyAt' and p.readyAt <= :toDt)
                 or (:dateType = 'actualReturnDate' and p.actualReturnDate <= :toDt)
           )
           and (
             :qLike = ''
             or (:filterKey = 'work' and lower(coalesce(catalog.name, '')) like :qLike)
            or (:filterKey = 'code' and lower(coalesce(p.code, '')) like :qLike)
            or (:filterKey = 'dentist' and lower(concat(coalesce(pract.firstname, ''), ' ', coalesce(pract.lastname, ''))) like :qLike)
            or (:filterKey = '' and (
                    lower(coalesce(catalog.name, '')) like :qLike
                    or lower(coalesce(p.code, '')) like :qLike
                    or lower(concat(coalesce(pract.firstname, ''), ' ', coalesce(pract.lastname, ''))) like :qLike
            ))
          )
    """)
    Page<Prothesis> searchForLabPortal(
            @Param("laboratory") com.cabinetplus.backend.models.Laboratory laboratory,
            @Param("archivedStatus") RecordStatus archivedStatus,
            @Param("dentistPublicId") UUID dentistPublicId,
            @Param("statusNorm") String statusNorm,
            @Param("filterKey") String filterKey,
            @Param("dateType") String dateType,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromDt") LocalDateTime fromDt,
            @Param("toEnabled") boolean toEnabled,
            @Param("toDt") LocalDateTime toDt,
            @Param("qLike") String qLike,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {
            "prothesisCatalog.name",
            "practitioner.publicId",
            "practitioner.firstname",
            "practitioner.lastname",
            "laboratory.id",
            "laboratory.name"
    })
    @Query("""
            select p
            from Prothesis p
            left join p.practitioner pract
            left join p.prothesisCatalog catalog
            where p.laboratory = :laboratory
              and p.recordStatus <> :archivedStatus
              and p.cancelRequestDecision = com.cabinetplus.backend.enums.CancellationRequestDecision.PENDING
            order by p.cancelRequestedAt desc nulls last, p.id desc
            """)
    List<Prothesis> findPendingCancellationForLabPortal(
            @Param("laboratory") com.cabinetplus.backend.models.Laboratory laboratory,
            @Param("archivedStatus") RecordStatus archivedStatus
    );

    @Modifying
    @Transactional
    @Query("""
        update Prothesis p
        set p.laboratory = :target
        where p.practitioner = :dentist
          and p.laboratory = :source
    """)
    int migrateLaboratoryForDentist(@Param("dentist") User dentist,
                                    @Param("source") com.cabinetplus.backend.models.Laboratory source,
                                    @Param("target") com.cabinetplus.backend.models.Laboratory target);

    @Modifying
    @Transactional
    @Query("""
        update Prothesis p
        set p.updatedBy = :updatedBy,
            p.updatedAt = :updatedAt
        where p.id = :id
    """)
    int touchUpdatedBy(@Param("id") Long id,
                       @Param("updatedBy") User updatedBy,
                       @Param("updatedAt") LocalDateTime updatedAt);

    @Modifying
    @Transactional
    @Query("""
        update Prothesis p
        set p.stlFilename = :stlFilename,
            p.stlFileType = :stlFileType,
            p.stlFileSizeBytes = :stlFileSizeBytes,
            p.stlUploadedAt = :stlUploadedAt,
            p.stlPathOrUrl = :stlPathOrUrl,
            p.stlUploadedBy = :stlUploadedBy,
            p.updatedBy = :updatedBy,
            p.updatedAt = :updatedAt
        where p.id = :id
    """)
    int updateStlAttachment(@Param("id") Long id,
                            @Param("stlFilename") String stlFilename,
                            @Param("stlFileType") String stlFileType,
                            @Param("stlFileSizeBytes") Long stlFileSizeBytes,
                            @Param("stlUploadedAt") LocalDateTime stlUploadedAt,
                            @Param("stlPathOrUrl") String stlPathOrUrl,
                            @Param("stlUploadedBy") User stlUploadedBy,
                            @Param("updatedBy") User updatedBy,
                            @Param("updatedAt") LocalDateTime updatedAt);
}
