package com.cabinetplus.backend.controllers;

import java.util.List;

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

    // ==========================================================
    // GET ALL ACTIVE PLANS
    // ==========================================================
    @GetMapping
    public List<Plan> getAllPlans() {
        return planService.getAllActivePlans();
    }

    // ==========================================================
    // GET PLAN BY ID
    // ==========================================================
    @GetMapping("/{id}")
    public Plan getPlanById(@PathVariable Long id) {
        return planService.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan not found"));
    }

    // ==========================================================
    // CREATE NEW PLAN
    // ==========================================================
    @PostMapping
    public Plan createPlan(@RequestBody Plan plan) {
        // Ensure new plans are active by default
        plan.setActive(true);
        return planService.save(plan);
    }

    // ==========================================================
    // UPDATE EXISTING PLAN
    // ==========================================================
    @PutMapping("/{id}")
    public Plan updatePlan(@PathVariable Long id, @RequestBody Plan updatedPlan) {
        Plan plan = planService.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan not found"));

        // Update fields
        plan.setCode(updatedPlan.getCode());
        plan.setName(updatedPlan.getName());
        plan.setMonthlyPrice(updatedPlan.getMonthlyPrice());
        plan.setYearlyMonthlyPrice(updatedPlan.getYearlyMonthlyPrice());
        plan.setDurationDays(updatedPlan.getDurationDays());
        plan.setActive(updatedPlan.isActive());

        return planService.save(plan);
    }

    // ==========================================================
    // DEACTIVATE PLAN (soft delete)
    // ==========================================================
    @DeleteMapping("/{id}")
    public void deactivatePlan(@PathVariable Long id) {
        planService.deactivatePlan(id);
    }
}
