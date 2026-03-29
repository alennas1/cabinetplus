package com.cabinetplus.backend.services;

import com.cabinetplus.backend.dto.LaboratoryPaymentRequest;
import com.cabinetplus.backend.dto.LaboratoryBillingEntryResponse;
import com.cabinetplus.backend.dto.LaboratoryBillingSummaryResponse;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.exceptions.BadRequestException;
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
        return repository.findByCreatedByAndArchivedAtIsNullAndRecordStatus(user, RecordStatus.ACTIVE);
    }

    public List<Laboratory> findArchivedByUser(User user) {
        return repository.findArchivedByCreatedBy(user);
    }

    public Optional<Laboratory> findByIdAndUser(Long id, User user) {
        return repository.findByIdAndCreatedBy(id, user);
    }

    public Laboratory save(Laboratory lab) {
        if (lab == null) {
            throw new BadRequestException(java.util.Map.of("_", "Corps de requete invalide"));
        }
        if (lab.getCreatedBy() == null) {
            throw new BadRequestException(java.util.Map.of("createdBy", "Utilisateur invalide"));
        }

        String name = lab.getName() != null ? lab.getName().trim() : null;
        lab.setName(name);
        if (name != null && !name.isBlank()) {
            boolean exists = lab.getId() == null
                    ? repository.existsByCreatedByAndNameIgnoreCase(lab.getCreatedBy(), name)
                    : repository.existsByCreatedByAndNameIgnoreCaseAndIdNot(lab.getCreatedBy(), name, lab.getId());
            if (exists) {
                throw new BadRequestException(java.util.Map.of("name", "Ce laboratoire existe deja"));
            }
        }
        return repository.save(lab);
    }

    public Optional<Laboratory> update(Long id, Laboratory updated, User user) {
        return repository.findByIdAndCreatedBy(id, user)
            .map(existing -> {
                if (existing.getArchivedAt() != null || existing.getRecordStatus() != RecordStatus.ACTIVE) {
                    throw new BadRequestException(java.util.Map.of("_", "Laboratoire archivé : lecture seule."));
                }
                String nextName = updated.getName() != null ? updated.getName().trim() : null;
                if (nextName != null && !nextName.isBlank()) {
                    boolean exists = repository.existsByCreatedByAndNameIgnoreCaseAndIdNot(user, nextName, id);
                    if (exists) {
                        throw new BadRequestException(java.util.Map.of("name", "Ce laboratoire existe deja"));
                    }
                }
                existing.setName(nextName);
                existing.setContactPerson(updated.getContactPerson());
                existing.setPhoneNumber(updated.getPhoneNumber());
                existing.setAddress(updated.getAddress());
                return repository.save(existing);
            });
    }

    @Transactional
    public Optional<Laboratory> archiveByUser(Long id, User user) {
        return findByIdAndUser(id, user)
                .map(l -> {
                    // Strict no-delete policy: deletion becomes archiving.
                    if (l.getArchivedAt() == null || l.getRecordStatus() == RecordStatus.ACTIVE) {
                        l.setRecordStatus(RecordStatus.ARCHIVED);
                        l.setArchivedAt(LocalDateTime.now());
                        repository.save(l);
                    }
                    return l;
                });
    }

    @Transactional
    public Optional<Laboratory> unarchiveByUser(Long id, User user) {
        return findByIdAndUser(id, user)
                .map(l -> {
                    if (l.getArchivedAt() != null || l.getRecordStatus() != RecordStatus.ACTIVE) {
                        l.setRecordStatus(RecordStatus.ACTIVE);
                        l.setArchivedAt(null);
                        repository.save(l);
                    }
                    return l;
                });
    }

    @Transactional
    public boolean deleteByUser(Long id, User user) {
        return archiveByUser(id, user).isPresent();
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
        return laboratoryPaymentRepository.findByLaboratoryIdAndCreatedByOrderByPaymentDateDesc(laboratory.getId(), user)
                .stream()
                .filter(p -> p != null && p.getRecordStatus() != RecordStatus.ARCHIVED)
                .toList();
    }

    public List<LaboratoryBillingSummaryResponse> getBillingHistoryForLaboratory(Laboratory laboratory, User user) {
        return prothesisRepository.getMonthlyBillingByPractitionerAndLaboratory(user, laboratory.getId());
    }

    public List<LaboratoryBillingEntryResponse> getBillingEntriesForLaboratory(Laboratory laboratory, User user) {
        return prothesisRepository.findBillingProthesesByPractitionerAndLaboratory(user, laboratory.getId()).stream()
                .map(p -> {
                    String patientName = "-";
                    if (p != null && p.getPatient() != null) {
                        String first = p.getPatient().getFirstname() != null ? p.getPatient().getFirstname().trim() : "";
                        String last = p.getPatient().getLastname() != null ? p.getPatient().getLastname().trim() : "";
                        String combined = (first + " " + last).trim();
                        if (!combined.isBlank()) patientName = combined;
                    }

                    String prothesisName = p != null && p.getProthesisCatalog() != null
                            ? p.getProthesisCatalog().getName()
                            : "-";

                    return new LaboratoryBillingEntryResponse(
                            p != null ? p.getId() : null,
                            patientName,
                            prothesisName,
                            p != null ? p.getLabCost() : null,
                            p != null && p.getSentToLabDate() != null ? p.getSentToLabDate() : (p != null ? p.getDateCreated() : null)
                    );
                })
                .toList();
    }

    public LaboratoryPayment addPayment(Long laboratoryId, LaboratoryPaymentRequest request, User user) {
        Laboratory laboratory = findByIdAndUser(laboratoryId, user)
            .orElseThrow(() -> new RuntimeException("Laboratoire introuvable"));
        if (laboratory.getArchivedAt() != null || laboratory.getRecordStatus() != RecordStatus.ACTIVE) {
            throw new BadRequestException(java.util.Map.of("_", "Laboratoire archivé : lecture seule."));
        }

        if (request.amount() == null || request.amount() <= 0) {
            throw new BadRequestException(java.util.Map.of("amount", "Montant invalide"));
        }

        LaboratoryPayment payment = new LaboratoryPayment();
        payment.setLaboratory(laboratory);
        payment.setCreatedBy(user);
        payment.setAmount(request.amount());
        // Force server-side timestamp for traceability (ignore any client-provided paymentDate).
        payment.setPaymentDate(LocalDateTime.now());
        payment.setNotes(request.notes());

        return laboratoryPaymentRepository.save(payment);
    }

    @Transactional
    public boolean deletePayment(Long laboratoryId, Long paymentId, User user) {
        return laboratoryPaymentRepository.findByIdAndLaboratoryIdAndCreatedBy(paymentId, laboratoryId, user)
            .map(payment -> {
                if (payment.getRecordStatus() != RecordStatus.CANCELLED) {
                    payment.setRecordStatus(RecordStatus.CANCELLED);
                    payment.setCancelledAt(LocalDateTime.now());
                    laboratoryPaymentRepository.save(payment);
                }
                return true;
            })
            .orElse(false);
    }
}

