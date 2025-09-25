package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.models.Employee;
import com.cabinetplus.backend.models.User;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    List<Employee> findAllByDentist(User dentist);
    Optional<Employee> findByIdAndDentist(Long id, User dentist);
}
