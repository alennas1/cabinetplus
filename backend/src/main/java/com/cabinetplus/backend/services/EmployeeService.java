package com.cabinetplus.backend.services;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.EmployeeRequestDTO;
import com.cabinetplus.backend.dto.EmployeeResponseDTO;
import com.cabinetplus.backend.dto.EmployeeWorkingHoursDTO;
import com.cabinetplus.backend.models.Employee;
import com.cabinetplus.backend.models.EmployeeWorkingHours;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.EmployeeRepository;
import com.cabinetplus.backend.repositories.EmployeeWorkingHoursRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final EmployeeWorkingHoursRepository workingHoursRepository;

    // --- Create ---
    public EmployeeResponseDTO saveEmployee(EmployeeRequestDTO dto, User dentist) {
        Employee employee = Employee.builder()
                .firstName(dto.getFirstName())
                .lastName(dto.getLastName())
                .gender(dto.getGender())
                .dateOfBirth(dto.getDateOfBirth())
                .nationalId(dto.getNationalId())
                .phone(dto.getPhone())
                .email(dto.getEmail())
                .address(dto.getAddress())
                .hireDate(dto.getHireDate())
                .endDate(dto.getEndDate())
                .status(dto.getStatus())
                .salary(dto.getSalary())
                .contractType(dto.getContractType())
                .dentist(dentist)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Employee saved = employeeRepository.save(employee);

        // Default working hours (08:00 - 16:00 for all 7 days)
        List<EmployeeWorkingHours> defaultHours = Arrays.stream(DayOfWeek.values())
                .map(day -> EmployeeWorkingHours.builder()
                        .employee(saved)
                        .dayOfWeek(day)
                        .startTime(LocalTime.of(8, 0))
                        .endTime(LocalTime.of(16, 0))
                        .build())
                .collect(Collectors.toList());

        workingHoursRepository.saveAll(defaultHours);

        List<EmployeeWorkingHoursDTO> schedules = defaultHours.stream()
                .map(h -> EmployeeWorkingHoursDTO.builder()
                        .id(h.getId())
                        .dayOfWeek(h.getDayOfWeek())
                        .startTime(h.getStartTime())
                        .endTime(h.getEndTime())
                        .build())
                .collect(Collectors.toList());

        return mapToResponse(saved, schedules);
    }

    // --- Update ---
    public EmployeeResponseDTO updateEmployee(Long id, EmployeeRequestDTO dto, User dentist) {
        Employee existing = employeeRepository.findByIdAndDentist(id, dentist)
                .orElseThrow(() -> new RuntimeException("Employee not found with id " + id));

        existing.setFirstName(dto.getFirstName());
        existing.setLastName(dto.getLastName());
        existing.setGender(dto.getGender());
        existing.setDateOfBirth(dto.getDateOfBirth());
        existing.setNationalId(dto.getNationalId());
        existing.setPhone(dto.getPhone());
        existing.setEmail(dto.getEmail());
        existing.setAddress(dto.getAddress());
        existing.setHireDate(dto.getHireDate());
        existing.setEndDate(dto.getEndDate());
        existing.setStatus(dto.getStatus());
        existing.setSalary(dto.getSalary());
        existing.setContractType(dto.getContractType());
        existing.setUpdatedAt(LocalDateTime.now());

        Employee updated = employeeRepository.save(existing);

        List<EmployeeWorkingHours> hours = workingHoursRepository.findByEmployee(updated);
        List<EmployeeWorkingHoursDTO> schedules = hours.stream()
                .map(h -> EmployeeWorkingHoursDTO.builder()
                        .id(h.getId())
                        .dayOfWeek(h.getDayOfWeek())
                        .startTime(h.getStartTime())
                        .endTime(h.getEndTime())
                        .build())
                .collect(Collectors.toList());

        return mapToResponse(updated, schedules);
    }

    // --- Get All ---
    public List<EmployeeResponseDTO> getAllEmployeesForDentist(User dentist) {
        return employeeRepository.findAllByDentist(dentist)
                .stream()
                .map(emp -> {
                    List<EmployeeWorkingHours> hours = workingHoursRepository.findByEmployee(emp);
                    List<EmployeeWorkingHoursDTO> schedules = hours.stream()
                            .map(h -> EmployeeWorkingHoursDTO.builder()
                                    .id(h.getId())
                                    .dayOfWeek(h.getDayOfWeek())
                                    .startTime(h.getStartTime())
                                    .endTime(h.getEndTime())
                                    .build())
                            .collect(Collectors.toList());
                    return mapToResponse(emp, schedules);
                })
                .collect(Collectors.toList());
    }

    // --- Get by ID ---
    public Optional<EmployeeResponseDTO> getEmployeeByIdForDentist(Long id, User dentist) {
        return employeeRepository.findByIdAndDentist(id, dentist)
                .map(emp -> {
                    List<EmployeeWorkingHours> hours = workingHoursRepository.findByEmployee(emp);
                    List<EmployeeWorkingHoursDTO> schedules = hours.stream()
                            .map(h -> EmployeeWorkingHoursDTO.builder()
                                    .id(h.getId())
                                    .dayOfWeek(h.getDayOfWeek())
                                    .startTime(h.getStartTime())
                                    .endTime(h.getEndTime())
                                    .build())
                            .collect(Collectors.toList());
                    return mapToResponse(emp, schedules);
                });
    }

    // --- Delete ---
    public void deleteEmployee(Long id, User dentist) {
        Employee existing = employeeRepository.findByIdAndDentist(id, dentist)
                .orElseThrow(() -> new RuntimeException("Employee not found with id " + id));

        employeeRepository.delete(existing);
    }

    // --- Mapper ---
    private EmployeeResponseDTO mapToResponse(Employee employee, List<EmployeeWorkingHoursDTO> schedules) {
        String dentistName = employee.getDentist().getFirstname() + " " + employee.getDentist().getLastname();

        return EmployeeResponseDTO.builder()
                .id(employee.getId())
                .firstName(employee.getFirstName())
                .lastName(employee.getLastName())
                .gender(employee.getGender())
                .dateOfBirth(employee.getDateOfBirth())
                .nationalId(employee.getNationalId())
                .phone(employee.getPhone())
                .email(employee.getEmail())
                .address(employee.getAddress())
                .hireDate(employee.getHireDate())
                .endDate(employee.getEndDate())
                .status(employee.getStatus())
                .salary(employee.getSalary())
                .contractType(employee.getContractType())
                .dentistId(employee.getDentist().getId())
                .dentistName(dentistName.trim())
                .createdAt(employee.getCreatedAt())
                .updatedAt(employee.getUpdatedAt())
                .workingHours(schedules)
                .build();
    }
}
