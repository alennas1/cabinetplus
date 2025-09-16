package com.cabinetplus.backend.services;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.ExpenseRequestDTO;
import com.cabinetplus.backend.dto.ExpenseResponseDTO;
import com.cabinetplus.backend.models.Expense;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.ExpenseRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;

    // Get all expenses for a user
    public List<Expense> getExpensesForUser(User user) {
        return expenseRepository.findByCreatedBy(user);
    }

    // Get expense by ID for a user
    public Optional<Expense> getExpenseByIdForUser(Long id, User user) {
        return expenseRepository.findByIdAndCreatedBy(id, user);
    }

    // Create expense
    public Expense createExpense(ExpenseRequestDTO dto, User user) {
        Expense expense = new Expense();
        expense.setTitle(dto.getTitle());
        expense.setAmount(dto.getAmount());
        expense.setCategory(dto.getCategory());
        expense.setDate(dto.getDate() != null ? dto.getDate() : java.time.LocalDate.now());
        expense.setDescription(dto.getDescription());
        expense.setCreatedBy(user);
        return expenseRepository.save(expense);
    }

    // Update expense
    public Expense updateExpense(Long id, ExpenseRequestDTO dto, User user) {
        return expenseRepository.findByIdAndCreatedBy(id, user)
                .map(expense -> {
                    expense.setTitle(dto.getTitle());
                    expense.setAmount(dto.getAmount());
                    expense.setCategory(dto.getCategory());
                    expense.setDate(dto.getDate() != null ? dto.getDate() : java.time.LocalDate.now());
                    expense.setDescription(dto.getDescription());
                    return expenseRepository.save(expense);
                })
                .orElseThrow(() -> new RuntimeException("Expense not found"));
    }

    // Delete expense
    public void deleteExpense(Long id, User user) {
        Expense expense = expenseRepository.findByIdAndCreatedBy(id, user)
                .orElseThrow(() -> new RuntimeException("Expense not found"));
        expenseRepository.delete(expense);
    }

    // Map Expense to DTO
    public ExpenseResponseDTO toDTO(Expense expense) {
        return new ExpenseResponseDTO(
                expense.getId(),
                expense.getTitle(),
                expense.getAmount(),
                expense.getCategory(),
                expense.getDate(),
                expense.getDescription()
        );
    }
}
