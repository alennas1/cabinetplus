package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.repositories.PlanRepository;
import com.cabinetplus.backend.exceptions.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class PlanService {

    private final PlanRepository planRepository;

    public PlanService(PlanRepository planRepository) {
        this.planRepository = planRepository;
    }

    // --- LOGIQUE ADMIN ---
    
    public List<Plan> getAllPlansForAdmin() {
        return planRepository.findAll(); // Retourne tout : actifs et inactifs
    }

    public Optional<Plan> findById(Long id) {
        return planRepository.findById(id);
    }

    public Plan save(Plan plan) {
        return planRepository.save(plan);
    }

    public void deactivatePlan(Long planId) {
        planRepository.findById(planId).ifPresent(plan -> {
            plan.setActive(false);
            plan.setRecommended(false);
            planRepository.save(plan);
        });
    }

    public Plan setRecommended(Long planId, boolean recommended) {
        Plan plan = planRepository.findById(planId).orElseThrow(() -> new NotFoundException("Plan introuvable"));
        if (recommended && !plan.isActive()) {
            throw new IllegalArgumentException("Impossible de recommander un plan inactif.");
        }

        if (recommended) {
            planRepository.clearRecommended();
            plan.setRecommended(true);
        } else {
            plan.setRecommended(false);
        }

        return planRepository.save(plan);
    }

    // --- LOGIQUE CLIENT ---

    public List<Plan> getAllActivePlans() {
        return planRepository.findByActiveTrue(); // Filtre uniquement les actifs
    }

    public Optional<Plan> findByCode(String code) {
        return planRepository.findByCode(code);
    }
}
