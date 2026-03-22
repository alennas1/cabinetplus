package com.cabinetplus.backend.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.PlanRequest;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.PlanService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/plans")
public class PlanController {

    private final PlanService planService;
    private final AuditService auditService;

    public PlanController(PlanService planService, AuditService auditService) {
        this.planService = planService;
        this.auditService = auditService;
    }

    // GET : Tous les plans pour le dashboard (Admin)
    
    @GetMapping
    public ResponseEntity<Iterable<Plan>> getAllPlans() {
        auditService.logSuccess(AuditEventType.PLAN_READ, "PLAN", null, "Plans consultés (admin)");
        return ResponseEntity.ok(planService.getAllPlansForAdmin());
    }   
    

    @GetMapping("/{id}")
    public ResponseEntity<Plan> getPlanById(@PathVariable Long id) {
        return planService.findById(id)
                .map(plan -> {
                    auditService.logSuccess(AuditEventType.PLAN_READ, "PLAN", String.valueOf(plan.getId()), "Plan consulté");
                    return plan;
                })
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
        Plan saved = planService.save(plan);
        auditService.logSuccess(AuditEventType.PLAN_CREATE, "PLAN", String.valueOf(saved.getId()), "Plan créé");
        return saved;
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
            Plan saved = planService.save(plan);
            auditService.logSuccess(AuditEventType.PLAN_UPDATE, "PLAN", String.valueOf(saved.getId()), "Plan modifié");
            return ResponseEntity.ok(saved);
        }).orElseThrow(() -> new NotFoundException("Plan introuvable"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivatePlan(@PathVariable Long id) {
        planService.deactivatePlan(id);
        auditService.logSuccess(AuditEventType.PLAN_DEACTIVATE, "PLAN", String.valueOf(id), "Plan désactivé");
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/recommended")
    public ResponseEntity<Plan> setRecommendedPlan(@PathVariable Long id, @RequestParam boolean recommended) {
        Plan saved = planService.setRecommended(id, recommended);
        auditService.logSuccess(
                AuditEventType.PLAN_RECOMMENDED_SET,
                "PLAN",
                String.valueOf(id),
                recommended ? "Plan recommandé activé" : "Plan recommandé désactivé"
        );
        return ResponseEntity.ok(saved);
    }
}
