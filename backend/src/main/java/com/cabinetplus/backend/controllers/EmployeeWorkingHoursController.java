package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.EmployeeWorkingHoursCreateRequest;
import com.cabinetplus.backend.dto.EmployeeWorkingHoursUpdateRequest;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.Employee;
import com.cabinetplus.backend.models.EmployeeWorkingHours;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.EmployeeWorkingHoursService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;
import com.cabinetplus.backend.util.PaginationUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/working-hours")
@RequiredArgsConstructor
public class EmployeeWorkingHoursController {

    private final EmployeeWorkingHoursService workingHoursService;
    private final UserService userService;
    private final PublicIdResolutionService publicIdResolutionService;
    private final AuditService auditService;

    // --- Get All for dentist ---
    @GetMapping
    public ResponseEntity<List<EmployeeWorkingHours>> getAll(Principal principal) {
        User dentist = getClinicUser(principal);
        auditService.logSuccess(AuditEventType.EMPLOYEE_WORKING_HOURS_READ, "EMPLOYEE_WORKING_HOURS", null, "Horaires employes consultes");

        return ResponseEntity.ok(workingHoursService.getAllForDentist(dentist));
    }

    @GetMapping("/paged")
    public ResponseEntity<PageResponse<EmployeeWorkingHours>> getAllPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "50") int size,
            Principal principal
    ) {
        User dentist = getClinicUser(principal);
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 200);

        Sort sort = Sort.by(Sort.Direction.ASC, "employee.id")
                .and(Sort.by(Sort.Direction.ASC, "dayOfWeek"))
                .and(Sort.by(Sort.Direction.ASC, "startTime"))
                .and(Sort.by(Sort.Direction.ASC, "id"));

        var paged = workingHoursService.getAllForDentistPaged(dentist, PageRequest.of(safePage, safeSize, sort));
        auditService.logSuccess(AuditEventType.EMPLOYEE_WORKING_HOURS_READ, "EMPLOYEE_WORKING_HOURS", null, "Horaires employes consultes (page)");
        return ResponseEntity.ok(PaginationUtil.toPageResponse(paged));
    }

    // --- Get by employee ---
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<EmployeeWorkingHours>> getByEmployee(
            @PathVariable String employeeId,
            Principal principal
    ) {
        User dentist = getClinicUser(principal);
        Long internalEmployeeId = publicIdResolutionService.requireEmployeeOwnedBy(employeeId, dentist).getId();
        auditService.logSuccess(AuditEventType.EMPLOYEE_WORKING_HOURS_READ, "EMPLOYEE", String.valueOf(internalEmployeeId), "Horaires employe consultes");

        return ResponseEntity.ok(workingHoursService.getByEmployee(internalEmployeeId, dentist));
    }

    @GetMapping("/employee/{employeeId}/paged")
    public ResponseEntity<PageResponse<EmployeeWorkingHours>> getByEmployeePaged(
            @PathVariable String employeeId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "50") int size,
            Principal principal
    ) {
        User dentist = getClinicUser(principal);
        Long internalEmployeeId = publicIdResolutionService.requireEmployeeOwnedBy(employeeId, dentist).getId();
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 200);
        Sort sort = Sort.by(Sort.Direction.ASC, "dayOfWeek")
                .and(Sort.by(Sort.Direction.ASC, "startTime"))
                .and(Sort.by(Sort.Direction.ASC, "id"));
        var paged = workingHoursService.getByEmployeePaged(internalEmployeeId, dentist, PageRequest.of(safePage, safeSize, sort));
        auditService.logSuccess(AuditEventType.EMPLOYEE_WORKING_HOURS_READ, "EMPLOYEE", String.valueOf(internalEmployeeId), "Horaires employe consultes (page)");
        return ResponseEntity.ok(PaginationUtil.toPageResponse(paged));
    }

    // --- Get by employee & day ---
    @GetMapping("/employee/{employeeId}/day/{day}")
    public ResponseEntity<List<EmployeeWorkingHours>> getByEmployeeAndDay(
            @PathVariable String employeeId,
            @PathVariable DayOfWeek day,
            Principal principal
    ) {
        User dentist = getClinicUser(principal);
        Long internalEmployeeId = publicIdResolutionService.requireEmployeeOwnedBy(employeeId, dentist).getId();
        auditService.logSuccess(AuditEventType.EMPLOYEE_WORKING_HOURS_READ, "EMPLOYEE", String.valueOf(internalEmployeeId), "Horaires employe (jour) consultes");

        return ResponseEntity.ok(workingHoursService.getByEmployeeAndDay(internalEmployeeId, day, dentist));
    }

    // --- Create ---
    @PostMapping
    public ResponseEntity<EmployeeWorkingHours> create(
            @Valid @RequestBody EmployeeWorkingHoursCreateRequest request,
            Principal principal
    ) {
        User dentist = getClinicUser(principal);
        validateTimeRange(request.startTime(), request.endTime());

        Long internalEmployeeId = publicIdResolutionService.requireEmployeeOwnedBy(request.employeeId(), dentist).getId();
        Employee employee = new Employee();
        employee.setId(internalEmployeeId);

        EmployeeWorkingHours hours = new EmployeeWorkingHours();
        hours.setEmployee(employee);
        hours.setDayOfWeek(request.dayOfWeek());
        hours.setStartTime(request.startTime());
        hours.setEndTime(request.endTime());

        EmployeeWorkingHours saved = workingHoursService.save(hours, dentist);
        auditService.logSuccess(
                AuditEventType.EMPLOYEE_WORKING_HOURS_CREATE,
                "EMPLOYEE_WORKING_HOURS",
                saved != null && saved.getId() != null ? String.valueOf(saved.getId()) : null,
                "Horaire employé créé"
        );
        return ResponseEntity.ok(saved);
    }

    // --- Update ---
    @PutMapping("/{id}")
    public ResponseEntity<EmployeeWorkingHours> update(
            @PathVariable Long id,
            @Valid @RequestBody EmployeeWorkingHoursUpdateRequest request,
            Principal principal
    ) {
        User dentist = getClinicUser(principal);
        validateTimeRange(request.startTime(), request.endTime());

        EmployeeWorkingHours hours = new EmployeeWorkingHours();
        hours.setDayOfWeek(request.dayOfWeek());
        hours.setStartTime(request.startTime());
        hours.setEndTime(request.endTime());

        EmployeeWorkingHours updated = workingHoursService.update(id, hours, dentist);
        auditService.logSuccess(
                AuditEventType.EMPLOYEE_WORKING_HOURS_UPDATE,
                "EMPLOYEE_WORKING_HOURS",
                String.valueOf(id),
                "Horaire employé modifié"
        );
        return ResponseEntity.ok(updated);
    }

    // --- Delete ---
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            Principal principal
    ) {
        User dentist = getClinicUser(principal);

        workingHoursService.delete(id, dentist);
        auditService.logSuccess(
                AuditEventType.EMPLOYEE_WORKING_HOURS_DELETE,
                "EMPLOYEE_WORKING_HOURS",
                String.valueOf(id),
                "Horaire employé supprimé"
        );
        return ResponseEntity.noContent().build();
    }

    private User getClinicUser(Principal principal) {
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
    }

    private void validateTimeRange(LocalTime startTime, LocalTime endTime) {
        if (startTime == null && endTime == null) {
            return;
        }
        if (startTime == null) {
            throw new BadRequestException(Map.of("startTime", "Heure de debut obligatoire"));
        }
        if (endTime == null) {
            throw new BadRequestException(Map.of("endTime", "Heure de fin obligatoire"));
        }
        if (!endTime.isAfter(startTime)) {
            throw new BadRequestException(Map.of("endTime", "L'heure de fin doit etre apres l'heure de debut"));
        }
    }
}

