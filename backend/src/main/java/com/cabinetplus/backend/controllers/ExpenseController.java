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
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Expense;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.ExpenseService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;
    private final UserService userService;
    private final PublicIdResolutionService publicIdResolutionService;
    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<List<ExpenseResponseDTO>> getAll(Principal principal) {
        User user = getClinicUser(principal);

        List<ExpenseResponseDTO> dtos = expenseService.getExpensesForUser(user)
                .stream()
                .map(expenseService::toDTO)
                .toList();

        auditService.logSuccess(AuditEventType.EXPENSE_READ, "EXPENSE", null, "Dépenses consultées");
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExpenseResponseDTO> getById(@PathVariable Long id, Principal principal) {
        User user = getClinicUser(principal);

        Expense expense = expenseService.getExpenseByIdForUser(id, user)
                .orElseThrow(() -> new NotFoundException("Depense introuvable"));
        auditService.logSuccess(AuditEventType.EXPENSE_READ, "EXPENSE", String.valueOf(expense.getId()), "Dépense consultée");
        return ResponseEntity.ok(expenseService.toDTO(expense));
    }

    @PostMapping
    public ResponseEntity<ExpenseResponseDTO> create(@RequestBody @Valid ExpenseRequestDTO dto, Principal principal) {
        User user = getClinicUser(principal);

        Expense expense = expenseService.createExpense(dto, user);
        auditService.logSuccess(AuditEventType.EXPENSE_CREATE, "EXPENSE", String.valueOf(expense.getId()), "Dépense créée");
        return ResponseEntity.ok(expenseService.toDTO(expense));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExpenseResponseDTO> update(@PathVariable Long id,
                                                     @RequestBody @Valid ExpenseRequestDTO dto,
                                                     Principal principal) {
        User user = getClinicUser(principal);

        Expense expense = expenseService.updateExpense(id, dto, user);
        auditService.logSuccess(AuditEventType.EXPENSE_UPDATE, "EXPENSE", String.valueOf(expense.getId()), "Dépense modifiée");
        return ResponseEntity.ok(expenseService.toDTO(expense));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        User user = getClinicUser(principal);

        expenseService.deleteExpense(id, user);
        auditService.logSuccess(AuditEventType.EXPENSE_DELETE, "EXPENSE", String.valueOf(id), "Dépense supprimée");
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/employee/{employeeId}")
public ResponseEntity<List<ExpenseResponseDTO>> getByEmployee(
        @PathVariable String employeeId,
        Principal principal) {

    User dentist = getClinicUser(principal);
    Long internalEmployeeId = publicIdResolutionService.requireEmployeeOwnedBy(employeeId, dentist).getId();

    auditService.logSuccess(AuditEventType.EXPENSE_READ, "EMPLOYEE", String.valueOf(internalEmployeeId), "Dépenses employé consultées");
    List<ExpenseResponseDTO> dtos = expenseService
            .getExpensesByEmployee(internalEmployeeId, dentist) // service method we discussed
            .stream()
            .map(expenseService::toDTO)
            .toList();

    return ResponseEntity.ok(dtos);
}

private User getClinicUser(Principal principal) {
    User user = userService.findByPhoneNumber(principal.getName())
            .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
    return userService.resolveClinicOwner(user);
}
}

