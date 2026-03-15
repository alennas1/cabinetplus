package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.enums.ClinicAccessRole;
import com.cabinetplus.backend.models.Employee;
import com.cabinetplus.backend.models.User;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    List<Employee> findAllByDentist(User dentist);
    Optional<Employee> findByIdAndDentist(Long id, User dentist);
    Optional<Employee> findByPublicIdAndDentist(UUID publicId, User dentist);

    @Query("""
            select count(e) from Employee e
            where e.dentist = :dentist
            and e.user is not null
            and e.user.clinicAccessRole = :role
            """)
    long countByDentistAndClinicRole(@Param("dentist") User dentist, @Param("role") ClinicAccessRole role);

    @Query("""
            select count(e) from Employee e
            where e.dentist = :dentist
            and (e.user is null or e.user.clinicAccessRole <> :partnerRole)
            """)
    long countStaffByDentist(@Param("dentist") User dentist, @Param("partnerRole") ClinicAccessRole partnerRole);
}
