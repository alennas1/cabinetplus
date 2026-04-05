package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.cabinetplus.backend.dto.HandPaymentResponseDTO;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.enums.PaymentStatus;
import com.cabinetplus.backend.enums.BillingCycle;
import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.HandPayment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.HandPaymentRepository;
import com.cabinetplus.backend.repositories.UserRepository;

import lombok.RequiredArgsConstructor;
@Service
@RequiredArgsConstructor
public class HandPaymentService {

    private final HandPaymentRepository handPaymentRepository;
    private final UserRepository userRepository;
    private final PlanLimitService planLimitService;

    private boolean hasValidActiveSubscription(User user) {
        return user.getPlan() != null
                && user.getExpirationDate() != null
                && user.getExpirationDate().isAfter(LocalDateTime.now());
    }

    private static boolean hasScheduledNextPlan(User user, LocalDateTime now) {
        if (user == null) return false;
        if (user.getNextPlan() == null) return false;
        LocalDateTime start = user.getNextPlanStartDate();
        if (start == null) return true; // legacy/inconsistent state: treat as scheduled to avoid double-scheduling
        return start.isAfter(now);
    }

    private static boolean isRenewalRequest(String notes) {
        String requestType = parseNotesValue(notes, "REQUEST_TYPE");
        return "RENEWAL".equalsIgnoreCase(requestType);
    }

    private static boolean isUpgradeRequest(String notes) {
        String requestType = parseNotesValue(notes, "REQUEST_TYPE");
        return "UPGRADE".equalsIgnoreCase(requestType);
    }

    private static boolean startModeIsAtEndOfCurrent(String notes) {
        String startMode = parseNotesValue(notes, "REQUEST_START_MODE");
        return "AT_END_OF_CURRENT".equalsIgnoreCase(startMode);
    }

    private boolean hasPendingUpgradeRequest(User user) {
        if (user == null) return false;
        List<HandPayment> pending = handPaymentRepository.findByUserAndStatus(user, PaymentStatus.PENDING);
        if (pending == null || pending.isEmpty()) return false;

        Long currentPlanId = user.getPlan() != null ? user.getPlan().getId() : null;
        for (HandPayment p : pending) {
            if (p == null) continue;
            String notes = p.getNotes();
            if (isRenewalRequest(notes)) continue;

            Long planId = p.getPlan() != null ? p.getPlan().getId() : null;
            boolean switchingPlan = planId != null && (currentPlanId == null || !currentPlanId.equals(planId));
            if (isUpgradeRequest(notes) || switchingPlan) {
                return true;
            }
        }
        return false;
    }

    public List<HandPaymentResponseDTO> getAllPendingPayments() {
        return handPaymentRepository.findByStatus(PaymentStatus.PENDING)
                .stream()
                .map(this::toResponse)
                .toList();
}
public List<HandPaymentResponseDTO> getPaymentsByUser(User user) {
        return handPaymentRepository.findByUser(user)
                .stream()
                .map(this::toResponse)
                .toList();
}
public List<HandPaymentResponseDTO> getAllPayments() {
        return handPaymentRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
}

    public Page<HandPaymentResponseDTO> getAllPaymentsPaged(int page, int size, String q, String status) {
        PaymentStatus statusFilter = parseStatusFilter(status);
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status.trim()) && statusFilter == null) {
            return Page.empty(PageRequest.of(Math.max(page, 0), Math.max(size, 1)));
        }

        PageRequest pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 200),
                Sort.by(Sort.Order.desc("paymentDate").nullsLast(), Sort.Order.asc("id"))
        );

        return handPaymentRepository.searchAdminPayments(statusFilter, toLike(q), pageable)
                .map(this::toResponse);
    }

    public Page<HandPaymentResponseDTO> getPendingPaymentsPaged(int page, int size, String q) {
        PageRequest pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 200),
                Sort.by(Sort.Order.desc("paymentDate").nullsLast(), Sort.Order.asc("id"))
        );

        return handPaymentRepository.searchAdminPayments(PaymentStatus.PENDING, toLike(q), pageable)
                .map(this::toResponse);
    }

    public Page<HandPaymentResponseDTO> getPaymentsByUserPaged(
            User user,
            int page,
            int size,
            String q,
            String status,
            String sortKey,
            boolean desc
    ) {
        if (user == null) {
            return Page.empty(PageRequest.of(Math.max(page, 0), Math.max(size, 1)));
        }

        PaymentStatus statusFilter = parseStatusFilter(status);
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status.trim()) && statusFilter == null) {
            return Page.empty(PageRequest.of(Math.max(page, 0), Math.max(size, 1)));
        }

        String qNorm = q != null ? q.trim().toLowerCase(Locale.ROOT) : "";
        List<PaymentStatus> statusMatches = qNorm.isBlank()
                ? List.of()
                : Arrays.stream(PaymentStatus.values())
                        .filter(s -> s != null && s.name().toLowerCase(Locale.ROOT).contains(qNorm))
                        .toList();

        PageRequest pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 200),
                buildUserPaymentsSort(sortKey, desc)
        );

        return handPaymentRepository.searchUserPayments(
                        user,
                        statusFilter,
                        toLike(q),
                        !statusMatches.isEmpty(),
                        statusMatches,
                        pageable
                )
                .map(this::toResponse);
    }

    public Page<HandPaymentResponseDTO> getMyPaymentsPaged(User user, int page, int size, String q) {
        if (user == null) {
            return Page.empty(PageRequest.of(Math.max(page, 0), Math.max(size, 1)));
        }

        PageRequest pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 200),
                Sort.by(Sort.Order.desc("paymentDate").nullsLast(), Sort.Order.asc("id"))
        );

        return handPaymentRepository.searchMyPayments(user, toLike(q), pageable)
                .map(this::toResponse);
    }

    private HandPaymentResponseDTO toResponse(HandPayment p) {
        if (p == null) return null;

        Long userId = p.getUser() != null ? p.getUser().getId() : null;
        String fullName = null;
        String phone = null;
        if (p.getUser() != null) {
            String first = p.getUser().getFirstname() != null ? p.getUser().getFirstname().trim() : "";
            String last = p.getUser().getLastname() != null ? p.getUser().getLastname().trim() : "";
            String combined = (first + " " + last).trim();
            fullName = combined.isBlank() ? null : combined;
            phone = p.getUser().getPhoneNumber();
        }

        Long planId = p.getPlan() != null ? p.getPlan().getId() : null;
        String planName = p.getPlan() != null ? p.getPlan().getName() : null;
        Integer durationDays = p.getPlan() != null ? p.getPlan().getDurationDays() : null;

        return new HandPaymentResponseDTO(
                p.getId(),
                p.getAmount(),
                p.getPaymentDate(),
                p.getStatus() != null ? p.getStatus().name() : null,
                p.getPaymentMethod() != null ? p.getPaymentMethod().name() : null,
                p.getBillingCycle() != null ? p.getBillingCycle().name() : "MONTHLY",
                p.getNotes(),
                userId,
                fullName,
                phone,
                planId,
                planName,
                durationDays
        );
    }

    private static PaymentStatus parseStatusFilter(String raw) {
        if (raw == null) return null;
        String safe = raw.trim();
        if (safe.isBlank() || "all".equalsIgnoreCase(safe)) return null;

        try {
            return PaymentStatus.valueOf(safe.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private static String toLike(String q) {
        String safe = q != null ? q.trim().toLowerCase(Locale.ROOT) : "";
        return safe.isBlank() ? "" : "%" + safe + "%";
    }

    private static Sort buildUserPaymentsSort(String sortKey, boolean desc) {
        String key = sortKey != null ? sortKey.trim() : "";
        Sort.Direction dir = desc ? Sort.Direction.DESC : Sort.Direction.ASC;

        Sort primary = switch (key) {
            case "planName" -> Sort.by(Sort.Order.by("plan.name").ignoreCase().with(dir));
            case "amount" -> Sort.by(Sort.Order.by("amount").nullsLast().with(dir));
            case "status" -> Sort.by(Sort.Order.by("status").with(dir));
            case "paymentDate" -> Sort.by(Sort.Order.by("paymentDate").nullsLast().with(dir));
            default -> Sort.by(Sort.Order.by("paymentDate").nullsLast().with(dir));
        };

        return primary.and(Sort.by(Sort.Order.asc("id")));
    }


    public HandPayment createHandPayment(HandPayment payment) {
        payment.setStatus(PaymentStatus.PENDING);
        if (payment.getPaymentMethod() == null) {
            payment.setPaymentMethod(com.cabinetplus.backend.enums.PaymentMethod.HAND);
        }

        User requestUser = payment.getUser();
        if (requestUser == null) {
            throw new BadRequestException(java.util.Map.of("_", "Utilisateur introuvable"));
        }
        if (requestUser.getRole() == UserRole.DENTIST && requestUser.getOwnerDentist() != null) {
            throw new BadRequestException(java.util.Map.of("_", "Les comptes employes heritent le plan du proprietaire"));
        }
        if (payment.getPlan() == null) {
            throw new BadRequestException(java.util.Map.of("planId", "Plan introuvable"));
        }

        String notes = payment.getNotes();
        LocalDateTime now = LocalDateTime.now();

        boolean isRenewal = isRenewalRequest(notes);
        Long currentPlanId = requestUser.getPlan() != null ? requestUser.getPlan().getId() : null;
        Long requestedPlanId = payment.getPlan().getId();
        boolean switchingPlan = requestedPlanId != null && (currentPlanId == null || !currentPlanId.equals(requestedPlanId));
        boolean hasActive = hasValidActiveSubscription(requestUser);

        if (isRenewal) {
            if (hasScheduledNextPlan(requestUser, now) || hasPendingUpgradeRequest(requestUser)) {
                throw new BadRequestException(java.util.Map.of(
                        "_",
                        "Renouvellement impossible: vous avez deja un abonnement prochain (programme ou en attente)."
                ));
            }
            if (switchingPlan) {
                throw new BadRequestException(java.util.Map.of("_", "Le renouvellement doit concerner le plan actuel."));
            }
        } else {
            // Enforce only one scheduled/pending plan change while current subscription is active.
            if (switchingPlan && hasActive) {
                if (!startModeIsAtEndOfCurrent(notes)) {
                    throw new BadRequestException(java.util.Map.of(
                            "_",
                            "Changement de plan immediat non autorise. Le nouveau plan doit demarrer a la fin de l'abonnement actuel."
                    ));
                }
                if (hasScheduledNextPlan(requestUser, now)) {
                    throw new BadRequestException(java.util.Map.of(
                            "_",
                            "Vous avez deja un abonnement programme. Attendez son activation avant de changer a nouveau."
                    ));
                }
                if (hasPendingUpgradeRequest(requestUser)) {
                    throw new BadRequestException(java.util.Map.of(
                            "_",
                            "Une demande de changement de plan est deja en attente. Attendez sa validation avant d'en creer une autre."
                    ));
                }
            }

            // Validate limits when switching plans (upgrade/downgrade).
            if (switchingPlan) {
                planLimitService.assertUsageFitsPlan(requestUser, payment.getPlan());
            }
        }

        // Save the payment
        HandPayment savedPayment = handPaymentRepository.save(payment);

        // Only set WAITING if user does not currently have a valid active subscription.
        // If they are still active and request renewal/upgrade, keep ACTIVE.
        User user = savedPayment.getUser();
        if (!hasValidActiveSubscription(user)) {
            user.setPlanStatus(UserPlanStatus.WAITING);
        }
        userRepository.save(user);

        return savedPayment;
    }

    /**
     * Confirm a pending payment
     * Sets user's planStatus to ACTIVE
     */
   @Transactional
public HandPayment confirmPayment(Long paymentId) {
    HandPayment payment = handPaymentRepository.findById(paymentId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paiement introuvable"));

    if (payment.getStatus() != PaymentStatus.PENDING) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce paiement est deja traite");
    }

    // 1. Validate the request against current usage before confirming the payment.
    User user = payment.getUser();
    if (user == null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Utilisateur introuvable");
    }
    if (user.getRole() == UserRole.DENTIST && user.getOwnerDentist() != null) {
        throw new BadRequestException(java.util.Map.of("_", "Les comptes employes heritent le plan du proprietaire"));
    }
    if (payment.getPlan() == null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plan introuvable");
    }

    String notes = payment.getNotes();
    String requestType = parseNotesValue(notes, "REQUEST_TYPE");
    boolean isRenewal = "RENEWAL".equalsIgnoreCase(requestType);

    Long currentPlanId = user.getPlan() != null ? user.getPlan().getId() : null;
    Long nextPlanId = payment.getPlan().getId();
    boolean switchingPlan = nextPlanId != null && (currentPlanId == null || !currentPlanId.equals(nextPlanId));
    if (switchingPlan && !isRenewal) {
        planLimitService.assertUsageFitsPlan(user, payment.getPlan());
    }

    // 2. Confirm the payment status (after validation)
    payment.setStatus(PaymentStatus.CONFIRMED);
    handPaymentRepository.save(payment);

    // 3. Apply renewal / plan change based on the requested start mode.
    user.setPlanStatus(UserPlanStatus.ACTIVE);
    
    LocalDateTime now = LocalDateTime.now();

    BillingCycle cycle = payment.getBillingCycle() != null ? payment.getBillingCycle() : BillingCycle.MONTHLY;

    // Renewal always extends from the current expiration (if still active), otherwise from now.
    if (isRenewal) {
        if (switchingPlan) {
            throw new BadRequestException(java.util.Map.of("_", "Le renouvellement doit concerner le plan actuel."));
        }
        if (hasScheduledNextPlan(user, now)) {
            throw new BadRequestException(java.util.Map.of(
                    "_",
                    "Renouvellement impossible: vous avez deja un abonnement prochain (programme ou en attente)."
            ));
        }
        LocalDateTime base = user.getExpirationDate() != null && user.getExpirationDate().isAfter(now)
                ? user.getExpirationDate()
                : now;

        user.setPlan(payment.getPlan());
        user.setPlanBillingCycle(cycle);
        user.setPlanStartDate(base);
        LocalDateTime newExpiration = computeExpiration(base, payment.getPlan(), cycle);
        user.setExpirationDate(newExpiration);

        userRepository.save(user);
        return payment;
    }

    String startMode = parseNotesValue(notes, "REQUEST_START_MODE");
    boolean startAtEnd = "AT_END_OF_CURRENT".equalsIgnoreCase(startMode);
    boolean hasActive = hasValidActiveSubscription(user);

    // If a plan change is requested "at the end of the current plan" AND the user is still active,
    // schedule it without overriding the current plan/expiration.
    if (startAtEnd && hasActive && user.getExpirationDate() != null && user.getExpirationDate().isAfter(now)) {
        if (hasScheduledNextPlan(user, now)) {
            throw new BadRequestException(java.util.Map.of(
                    "_",
                    "Vous avez deja un abonnement programme. Attendez son activation avant de changer a nouveau."
            ));
        }
        LocalDateTime nextStart = user.getExpirationDate();
        LocalDateTime nextEnd = computeExpiration(nextStart, payment.getPlan(), cycle);

        user.setNextPlan(payment.getPlan());
        user.setNextPlanBillingCycle(cycle);
        user.setNextPlanStartDate(nextStart);
        user.setNextPlanExpirationDate(nextEnd);

        userRepository.save(user);
        return payment;
    }

    // Otherwise, apply immediately (or if the current plan is not active anymore).
    user.setPlan(payment.getPlan());
    user.setPlanBillingCycle(cycle);
    user.setPlanStartDate(now);
    user.setExpirationDate(computeExpiration(now, payment.getPlan(), cycle));

    user.setNextPlan(null);
    user.setNextPlanBillingCycle(null);
    user.setNextPlanStartDate(null);
    user.setNextPlanExpirationDate(null);

    userRepository.save(user);

    return payment;
}


    /**
     * Reject a pending payment
     * Preserves ACTIVE if user still has a valid subscription, otherwise reverts state.
     */
    @Transactional
    public HandPayment rejectPayment(Long paymentId) {
        HandPayment payment = handPaymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paiement introuvable"));

        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce paiement est deja traite");
        }

        payment.setStatus(PaymentStatus.REJECTED);
        HandPayment rejectedPayment = handPaymentRepository.save(payment);

        // Do not downgrade active users who still have a valid plan window.
        User user = rejectedPayment.getUser();
        if (hasValidActiveSubscription(user)) {
            user.setPlanStatus(UserPlanStatus.ACTIVE);
        } else if (user.getExpirationDate() != null && user.getExpirationDate().isBefore(LocalDateTime.now())) {
            user.setPlanStatus(UserPlanStatus.INACTIVE);
        } else {
            user.setPlanStatus(UserPlanStatus.PENDING);
        }
        userRepository.save(user);

        return rejectedPayment;
    }

    /**
     * Check and update expiration for a user
     * Should be called periodically or on login
     */
    public void checkAndUpdateExpiration(User user) {
        if (user.getExpirationDate() != null && LocalDateTime.now().isAfter(user.getExpirationDate())) {
            user.setPlanStatus(UserPlanStatus.INACTIVE);
            userRepository.save(user);
        }
    }

    private static LocalDateTime computeExpiration(LocalDateTime startDate, com.cabinetplus.backend.models.Plan plan, BillingCycle cycle) {
        if (startDate == null || plan == null) return null;
        Integer monthlyPrice = plan.getMonthlyPrice();
        boolean isFree = monthlyPrice != null && monthlyPrice == 0;
        if (isFree) {
            return startDate.plusDays(7);
        }
        return (cycle == BillingCycle.YEARLY) ? startDate.plusYears(1) : startDate.plusMonths(1);
    }

    private static String parseNotesValue(String notes, String key) {
        if (notes == null || notes.isBlank() || key == null || key.isBlank()) return null;
        String target = key.trim().toUpperCase() + "=";
        String[] parts = notes.split("\\|");
        for (String raw : parts) {
            if (raw == null) continue;
            String part = raw.trim();
            String upper = part.toUpperCase();
            int idx = upper.indexOf(target);
            if (idx < 0) continue;
            return part.substring(idx + target.length()).trim();
        }
        // Fallback for legacy notes: key=value present without '|'
        String upperNotes = notes.toUpperCase();
        int idx = upperNotes.indexOf(target);
        if (idx < 0) return null;
        int start = idx + target.length();
        int end = notes.indexOf('|', start);
        if (end < 0) end = notes.length();
        return notes.substring(start, end).trim();
    }
}
