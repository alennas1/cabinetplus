package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.models.Employee;
import com.cabinetplus.backend.models.User;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    List<Employee> findAllByDentist(User dentist);
    Page<Employee> findByDentist(User dentist, Pageable pageable);

    List<Employee> findAllByDentistAndArchivedAtIsNullAndRecordStatus(User dentist,
                                                                      com.cabinetplus.backend.enums.RecordStatus recordStatus);

    Page<Employee> findByDentistAndArchivedAtIsNullAndRecordStatus(User dentist,
                                                                   com.cabinetplus.backend.enums.RecordStatus recordStatus,
                                                                   Pageable pageable);

    @Query("""
            select e
            from Employee e
            where e.dentist = :dentist
              and (e.archivedAt is not null or e.recordStatus <> com.cabinetplus.backend.enums.RecordStatus.ACTIVE)
            """)
    List<Employee> findArchivedByDentist(@Param("dentist") User dentist);

    @Query("""
            select e
            from Employee e
            where e.dentist = :dentist
              and (e.archivedAt is not null or e.recordStatus <> com.cabinetplus.backend.enums.RecordStatus.ACTIVE)
            """)
    Page<Employee> findArchivedByDentist(@Param("dentist") User dentist, Pageable pageable);

    @Query("""
            select e
            from Employee e
            where e.dentist = :dentist
              and e.archivedAt is null
              and e.recordStatus = com.cabinetplus.backend.enums.RecordStatus.ACTIVE
              and (
                :q is null
                or :q = ''
                or lower(coalesce(e.firstName, '')) like concat('%', :q, '%')
                or lower(coalesce(e.lastName, '')) like concat('%', :q, '%')
                or lower(coalesce(e.phone, '')) like concat('%', :q, '%')
              )
            """)
    Page<Employee> searchActiveByDentist(@Param("dentist") User dentist, @Param("q") String q, Pageable pageable);

    @Query("""
            select e
            from Employee e
            where e.dentist = :dentist
              and (e.archivedAt is not null or e.recordStatus <> com.cabinetplus.backend.enums.RecordStatus.ACTIVE)
              and (
                :q is null
                or :q = ''
                or lower(coalesce(e.firstName, '')) like concat('%', :q, '%')
                or lower(coalesce(e.lastName, '')) like concat('%', :q, '%')
                or lower(coalesce(e.phone, '')) like concat('%', :q, '%')
              )
            """)
    Page<Employee> searchArchivedByDentist(@Param("dentist") User dentist, @Param("q") String q, Pageable pageable);

    Optional<Employee> findByIdAndDentist(Long id, User dentist);
    Optional<Employee> findByPublicIdAndDentist(UUID publicId, User dentist);
    Optional<Employee> findByPublicId(UUID publicId);

    Optional<Employee> findBySetupCode(String setupCode);

    boolean existsBySetupCode(String setupCode);

    Optional<Employee> findByUser(User user);

    long countByDentistAndArchivedAtIsNullAndRecordStatus(User dentist, RecordStatus recordStatus);
}
