package com.cabinetplus.backend.models;

import java.time.LocalDateTime;

import com.cabinetplus.backend.enums.JustificationType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "justifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Justification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150) 
    private String title;


    @Column(columnDefinition = "TEXT", nullable = false)
    private String finalContent;

    private LocalDateTime date;

    @ManyToOne
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne
    @JoinColumn(name = "practitioner_id", nullable = false)
    private User practitioner;

    @PrePersist
    protected void onCreate() {
        this.date = LocalDateTime.now();
    }
}