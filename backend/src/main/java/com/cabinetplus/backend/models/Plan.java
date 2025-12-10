package com.cabinetplus.backend.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "plans")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // e.g., “FREE_TRIAL”, “BASIC”, “PRO”
    @Column(unique = true, nullable = false)
    private String code;

    private String name;

    // Monthly price
    private Integer monthlyPrice;

    // Reduced price when billed yearly
    private Integer yearlyMonthlyPrice;

    // Duration in days for free trial or default period
    private Integer durationDays;

    private boolean active = true;
}
