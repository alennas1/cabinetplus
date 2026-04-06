package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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

import com.cabinetplus.backend.dto.CancellationRequest;
import com.cabinetplus.backend.dto.ExpenseRequestDTO;
import com.cabinetplus.backend.dto.ExpenseResponseDTO;
import com.cabinetplus.backend.dto.MonthlyExpenseTotalDTO;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Expense;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.CancellationSecurityService;
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
    private final CancellationSecurityService cancellationSecurityService;

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

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Sort sort = Sort.by(Sort.Direction.DESC, "date").and(Sort.by(Sort.Direction.DESC, "id"));
        PageRequest pageable = PageRequest.of(safePage, safeSize, sort);

        var paged = expenseService.searchExpensesForUser(user, q, field, pageable);
        List<ExpenseResponseDTO> items = paged.getContent().stream().map(expenseService::toDTO).toList();

        auditService.logSuccess(AuditEventType.EXPENSE_READ, "EXPENSE", null, "Depenses consultees (page)");
        return ResponseEntity.ok(new PageResponse<>(
                items,
                paged.getNumber(),
                paged.getSize(),
                paged.getTotalElements(),
                paged.getTotalPages()
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

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ExpenseResponseDTO> cancel(@PathVariable Long id, @Valid @RequestBody CancellationRequest payload, Principal principal) {
        User actor = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
        User clinicOwner = userService.resolveClinicOwner(actor);
        String reason = cancellationSecurityService.requirePinAndReason(actor, payload.pin(), payload.reason());

        Expense cancelled = expenseService.cancelExpense(id, clinicOwner, actor, reason);
        auditService.logSuccess(
                AuditEventType.EXPENSE_CANCEL,
                "EXPENSE",
                String.valueOf(cancelled.getId()),
                "Depense annulee. Motif: " + reason
        );
        return ResponseEntity.ok(expenseService.toDTO(cancelled));
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
         @RequestParam(name = "limit", defaultValue = "200") int limit,
         Principal principal) {

    User dentist = getClinicUser(principal);
    Long internalEmployeeId = publicIdResolutionService.requireEmployeeOwnedBy(employeeId, dentist).getId();

    int safeLimit = Math.min(Math.max(limit, 1), 1000);
    Sort sort = Sort.by(Sort.Direction.DESC, "date").and(Sort.by(Sort.Direction.DESC, "id"));
    PageRequest pageable = PageRequest.of(0, safeLimit, sort);

    auditService.logSuccess(AuditEventType.EXPENSE_READ, "EMPLOYEE", String.valueOf(internalEmployeeId), "Dépenses employé consultées");
    List<ExpenseResponseDTO> dtos = expenseService.getExpensesByEmployeePage(internalEmployeeId, dentist, pageable)
            .getContent()
            .stream()
            .map(expenseService::toDTO)
            .toList();

     return ResponseEntity.ok(dtos);
 }

    @GetMapping("/employee/{employeeId}/paged")
    public ResponseEntity<PageResponse<ExpenseResponseDTO>> getByEmployeePaged(
            @PathVariable String employeeId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size,
            @RequestParam(name = "sortKey", required = false) String sortKey,
            @RequestParam(name = "sortDirection", required = false) String sortDirection,
            Principal principal
    ) {
        User dentist = getClinicUser(principal);
        Long internalEmployeeId = publicIdResolutionService.requireEmployeeOwnedBy(employeeId, dentist).getId();

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        boolean desc = "desc".equalsIgnoreCase(sortDirection);
        String sortKeyNorm = sortKey != null ? sortKey.trim().toLowerCase() : "";

        Sort.Direction direction = desc ? Sort.Direction.DESC : Sort.Direction.ASC;
        Sort sort = switch (sortKeyNorm) {
            case "title" -> Sort.by(direction, "title");
            case "amount" -> Sort.by(direction, "amount");
            case "date" -> Sort.by(direction, "date");
            default -> Sort.by(Sort.Direction.DESC, "date");
        };
        sort = sort.and(Sort.by(Sort.Direction.DESC, "id"));

        PageRequest pageable = PageRequest.of(safePage, safeSize, sort);
        var paged = expenseService.getExpensesByEmployeePage(internalEmployeeId, dentist, pageable);
        List<ExpenseResponseDTO> items = paged.getContent().stream().map(expenseService::toDTO).toList();

        auditService.logSuccess(
                AuditEventType.EXPENSE_READ,
                "EMPLOYEE",
                String.valueOf(internalEmployeeId),
                "Depenses employe consultees (page)"
        );

        return ResponseEntity.ok(new PageResponse<>(
                items,
                paged.getNumber(),
                paged.getSize(),
                paged.getTotalElements(),
                paged.getTotalPages()
        ));
    }

    @GetMapping("/employee/{employeeId}/monthly-totals")
    public ResponseEntity<List<MonthlyExpenseTotalDTO>> getEmployeeMonthlyTotals(
            @PathVariable String employeeId,
            Principal principal
    ) {
        User dentist = getClinicUser(principal);
        Long internalEmployeeId = publicIdResolutionService.requireEmployeeOwnedBy(employeeId, dentist).getId();
        List<MonthlyExpenseTotalDTO> totals = expenseService.getEmployeeMonthlyTotals(internalEmployeeId, dentist);
        auditService.logSuccess(
                AuditEventType.EXPENSE_READ,
                "EMPLOYEE",
                String.valueOf(internalEmployeeId),
                "Depenses employe (mensuel) consultees"
        );
        return ResponseEntity.ok(totals);
    }

private User getClinicUser(Principal principal) {
    User user = userService.findByPhoneNumber(principal.getName())
            .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
    return userService.resolveClinicOwner(user);
}
}

