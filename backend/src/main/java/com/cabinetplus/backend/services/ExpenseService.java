package com.cabinetplus.backend.services;

import java.util.List;
import java.util.Optional;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.ExpenseRequestDTO;
import com.cabinetplus.backend.dto.ExpenseResponseDTO;
import com.cabinetplus.backend.enums.ExpenseCategory;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.NotFoundException;
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
        return expenseRepository.save(expense);
    }

    // Update expense
    public Expense updateExpense(Long id, ExpenseRequestDTO dto, User user) {
        return expenseRepository.findByIdAndCreatedBy(id, user)
                .map(expense -> {
                    mapDtoToExpense(dto, expense, user);
                    return expenseRepository.save(expense);
                })
                .orElseThrow(() -> new NotFoundException("Depense introuvable"));
    }

    // Delete expense
    public void deleteExpense(Long id, User user) {
        Expense expense = expenseRepository.findByIdAndCreatedBy(id, user)
                .orElseThrow(() -> new NotFoundException("Depense introuvable"));
        expenseRepository.delete(expense);
    }

    // Get all expenses for a specific employee, only for the dentist
public List<Expense> getExpensesByEmployee(Long employeeId, User dentist) {
    Employee employee = employeeRepository.findById(employeeId)
            .orElseThrow(() -> new NotFoundException("Employe introuvable"));

    // Ensure the employee belongs to this dentist
    if (!employee.getDentist().getId().equals(dentist.getId())) {
        throw new AccessDeniedException("Vous n'etes pas autorise a voir les depenses de cet employe");
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
        Double amount = dto.getAmount();
        if (amount == null || amount <= 0) {
            throw new BadRequestException(java.util.Map.of("amount", "Le montant doit etre superieur a 0"));
        }
        expense.setAmount(amount);
        expense.setCategory(dto.getCategory());
        expense.setDate(dto.getDate() != null ? dto.getDate() : java.time.LocalDate.now());
        expense.setDescription(dto.getDescription());
        expense.setCreatedBy(user);

        ExpenseCategory category = dto.getCategory();
        Long employeeId = dto.getEmployeeId();

        if (category == ExpenseCategory.SALARY) {
            if (employeeId == null) {
                throw new BadRequestException(java.util.Map.of("employeeId", "Selectionnez un employe pour une depense SALARY"));
            }

            Employee employee = employeeRepository.findById(employeeId)
                    .orElseThrow(() -> new NotFoundException("Employe introuvable"));
            if (employee.getDentist() == null || employee.getDentist().getId() == null
                    || !employee.getDentist().getId().equals(user.getId())) {
                throw new AccessDeniedException("Vous n'etes pas autorise a utiliser cet employe");
            }
            expense.setEmployee(employee);
        } else {
            if (employeeId != null) {
                throw new BadRequestException(java.util.Map.of("employeeId", "Le champ employe est reserve aux depenses SALARY"));
            }
            expense.setEmployee(null);
        }
    }

}
