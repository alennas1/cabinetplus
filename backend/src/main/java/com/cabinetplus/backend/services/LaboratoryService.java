package com.cabinetplus.backend.services;

import com.cabinetplus.backend.dto.LaboratoryPaymentRequest;
import com.cabinetplus.backend.dto.LaboratoryBillingEntryResponse;
import com.cabinetplus.backend.dto.LaboratoryBillingSummaryResponse;
import com.cabinetplus.backend.models.LaboratoryPayment;
import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.LaboratoryPaymentRepository;
import com.cabinetplus.backend.repositories.LaboratoryRepository;
import com.cabinetplus.backend.repositories.ProthesisRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class LaboratoryService {
    private final LaboratoryRepository repository;
    private final ProthesisRepository prothesisRepository;
    private final LaboratoryPaymentRepository laboratoryPaymentRepository;

    public List<Laboratory> findAllByUser(User user) {
        return repository.findByCreatedBy(user);
    }

    public Optional<Laboratory> findByIdAndUser(Long id, User user) {
        return repository.findByIdAndCreatedBy(id, user);
    }

    public Laboratory save(Laboratory lab) {
        return repository.save(lab);
    }

    public Optional<Laboratory> update(Long id, Laboratory updated, User user) {
        return repository.findById(id)
            .filter(l -> l.getCreatedBy().equals(user))
            .map(existing -> {
                existing.setName(updated.getName());
                existing.setContactPerson(updated.getContactPerson());
                existing.setPhoneNumber(updated.getPhoneNumber());
                existing.setAddress(updated.getAddress());
                return repository.save(existing);
            });
    }

    @Transactional
    public boolean deleteByUser(Long id, User user) {
        return findByIdAndUser(id, user)
            .map(l -> {
                long paymentCount = laboratoryPaymentRepository.countByLaboratoryIdAndCreatedBy(id, user);
                long prothesisCount = prothesisRepository.countByLaboratoryIdAndPractitioner(id, user);
                if (paymentCount > 0 || prothesisCount > 0) {
                    return false;
                }
                repository.delete(l);
                return true;
            })
            .orElse(false);
    }

    public double getTotalOwed(Laboratory laboratory, User user) {
        Double total = prothesisRepository.sumLabCostByPractitionerAndLaboratory(user, laboratory.getId());
        return total != null ? total : 0.0;
    }

    public double getTotalPaid(Laboratory laboratory, User user) {
        Double total = laboratoryPaymentRepository.sumAmountByLaboratoryIdAndCreatedBy(laboratory.getId(), user);
        return total != null ? total : 0.0;
    }

    public List<LaboratoryPayment> getPaymentsForLaboratory(Laboratory laboratory, User user) {
        return laboratoryPaymentRepository.findByLaboratoryIdAndCreatedByOrderByPaymentDateDesc(laboratory.getId(), user);
    }

    public List<LaboratoryBillingSummaryResponse> getBillingHistoryForLaboratory(Laboratory laboratory, User user) {
        return prothesisRepository.getMonthlyBillingByPractitionerAndLaboratory(user, laboratory.getId());
    }

    public List<LaboratoryBillingEntryResponse> getBillingEntriesForLaboratory(Laboratory laboratory, User user) {
        return prothesisRepository.getBillingEntriesByPractitionerAndLaboratory(user, laboratory.getId());
    }

    public LaboratoryPayment addPayment(Long laboratoryId, LaboratoryPaymentRequest request, User user) {
        Laboratory laboratory = findByIdAndUser(laboratoryId, user)
            .orElseThrow(() -> new RuntimeException("Laboratoire introuvable"));

        LaboratoryPayment payment = new LaboratoryPayment();
        payment.setLaboratory(laboratory);
        payment.setCreatedBy(user);
        payment.setAmount(request.amount());
        payment.setPaymentDate(request.paymentDate() != null ? request.paymentDate() : LocalDateTime.now());
        payment.setNotes(request.notes());

        return laboratoryPaymentRepository.save(payment);
    }

    @Transactional
    public boolean deletePayment(Long laboratoryId, Long paymentId, User user) {
        return laboratoryPaymentRepository.findByIdAndLaboratoryIdAndCreatedBy(paymentId, laboratoryId, user)
            .map(payment -> {
                laboratoryPaymentRepository.delete(payment);
                return true;
            })
            .orElse(false);
    }
}

