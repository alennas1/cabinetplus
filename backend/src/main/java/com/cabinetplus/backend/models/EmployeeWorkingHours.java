package com.cabinetplus.backend.models;

import java.time.DayOfWeek;
import java.time.LocalTime;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "employee_working_hours")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeWorkingHours {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Which day of the week (MONDAY, TUESDAY, etc.)
    @Enumerated(EnumType.STRING)
    private DayOfWeek dayOfWeek;

    // Start and end times
    private LocalTime startTime;
    private LocalTime endTime;

    // Relation with employee
    @ManyToOne
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;
}
