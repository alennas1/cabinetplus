package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

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

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
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
                BillingCycle requestedCycle = user.getNextPlanBillingCycle();
                LocalDateTime start = user.getNextPlanStartDate();

                user.setPlan(user.getNextPlan());
                user.setPlanStartDate(start);

                LocalDateTime nextExpiration = user.getNextPlanExpirationDate();
                boolean isLifetime = requestedCycle == null && nextExpiration == null;
                BillingCycle appliedCycle = isLifetime ? null : (requestedCycle != null ? requestedCycle : BillingCycle.MONTHLY);
                BillingCycle cycle = appliedCycle != null ? appliedCycle : BillingCycle.MONTHLY;

                user.setPlanBillingCycle(appliedCycle);

                if (nextExpiration == null && !isLifetime) {
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
        return (cycle == BillingCycle.YEARLY) ? startDate.plusYears(1) : startDate.plusMonths(1);
    }
}
