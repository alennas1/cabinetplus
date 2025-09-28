package com.cabinetplus.backend.services;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.ExpenseRequestDTO;
import com.cabinetplus.backend.dto.ExpenseResponseDTO;
import com.cabinetplus.backend.enums.ExpenseCategory;
import com.cabinetplus.backend.models.Employee;
import com.cabinetplus.backend.models.Expense;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.EmployeeRepository;
import com.cabinetplus.backend.repositories.ExpenseRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final EmployeeRepository employeeRepository;

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
        mapDtoToExpense(dto, expense, user);
        validateExpense(expense);
        return expenseRepository.save(expense);
    }

    // Update expense
    public Expense updateExpense(Long id, ExpenseRequestDTO dto, User user) {
        return expenseRepository.findByIdAndCreatedBy(id, user)
                .map(expense -> {
                    mapDtoToExpense(dto, expense, user);
                    validateExpense(expense);
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

    // Get all expenses for a specific employee, only for the dentist
public List<Expense> getExpensesByEmployee(Long employeeId, User dentist) {
    Employee employee = employeeRepository.findById(employeeId)
            .orElseThrow(() -> new RuntimeException("Employee not found"));

    // Ensure the employee belongs to this dentist
    if (!employee.getDentist().getId().equals(dentist.getId())) {
        throw new RuntimeException("You are not authorized to view this employee's expenses");
    }

    return expenseRepository.findByEmployeeAndCreatedBy(employee, dentist);
}

    // Map Expense to DTO
    public ExpenseResponseDTO toDTO(Expense expense) {
        return new ExpenseResponseDTO(
                expense.getId(),
                expense.getTitle(),
                expense.getAmount(),
                expense.getCategory(),
                expense.getDate(),
                expense.getDescription(),
                expense.getEmployee() != null ? expense.getEmployee().getId() : null
        );
    }

    // --- Helpers ---
    private void mapDtoToExpense(ExpenseRequestDTO dto, Expense expense, User user) {
        expense.setTitle(dto.getTitle());
        expense.setAmount(dto.getAmount());
        expense.setCategory(dto.getCategory());
        expense.setDate(dto.getDate() != null ? dto.getDate() : java.time.LocalDate.now());
        expense.setDescription(dto.getDescription());
        expense.setCreatedBy(user);

        if (dto.getEmployeeId() != null) {
            Employee employee = employeeRepository.findById(dto.getEmployeeId())
                    .orElseThrow(() -> new RuntimeException("Employee not found"));
            expense.setEmployee(employee);
        } else {
            expense.setEmployee(null);
        }
    }

    private void validateExpense(Expense expense) {
        if (expense.getCategory() == ExpenseCategory.SALARY && expense.getEmployee() == null) {
            throw new IllegalArgumentException("Employee must be specified for SALARY expenses");
        }
    }
}
