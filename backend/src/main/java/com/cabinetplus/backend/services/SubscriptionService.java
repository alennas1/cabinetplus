package com.cabinetplus.backend.services;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.enums.BillingCycle;
import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;

@Service
public class SubscriptionService {

    private final UserRepository userRepository;
    private final PlanLimitService planLimitService;

    public SubscriptionService(UserRepository userRepository, PlanLimitService planLimitService) {
        this.userRepository = userRepository;
        this.planLimitService = planLimitService;
    }

    /**
     * Keeps subscription data consistent:
     * - Activates a scheduled next plan when its start date is reached.
     * - Marks the plan as inactive when the current expiration is passed.
     */
    public User refreshSubscription(User user) {
        if (user == null) return null;

        LocalDateTime now = LocalDateTime.now();
        boolean changed = false;

        if (user.getNextPlan() != null
                && user.getNextPlanStartDate() != null
                && !user.getNextPlanStartDate().isAfter(now)) {
            boolean canActivateNext = true;
            try {
                planLimitService.assertUsageFitsPlan(user, user.getNextPlan());
            } catch (IllegalArgumentException ex) {
                canActivateNext = false;
            }

            if (canActivateNext) {
                BillingCycle cycle = user.getNextPlanBillingCycle() != null ? user.getNextPlanBillingCycle() : BillingCycle.MONTHLY;
                LocalDateTime start = user.getNextPlanStartDate();

                user.setPlan(user.getNextPlan());
                user.setPlanBillingCycle(cycle);
                user.setPlanStartDate(start);

                LocalDateTime nextExpiration = user.getNextPlanExpirationDate();
                if (nextExpiration == null) {
                    nextExpiration = computeExpiration(start, user.getPlan(), cycle);
                }
                user.setExpirationDate(nextExpiration);

                user.setNextPlan(null);
                user.setNextPlanBillingCycle(null);
                user.setNextPlanStartDate(null);
                user.setNextPlanExpirationDate(null);

                user.setPlanStatus(UserPlanStatus.ACTIVE);
                changed = true;
            }
        }

        if (user.getExpirationDate() != null && now.isAfter(user.getExpirationDate())) {
            if (user.getPlanStatus() != UserPlanStatus.INACTIVE) {
                user.setPlanStatus(UserPlanStatus.INACTIVE);
                changed = true;
            }
        }

        if (!changed) return user;
        return userRepository.save(user);
    }

    private static LocalDateTime computeExpiration(LocalDateTime startDate, Plan plan, BillingCycle cycle) {
        if (startDate == null || plan == null) return null;
        Integer monthlyPrice = plan.getMonthlyPrice();
        boolean isFree = monthlyPrice != null && monthlyPrice == 0;
        if (isFree) {
            return startDate.plusDays(7);
        }
        return (cycle == BillingCycle.YEARLY) ? startDate.plusYears(1) : startDate.plusMonths(1);
    }
}
