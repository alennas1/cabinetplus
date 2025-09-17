package com.cabinetplus.backend.repositories;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.models.Expense;
import com.cabinetplus.backend.models.User;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    // Existing methods
    List<Expense> findByCreatedBy(User user);
    Optional<Expense> findByIdAndCreatedBy(Long id, User user);

    @Query("SELECT SUM(e.amount) FROM Expense e WHERE e.createdBy = :dentist AND e.date BETWEEN :start AND :end")
    Optional<Double> sumAmountByDentist(@Param("dentist") User dentist,
                                        @Param("start") LocalDate start,
                                        @Param("end") LocalDate end);

    List<Expense> findByCreatedByAndDateBetween(User dentist, LocalDate start, LocalDate end);
}
