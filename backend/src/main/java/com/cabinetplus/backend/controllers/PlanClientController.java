package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.services.PlanService;
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

    public PlanClientController(PlanService planService) {
        this.planService = planService;
    }

    /**
     * Get only active plans for clients
     * Accessible via GET /api/plan
     */
    @GetMapping
    public ResponseEntity<List<Plan>> getAllActivePlans() {
        return ResponseEntity.ok(planService.getAllActivePlans());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Plan> getPlanById(@PathVariable Long id) {
        return planService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}