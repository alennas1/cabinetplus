package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.Comparator;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.ExpenseRequestDTO;
import com.cabinetplus.backend.dto.ExpenseResponseDTO;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Expense;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.ExpenseService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;
import com.cabinetplus.backend.util.PaginationUtil;

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

    @GetMapping("/paged")
    public ResponseEntity<PageResponse<ExpenseResponseDTO>> getPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "field", required = false) String field,
            Principal principal
    ) {
        User user = getClinicUser(principal);

        String qNorm = q != null ? q.trim().toLowerCase() : "";
        String fieldNorm = field != null ? field.trim() : "";

        List<Expense> all = expenseService.getExpensesForUser(user);
        List<Expense> filtered = (all == null ? List.<Expense>of() : all).stream()
                .filter(e -> matchesExpense(e, qNorm, fieldNorm))
                .sorted(Comparator
                        .comparing(Expense::getDate, Comparator.nullsLast(Comparator.naturalOrder())).reversed()
                        .thenComparing(Expense::getId, Comparator.nullsLast(Comparator.naturalOrder())).reversed()
                )
                .toList();

        PageResponse<Expense> pageResponse = PaginationUtil.toPageResponse(filtered, page, size);
        List<ExpenseResponseDTO> items = pageResponse.items().stream().map(expenseService::toDTO).toList();

        auditService.logSuccess(AuditEventType.EXPENSE_READ, "EXPENSE", null, "Depenses consultees (page)");
        return ResponseEntity.ok(new PageResponse<>(
                items,
                pageResponse.page(),
                pageResponse.size(),
                pageResponse.totalElements(),
                pageResponse.totalPages()
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExpenseResponseDTO> getById(@PathVariable Long id, Principal principal) {
        if (id != null) {
            // Strict no-delete policy: expenses are immutable history.
            return ResponseEntity.status(org.springframework.http.HttpStatus.METHOD_NOT_ALLOWED).build();
        }

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

    private static boolean matchesExpense(Expense expense, String qNorm, String field) {
        if (expense == null) return false;
        if (qNorm == null || qNorm.isBlank()) return true;

        String safeField = field != null ? field.trim() : "";
        String title = safeLower(expense.getTitle());
        String desc = safeLower(expense.getDescription());
        String category = expense.getCategory() != null ? expense.getCategory().name().toLowerCase() : "";
        String otherCategoryLabel = safeLower(expense.getOtherCategoryLabel());
        String fournisseurName = expense.getFournisseur() != null ? safeLower(expense.getFournisseur().getName()) : "";
        String amount = expense.getAmount() != null ? String.valueOf(expense.getAmount()) : "";
        String date = expense.getDate() != null ? expense.getDate().toString().toLowerCase() : "";

        return switch (safeField) {
            case "title" -> title.contains(qNorm);
            case "category" -> category.contains(qNorm) || otherCategoryLabel.contains(qNorm);
            case "fournisseurName" -> fournisseurName.contains(qNorm);
            case "amount" -> amount.contains(qNorm);
            case "date" -> date.contains(qNorm);
            case "description" -> desc.contains(qNorm);
            default -> title.contains(qNorm)
                    || desc.contains(qNorm)
                    || category.contains(qNorm)
                    || otherCategoryLabel.contains(qNorm)
                    || fournisseurName.contains(qNorm)
                    || amount.contains(qNorm)
                    || date.contains(qNorm);
        };
    }

    private static String safeLower(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

private User getClinicUser(Principal principal) {
    User user = userService.findByPhoneNumber(principal.getName())
            .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
    return userService.resolveClinicOwner(user);
}
}

