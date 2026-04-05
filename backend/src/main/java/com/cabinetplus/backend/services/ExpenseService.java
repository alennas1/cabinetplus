package com.cabinetplus.backend.services;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.ExpenseRequestDTO;
import com.cabinetplus.backend.dto.ExpenseResponseDTO;
import com.cabinetplus.backend.dto.MonthlyExpenseTotalDTO;
import com.cabinetplus.backend.enums.ExpenseCategory;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Employee;
import com.cabinetplus.backend.models.Expense;
import com.cabinetplus.backend.models.Fournisseur;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.EmployeeRepository;
import com.cabinetplus.backend.repositories.ExpenseRepository;
import com.cabinetplus.backend.repositories.FournisseurRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final EmployeeRepository employeeRepository;
    private final FournisseurRepository fournisseurRepository;

    // Get all expenses for a user
    public List<Expense> getExpensesForUser(User user) {
        return expenseRepository.findByCreatedBy(user);
    }

    public Page<Expense> searchExpensesForUser(User user, String q, String field, Pageable pageable) {
        if (user == null) {
            return Page.empty(pageable);
        }

        String qNorm = q != null ? q.trim().toLowerCase() : "";
        String qLike = qNorm.isBlank() ? "" : ("%" + qNorm + "%");
        String fieldKey = field != null ? field.trim() : "";

        Double amountExact = null;
        if (!qNorm.isBlank()) {
            try {
                amountExact = Double.valueOf(qNorm.replace(",", "."));
            } catch (Exception ignored) {
                amountExact = null;
            }
        }

        java.time.LocalDate dateExact = null;
        if (!qNorm.isBlank()) {
            try {
                dateExact = java.time.LocalDate.parse(qNorm);
            } catch (Exception ignored) {
                dateExact = null;
            }
        }

        // Only allow a known set of field names (prevents accidental JPQL changes and matches frontend keys).
        String safeFieldKey = switch (fieldKey) {
            case "title", "description", "category", "fournisseurName", "amount", "date" -> fieldKey;
            default -> "";
        };

        return expenseRepository.searchByDentist(user, qLike, safeFieldKey, amountExact, dateExact, pageable);
    }

    public List<Expense> getExpensesByFournisseur(Long fournisseurId, User dentist) {
        if (fournisseurId == null) return List.of();
        return expenseRepository.findByFournisseur_IdAndCreatedByOrderByDateDesc(fournisseurId, dentist);
    }

    public double getTotalAmountByFournisseur(Long fournisseurId, User dentist) {
        if (fournisseurId == null) return 0.0;
        return expenseRepository.sumAmountByFournisseur(dentist, fournisseurId).orElse(0.0);
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

    public Expense cancelExpense(Long id, User dentist, User actor, String reason) {
        if (id == null) throw new NotFoundException("Depense introuvable");
        Expense expense = expenseRepository.findByIdAndCreatedBy(id, dentist)
                .orElseThrow(() -> new NotFoundException("Depense introuvable"));

        if (expense.getRecordStatus() == RecordStatus.CANCELLED) {
            return expense;
        }

        expense.setRecordStatus(RecordStatus.CANCELLED);
        expense.setCancelledAt(java.time.LocalDateTime.now());
        expense.setCancelledBy(actor);
        expense.setCancelReason(reason);
        return expenseRepository.save(expense);
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

    public Page<Expense> getExpensesByEmployeePage(Long employeeId, User dentist, Pageable pageable) {
        if (employeeId == null) {
            return Page.empty(pageable);
        }
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new NotFoundException("Employe introuvable"));

        if (employee.getDentist() == null || employee.getDentist().getId() == null
                || dentist == null || dentist.getId() == null
                || !employee.getDentist().getId().equals(dentist.getId())) {
            throw new AccessDeniedException("Vous n'etes pas autorise a voir les depenses de cet employe");
        }

        return expenseRepository.findByEmployeeAndDentist(employee, dentist, pageable);
    }

    public List<MonthlyExpenseTotalDTO> getEmployeeMonthlyTotals(Long employeeId, User dentist) {
        if (employeeId == null) {
            return List.of();
        }
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new NotFoundException("Employe introuvable"));

        if (employee.getDentist() == null || employee.getDentist().getId() == null
                || dentist == null || dentist.getId() == null
                || !employee.getDentist().getId().equals(dentist.getId())) {
            throw new AccessDeniedException("Vous n'etes pas autorise a voir les depenses de cet employe");
        }

        return expenseRepository.sumEmployeeMonthlyTotals(employee, dentist).stream()
                .map(row -> {
                    if (row == null || row.length < 3) return null;
                    int year = row[0] instanceof Number n ? n.intValue() : 0;
                    int month = row[1] instanceof Number n ? n.intValue() : 0;
                    Double total = row[2] instanceof Number n ? n.doubleValue() : 0.0;
                    return new MonthlyExpenseTotalDTO(year, month, total);
                })
                .filter(v -> v != null && v.getYear() > 0 && v.getMonth() > 0)
                .toList();
    }

    // Map Expense to DTO
    public ExpenseResponseDTO toDTO(Expense expense) {
        String createdByName = null;
        if (expense.getCreatedBy() != null) {
            String first = expense.getCreatedBy().getFirstname() != null ? expense.getCreatedBy().getFirstname().trim() : "";
            String last = expense.getCreatedBy().getLastname() != null ? expense.getCreatedBy().getLastname().trim() : "";
            String combined = (first + " " + last).trim();
            createdByName = combined.isBlank() ? null : combined;
        }

        String cancelledByName = null;
        if (expense.getCancelledBy() != null) {
            String first = expense.getCancelledBy().getFirstname() != null ? expense.getCancelledBy().getFirstname().trim() : "";
            String last = expense.getCancelledBy().getLastname() != null ? expense.getCancelledBy().getLastname().trim() : "";
            String combined = (first + " " + last).trim();
            cancelledByName = combined.isBlank() ? null : combined;
        }
        return new ExpenseResponseDTO(
                expense.getId(),
                expense.getTitle(),
                expense.getAmount(),
                expense.getCategory(),
                expense.getDate(),
                expense.getDescription(),
                expense.getOtherCategoryLabel(),
                expense.getFournisseur() != null ? expense.getFournisseur().getId() : null,
                expense.getFournisseur() != null ? expense.getFournisseur().getName() : null,
                expense.getEmployee() != null ? expense.getEmployee().getId() : null,
                createdByName,
                expense.getRecordStatus(),
                expense.getCancelledAt(),
                cancelledByName,
                expense.getCancelReason()
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

        // Date is server-generated for traceability:
        // - on create: set to today
        // - on update: keep the original date (do not accept client edits)
        if (expense.getId() == null) {
            expense.setDate(java.time.LocalDate.now());
        } else if (expense.getDate() == null) {
            expense.setDate(java.time.LocalDate.now());
        }

        expense.setDescription(dto.getDescription());
        expense.setCreatedBy(user);

        ExpenseCategory category = dto.getCategory();
        Long employeeId = dto.getEmployeeId();
        Long fournisseurId = dto.getFournisseurId();
        String otherCategoryLabel = dto.getOtherCategoryLabel();

        if (category == ExpenseCategory.OTHER) {
            String cleaned = otherCategoryLabel == null ? "" : otherCategoryLabel.trim();
            if (cleaned.isEmpty()) {
                throw new BadRequestException(java.util.Map.of("otherCategoryLabel", "Precisez la categorie (Autre)."));
            }
            expense.setOtherCategoryLabel(cleaned);
        } else {
            if (otherCategoryLabel != null && !otherCategoryLabel.trim().isEmpty()) {
                throw new BadRequestException(java.util.Map.of("otherCategoryLabel", "Le libelle n'est autorise que pour la categorie OTHER."));
            }
            expense.setOtherCategoryLabel(null);
        }

        Fournisseur fournisseur = null;
        if (fournisseurId != null) {
            fournisseur = fournisseurRepository.findByIdAndCreatedBy(fournisseurId, user)
                    .orElseThrow(() -> new BadRequestException(java.util.Map.of("fournisseurId", "Fournisseur introuvable")));
        }
        expense.setFournisseur(fournisseur);

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
