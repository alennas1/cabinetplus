package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.models.EmployeeWorkingHours;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.EmployeeWorkingHoursService;
import com.cabinetplus.backend.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.DayOfWeek;
import java.util.List;

@RestController
@RequestMapping("/api/working-hours")
@RequiredArgsConstructor
public class EmployeeWorkingHoursController {

    private final EmployeeWorkingHoursService workingHoursService;
    private final UserService userService;

    // --- Get All for dentist ---
    @GetMapping
    public ResponseEntity<List<EmployeeWorkingHours>> getAll(Principal principal) {
        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(workingHoursService.getAllForDentist(dentist));
    }

    // --- Get by employee ---
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<EmployeeWorkingHours>> getByEmployee(
            @PathVariable Long employeeId,
            Principal principal
    ) {
        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(workingHoursService.getByEmployee(employeeId, dentist));
    }

    // --- Get by employee & day ---
    @GetMapping("/employee/{employeeId}/day/{day}")
    public ResponseEntity<List<EmployeeWorkingHours>> getByEmployeeAndDay(
            @PathVariable Long employeeId,
            @PathVariable DayOfWeek day,
            Principal principal
    ) {
        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(workingHoursService.getByEmployeeAndDay(employeeId, day, dentist));
    }

    // --- Create ---
    @PostMapping
    public ResponseEntity<EmployeeWorkingHours> create(
            @RequestBody EmployeeWorkingHours hours,
            Principal principal
    ) {
        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(workingHoursService.save(hours, dentist));
    }

    // --- Update ---
    @PutMapping("/{id}")
    public ResponseEntity<EmployeeWorkingHours> update(
            @PathVariable Long id,
            @RequestBody EmployeeWorkingHours hours,
            Principal principal
    ) {
        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(workingHoursService.update(id, hours, dentist));
    }

    // --- Delete ---
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            Principal principal
    ) {
        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        workingHoursService.delete(id, dentist);
        return ResponseEntity.noContent().build();
    }
}
