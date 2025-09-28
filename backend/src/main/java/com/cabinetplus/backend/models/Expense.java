package com.cabinetplus.backend.models;

import java.time.LocalDate;

import com.cabinetplus.backend.enums.ExpenseCategory;

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
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "expenses")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Title is required")
    @Column(nullable = false)
    private String title;

    @NotNull(message = "Amount is required")
    @Column(nullable = false)
    private Double amount;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Category is required")
    @Column(nullable = false)
    private ExpenseCategory category;

    private LocalDate date;

    @Column(length = 500)
    private String description;

    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    // 👇 Added relation with Employee (optional)
    @ManyToOne(optional = true)
    @JoinColumn(name = "employee_id")
    private Employee employee;
}
