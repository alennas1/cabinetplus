package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.EmployeeWorkingHoursCreateRequest;
import com.cabinetplus.backend.dto.EmployeeWorkingHoursUpdateRequest;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.Employee;
import com.cabinetplus.backend.models.EmployeeWorkingHours;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.EmployeeWorkingHoursService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;
import lombok.RequiredArgsConstructor;
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

    // --- Get All for dentist ---
    @GetMapping
    public ResponseEntity<List<EmployeeWorkingHours>> getAll(Principal principal) {
        User dentist = getClinicUser(principal);

        return ResponseEntity.ok(workingHoursService.getAllForDentist(dentist));
    }

    // --- Get by employee ---
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<EmployeeWorkingHours>> getByEmployee(
            @PathVariable String employeeId,
            Principal principal
    ) {
        User dentist = getClinicUser(principal);
        Long internalEmployeeId = publicIdResolutionService.requireEmployeeOwnedBy(employeeId, dentist).getId();

        return ResponseEntity.ok(workingHoursService.getByEmployee(internalEmployeeId, dentist));
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

        return ResponseEntity.ok(workingHoursService.save(hours, dentist));
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

        return ResponseEntity.ok(workingHoursService.update(id, hours, dentist));
    }

    // --- Delete ---
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            Principal principal
    ) {
        User dentist = getClinicUser(principal);

        workingHoursService.delete(id, dentist);
        return ResponseEntity.noContent().build();
    }

    private User getClinicUser(Principal principal) {
        User user = userService.findByUsername(principal.getName())
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

