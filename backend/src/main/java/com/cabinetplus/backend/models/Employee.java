package com.cabinetplus.backend.models;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.dto.EmployeeStatus;
import com.cabinetplus.backend.security.EncryptionConverter;
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
    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String firstName;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String lastName;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String gender;
    private LocalDate dateOfBirth;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String nationalId;

    // --- Contact Info ---
    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String phone;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String email;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RecordStatus recordStatus = RecordStatus.ACTIVE;

    private LocalDateTime archivedAt;

    @PrePersist
    private void ensurePublicId() {
        if (publicId == null) {
            publicId = UuidV7.randomUuidV7();
        }
    }
}
