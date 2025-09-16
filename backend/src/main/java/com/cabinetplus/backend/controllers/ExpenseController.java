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
        System.out.println("GET /api/expenses called. Principal: " + principal);

        User user = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        System.out.println("User found: " + user.getUsername());

        List<ExpenseResponseDTO> dtos = expenseService.getExpensesForUser(user)
                .stream()
                .map(expenseService::toDTO)
                .toList();

        System.out.println("Expenses fetched: " + dtos.size());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExpenseResponseDTO> getById(@PathVariable Long id, Principal principal) {
        System.out.println("GET /api/expenses/" + id + " called. Principal: " + principal);

        User user = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        System.out.println("User found: " + user.getUsername());

        return expenseService.getExpenseByIdForUser(id, user)
                .map(expenseService::toDTO)
                .map(dto -> {
                    System.out.println("Expense found: " + dto.getTitle());
                    return ResponseEntity.ok(dto);
                })
                .orElseGet(() -> {
                    System.out.println("Expense not found: " + id);
                    return ResponseEntity.notFound().build();
                });
    }

    @PostMapping
    public ResponseEntity<ExpenseResponseDTO> create(@RequestBody ExpenseRequestDTO dto, Principal principal) {
        System.out.println("POST /api/expenses called. Principal: " + principal);

        User user = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        System.out.println("User creating expense: " + user.getUsername());

        Expense expense = expenseService.createExpense(dto, user);
        System.out.println("Expense created: " + expense.getTitle());
        return ResponseEntity.ok(expenseService.toDTO(expense));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExpenseResponseDTO> update(@PathVariable Long id,
                                                     @RequestBody ExpenseRequestDTO dto,
                                                     Principal principal) {
        System.out.println("PUT /api/expenses/" + id + " called. Principal: " + principal);

        User user = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        System.out.println("User updating expense: " + user.getUsername());

        Expense expense = expenseService.updateExpense(id, dto, user);
        System.out.println("Expense updated: " + expense.getTitle());
        return ResponseEntity.ok(expenseService.toDTO(expense));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        System.out.println("DELETE /api/expenses/" + id + " called. Principal: " + principal);

        User user = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        System.out.println("User deleting expense: " + user.getUsername());

        expenseService.deleteExpense(id, user);
        System.out.println("Expense deleted: " + id);
        return ResponseEntity.noContent().build();
    }
}
