package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.models.Expense;
import com.cabinetplus.backend.models.User;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findByCreatedBy(User user);

    Optional<Expense> findByIdAndCreatedBy(Long id, User user);
}
