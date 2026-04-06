package com.cabinetplus.backend.services;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.cabinetplus.backend.dto.AdminPlanGrantRequest;
import com.cabinetplus.backend.enums.BillingCycle;
import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.User;

@Service
public class AdminPlanGrantService {

    private final UserService userService;
    private final PlanService planService;
    private final PlanLimitService planLimitService;
    private final SubscriptionService subscriptionService;
    private final Clock clock;

    public AdminPlanGrantService(
            UserService userService,
            PlanService planService,
            PlanLimitService planLimitService,
            SubscriptionService subscriptionService
    ) {
        this.userService = userService;
        this.planService = planService;
        this.planLimitService = planLimitService;
        this.subscriptionService = subscriptionService;
        this.clock = Clock.systemUTC();
    }

    public User grant(Long targetUserId, AdminPlanGrantRequest request) {
        if (targetUserId == null) {
            throw new BadRequestException(Map.of("userId", "Utilisateur introuvable"));
        }
        if (request == null) {
            throw new BadRequestException(Map.of("_", "Requete invalide"));
        }

        User target = userService.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        User owner = userService.resolveClinicOwner(target);
        if (!userService.isOwnerDentist(owner)) {
            throw new BadRequestException(Map.of("_", "Seuls les proprietaires (dentistes) ont un abonnement."));
        }

        Plan plan = planService.findById(request.planId())
                .orElseThrow(() -> new BadRequestException(Map.of("planId", "Plan introuvable")));

        // Ensure subscription window is up-to-date before we compute "end of current".
        subscriptionService.refreshSubscription(owner);

        LocalDateTime now = LocalDateTime.ofInstant(Instant.now(clock), ZoneOffset.UTC);
        StartMode startMode = parseStartMode(request.startMode());
        GrantDuration duration = parseDuration(request.duration());

        LocalDateTime startAt = resolveStartAt(owner, startMode, request.startsAt(), now);
        LocalDateTime endAt = resolveEndAt(startAt, duration);
        BillingCycle cycle = resolveCycle(duration);

        boolean startIsNowOrPast = !startAt.isAfter(now);
        if (startIsNowOrPast) {
            planLimitService.assertUsageFitsPlan(owner, plan);

            owner.setPlan(plan);
            owner.setPlanBillingCycle(cycle);
            owner.setPlanStartDate(startAt);
            owner.setExpirationDate(endAt);
            owner.setPlanStatus(UserPlanStatus.ACTIVE);

            owner.setNextPlan(null);
            owner.setNextPlanBillingCycle(null);
            owner.setNextPlanStartDate(null);
            owner.setNextPlanExpirationDate(null);

            return userService.save(owner);
        }

        // Otherwise: schedule as next plan (future start).
        planLimitService.assertUsageFitsPlan(owner, plan);

        owner.setNextPlan(plan);
        owner.setNextPlanBillingCycle(cycle);
        owner.setNextPlanStartDate(startAt);
        owner.setNextPlanExpirationDate(endAt);

        return userService.save(owner);
    }

    private enum StartMode {
        NOW,
        AT_END_OF_CURRENT,
        CUSTOM_DATE
    }

    private enum GrantDuration {
        DAYS_7,
        DAYS_14,
        MONTH_1,
        YEAR_1,
        LIFETIME
    }

    private static StartMode parseStartMode(String raw) {
        if (raw == null) {
            throw new BadRequestException(Map.of("startMode", "Mode de debut requis"));
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        try {
            return StartMode.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException(Map.of("startMode", "Mode de debut invalide"));
        }
    }

    private static GrantDuration parseDuration(String raw) {
        if (raw == null) {
            throw new BadRequestException(Map.of("duration", "Duree requise"));
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        try {
            return GrantDuration.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException(Map.of("duration", "Duree invalide"));
        }
    }

    private static BillingCycle resolveCycle(GrantDuration duration) {
        return switch (duration) {
            case YEAR_1 -> BillingCycle.YEARLY;
            case LIFETIME -> null;
            default -> BillingCycle.MONTHLY;
        };
    }

    private static LocalDateTime resolveStartAt(User owner, StartMode startMode, Instant startsAt, LocalDateTime now) {
        return switch (startMode) {
            case NOW -> now;
            case CUSTOM_DATE -> {
                if (startsAt == null) {
                    throw new BadRequestException(Map.of("startsAt", "Date de debut requise"));
                }
                yield LocalDateTime.ofInstant(startsAt, ZoneOffset.UTC);
            }
            case AT_END_OF_CURRENT -> {
                if (owner.getPlanStatus() == UserPlanStatus.ACTIVE && owner.getExpirationDate() == null) {
                    throw new BadRequestException(Map.of("_", "Impossible de programmer apres un plan sans expiration (lifetime)."));
                }
                if (owner.getExpirationDate() != null && owner.getExpirationDate().isAfter(now)) {
                    yield owner.getExpirationDate();
                }
                yield now;
            }
        };
    }

    private static LocalDateTime resolveEndAt(LocalDateTime startAt, GrantDuration duration) {
        if (startAt == null) return null;
        return switch (duration) {
            case DAYS_7 -> startAt.plusDays(7);
            case DAYS_14 -> startAt.plusDays(14);
            case MONTH_1 -> startAt.plusMonths(1);
            case YEAR_1 -> startAt.plusYears(1);
            case LIFETIME -> null;
        };
    }
}
