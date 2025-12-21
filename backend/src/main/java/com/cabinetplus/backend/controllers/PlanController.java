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

import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.services.PlanService;

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
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Plan createPlan(@RequestBody Plan plan) {
        plan.setActive(true);
        return planService.save(plan);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Plan> updatePlan(@PathVariable Long id, @RequestBody Plan updatedPlan) {
        return planService.findById(id).map(plan -> {
            plan.setCode(updatedPlan.getCode());
            plan.setName(updatedPlan.getName());
            plan.setMonthlyPrice(updatedPlan.getMonthlyPrice());
            plan.setYearlyMonthlyPrice(updatedPlan.getYearlyMonthlyPrice());
            plan.setDurationDays(updatedPlan.getDurationDays());
            plan.setActive(updatedPlan.isActive());
            return ResponseEntity.ok(planService.save(plan));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivatePlan(@PathVariable Long id) {
        planService.deactivatePlan(id);
        return ResponseEntity.noContent().build();
    }
}