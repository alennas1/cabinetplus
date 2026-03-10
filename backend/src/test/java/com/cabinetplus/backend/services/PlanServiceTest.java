package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.repositories.PlanRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlanServiceTest {

    @Mock
    private PlanRepository planRepository;

    private PlanService planService;

    @BeforeEach
    void setUp() {
        planService = new PlanService(planRepository);
    }

    @Test
    void deactivatePlanMarksInactiveWhenFound() {
        Plan plan = new Plan();
        plan.setId(5L);
        plan.setActive(true);
        when(planRepository.findById(5L)).thenReturn(Optional.of(plan));

        planService.deactivatePlan(5L);

        assertEquals(false, plan.isActive());
        verify(planRepository).save(plan);
    }
}
