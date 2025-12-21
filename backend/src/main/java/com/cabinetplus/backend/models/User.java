package com.cabinetplus.backend.models;

import java.time.LocalDateTime;

import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.enums.UserRole;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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

    private boolean isPhoneVerified = false;

    @ManyToOne
    @JoinColumn(name = "plan_id")
    private Plan plan;

    @Enumerated(EnumType.STRING)
    private UserPlanStatus planStatus = UserPlanStatus.PENDING;

    @Column(length = 20)
    private String phoneNumber;



    private LocalDateTime createdAt;
    private LocalDateTime expirationDate;

    private boolean canDeleteAdmin = false; // super-admin flag

    // --- NEW OPTIONAL CLINIC FIELDS ---
    private String clinicName;
    
    @Column(columnDefinition = "TEXT") // TEXT allows for longer addresses
    private String address;


private String phoneOtp;
private LocalDateTime phoneOtpExpires;
}