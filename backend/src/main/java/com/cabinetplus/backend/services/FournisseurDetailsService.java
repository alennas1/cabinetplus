package com.cabinetplus.backend.services;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cabinetplus.backend.dto.FournisseurBillingEntryResponse;
import com.cabinetplus.backend.dto.FournisseurBillingSummaryResponse;
import com.cabinetplus.backend.dto.FournisseurPaymentRequest;
import com.cabinetplus.backend.dto.FournisseurPaymentResponse;
import com.cabinetplus.backend.dto.CountTotalResponseDTO;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Expense;
import com.cabinetplus.backend.models.Fournisseur;
import com.cabinetplus.backend.models.FournisseurPayment;
import com.cabinetplus.backend.models.Item;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.ExpenseRepository;
import com.cabinetplus.backend.repositories.FournisseurPaymentRepository;
import com.cabinetplus.backend.repositories.FournisseurRepository;
import com.cabinetplus.backend.repositories.ItemRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FournisseurDetailsService {

    private final FournisseurRepository fournisseurRepository;
    private final ItemRepository itemRepository;
    private final ExpenseRepository expenseRepository;
    private final FournisseurPaymentRepository fournisseurPaymentRepository;

    public Optional<Fournisseur> findByIdAndUser(Long id, User user) {
        return fournisseurRepository.findByIdAndCreatedBy(id, user);
    }

    public double getTotalOwed(Fournisseur fournisseur, User user) {
        double itemsTotal = itemRepository.sumPriceByFournisseur(user, fournisseur.getId()).orElse(0.0);
        double expensesTotal = expenseRepository.sumAmountByFournisseur(user, fournisseur.getId()).orElse(0.0);
        return itemsTotal + expensesTotal;
    }

    public double getTotalPaid(Fournisseur fournisseur, User user) {
        Double total = fournisseurPaymentRepository.sumAmountByFournisseurIdAndCreatedBy(fournisseur.getId(), user);
        return total != null ? total : 0.0;
    }

    public List<FournisseurPayment> getPaymentsForFournisseur(Fournisseur fournisseur, User user) {
        return fournisseurPaymentRepository.findByFournisseurIdAndCreatedByOrderByPaymentDateDesc(fournisseur.getId(), user)
                .stream()
                .filter(p -> p != null && p.getRecordStatus() != RecordStatus.ARCHIVED)
                .toList();
    }

    public Page<FournisseurPaymentResponse> getPaymentsPagedForFournisseur(
            Fournisseur fournisseur,
            User user,
            LocalDateTime from,
            LocalDateTime to,
            Pageable pageable
    ) {
        if (fournisseur == null || user == null) {
            return Page.empty(pageable);
        }

        boolean fromEnabled = from != null;
        boolean toEnabled = to != null;
        return fournisseurPaymentRepository.searchPaymentsPaged(
                        fournisseur.getId(),
                        user,
                        RecordStatus.ARCHIVED,
                        fromEnabled,
                        from,
                        toEnabled,
                        to,
                        pageable
                )
                .map(payment -> new FournisseurPaymentResponse(
                        payment.getId(),
                        payment.getAmount(),
                        payment.getPaymentDate(),
                        payment.getNotes(),
                        payment.getRecordStatus(),
                        payment.getCancelledAt(),
                        payment.getCreatedBy() != null
                                ? ((payment.getCreatedBy().getFirstname() != null ? payment.getCreatedBy().getFirstname().trim() : "")
                                + " " + (payment.getCreatedBy().getLastname() != null ? payment.getCreatedBy().getLastname().trim() : "")).trim()
                                : null
                ));
    }

    public CountTotalResponseDTO getPaymentsSummaryForFournisseur(
            Fournisseur fournisseur,
            User user,
            LocalDateTime from,
            LocalDateTime to
    ) {
        if (fournisseur == null || user == null) {
            return new CountTotalResponseDTO(0, 0.0);
        }

        boolean fromEnabled = from != null;
        boolean toEnabled = to != null;
        return parseCountTotal(fournisseurPaymentRepository.getPaymentsSummary(
                fournisseur.getId(),
                user,
                RecordStatus.ARCHIVED,
                RecordStatus.CANCELLED,
                fromEnabled,
                from,
                toEnabled,
                to
        ));
    }

    public List<FournisseurBillingEntryResponse> getBillingEntriesForFournisseur(Fournisseur fournisseur, User user) {
        List<FournisseurBillingEntryResponse> entries = new ArrayList<>();
        String createdByName = null;
        if (user != null) {
            String first = user.getFirstname() != null ? user.getFirstname().trim() : "";
            String last = user.getLastname() != null ? user.getLastname().trim() : "";
            String combined = (first + " " + last).trim();
            createdByName = combined.isBlank() ? null : combined;
        }

        List<Item> items = itemRepository.findByFournisseur_IdAndCreatedByOrderByCreatedAtDesc(fournisseur.getId(), user);
        for (Item item : items) {
            String itemName = item.getItemDefault() != null ? item.getItemDefault().getName() : "Achat";
            entries.add(new FournisseurBillingEntryResponse(
                    item.getId(),
                    "ITEM",
                    itemName,
                    item.getPrice() != null ? item.getPrice() : 0.0,
                    item.getCreatedAt(),
                    createdByName
            ));
        }

        List<Expense> expenses = expenseRepository.findByFournisseur_IdAndCreatedByOrderByDateDesc(fournisseur.getId(), user);
        for (Expense expense : expenses) {
            LocalDate date = expense.getDate();
            entries.add(new FournisseurBillingEntryResponse(
                    expense.getId(),
                    "EXPENSE",
                    expense.getTitle() != null ? expense.getTitle() : "Dépense",
                    expense.getAmount() != null ? expense.getAmount() : 0.0,
                    date != null ? date.atStartOfDay() : null,
                    createdByName
            ));
        }

        entries.sort(Comparator.comparing(FournisseurBillingEntryResponse::billingDate, Comparator.nullsLast(Comparator.reverseOrder())));
        return entries;
    }

    public Page<FournisseurBillingEntryResponse> getBillingEntriesPagedForFournisseur(
            Fournisseur fournisseur,
            User user,
            LocalDateTime from,
            LocalDateTime to,
            Pageable pageable
    ) {
        if (fournisseur == null || user == null) {
            return Page.empty(pageable);
        }

        boolean fromEnabled = from != null;
        boolean toEnabled = to != null;
        Page<Object[]> raw = itemRepository.findFournisseurBillingEntries(
                fournisseur.getId(),
                user.getId(),
                fromEnabled,
                from,
                toEnabled,
                to,
                pageable
        );

        return raw.map(row -> {
            if (row == null || row.length < 6) {
                return new FournisseurBillingEntryResponse(null, null, null, null, null, null);
            }

            Long referenceId = row[0] instanceof Number n ? n.longValue() : null;
            String source = row[1] != null ? String.valueOf(row[1]) : null;
            String label = row[2] != null ? String.valueOf(row[2]) : null;
            Double amount = row[3] instanceof Number n ? n.doubleValue() : null;

            LocalDateTime billingDate = null;
            Object dateObj = row[4];
            if (dateObj instanceof LocalDateTime ldt) {
                billingDate = ldt;
            } else if (dateObj instanceof java.sql.Timestamp ts) {
                billingDate = ts.toLocalDateTime();
            }

            String createdByName = row[5] != null ? String.valueOf(row[5]) : null;

            return new FournisseurBillingEntryResponse(referenceId, source, label, amount, billingDate, createdByName);
        });
    }

    public CountTotalResponseDTO getBillingEntriesSummaryForFournisseur(
            Fournisseur fournisseur,
            User user,
            LocalDateTime from,
            LocalDateTime to
    ) {
        if (fournisseur == null || user == null) {
            return new CountTotalResponseDTO(0, 0.0);
        }

        boolean fromEnabled = from != null;
        boolean toEnabled = to != null;
        return parseCountTotal(itemRepository.getFournisseurBillingEntriesSummary(
                fournisseur.getId(),
                user.getId(),
                fromEnabled,
                from,
                toEnabled,
                to
        ));
    }

    private CountTotalResponseDTO parseCountTotal(Object result) {
        long count = 0L;
        double total = 0.0;
        if (result instanceof Object[] row) {
            if (row.length > 0 && row[0] instanceof Object[] arr) {
                if (arr.length > 0 && arr[0] instanceof Number n) count = n.longValue();
                if (arr.length > 1 && arr[1] instanceof Number n) total = n.doubleValue();
            } else {
                if (row.length > 0 && row[0] instanceof Number n) count = n.longValue();
                if (row.length > 1 && row[1] instanceof Number n) total = n.doubleValue();
            }
        }
        return new CountTotalResponseDTO(count, total);
    }

    public List<FournisseurBillingSummaryResponse> getBillingHistoryForFournisseur(Fournisseur fournisseur, User user) {
        Map<String, Double> grouped = getBillingEntriesForFournisseur(fournisseur, user).stream()
                .collect(Collectors.groupingBy(
                        e -> e.billingDate().getYear() + "-" + e.billingDate().getMonthValue(),
                        Collectors.summingDouble(e -> e.amount() != null ? e.amount() : 0.0)
                ));

        return grouped.entrySet().stream()
                .map(entry -> {
                    String[] parts = entry.getKey().split("-");
                    Integer year = Integer.valueOf(parts[0]);
                    Integer month = Integer.valueOf(parts[1]);
                    return new FournisseurBillingSummaryResponse(year, month, entry.getValue());
                })
                .sorted((a, b) -> {
                    int cmp = b.year().compareTo(a.year());
                    if (cmp != 0) return cmp;
                    return b.month().compareTo(a.month());
                })
                .toList();
    }

    public FournisseurPayment addPayment(Long fournisseurId, FournisseurPaymentRequest request, User user) {
        Fournisseur fournisseur = fournisseurRepository.findByIdAndCreatedBy(fournisseurId, user)
                .orElseThrow(() -> new NotFoundException("Fournisseur introuvable"));
        if (fournisseur.getArchivedAt() != null || fournisseur.getRecordStatus() != RecordStatus.ACTIVE) {
            throw new BadRequestException(java.util.Map.of("_", "Fournisseur archivé : lecture seule."));
        }

        if (request.amount() == null || request.amount() <= 0) {
            throw new BadRequestException(java.util.Map.of("amount", "Montant invalide"));
        }

        FournisseurPayment payment = new FournisseurPayment();
        payment.setFournisseur(fournisseur);
        payment.setCreatedBy(user);
        payment.setAmount(request.amount());
        // Force server-side timestamp for traceability (ignore any client-provided paymentDate).
        payment.setPaymentDate(LocalDateTime.now());
        payment.setNotes(request.notes());

        return fournisseurPaymentRepository.save(payment);
    }

    @Transactional
    public boolean deletePayment(Long fournisseurId, Long paymentId, User user) {
        return fournisseurPaymentRepository.findByIdAndFournisseurIdAndCreatedBy(paymentId, fournisseurId, user)
                .map(payment -> {
                    if (payment.getRecordStatus() != RecordStatus.CANCELLED) {
                        payment.setRecordStatus(RecordStatus.CANCELLED);
                        payment.setCancelledAt(LocalDateTime.now());
                        fournisseurPaymentRepository.save(payment);
                    }
                    return true;
                })
                .orElse(false);
    }
}
