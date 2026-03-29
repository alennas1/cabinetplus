package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.dto.EmployeeRequestDTO;
import com.cabinetplus.backend.dto.EmployeeResponseDTO;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.EmployeeService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;
    private final UserService userService;
    private final PublicIdResolutionService publicIdResolutionService;
    private final AuditService auditService;

    @PostMapping
    public ResponseEntity<EmployeeResponseDTO> createEmployee(
            @Valid @RequestBody EmployeeRequestDTO dto,
            Principal principal) {

        User dentist = getClinicUser(principal);

        EmployeeResponseDTO employeeResponse = employeeService.saveEmployee(dto, dentist);
        auditService.logSuccess(
                AuditEventType.EMPLOYEE_CREATE,
                "EMPLOYEE",
                employeeResponse != null && employeeResponse.getId() != null ? String.valueOf(employeeResponse.getId()) : null,
                "Employé créé"
        );
        return ResponseEntity.ok(employeeResponse);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmployeeResponseDTO> updateEmployee(
            @PathVariable String id,
            @Valid @RequestBody EmployeeRequestDTO dto,
            Principal principal) {

        User dentist = getClinicUser(principal);

        Long internalEmployeeId = publicIdResolutionService.requireEmployeeOwnedBy(id, dentist).getId();
        EmployeeResponseDTO updated = employeeService.updateEmployee(internalEmployeeId, dto, dentist);
        auditService.logSuccess(AuditEventType.EMPLOYEE_UPDATE, "EMPLOYEE", String.valueOf(internalEmployeeId), "Employé modifié");
        return ResponseEntity.ok(updated);
    }

    @GetMapping
    public ResponseEntity<List<EmployeeResponseDTO>> getAllEmployees(Principal principal) {
        User dentist = getClinicUser(principal);
        auditService.logSuccess(AuditEventType.EMPLOYEE_READ, "EMPLOYEE", null, "Employés consultés");
        return ResponseEntity.ok(employeeService.getAllEmployeesForDentist(dentist));
    }

    @GetMapping("/archived")
    public ResponseEntity<List<EmployeeResponseDTO>> getArchivedEmployees(Principal principal) {
        User dentist = getClinicUser(principal);
        auditService.logSuccess(AuditEventType.EMPLOYEE_READ, "EMPLOYEE", null, "Employés archivés consultés");
        return ResponseEntity.ok(employeeService.getArchivedEmployeesForDentist(dentist));
    }

    @GetMapping("/paged")
    public ResponseEntity<PageResponse<EmployeeResponseDTO>> getEmployeesPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "sortKey", required = false) String sortKey,
            @RequestParam(name = "sortDirection", required = false) String sortDirection,
            Principal principal) {

        User dentist = getClinicUser(principal);

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        String sortKeyNorm = sortKey != null ? sortKey.trim().toLowerCase() : "";
        String sortDirNorm = sortDirection != null ? sortDirection.trim().toLowerCase() : "";
        boolean desc = "desc".equalsIgnoreCase(sortDirNorm);

        String sortProperty = switch (sortKeyNorm) {
            case "firstname", "first_name", "first" -> "firstName";
            case "lastname", "last_name", "last" -> "lastName";
            case "phone", "phonenumber", "phone_number" -> "phone";
            case "role", "accessrole", "access_role" -> "accessRole";
            case "status" -> "status";
            case "createdat", "created_at", "created" -> "createdAt";
            default -> "createdAt";
        };

        var pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by(desc ? Sort.Direction.DESC : Sort.Direction.ASC, sortProperty)
        );

        var employeesPage = employeeService.searchEmployeesForDentist(dentist, q != null ? q.trim() : "", pageable);
        var items = employeesPage.getContent().stream()
                .map(employeeService::toListResponse)
                .toList();

        auditService.logSuccess(AuditEventType.EMPLOYEE_READ, "EMPLOYEE", null, "EmployÃ©s consultÃ©s (page)");
        return ResponseEntity.ok(new PageResponse<>(
                items,
                employeesPage.getNumber(),
                employeesPage.getSize(),
                employeesPage.getTotalElements(),
                employeesPage.getTotalPages()
        ));
    }

    @GetMapping("/archived/paged")
    public ResponseEntity<PageResponse<EmployeeResponseDTO>> getArchivedEmployeesPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "sortKey", required = false) String sortKey,
            @RequestParam(name = "sortDirection", required = false) String sortDirection,
            Principal principal) {

        User dentist = getClinicUser(principal);

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        String sortKeyNorm = sortKey != null ? sortKey.trim().toLowerCase() : "";
        String sortDirNorm = sortDirection != null ? sortDirection.trim().toLowerCase() : "";
        boolean desc = "desc".equalsIgnoreCase(sortDirNorm);

        String sortProperty = switch (sortKeyNorm) {
            case "firstname", "first_name", "first" -> "firstName";
            case "lastname", "last_name", "last" -> "lastName";
            case "phone", "phonenumber", "phone_number" -> "phone";
            case "role", "accessrole", "access_role" -> "accessRole";
            case "status" -> "status";
            case "createdat", "created_at", "created" -> "createdAt";
            default -> "createdAt";
        };

        var pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by(desc ? Sort.Direction.DESC : Sort.Direction.ASC, sortProperty)
        );

        var employeesPage = employeeService.searchArchivedEmployeesForDentist(dentist, q != null ? q.trim() : "", pageable);
        var items = employeesPage.getContent().stream()
                .map(employeeService::toListResponse)
                .toList();

        auditService.logSuccess(AuditEventType.EMPLOYEE_READ, "EMPLOYEE", null, "Employés archivés consultés (page)");
        return ResponseEntity.ok(new PageResponse<>(
                items,
                employeesPage.getNumber(),
                employeesPage.getSize(),
                employeesPage.getTotalElements(),
                employeesPage.getTotalPages()
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmployeeResponseDTO> getEmployeeById(
            @PathVariable String id,
            Principal principal) {

        User dentist = getClinicUser(principal);

        Long internalEmployeeId = publicIdResolutionService.requireEmployeeOwnedBy(id, dentist).getId();
        return employeeService.getEmployeeByIdForDentist(internalEmployeeId, dentist)
                .map(employee -> {
                    auditService.logSuccess(AuditEventType.EMPLOYEE_READ, "EMPLOYEE", String.valueOf(internalEmployeeId), "Employé consulté");
                    return employee;
                })
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new NotFoundException("Employe introuvable"));
    }

    @PutMapping("/{id}/archive")
    public ResponseEntity<EmployeeResponseDTO> archiveEmployee(
            @PathVariable String id,
            Principal principal) {

        User dentist = getClinicUser(principal);
        Long internalEmployeeId = publicIdResolutionService.requireEmployeeOwnedBy(id, dentist).getId();
        employeeService.archiveEmployee(internalEmployeeId, dentist);
        auditService.logSuccess(AuditEventType.EMPLOYEE_ARCHIVE, "EMPLOYEE", String.valueOf(internalEmployeeId), "Employé archivé");
        return getEmployeeById(id, principal);
    }

    @PutMapping("/{id}/unarchive")
    public ResponseEntity<EmployeeResponseDTO> unarchiveEmployee(
            @PathVariable String id,
            Principal principal) {

        User dentist = getClinicUser(principal);
        Long internalEmployeeId = publicIdResolutionService.requireEmployeeOwnedBy(id, dentist).getId();
        employeeService.unarchiveEmployee(internalEmployeeId, dentist);
        auditService.logSuccess(AuditEventType.EMPLOYEE_UPDATE, "EMPLOYEE", String.valueOf(internalEmployeeId), "Employé désarchivé");
        return getEmployeeById(id, principal);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmployee(
            @PathVariable String id,
            Principal principal) {

        User dentist = getClinicUser(principal);

        Long internalEmployeeId = publicIdResolutionService.requireEmployeeOwnedBy(id, dentist).getId();
        employeeService.deleteEmployee(internalEmployeeId, dentist);
        auditService.logSuccess(AuditEventType.EMPLOYEE_ARCHIVE, "EMPLOYEE", String.valueOf(internalEmployeeId), "Employé archivé");
        return ResponseEntity.noContent().build();
    }

    private User getClinicUser(Principal principal) {
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
    }
}

