package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.Employee;
import com.cabinetplus.backend.models.EmployeeWorkingHours;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.EmployeeRepository;
import com.cabinetplus.backend.repositories.EmployeeWorkingHoursRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

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

    public Page<EmployeeWorkingHours> getAllForDentistPaged(User dentist, Pageable pageable) {
        if (dentist == null) {
            return Page.empty(pageable);
        }
        return repository.findByEmployee_Dentist(dentist, pageable);
    }

    public List<EmployeeWorkingHours> getByEmployee(Long employeeId, User dentist) {
        Employee employee = employeeRepository.findByIdAndDentist(employeeId, dentist)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employe introuvable ou non autorise"));
        return repository.findByEmployee(employee);
    }

    public Page<EmployeeWorkingHours> getByEmployeePaged(Long employeeId, User dentist, Pageable pageable) {
        if (employeeId == null) {
            return Page.empty(pageable);
        }
        employeeRepository.findByIdAndDentist(employeeId, dentist)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employe introuvable ou non autorise"));
        return repository.findByEmployeeIdAndEmployee_Dentist(employeeId, dentist, pageable);
    }

    public List<EmployeeWorkingHours> getByEmployeeAndDay(Long employeeId, DayOfWeek day, User dentist) {
        Employee employee = employeeRepository.findByIdAndDentist(employeeId, dentist)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employe introuvable ou non autorise"));
        return repository.findByEmployeeIdAndDayOfWeek(employeeId, day);
    }

    public EmployeeWorkingHours save(EmployeeWorkingHours hours, User dentist) {
        // check employee ownership
        Employee employee = employeeRepository.findByIdAndDentist(hours.getEmployee().getId(), dentist)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employe introuvable ou non autorise"));
        hours.setEmployee(employee);
        return repository.save(hours);
    }

    public EmployeeWorkingHours update(Long id, EmployeeWorkingHours hours, User dentist) {
        EmployeeWorkingHours existing = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Horaires introuvables"));

        if (!existing.getEmployee().getDentist().equals(dentist)) {
            throw new AccessDeniedException("Acces refuse");
        }

        hours.setId(id);
        hours.setEmployee(existing.getEmployee()); // keep same employee
        return repository.save(hours);
    }

    public void delete(Long id, User dentist) {
        EmployeeWorkingHours existing = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Horaires introuvables"));

        if (!existing.getEmployee().getDentist().equals(dentist)) {
            throw new AccessDeniedException("Acces refuse");
        }

        repository.delete(existing);
    }
}
