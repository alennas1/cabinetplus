package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.Employee;
import com.cabinetplus.backend.models.EmployeeWorkingHours;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.EmployeeRepository;
import com.cabinetplus.backend.repositories.EmployeeWorkingHoursRepository;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.util.List;

@Service
public class EmployeeWorkingHoursService {

    private final EmployeeWorkingHoursRepository repository;
    private final EmployeeRepository employeeRepository;

    public EmployeeWorkingHoursService(EmployeeWorkingHoursRepository repository,
                                       EmployeeRepository employeeRepository) {
        this.repository = repository;
        this.employeeRepository = employeeRepository;
    }

    public List<EmployeeWorkingHours> getAllForDentist(User dentist) {
        return repository.findByEmployee_Dentist(dentist);
    }

    public List<EmployeeWorkingHours> getByEmployee(Long employeeId, User dentist) {
        Employee employee = employeeRepository.findByIdAndDentist(employeeId, dentist)
                .orElseThrow(() -> new RuntimeException("Employee not found or not yours"));
        return repository.findByEmployee(employee);
    }

    public List<EmployeeWorkingHours> getByEmployeeAndDay(Long employeeId, DayOfWeek day, User dentist) {
        Employee employee = employeeRepository.findByIdAndDentist(employeeId, dentist)
                .orElseThrow(() -> new RuntimeException("Employee not found or not yours"));
        return repository.findByEmployeeIdAndDayOfWeek(employeeId, day);
    }

    public EmployeeWorkingHours save(EmployeeWorkingHours hours, User dentist) {
        // check employee ownership
        Employee employee = employeeRepository.findByIdAndDentist(hours.getEmployee().getId(), dentist)
                .orElseThrow(() -> new RuntimeException("Employee not found or not yours"));
        hours.setEmployee(employee);
        return repository.save(hours);
    }

    public EmployeeWorkingHours update(Long id, EmployeeWorkingHours hours, User dentist) {
        EmployeeWorkingHours existing = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Working hours not found"));

        if (!existing.getEmployee().getDentist().equals(dentist)) {
            throw new RuntimeException("Unauthorized");
        }

        hours.setId(id);
        hours.setEmployee(existing.getEmployee()); // keep same employee
        return repository.save(hours);
    }

    public void delete(Long id, User dentist) {
        EmployeeWorkingHours existing = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Working hours not found"));

        if (!existing.getEmployee().getDentist().equals(dentist)) {
            throw new RuntimeException("Unauthorized");
        }

        repository.delete(existing);
    }
}
