package com.cabinetplus.backend.services;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.repositories.PlanRepository;

@Service
@Transactional
public class PlanService {

    private final PlanRepository planRepository;

    public PlanService(PlanRepository planRepository) {
        this.planRepository = planRepository;
    }

    public Optional<Plan> findById(Long id) {
        return planRepository.findById(id);
    }

    public Optional<Plan> findByCode(String code) {
        return planRepository.findByCode(code);
    }

    public List<Plan> getAllActivePlans() {
        return planRepository.findByActiveTrue();
    }

    public Plan save(Plan plan) {
        return planRepository.save(plan);
    }

    public void deactivatePlan(Long planId) {
        planRepository.findById(planId).ifPresent(plan -> {
            plan.setActive(false);
            planRepository.save(plan);
        });
    }
}
