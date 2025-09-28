package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.ExpenseRequestDTO;
import com.cabinetplus.backend.dto.ExpenseResponseDTO;
import com.cabinetplus.backend.models.Expense;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.ExpenseService;
import com.cabinetplus.backend.services.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<ExpenseResponseDTO>> getAll(Principal principal) {
        User user = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<ExpenseResponseDTO> dtos = expenseService.getExpensesForUser(user)
                .stream()
                .map(expenseService::toDTO)
                .toList();

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExpenseResponseDTO> getById(@PathVariable Long id, Principal principal) {
        User user = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return expenseService.getExpenseByIdForUser(id, user)
                .map(expenseService::toDTO)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ExpenseResponseDTO> create(@RequestBody ExpenseRequestDTO dto, Principal principal) {
        User user = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Expense expense = expenseService.createExpense(dto, user);
        return ResponseEntity.ok(expenseService.toDTO(expense));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExpenseResponseDTO> update(@PathVariable Long id,
                                                     @RequestBody ExpenseRequestDTO dto,
                                                     Principal principal) {
        User user = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Expense expense = expenseService.updateExpense(id, dto, user);
        return ResponseEntity.ok(expenseService.toDTO(expense));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        User user = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        expenseService.deleteExpense(id, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/employee/{employeeId}")
public ResponseEntity<List<ExpenseResponseDTO>> getByEmployee(
        @PathVariable Long employeeId,
        Principal principal) {

    User dentist = userService.findByUsername(principal.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));

    List<ExpenseResponseDTO> dtos = expenseService
            .getExpensesByEmployee(employeeId, dentist) // service method we discussed
            .stream()
            .map(expenseService::toDTO)
            .toList();

    return ResponseEntity.ok(dtos);
}
}
