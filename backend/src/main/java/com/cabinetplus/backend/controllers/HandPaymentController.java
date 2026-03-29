package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.HandPaymentDTO;
import com.cabinetplus.backend.dto.HandPaymentNoPasswordDTO;
import com.cabinetplus.backend.dto.HandPaymentResponseDTO;
import com.cabinetplus.backend.dto.HandPaymentsSummaryResponseDTO;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.BillingCycle;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.HandPayment;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PlanRepository;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.HandPaymentService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.util.PaginationUtil;
import com.cabinetplus.backend.util.PhoneNumberUtil;
import com.cabinetplus.backend.exceptions.BadRequestException;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Comparator;

@RestController
@RequestMapping("/api/hand-payments")
@RequiredArgsConstructor
public class HandPaymentController {

    private final HandPaymentService handPaymentService;
    private final UserRepository userRepository;
    private final PlanRepository planRepository;
    private final AuditService auditService;
    private final PublicIdResolutionService publicIdResolutionService;
    private final PasswordEncoder passwordEncoder;

    /**
     * Get all pending hand payments
     */

    @GetMapping("/all")
public ResponseEntity<List<HandPaymentResponseDTO>> getAllPayments(Principal principal) {
    User admin = requireUser(principal);
    if (admin.getRole() != UserRole.ADMIN) {
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Acces refuse");
    }
    auditService.logSuccessAsUser(admin, AuditEventType.HAND_PAYMENT_READ, "HAND_PAYMENT", null, "Paiements manuels consultes (tous)");
    return ResponseEntity.ok(handPaymentService.getAllPayments());
}

    @GetMapping("/all/paged")
    public ResponseEntity<PageResponse<HandPaymentResponseDTO>> getAllPaymentsPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "status", required = false) String status,
            Principal principal
    ) {
        User admin = requireUser(principal);
        if (admin.getRole() != UserRole.ADMIN) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Acces refuse");
        }

        String qNorm = q != null ? q.trim().toLowerCase() : "";
        String statusNorm = status != null ? status.trim().toLowerCase() : "";

        List<HandPaymentResponseDTO> all = handPaymentService.getAllPayments();
        List<HandPaymentResponseDTO> filtered = (all == null ? List.<HandPaymentResponseDTO>of() : all).stream()
                .filter(p -> {
                    if (statusNorm.isBlank() || "all".equals(statusNorm)) return true;
                    String s = p.paymentStatus() != null ? p.paymentStatus().trim().toLowerCase() : "";
                    return s.equals(statusNorm);
                })
                .filter(p -> {
                    if (qNorm.isBlank()) return true;
                    String name = p.fullName() != null ? p.fullName().trim().toLowerCase() : "";
                    String plan = p.planName() != null ? p.planName().trim().toLowerCase() : "";
                    String phone = p.phoneNumber() != null ? p.phoneNumber().trim().toLowerCase() : "";
                    return name.contains(qNorm) || plan.contains(qNorm) || phone.contains(qNorm);
                })
                .sorted(Comparator.comparing(HandPaymentResponseDTO::paymentDate, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .toList();

        return ResponseEntity.ok(PaginationUtil.toPageResponse(filtered, page, size));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<HandPaymentResponseDTO>> getPendingPayments(Principal principal) {
    User admin = requireUser(principal);
    if (admin.getRole() != UserRole.ADMIN) {
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Acces refuse");
    }
    auditService.logSuccessAsUser(admin, AuditEventType.HAND_PAYMENT_READ, "HAND_PAYMENT", null, "Paiements manuels consultes (en attente)");
    return ResponseEntity.ok(handPaymentService.getAllPendingPayments());
}

    @GetMapping("/pending/paged")
    public ResponseEntity<PageResponse<HandPaymentResponseDTO>> getPendingPaymentsPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            Principal principal
    ) {
        User admin = requireUser(principal);
        if (admin.getRole() != UserRole.ADMIN) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Acces refuse");
        }

        String qNorm = q != null ? q.trim().toLowerCase() : "";
        List<HandPaymentResponseDTO> all = handPaymentService.getAllPendingPayments();
        List<HandPaymentResponseDTO> filtered = (all == null ? List.<HandPaymentResponseDTO>of() : all).stream()
                .filter(p -> {
                    if (qNorm.isBlank()) return true;
                    String name = p.fullName() != null ? p.fullName().trim().toLowerCase() : "";
                    String plan = p.planName() != null ? p.planName().trim().toLowerCase() : "";
                    String phone = p.phoneNumber() != null ? p.phoneNumber().trim().toLowerCase() : "";
                    return name.contains(qNorm) || plan.contains(qNorm) || phone.contains(qNorm);
                })
                .sorted(Comparator.comparing(HandPaymentResponseDTO::paymentDate, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .toList();

        return ResponseEntity.ok(PaginationUtil.toPageResponse(filtered, page, size));
    }

@GetMapping("/user/{userId}")
public ResponseEntity<List<HandPaymentResponseDTO>> getPaymentsByUserId(@PathVariable String userId, Principal principal) {
    User admin = requireUser(principal);
    if (admin.getRole() != UserRole.ADMIN) {
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Acces refuse");
    }
    User user = publicIdResolutionService.requireUserByIdOrPublicId(userId);
    auditService.logSuccessAsUser(admin, AuditEventType.HAND_PAYMENT_READ, "USER", user != null && user.getId() != null ? String.valueOf(user.getId()) : null, "Paiements manuels utilisateur consultes");

    return ResponseEntity.ok(handPaymentService.getPaymentsByUser(user));
}

    @GetMapping("/user/{userId}/paged")
    public ResponseEntity<PageResponse<HandPaymentResponseDTO>> getPaymentsByUserIdPaged(
            @PathVariable String userId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "sortKey", required = false) String sortKey,
            @RequestParam(name = "direction", required = false) String direction,
            Principal principal
    ) {
        User admin = requireUser(principal);
        if (admin.getRole() != UserRole.ADMIN) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Acces refuse");
        }

        User user = publicIdResolutionService.requireUserByIdOrPublicId(userId);
        auditService.logSuccessAsUser(
                admin,
                AuditEventType.HAND_PAYMENT_READ,
                "USER",
                user != null && user.getId() != null ? String.valueOf(user.getId()) : null,
                "Paiements manuels utilisateur consultes (page)"
        );

        String qNorm = q != null ? q.trim().toLowerCase() : "";
        String statusNorm = status != null ? status.trim().toLowerCase() : "";

        boolean desc = direction != null && direction.trim().equalsIgnoreCase("desc");
        Comparator<String> stringComparator = desc
                ? Comparator.nullsLast(Comparator.reverseOrder())
                : Comparator.nullsLast(Comparator.naturalOrder());
        Comparator<Integer> intComparator = desc
                ? Comparator.nullsLast(Comparator.reverseOrder())
                : Comparator.nullsLast(Comparator.naturalOrder());
        Comparator<java.time.LocalDateTime> dateComparator = desc
                ? Comparator.nullsLast(Comparator.reverseOrder())
                : Comparator.nullsLast(Comparator.naturalOrder());

        String sortKeyNorm = sortKey != null ? sortKey.trim() : "";
        Comparator<HandPaymentResponseDTO> comparator = switch (sortKeyNorm) {
            case "planName" -> Comparator.comparing(p -> p.planName() != null ? p.planName().trim().toLowerCase() : "", stringComparator);
            case "amount" -> Comparator.comparing(HandPaymentResponseDTO::amount, intComparator);
            case "status" -> Comparator.comparing(p -> p.paymentStatus() != null ? p.paymentStatus().trim().toLowerCase() : "", stringComparator);
            case "paymentDate" -> Comparator.comparing(HandPaymentResponseDTO::paymentDate, dateComparator);
            default -> Comparator.comparing(HandPaymentResponseDTO::paymentDate, dateComparator);
        };
        comparator = comparator.thenComparing(HandPaymentResponseDTO::paymentId, Comparator.nullsLast(Comparator.naturalOrder()));

        List<HandPaymentResponseDTO> all = handPaymentService.getPaymentsByUser(user);
        List<HandPaymentResponseDTO> filtered = (all == null ? List.<HandPaymentResponseDTO>of() : all).stream()
                .filter(p -> {
                    if (statusNorm.isBlank() || "all".equals(statusNorm)) return true;
                    String s = p.paymentStatus() != null ? p.paymentStatus().trim().toLowerCase() : "";
                    return s.equals(statusNorm);
                })
                .filter(p -> {
                    if (qNorm.isBlank()) return true;
                    String plan = p.planName() != null ? p.planName().trim().toLowerCase() : "";
                    String notes = p.notes() != null ? p.notes().trim().toLowerCase() : "";
                    String statusLabel = p.paymentStatus() != null ? p.paymentStatus().trim().toLowerCase() : "";
                    String phone = p.phoneNumber() != null ? p.phoneNumber().trim().toLowerCase() : "";
                    return plan.contains(qNorm) || notes.contains(qNorm) || statusLabel.contains(qNorm) || phone.contains(qNorm);
                })
                .sorted(comparator)
                .toList();

        return ResponseEntity.ok(PaginationUtil.toPageResponse(filtered, page, size));
    }

    @GetMapping("/user/{userId}/summary")
    public ResponseEntity<HandPaymentsSummaryResponseDTO> getPaymentsByUserIdSummary(@PathVariable String userId, Principal principal) {
        User admin = requireUser(principal);
        if (admin.getRole() != UserRole.ADMIN) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Acces refuse");
        }

        User user = publicIdResolutionService.requireUserByIdOrPublicId(userId);
        auditService.logSuccessAsUser(
                admin,
                AuditEventType.HAND_PAYMENT_READ,
                "USER",
                user != null && user.getId() != null ? String.valueOf(user.getId()) : null,
                "Paiements manuels utilisateur consultes (resume)"
        );

        List<HandPaymentResponseDTO> all = handPaymentService.getPaymentsByUser(user);
        List<HandPaymentResponseDTO> safe = all == null ? List.of() : all;

        long allCount = safe.size();
        long allTotal = safe.stream().mapToLong(p -> p.amount() != null ? p.amount().longValue() : 0L).sum();

        long confirmedCount = safe.stream().filter(p -> "confirmed".equalsIgnoreCase(p.paymentStatus())).count();
        long confirmedTotal = safe.stream()
                .filter(p -> "confirmed".equalsIgnoreCase(p.paymentStatus()))
                .mapToLong(p -> p.amount() != null ? p.amount().longValue() : 0L)
                .sum();

        long pendingCount = safe.stream().filter(p -> "pending".equalsIgnoreCase(p.paymentStatus())).count();
        long pendingTotal = safe.stream()
                .filter(p -> "pending".equalsIgnoreCase(p.paymentStatus()))
                .mapToLong(p -> p.amount() != null ? p.amount().longValue() : 0L)
                .sum();

        long rejectedCount = safe.stream().filter(p -> "rejected".equalsIgnoreCase(p.paymentStatus())).count();
        long rejectedTotal = safe.stream()
                .filter(p -> "rejected".equalsIgnoreCase(p.paymentStatus()))
                .mapToLong(p -> p.amount() != null ? p.amount().longValue() : 0L)
                .sum();

        return ResponseEntity.ok(new HandPaymentsSummaryResponseDTO(
                allCount,
                allTotal,
                confirmedCount,
                confirmedTotal,
                pendingCount,
                pendingTotal,
                rejectedCount,
                rejectedTotal
        ));
    }

@GetMapping("/my-payments")
public ResponseEntity<List<HandPaymentResponseDTO>> getMyPayments(Principal principal) {
    User user = requireUser(principal);
    auditService.logSuccessAsUser(user, AuditEventType.HAND_PAYMENT_READ, "USER", user.getId() != null ? String.valueOf(user.getId()) : null, "Mes paiements manuels consultes");

    return ResponseEntity.ok(handPaymentService.getPaymentsByUser(user));
}

    @GetMapping("/my-payments/paged")
    public ResponseEntity<PageResponse<HandPaymentResponseDTO>> getMyPaymentsPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            Principal principal
    ) {
        User user = requireUser(principal);
        String qNorm = q != null ? q.trim().toLowerCase() : "";

        List<HandPaymentResponseDTO> all = handPaymentService.getPaymentsByUser(user);
        List<HandPaymentResponseDTO> filtered = (all == null ? List.<HandPaymentResponseDTO>of() : all).stream()
                .filter(p -> {
                    if (qNorm.isBlank()) return true;
                    String plan = p.planName() != null ? p.planName().trim().toLowerCase() : "";
                    String notes = p.notes() != null ? p.notes().trim().toLowerCase() : "";
                    return plan.contains(qNorm) || notes.contains(qNorm);
                })
                .sorted(Comparator.comparing(HandPaymentResponseDTO::paymentDate, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .toList();

        return ResponseEntity.ok(PaginationUtil.toPageResponse(filtered, page, size));
    }

    /**
     * Create a new hand payment for the authenticated user
     */
    @PostMapping("/create")
 public ResponseEntity<HandPayment> createPayment(@Valid @RequestBody HandPaymentDTO dto, Principal principal) {
     User user = requireUser(principal);

     if (!passwordEncoder.matches(dto.getPassword(), user.getPasswordHash())) {
         throw new BadRequestException(java.util.Map.of("password", "Mot de passe incorrect"));
     }
 
     Plan plan = planRepository.findById(dto.getPlanId())
             .orElseThrow(() -> new RuntimeException("Plan introuvable"));

    HandPayment payment = new HandPayment();
    payment.setUser(user);
    payment.setPlan(plan);
    payment.setAmount(dto.getAmount());
    payment.setNotes(dto.getNotes());

    // IMPORTANT: Map the billing cycle from DTO to Entity
    if (dto.getBillingCycle() != null) {
        try {
            payment.setBillingCycle(BillingCycle.valueOf(dto.getBillingCycle().toUpperCase()));
        } catch (IllegalArgumentException e) {
            // Fallback if string doesn't match Enum
            payment.setBillingCycle(BillingCycle.MONTHLY);
        }
    } else {
        payment.setBillingCycle(BillingCycle.MONTHLY);
    }

    HandPayment savedPayment = handPaymentService.createHandPayment(payment);
    auditService.logSuccessAsUser(
            user,
            AuditEventType.HAND_PAYMENT_CREATE,
            "USER",
            user.getId() != null ? String.valueOf(user.getId()) : null,
            "Paiement manuel cree"
    );
    return ResponseEntity.ok(savedPayment);
}

    /**
     * Create a new hand payment WITHOUT password.
     * Used by onboarding flow to avoid asking for the password again.
     */
    @PostMapping("/create-no-password")
    public ResponseEntity<HandPayment> createPaymentNoPassword(@Valid @RequestBody HandPaymentNoPasswordDTO dto, Principal principal) {
        User user = requireUser(principal);

        Plan plan = planRepository.findById(dto.getPlanId())
                .orElseThrow(() -> new RuntimeException("Plan introuvable"));

        HandPayment payment = new HandPayment();
        payment.setUser(user);
        payment.setPlan(plan);
        payment.setAmount(dto.getAmount());
        payment.setNotes(dto.getNotes());

        if (dto.getBillingCycle() != null) {
            try {
                payment.setBillingCycle(BillingCycle.valueOf(dto.getBillingCycle().toUpperCase()));
            } catch (IllegalArgumentException e) {
                payment.setBillingCycle(BillingCycle.MONTHLY);
            }
        } else {
            payment.setBillingCycle(BillingCycle.MONTHLY);
        }

        HandPayment savedPayment = handPaymentService.createHandPayment(payment);
        auditService.logSuccessAsUser(
                user,
                AuditEventType.HAND_PAYMENT_CREATE,
                "USER",
                user.getId() != null ? String.valueOf(user.getId()) : null,
                "Paiement manuel cree (sans mot de passe)"
        );
        return ResponseEntity.ok(savedPayment);
    }

    /**
     * Confirm a pending hand payment
     */
    @PostMapping("/confirm/{id}")
    public ResponseEntity<HandPayment> confirmPayment(@PathVariable Long id, Principal principal) {
        User admin = requireUser(principal);
        if (admin.getRole() != UserRole.ADMIN) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Acces refuse");
        }
        try {
            HandPayment payment = handPaymentService.confirmPayment(id);
            auditService.logSuccessAsUser(admin, AuditEventType.HAND_PAYMENT_CONFIRM, "HAND_PAYMENT", String.valueOf(id), "Paiement confirme");
            return ResponseEntity.ok(payment);
        } catch (RuntimeException ex) {
            auditService.logFailureAsUser(admin, AuditEventType.HAND_PAYMENT_CONFIRM, "HAND_PAYMENT", String.valueOf(id), ex.getMessage());
            throw ex;
        }
    }

    /**
     * Reject a pending hand payment
     */
    @PostMapping("/reject/{id}")
    public ResponseEntity<HandPayment> rejectPayment(@PathVariable Long id, Principal principal) {
        User admin = requireUser(principal);
        if (admin.getRole() != UserRole.ADMIN) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Acces refuse");
        }
        try {
            HandPayment payment = handPaymentService.rejectPayment(id);
            auditService.logSuccessAsUser(admin, AuditEventType.HAND_PAYMENT_REJECT, "HAND_PAYMENT", String.valueOf(id), "Paiement rejete");
            return ResponseEntity.ok(payment);
        } catch (RuntimeException ex) {
            auditService.logFailureAsUser(admin, AuditEventType.HAND_PAYMENT_REJECT, "HAND_PAYMENT", String.valueOf(id), ex.getMessage());
            throw ex;
        }
    }

    private User requireUser(Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            throw new RuntimeException("Utilisateur introuvable");
        }
        var candidates = PhoneNumberUtil.algeriaStoredCandidates(principal.getName());
        if (candidates.isEmpty()) {
            throw new RuntimeException("Utilisateur introuvable");
        }
        return userRepository.findFirstByPhoneNumberInOrderByIdAsc(candidates)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
    }
}
