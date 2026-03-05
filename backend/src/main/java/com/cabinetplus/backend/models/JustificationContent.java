package com.cabinetplus.backend.models;

import com.cabinetplus.backend.enums.JustificationType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "justification_contents",
       uniqueConstraints = @UniqueConstraint(columnNames = {"type", "practitioner_id"})) // Only enforce unique per enum type per practitioner
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JustificationContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150) 
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @ManyToOne
    @JoinColumn(name = "practitioner_id", nullable = false)
    private User practitioner;

    // ✅ Removed @PrePersist validation — handled in service now
}