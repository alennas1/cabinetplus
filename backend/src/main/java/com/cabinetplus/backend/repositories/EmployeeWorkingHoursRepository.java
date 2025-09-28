package com.cabinetplus.backend.repositories;

import java.time.DayOfWeek;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.cabinetplus.backend.models.Employee;
import com.cabinetplus.backend.models.EmployeeWorkingHours;
import com.cabinetplus.backend.models.User;

@Repository
public interface EmployeeWorkingHoursRepository extends JpaRepository<EmployeeWorkingHours, Long> {

    // --- Basic ---
    List<EmployeeWorkingHours> findByEmployee(Employee employee);
    List<EmployeeWorkingHours> findByEmployeeId(Long employeeId);
    List<EmployeeWorkingHours> findByEmployeeIdAndDayOfWeek(Long employeeId, DayOfWeek dayOfWeek);

    // --- Dentist-based filtering ---
    List<EmployeeWorkingHours> findByEmployee_Dentist(User dentist);
    List<EmployeeWorkingHours> findByEmployeeIdAndEmployee_Dentist(Long employeeId, User dentist);
    List<EmployeeWorkingHours> findByEmployeeIdAndDayOfWeekAndEmployee_Dentist(Long employeeId, DayOfWeek day, User dentist);
}
