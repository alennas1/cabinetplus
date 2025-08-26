package com.cabinetplus.backend.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

import com.cabinetplus.backend.enums.UserRole;

@Entity
@Table(name = "users")
@Data @NoArgsConstructor @AllArgsConstructor
public class User {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    private String passwordHash;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    private String firstname;
    private String lastname;
    private String email;

    private LocalDateTime createdAt;
}
