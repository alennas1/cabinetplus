package com.cabinetplus.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EmployeeResponseDTO {
    private Long id;

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
    private String status;

    private Double salary;
    private String contractType;

    private Long dentistId;
    private String dentistName; // optional: dentist full name

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
