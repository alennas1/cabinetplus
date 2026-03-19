package com.cabinetplus.backend.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.PlanRequest;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.services.PlanService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/plans")
public class PlanController {

    private final PlanService planService;

    public PlanController(PlanService planService) {
        this.planService = planService;
    }

    // GET : Tous les plans pour le dashboard (Admin)
    
    @GetMapping
    public ResponseEntity<Iterable<Plan>> getAllPlans() {
        return ResponseEntity.ok(planService.getAllPlansForAdmin());
    }   
    

    @GetMapping("/{id}")
    public ResponseEntity<Plan> getPlanById(@PathVariable Long id) {
        return planService.findById(id)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new NotFoundException("Plan introuvable"));
    }

    @PostMapping
    public Plan createPlan(@Valid @RequestBody PlanRequest request) {
        Plan plan = new Plan();
        plan.setCode(request.code() != null ? request.code().trim() : null);
        plan.setName(request.name() != null ? request.name().trim() : null);
        plan.setMonthlyPrice(request.monthlyPrice());
        plan.setYearlyMonthlyPrice(request.yearlyMonthlyPrice());
        plan.setDurationDays(request.durationDays());
        plan.setMaxDentists(request.maxDentists());
        plan.setMaxEmployees(request.maxEmployees());
        plan.setMaxPatients(request.maxPatients());
        plan.setMaxStorageGb(request.maxStorageGb());
        plan.setActive(true);
        return planService.save(plan);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Plan> updatePlan(@PathVariable Long id, @Valid @RequestBody PlanRequest updatedPlan) {
        return planService.findById(id).map(plan -> {
            plan.setCode(updatedPlan.code() != null ? updatedPlan.code().trim() : null);
            plan.setName(updatedPlan.name() != null ? updatedPlan.name().trim() : null);
            plan.setMonthlyPrice(updatedPlan.monthlyPrice());
            plan.setYearlyMonthlyPrice(updatedPlan.yearlyMonthlyPrice());
            plan.setDurationDays(updatedPlan.durationDays());
            plan.setMaxDentists(updatedPlan.maxDentists());
            plan.setMaxEmployees(updatedPlan.maxEmployees());
            plan.setMaxPatients(updatedPlan.maxPatients());
            plan.setMaxStorageGb(updatedPlan.maxStorageGb());
            plan.setActive(updatedPlan.activeOrTrue());
            return ResponseEntity.ok(planService.save(plan));
        }).orElseThrow(() -> new NotFoundException("Plan introuvable"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivatePlan(@PathVariable Long id) {
        planService.deactivatePlan(id);
        return ResponseEntity.noContent().build();
    }
}
