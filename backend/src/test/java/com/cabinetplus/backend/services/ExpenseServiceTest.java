package com.cabinetplus.backend.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import com.cabinetplus.backend.dto.ExpenseRequestDTO;
import com.cabinetplus.backend.enums.ExpenseCategory;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Employee;
import com.cabinetplus.backend.models.Expense;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.EmployeeRepository;
import com.cabinetplus.backend.repositories.ExpenseRepository;

class ExpenseServiceTest {

    private ExpenseRepository expenseRepository;
    private EmployeeRepository employeeRepository;
    private ExpenseService expenseService;

    @BeforeEach
    void setUp() {
        expenseRepository = mock(ExpenseRepository.class);
        employeeRepository = mock(EmployeeRepository.class);
        expenseService = new ExpenseService(expenseRepository, employeeRepository);
    }

    @Test
    void createExpenseWhenAmountNonPositiveThrows400() {
        User dentist = new User();
        dentist.setId(1L);

        ExpenseRequestDTO dto = new ExpenseRequestDTO("Title", 0.0, ExpenseCategory.SUPPLIES, null, null, null);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> expenseService.createExpense(dto, dentist));
        assertEquals("Le montant doit etre superieur a 0", ex.getFieldErrors().get("amount"));
    }

    @Test
    void createExpenseWhenSalaryMissingEmployeeThrows400() {
        User dentist = new User();
        dentist.setId(1L);

        ExpenseRequestDTO dto = new ExpenseRequestDTO("Salaire", 10.0, ExpenseCategory.SALARY, null, null, null);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> expenseService.createExpense(dto, dentist));
        assertEquals("Selectionnez un employe pour une depense SALARY", ex.getFieldErrors().get("employeeId"));
    }

    @Test
    void createExpenseWhenNonSalaryHasEmployeeThrows400() {
        User dentist = new User();
        dentist.setId(1L);

        ExpenseRequestDTO dto = new ExpenseRequestDTO("Ok", 10.0, ExpenseCategory.SUPPLIES, null, null, 5L);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> expenseService.createExpense(dto, dentist));
        assertEquals("Le champ employe est reserve aux depenses SALARY", ex.getFieldErrors().get("employeeId"));
    }

    @Test
    void createExpenseWhenSalaryEmployeeNotFoundThrows404() {
        User dentist = new User();
        dentist.setId(1L);

        ExpenseRequestDTO dto = new ExpenseRequestDTO("Salaire", 10.0, ExpenseCategory.SALARY, null, null, 99L);

        when(employeeRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> expenseService.createExpense(dto, dentist));
    }

    @Test
    void createExpenseWhenSalaryEmployeeNotOwnedThrows403() {
        User dentist = new User();
        dentist.setId(1L);

        User other = new User();
        other.setId(2L);

        Employee employee = new Employee();
        employee.setId(5L);
        employee.setDentist(other);

        ExpenseRequestDTO dto = new ExpenseRequestDTO("Salaire", 10.0, ExpenseCategory.SALARY, null, null, 5L);

        when(employeeRepository.findById(5L)).thenReturn(Optional.of(employee));

        assertThrows(AccessDeniedException.class, () -> expenseService.createExpense(dto, dentist));
    }

    @Test
    void createExpenseSuccessPersistsExpense() {
        User dentist = new User();
        dentist.setId(1L);

        ExpenseRequestDTO dto = new ExpenseRequestDTO("Ok", 10.0, ExpenseCategory.SUPPLIES, null, "desc", null);

        when(expenseRepository.save(any(Expense.class))).thenAnswer(inv -> inv.getArgument(0));

        Expense saved = expenseService.createExpense(dto, dentist);
        assertEquals("Ok", saved.getTitle());
        assertEquals(10.0, saved.getAmount());
        assertEquals(ExpenseCategory.SUPPLIES, saved.getCategory());
        assertEquals("desc", saved.getDescription());
        assertEquals(dentist, saved.getCreatedBy());
    }
}

