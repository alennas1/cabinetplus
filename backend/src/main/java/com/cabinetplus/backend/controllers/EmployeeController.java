package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.cabinetplus.backend.dto.EmployeeRequestDTO;
import com.cabinetplus.backend.dto.EmployeeResponseDTO;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.User;
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

    @PostMapping
    public ResponseEntity<EmployeeResponseDTO> createEmployee(
            @Valid @RequestBody EmployeeRequestDTO dto,
            Principal principal) {

        User dentist = getClinicUser(principal);

        EmployeeResponseDTO employeeResponse = employeeService.saveEmployee(dto, dentist);
        return ResponseEntity.ok(employeeResponse);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmployeeResponseDTO> updateEmployee(
            @PathVariable String id,
            @Valid @RequestBody EmployeeRequestDTO dto,
            Principal principal) {

        User dentist = getClinicUser(principal);

        Long internalEmployeeId = publicIdResolutionService.requireEmployeeOwnedBy(id, dentist).getId();
        return ResponseEntity.ok(employeeService.updateEmployee(internalEmployeeId, dto, dentist));
    }

    @GetMapping
    public ResponseEntity<List<EmployeeResponseDTO>> getAllEmployees(Principal principal) {
        User dentist = getClinicUser(principal);

        return ResponseEntity.ok(employeeService.getAllEmployeesForDentist(dentist));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmployeeResponseDTO> getEmployeeById(
            @PathVariable String id,
            Principal principal) {

        User dentist = getClinicUser(principal);

        Long internalEmployeeId = publicIdResolutionService.requireEmployeeOwnedBy(id, dentist).getId();
        return employeeService.getEmployeeByIdForDentist(internalEmployeeId, dentist)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new NotFoundException("Employe introuvable"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmployee(
            @PathVariable String id,
            Principal principal) {

        User dentist = getClinicUser(principal);

        Long internalEmployeeId = publicIdResolutionService.requireEmployeeOwnedBy(id, dentist).getId();
        employeeService.deleteEmployee(internalEmployeeId, dentist);
        return ResponseEntity.noContent().build();
    }

    private User getClinicUser(Principal principal) {
        User user = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
    }
}

