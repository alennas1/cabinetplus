package com.cabinetplus.backend.models;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.cabinetplus.backend.dto.EmployeeStatus;
import com.cabinetplus.backend.util.UuidV7;

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

    @Column(name = "public_id", nullable = false, unique = true, updatable = false)
    private UUID publicId;

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

    @OneToOne
    @JoinColumn(name = "user_id")
    private User user;

    // Relation with working hours
    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EmployeeWorkingHours> workingHours;

    // Audit timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    private void ensurePublicId() {
        if (publicId == null) {
            publicId = UuidV7.randomUuidV7();
        }
    }
}
