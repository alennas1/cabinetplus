package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.cabinetplus.backend.dto.EmployeeRequestDTO;
import com.cabinetplus.backend.dto.EmployeeResponseDTO;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.EmployeeService;
import com.cabinetplus.backend.services.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;
    private final UserService userService;

    @PostMapping
    public ResponseEntity<EmployeeResponseDTO> createEmployee(
            @RequestBody EmployeeRequestDTO dto,
            Principal principal) {

        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        EmployeeResponseDTO employeeResponse = employeeService.saveEmployee(dto, dentist);
        return ResponseEntity.ok(employeeResponse);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmployeeResponseDTO> updateEmployee(
            @PathVariable Long id,
            @RequestBody EmployeeRequestDTO dto,
            Principal principal) {

        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(employeeService.updateEmployee(id, dto, dentist));
    }

    @GetMapping
    public ResponseEntity<List<EmployeeResponseDTO>> getAllEmployees(Principal principal) {
        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(employeeService.getAllEmployeesForDentist(dentist));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmployeeResponseDTO> getEmployeeById(
            @PathVariable Long id,
            Principal principal) {

        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return employeeService.getEmployeeByIdForDentist(id, dentist)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmployee(
            @PathVariable Long id,
            Principal principal) {

        User dentist = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        employeeService.deleteEmployee(id, dentist);
        return ResponseEntity.noContent().build();
    }
}
