package com.cabinetplus.backend.controllers;

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
import java.util.List;

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
            @RequestBody EmployeeWorkingHours hours,
            Principal principal
    ) {
        User dentist = getClinicUser(principal);

        return ResponseEntity.ok(workingHoursService.save(hours, dentist));
    }

    // --- Update ---
    @PutMapping("/{id}")
    public ResponseEntity<EmployeeWorkingHours> update(
            @PathVariable Long id,
            @RequestBody EmployeeWorkingHours hours,
            Principal principal
    ) {
        User dentist = getClinicUser(principal);

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
}

