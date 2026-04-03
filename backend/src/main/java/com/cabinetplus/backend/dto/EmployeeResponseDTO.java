package com.cabinetplus.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.cabinetplus.backend.enums.RecordStatus;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EmployeeResponseDTO {
    private Long id;
    private UUID publicId;

    private String firstName;
    private String lastName;
    private String gender;
    private LocalDate dateOfBirth;
    private String nationalId;

    private String phone;
    private String email;
    private String address;

    private LocalDate hireDate;
    private LocalDate endDate;

    private EmployeeStatus status;
    private Double salary;
    private String contractType;

    private Long dentistId;
    private String dentistName;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private RecordStatus recordStatus;
    private LocalDateTime archivedAt;

    private Long userId;

    // Add working hours
    private List<EmployeeWorkingHoursDTO> workingHours;
}
