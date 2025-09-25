package com.cabinetplus.backend.services;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.EmployeeRequestDTO;
import com.cabinetplus.backend.dto.EmployeeResponseDTO;
import com.cabinetplus.backend.models.Employee;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.EmployeeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;

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
                .build();

        Employee saved = employeeRepository.save(employee);
        return mapToResponse(saved);
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

        Employee updated = employeeRepository.save(existing);
        return mapToResponse(updated);
    }

    // --- Get All ---
    public List<EmployeeResponseDTO> getAllEmployeesForDentist(User dentist) {
        return employeeRepository.findAllByDentist(dentist)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // --- Get by ID ---
    public Optional<EmployeeResponseDTO> getEmployeeByIdForDentist(Long id, User dentist) {
        return employeeRepository.findByIdAndDentist(id, dentist)
                .map(this::mapToResponse);
    }

    // --- Delete ---
    public void deleteEmployee(Long id, User dentist) {
        Employee existing = employeeRepository.findByIdAndDentist(id, dentist)
                .orElseThrow(() -> new RuntimeException("Employee not found with id " + id));

        employeeRepository.delete(existing);
    }

    // --- Mapper ---
    private EmployeeResponseDTO mapToResponse(Employee employee) {
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
                .build();
    }
}
