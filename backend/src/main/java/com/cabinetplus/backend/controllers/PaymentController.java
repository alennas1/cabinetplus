package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.PaymentRequest;
import com.cabinetplus.backend.dto.PaymentResponse;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.dto.CancellationRequest;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.models.Payment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PaymentRepository;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.CancellationSecurityService;
import com.cabinetplus.backend.services.PaymentService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;
import com.cabinetplus.backend.util.PaginationUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final AuditService auditService;
    private final PaymentRepository paymentRepository;
    private final UserService userService;
    private final PublicIdResolutionService publicIdResolutionService;
    private final CancellationSecurityService cancellationSecurityService;

    @PostMapping("/payments")
    public ResponseEntity<PaymentResponse> create(@Valid @RequestBody PaymentRequest request, Principal principal) {
        User actor = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        PaymentResponse created = paymentService.create(request, actor);
        auditService.logSuccess(
                AuditEventType.PAYMENT_CREATE,
                "PATIENT",
                String.valueOf(request.patientId()),
                "Paiement ajoute"
        );
        return ResponseEntity
                .created(URI.create("/api/payments/" + created.id()))
                .body(created);
    }

    @GetMapping("/patients/{patientId}/payments")
    public ResponseEntity<List<Payment>> listByPatient(@PathVariable String patientId, Principal principal) {
        User actor = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        User ownerDentist = userService.resolveClinicOwner(actor);
        Long internalPatientId = publicIdResolutionService.requirePatientOwnedBy(patientId, ownerDentist).getId();
        auditService.logSuccess(
                AuditEventType.PAYMENT_READ,
                "PATIENT",
                internalPatientId != null ? String.valueOf(internalPatientId) : null,
                "Paiements patient consultes"
        );
        return ResponseEntity.ok(paymentService.listByPatient(internalPatientId, actor));
    }

    @GetMapping("/patients/{patientId}/payments/paged")
    public ResponseEntity<PageResponse<Payment>> listByPatientPaged(
            @PathVariable String patientId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "field", required = false) String field,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "sortKey", required = false) String sortKey,
            @RequestParam(name = "sortDirection", required = false) String sortDirection,
            Principal principal
    ) {
        User actor = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        User ownerDentist = userService.resolveClinicOwner(actor);
        Long internalPatientId = publicIdResolutionService.requirePatientOwnedBy(patientId, ownerDentist).getId();

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        String fieldNorm = field != null ? field.trim().toLowerCase() : "";
        String fieldKey = switch (fieldNorm) {
            case "method", "amount" -> fieldNorm;
            default -> "";
        };

        String qNorm = q != null ? q.trim().toLowerCase() : "";
        String qLike = qNorm.isBlank() ? "" : ("%" + qNorm + "%");

        String statusNorm = status != null ? status.trim().toUpperCase() : "";
        Payment.Method method = null;
        if (!statusNorm.isBlank()) {
            try {
                method = Payment.Method.valueOf(statusNorm);
            } catch (Exception ignored) {
                method = null;
            }
        }

        boolean fromEnabled = from != null;
        boolean toEnabled = to != null;
        LocalDateTime fromDateTime = fromEnabled ? from.atStartOfDay() : LocalDate.of(1900, 1, 1).atStartOfDay();
        LocalDateTime toDateTimeExclusive = toEnabled ? to.plusDays(1).atStartOfDay() : LocalDate.of(3000, 1, 1).atStartOfDay();

        String sortKeyNorm = sortKey != null ? sortKey.trim().toLowerCase() : "";
        boolean desc = "desc".equalsIgnoreCase(sortDirection);
        Sort.Direction direction = desc ? Sort.Direction.DESC : Sort.Direction.ASC;

        Sort sort = switch (sortKeyNorm) {
            case "amount" -> Sort.by(direction, "amount");
            case "method" -> Sort.by(direction, "method");
            case "date" -> Sort.by(direction, "date");
            default -> Sort.by(Sort.Direction.DESC, "date");
        };
        sort = sort.and(Sort.by(Sort.Direction.ASC, "id"));

        PageRequest pageable = PageRequest.of(safePage, safeSize, sort);

        var paged = paymentService.searchPatientPayments(
                internalPatientId,
                actor,
                method,
                fromEnabled,
                fromDateTime,
                toEnabled,
                toDateTimeExclusive,
                qLike,
                fieldKey,
                pageable
        );

        return ResponseEntity.ok(PaginationUtil.toPageResponse(paged));
    }

@PutMapping("/payments/{paymentId}/cancel")
    public ResponseEntity<Payment> cancel(@PathVariable Long paymentId, @Valid @RequestBody CancellationRequest payload, Principal principal) {
        User actor = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        String reason = cancellationSecurityService.requirePinAndReason(actor, payload.pin(), payload.reason());
        Payment existing = paymentRepository.findById(paymentId).orElse(null);
        Payment cancelled = paymentService.cancel(paymentId, actor, reason);
        auditService.logSuccess(
                AuditEventType.PAYMENT_CANCEL,
                "PATIENT",
                existing != null && existing.getPatient() != null
                        ? String.valueOf(existing.getPatient().getId())
                        : null,
                existing != null
                        ? ("Paiement annulé. Motif: " + reason)
                        : ("Paiement annulé: #" + paymentId + ". Motif: " + reason)
        );
        return ResponseEntity.ok(cancelled);
    }

    private User getClinicUser(Principal principal) {
        User currentUser = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(currentUser);
    }
}
