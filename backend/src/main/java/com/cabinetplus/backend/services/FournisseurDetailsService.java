package com.cabinetplus.backend.services;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cabinetplus.backend.dto.FournisseurBillingEntryResponse;
import com.cabinetplus.backend.dto.FournisseurBillingSummaryResponse;
import com.cabinetplus.backend.dto.FournisseurPaymentRequest;
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
        return fournisseurPaymentRepository.findByFournisseurIdAndCreatedByOrderByPaymentDateDesc(fournisseur.getId(), user);
    }

    public List<FournisseurBillingEntryResponse> getBillingEntriesForFournisseur(Fournisseur fournisseur, User user) {
        List<FournisseurBillingEntryResponse> entries = new ArrayList<>();

        List<Item> items = itemRepository.findByFournisseur_IdAndCreatedByOrderByCreatedAtDesc(fournisseur.getId(), user);
        for (Item item : items) {
            String itemName = item.getItemDefault() != null ? item.getItemDefault().getName() : "Achat";
            entries.add(new FournisseurBillingEntryResponse(
                    item.getId(),
                    "ITEM",
                    itemName,
                    item.getPrice() != null ? item.getPrice() : 0.0,
                    item.getCreatedAt()
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
                    date != null ? date.atStartOfDay() : null
            ));
        }

        entries.sort(Comparator.comparing(FournisseurBillingEntryResponse::billingDate, Comparator.nullsLast(Comparator.reverseOrder())));
        return entries;
    }

    public List<FournisseurBillingSummaryResponse> getBillingHistoryForFournisseur(Fournisseur fournisseur, User user) {
        Map<String, Double> grouped = getBillingEntriesForFournisseur(fournisseur, user).stream()
                .filter(e -> e.billingDate() != null)
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
                    fournisseurPaymentRepository.delete(payment);
                    return true;
                })
                .orElse(false);
    }
}
