package com.cabinetplus.backend.models;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.cabinetplus.backend.dto.EmployeeStatus;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "employees")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // --- Basic Info ---
    private String firstName;
    private String lastName;
    private String gender;
    private LocalDate dateOfBirth;
    private String nationalId;

    // --- Contact Info ---
    private String phone;
    private String email;
    private String address;

    // --- Employment Info ---
    private LocalDate hireDate;
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    private EmployeeStatus status;

    private Double salary;
    private String contractType;

    // Relation with dentist (User)
    @ManyToOne
    @JoinColumn(name = "dentist_id")
    private User dentist;

    // Relation with working hours
    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EmployeeWorkingHours> workingHours;

    // Audit timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
