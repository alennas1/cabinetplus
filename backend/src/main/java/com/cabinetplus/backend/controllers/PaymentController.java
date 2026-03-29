package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.PaymentRequest;
import com.cabinetplus.backend.dto.PaymentResponse;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.models.Payment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PaymentRepository;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.PaymentService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;
import com.cabinetplus.backend.util.PagedQueryUtil;
import com.cabinetplus.backend.util.PaginationUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.security.Principal;
import java.time.LocalDate;
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

        final String fieldNorm = field != null ? field.trim().toLowerCase() : "";
        final String fieldKey = fieldNorm.isBlank() ? "amount" : fieldNorm;
        String sortKeyNorm = sortKey != null ? sortKey.trim().toLowerCase() : "";
        boolean desc = "desc".equalsIgnoreCase(sortDirection);
        String statusNorm = status != null ? status.trim().toUpperCase() : "";

        Comparator<Payment> comparator = buildPaymentSortComparator(sortKeyNorm, desc);

        List<Payment> filtered = paymentService.listByPatient(internalPatientId, actor).stream()
                .filter(p -> {
                    if (p == null) return false;
                    if (p.getRecordStatus() == RecordStatus.ARCHIVED) return false;

                    if (!statusNorm.isBlank()) {
                        String method = p.getMethod() != null ? p.getMethod().name() : "";
                        if (!method.equalsIgnoreCase(statusNorm)) return false;
                    }

                    if (!PagedQueryUtil.isInDateRange(p.getDate(), from, to)) return false;

                    if (q != null && !q.isBlank()) {
                        String hay = switch (fieldKey) {
                            case "method" -> p.getMethod() != null ? p.getMethod().name() : null;
                            case "amount" -> p.getAmount() != null ? String.valueOf(p.getAmount()) : null;
                            default -> {
                                String amount = p.getAmount() != null ? String.valueOf(p.getAmount()) : "";
                                String method = p.getMethod() != null ? p.getMethod().name() : "";
                                yield amount + " " + method;
                            }
                        };
                        if (!PagedQueryUtil.matchesSearch(hay, q)) return false;
                    }

                    return true;
                })
                .sorted(comparator)
                .toList();

        return ResponseEntity.ok(PaginationUtil.toPageResponse(filtered, page, size));
    }

    private static Comparator<Payment> buildPaymentSortComparator(String sortKeyNorm, boolean desc) {
        Comparator<Double> doubleComparator = PagedQueryUtil.doubleComparator(desc);
        Comparator<String> stringComparator = PagedQueryUtil.stringComparator(desc);
        var dateTimeComparator = PagedQueryUtil.dateTimeComparator(desc);

        Comparator<Payment> comparator = switch (sortKeyNorm) {
            case "amount" -> Comparator.comparing(p -> p != null ? p.getAmount() : null, doubleComparator);
            case "method" -> Comparator.comparing(
                    p -> p != null && p.getMethod() != null ? p.getMethod().name() : null,
                    stringComparator
            );
            case "date" -> Comparator.comparing(p -> p != null ? p.getDate() : null, dateTimeComparator);
            default -> Comparator.comparing(
                    p -> p != null ? p.getDate() : null,
                    PagedQueryUtil.dateTimeComparator(true)
            );
        };

        return comparator.thenComparing(p -> p != null ? p.getId() : null, PagedQueryUtil.longComparator(false));
    }

    @PutMapping("/payments/{paymentId}/cancel")
    public ResponseEntity<Void> cancel(@PathVariable Long paymentId, Principal principal) {
        User actor = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        Payment existing = paymentRepository.findById(paymentId).orElse(null);
        paymentService.delete(paymentId, actor);
        auditService.logSuccess(
                AuditEventType.PAYMENT_CANCEL,
                "PATIENT",
                existing != null && existing.getPatient() != null
                        ? String.valueOf(existing.getPatient().getId())
                        : null,
                existing != null
                        ? "Paiement annulé"
                        : "Paiement annulé: #" + paymentId
        );
        return ResponseEntity.noContent().build();
    }

    private User getClinicUser(Principal principal) {
        User currentUser = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(currentUser);
    }
}
