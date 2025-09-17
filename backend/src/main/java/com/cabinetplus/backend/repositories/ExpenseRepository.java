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

    List<Expense> findByCreatedBy(User user);

    Optional<Expense> findByIdAndCreatedBy(Long id, User user);

    @Query("SELECT SUM(e.amount) FROM Expense e WHERE e.date BETWEEN :from AND :to")
    Double sumExpensesBetween(LocalDate from, LocalDate to);

    @Query("SELECT e.category, SUM(e.amount) FROM Expense e WHERE e.date BETWEEN :from AND :to GROUP BY e.category")
    List<Object[]> sumByCategory(LocalDate from, LocalDate to);


    @Query("SELECT COALESCE(SUM(i.price), 0) " +
       "FROM Item i " +
       "WHERE EXTRACT(YEAR FROM i.createdAt) = :year AND EXTRACT(MONTH FROM i.createdAt) = :month")
Double sumByMonth(@Param("year") int year, @Param("month") int month);


}
