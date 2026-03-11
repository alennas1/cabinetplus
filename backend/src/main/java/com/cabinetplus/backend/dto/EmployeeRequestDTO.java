package com.cabinetplus.backend.dto;

import java.time.LocalDate;

import com.cabinetplus.backend.enums.ClinicAccessRole;

import lombok.Data;

@Data
public class EmployeeRequestDTO {
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

    private String username;
    private String password;
    private ClinicAccessRole accessRole;
}
