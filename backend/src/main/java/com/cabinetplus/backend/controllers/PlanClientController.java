package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.PlanService;
import com.cabinetplus.backend.exceptions.NotFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/plans")
public class PlanClientController {

    private final PlanService planService;
    private final AuditService auditService;

    public PlanClientController(PlanService planService, AuditService auditService) {
        this.planService = planService;
        this.auditService = auditService;
    }

    /**
     * Get only active plans for clients
     * Accessible via GET /api/plan
     */
    @GetMapping
    public ResponseEntity<List<Plan>> getAllActivePlans() {
        auditService.logSuccess(AuditEventType.PLAN_READ, "PLAN", null, "Plans consultés");
        return ResponseEntity.ok(planService.getAllActivePlans());
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
}
