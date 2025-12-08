package com.cabinetplus.backend.models;

import java.time.LocalDateTime;

import com.cabinetplus.backend.enums.PlanStatus;
import com.cabinetplus.backend.enums.UserRole;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    private String passwordHash;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    private String firstname;
    private String lastname;
    private String email;

    private boolean isEmailVerified = false;
    private boolean isPhoneVerified = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PlanStatus planStatus = PlanStatus.PENDING_PLAN;

    @Column(length = 20)
    private String phoneNumber;

    private LocalDateTime createdAt;

    private LocalDateTime expirationDate;  // <-- new field
}
