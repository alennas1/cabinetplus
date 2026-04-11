package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.*;
import com.cabinetplus.backend.repositories.*;
import com.cabinetplus.backend.dto.*;
import com.cabinetplus.backend.enums.CancellationRequestDecision;
import com.cabinetplus.backend.enums.LaboratoryConnectionStatus;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.events.LabOpsChangedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProthesisService {
    private static final Set<String> ALLOWED_STATUSES = Set.of("PENDING", "SENT_TO_LAB", "PRETE", "RECEIVED", "FITTED");

    private final ProthesisRepository repository;
    private final ProthesisCatalogRepository catalogRepository;
    private final PatientRepository patientRepository;
    private final LaboratoryRepository labRepository;
    private final LaboratoryConnectionRepository laboratoryConnectionRepository;
    private final RealtimeRecipientsService realtimeRecipientsService;
    private final ApplicationEventPublisher eventPublisher;
    private final ReferenceCodeGeneratorService referenceCodeGeneratorService;

    public List<Prothesis> findAllByUser(User user) {
        if (user.getRole() == UserRole.ADMIN) {
            return repository.findAll().stream()
                    .filter(p -> p != null && p.getRecordStatus() == RecordStatus.ACTIVE)
                    .toList();
        }
        return repository.findByPractitioner(user).stream()
                .filter(p -> p != null && p.getRecordStatus() == RecordStatus.ACTIVE)
                .toList();
    }

    public Page<Prothesis> searchAllPaged(
            User user,
            int page,
            int size,
            String q,
            String status,
            String filterBy,
            String dateType,
            LocalDateTime from,
            LocalDateTime to,
            String sortKey,
            boolean desc,
            Long focusId
    ) {
        if (user == null) {
            return Page.empty(PageRequest.of(Math.max(page, 0), Math.max(size, 1)));
        }

        User practitionerFilter = user.getRole() == UserRole.ADMIN ? null : user;

        String statusNorm = status != null && !status.isBlank() ? status.trim().toUpperCase(Locale.ROOT) : "";

        String filterKey = normalizeProthesisFilterKey(filterBy);
        String dateTypeKey = normalizeDateType(dateType);

        String qNorm = q != null ? q.trim().toLowerCase(Locale.ROOT) : "";
        String qLike = qNorm.isBlank() ? "" : "%" + qNorm + "%";
        Integer qTooth = parseIntOrNull(qNorm);
        boolean qToothEnabled = qTooth != null;

        boolean fromEnabled = from != null;
        boolean toEnabled = to != null;

        boolean sortByTeeth = "teeth".equalsIgnoreCase(sortKey != null ? sortKey.trim() : "");
        Sort sort = sortByTeeth ? Sort.unsorted() : buildMainSort(sortKey, dateTypeKey, desc);

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 200);

        int effectivePage = safePage;
        if (focusId != null && safeSize > 0) {
            Integer focusPage = resolveFocusPage(
                    focusId,
                    practitionerFilter,
                    statusNorm,
                    filterKey,
                    dateTypeKey,
                    fromEnabled,
                    from,
                    toEnabled,
                    to,
                    qLike,
                    qToothEnabled,
                    qTooth,
                    sortByTeeth,
                    desc,
                    safeSize,
                    sort
            );
            if (focusPage != null) {
                effectivePage = focusPage;
            }
        }

        Pageable pageable = sortByTeeth
                ? PageRequest.of(effectivePage, safeSize)
                : PageRequest.of(effectivePage, safeSize, sort);

        if (sortByTeeth) {
            return desc
                    ? repository.searchActiveProthesesSortByToothDesc(
                        practitionerFilter,
                        RecordStatus.ACTIVE,
                        statusNorm,
                        filterKey,
                        dateTypeKey,
                        fromEnabled,
                        from,
                        toEnabled,
                        to,
                        qLike,
                        qToothEnabled,
                        qTooth,
                        pageable
                    )
                    : repository.searchActiveProthesesSortByToothAsc(
                        practitionerFilter,
                        RecordStatus.ACTIVE,
                        statusNorm,
                        filterKey,
                        dateTypeKey,
                        fromEnabled,
                        from,
                        toEnabled,
                        to,
                        qLike,
                        qToothEnabled,
                        qTooth,
                        pageable
                    );
        }

        return repository.searchActiveProtheses(
                practitionerFilter,
                RecordStatus.ACTIVE,
                statusNorm,
                filterKey,
                dateTypeKey,
                fromEnabled,
                from,
                toEnabled,
                to,
                qLike,
                qToothEnabled,
                qTooth,
                pageable
        );
    }

    private Integer resolveFocusPage(
            Long focusId,
            User practitionerFilter,
            String statusNorm,
            String filterKey,
            String dateTypeKey,
            boolean fromEnabled,
            LocalDateTime from,
            boolean toEnabled,
            LocalDateTime to,
            String qLike,
            boolean qToothEnabled,
            Integer qTooth,
            boolean sortByTeeth,
            boolean desc,
            int size,
            Sort sort
    ) {
        if (focusId == null || size <= 0) return null;

        int maxScanPages = 200;
        for (int i = 0; i < maxScanPages; i++) {
            Pageable probe = sortByTeeth
                    ? PageRequest.of(i, size)
                    : PageRequest.of(i, size, sort);

            Page<Long> ids = sortByTeeth
                    ? (desc
                        ? repository.searchActiveProthesisIdsSortByToothDesc(
                            practitionerFilter,
                            RecordStatus.ACTIVE,
                            statusNorm,
                            filterKey,
                            dateTypeKey,
                            fromEnabled,
                            from,
                            toEnabled,
                            to,
                            qLike,
                            qToothEnabled,
                            qTooth,
                            probe
                        )
                        : repository.searchActiveProthesisIdsSortByToothAsc(
                            practitionerFilter,
                            RecordStatus.ACTIVE,
                            statusNorm,
                            filterKey,
                            dateTypeKey,
                            fromEnabled,
                            from,
                            toEnabled,
                            to,
                            qLike,
                            qToothEnabled,
                            qTooth,
                            probe
                        )
                    )
                    : repository.searchActiveProthesisIds(
                        practitionerFilter,
                        RecordStatus.ACTIVE,
                        statusNorm,
                        filterKey,
                        dateTypeKey,
                        fromEnabled,
                        from,
                        toEnabled,
                        to,
                        qLike,
                        qToothEnabled,
                        qTooth,
                        probe
                    );

            if (ids.getContent().contains(focusId)) {
                return i;
            }
            if (i >= ids.getTotalPages() - 1) {
                return null;
            }
        }

        return null;
    }

    private static String normalizeProthesisFilterKey(String filterBy) {
        if (filterBy == null) return "";
        String safe = filterBy.trim().toLowerCase(Locale.ROOT);
        return switch (safe) {
            case "prothesisname" -> "prothesisname";
            case "materialname" -> "materialname";
            default -> "";
        };
    }

    private static String normalizeDateType(String dateType) {
        if (dateType == null || dateType.isBlank()) return "dateCreated";
        String safe = dateType.trim();
        return switch (safe) {
            case "sentToLabDate" -> "sentToLabDate";
            case "actualReturnDate" -> "actualReturnDate";
            case "dateCreated" -> "dateCreated";
            default -> "dateCreated";
        };
    }

    private static Integer parseIntOrNull(String value) {
        if (value == null) return null;
        String raw = value.trim();
        if (raw.isBlank()) return null;
        if (!raw.chars().allMatch(Character::isDigit)) return null;
        try {
            return Integer.parseInt(raw);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static Sort buildMainSort(String sortKey, String dateTypeKey, boolean desc) {
        String key = sortKey != null && !sortKey.isBlank() ? sortKey.trim() : "dates";

        if ("work".equalsIgnoreCase(key)) {
            return Sort.by(
                    Sort.Order.by("prothesisCatalog.name").ignoreCase().with(desc ? Sort.Direction.DESC : Sort.Direction.ASC),
                    Sort.Order.by("prothesisCatalog.material.name").ignoreCase().with(desc ? Sort.Direction.DESC : Sort.Direction.ASC),
                    Sort.Order.asc("id")
            );
        }

        if ("lab".equalsIgnoreCase(key)) {
            return Sort.by(
                    Sort.Order.by("laboratory.name").ignoreCase().with(desc ? Sort.Direction.DESC : Sort.Direction.ASC),
                    Sort.Order.asc("id")
            );
        }

        if ("code".equalsIgnoreCase(key)) {
            return Sort.by(
                    Sort.Order.by("code").ignoreCase().nullsLast().with(desc ? Sort.Direction.DESC : Sort.Direction.ASC),
                    Sort.Order.asc("id")
            );
        }

        if ("status".equalsIgnoreCase(key)) {
            return Sort.by(
                    Sort.Order.by("status").ignoreCase().nullsLast().with(desc ? Sort.Direction.DESC : Sort.Direction.ASC),
                    Sort.Order.asc("id")
            );
        }

        if ("labCost".equalsIgnoreCase(key)) {
            return Sort.by(
                    (desc ? Sort.Order.desc("labCost") : Sort.Order.asc("labCost")).nullsLast(),
                    Sort.Order.asc("id")
            );
        }

        if ("dates".equalsIgnoreCase(key)) {
            String prop = switch (dateTypeKey) {
                case "sentToLabDate" -> "sentToLabDate";
                case "actualReturnDate" -> "actualReturnDate";
                default -> "dateCreated";
            };
            return Sort.by(
                    (desc ? Sort.Order.desc(prop) : Sort.Order.asc(prop)).nullsLast(),
                    Sort.Order.asc("id")
            );
        }

        return Sort.by(
                (desc ? Sort.Order.desc("dateCreated") : Sort.Order.asc("dateCreated")).nullsLast(),
                Sort.Order.asc("id")
        );
    }

    @Transactional
    public Prothesis create(ProthesisRequest dto, User user, User actor) {
        Patient patient = requirePatientOwnedBy(dto.patientId(), user);
        ProthesisCatalog catalog = requireCatalogOwnedBy(dto.catalogId(), user);
        List<Integer> teeth = normalizeTeeth(dto.teeth());
        assertCatalogRules(catalog, teeth);

        Prothesis p = new Prothesis();
        p.setPatient(patient);
        p.setProthesisCatalog(catalog);
        p.setPractitioner(user);
        p.setTeeth(teeth);
        p.setFinalPrice(dto.finalPrice());
        p.setLabCost(dto.labCost());
        p.setLabCode(trimToNull(dto.labCode()));
        p.setNotes(trimToNull(dto.notes()));
        p.setStatus("PENDING");
        p.setDateCreated(LocalDateTime.now());
        p.setUpdatedBy(actor != null ? actor : user);
        p.setUpdatedAt(p.getDateCreated());

        // Keep manually edited price when provided; otherwise fall back to catalog logic.
        if (dto.finalPrice() == null) {
            p.setFinalPrice(resolveCatalogAmount(catalog.getDefaultPrice(), catalog.isFlatFee(), teeth));
        }

        // Auto-fill lab cost from catalog when not manually provided.
        if (dto.labCost() == null) {
            p.setLabCost(resolveCatalogAmount(catalog.getDefaultLabCost(), catalog.isFlatFee(), teeth));
        }

        long count = repository.countByPractitionerAndDateCreatedGreaterThanEqualAndDateCreatedLessThan(
                user,
                referenceCodeGeneratorService.dayStart(p.getDateCreated()),
                referenceCodeGeneratorService.nextDayStart(p.getDateCreated())
        );
        p.setCode(referenceCodeGeneratorService.generate("PR", p.getDateCreated(), count));

        assertUniqueLabCode(p.getLabCode(), p.getPractitioner(), null);
        assertAmounts(p.getFinalPrice(), p.getLabCost());
        return repository.save(p);
    }

    @Transactional
    public Prothesis update(Long id, ProthesisRequest dto, User user, User actor) {
        Prothesis p = requireProthesisOwnedBy(id, user);
        if (p.getRecordStatus() == RecordStatus.CANCELLED) {
            throw new BadRequestException(java.util.Map.of("_", "Prothèse annulée : lecture seule."));
        }

        Patient patient = requirePatientOwnedBy(dto.patientId(), user);
        ProthesisCatalog catalog = requireCatalogOwnedBy(dto.catalogId(), user);
        List<Integer> teeth = normalizeTeeth(dto.teeth());
        assertCatalogRules(catalog, teeth);

        boolean catalogChanged = p.getProthesisCatalog() == null || !p.getProthesisCatalog().getId().equals(catalog.getId());
        boolean teethChanged = p.getTeeth() == null || !p.getTeeth().equals(teeth);

        p.setPatient(patient);
        p.setProthesisCatalog(catalog);
        p.setTeeth(teeth);
        if (dto.labCode() != null) {
            p.setLabCode(trimToNull(dto.labCode()));
        }
        p.setNotes(trimToNull(dto.notes()));
        p.setUpdatedBy(actor != null ? actor : user);

        if (dto.finalPrice() != null) {
            p.setFinalPrice(dto.finalPrice());
        } else {
            p.setFinalPrice(resolveCatalogAmount(catalog.getDefaultPrice(), catalog.isFlatFee(), teeth));
        }

        if (dto.labCost() != null) {
            p.setLabCost(dto.labCost());
        } else if (p.getLabCost() == null || catalogChanged || teethChanged) {
            p.setLabCost(resolveCatalogAmount(catalog.getDefaultLabCost(), catalog.isFlatFee(), teeth));
        }

        assertUniqueLabCode(p.getLabCode(), p.getPractitioner(), p.getId());
        assertAmounts(p.getFinalPrice(), p.getLabCost());
        return repository.save(p);
    }

    @Transactional
    public Prothesis assignToLab(Long id, LabAssignmentRequest dto, User user, User actor) {
        Prothesis p = requireProthesisOwnedBy(id, user);
        if (p.getRecordStatus() == RecordStatus.CANCELLED) {
            throw new BadRequestException(java.util.Map.of("_", "Prothèse annulée : lecture seule."));
        }
        String currentStatus = normalizeStatus(p.getStatus());
        if (!"PENDING".equals(currentStatus)) {
            throw new BadRequestException(java.util.Map.of("status", "Envoi au laboratoire autorise uniquement depuis le statut PENDING"));
        }

        Laboratory lab;
        if (user.getRole() == UserRole.ADMIN) {
            lab = labRepository.findById(dto.laboratoryId()).orElse(null);
        } else {
            lab = labRepository.findById(dto.laboratoryId()).orElse(null);
            if (lab != null && lab.getCreatedBy() != null && lab.getCreatedBy().getId() != null
                    && user.getId() != null && lab.getCreatedBy().getId().equals(user.getId())) {
                // Private lab created by the dentist
            } else if (lab != null && lab.getCreatedBy() != null && lab.getCreatedBy().getRole() == UserRole.LAB) {
                boolean connected = laboratoryConnectionRepository.existsByDentistAndLaboratoryAndStatus(
                        user,
                        lab,
                        LaboratoryConnectionStatus.ACCEPTED
                );
                if (!connected) {
                    lab = null;
                }
            } else {
                lab = null;
            }
        }

        if (lab == null) {
            throw new BadRequestException(java.util.Map.of("laboratoryId", "Laboratoire introuvable"));
        }

        p.setLaboratory(lab);
        p.setLabCost(dto.labCost()); // Cost in DZD
        p.setStatus("SENT_TO_LAB");
        p.setSentToLabDate(LocalDateTime.now());
        if (p.getSentToLabBy() == null) {
            p.setSentToLabBy(actor != null ? actor : user);
        }
        p.setUpdatedBy(actor != null ? actor : user);

        assertAmounts(p.getFinalPrice(), p.getLabCost());
        Prothesis saved = repository.save(p);
        publishProthesisRealtime(saved, "STATUS_CHANGED_BY_DENTIST", saved.getStatus());
        return saved;
    }

    @Transactional
    public Prothesis updateStatus(Long id, String newStatus, User user, User actor) {
        Prothesis p = requireProthesisOwnedBy(id, user);
        if (p.getRecordStatus() == RecordStatus.CANCELLED) {
            throw new BadRequestException(java.util.Map.of("_", "Prothèse annulée : lecture seule."));
        }

        String statusUpper = normalizeStatus(newStatus);
        if (!ALLOWED_STATUSES.contains(statusUpper)) {
            throw new BadRequestException(java.util.Map.of("status", "Statut invalide"));
        }

        String currentStatus = normalizeStatus(p.getStatus());
        if (!isAllowedStatusTransition(currentStatus, statusUpper)) {
            throw new BadRequestException(java.util.Map.of("status", "Transition de statut invalide"));
        }

        if ("SENT_TO_LAB".equals(statusUpper) && p.getLaboratory() == null) {
            throw new BadRequestException(java.util.Map.of("laboratoryId", "Laboratoire obligatoire"));
        }

        p.setStatus(statusUpper);

        if ("SENT_TO_LAB".equals(statusUpper) && p.getSentToLabDate() == null) {
            p.setSentToLabDate(LocalDateTime.now());
            if (p.getSentToLabBy() == null) {
                p.setSentToLabBy(actor != null ? actor : user);
            }
        }
        
         // Track specifically when the work arrived back at the cabinet
         if ("RECEIVED".equals(statusUpper)) {
             p.setActualReturnDate(LocalDateTime.now());
             if (p.getReceivedBy() == null) {
                 p.setReceivedBy(actor != null ? actor : user);
             }
         }

         if ("FITTED".equals(statusUpper)) {
             if (p.getPosedAt() == null) {
                 p.setPosedAt(LocalDateTime.now());
             }
             if (p.getPosedBy() == null) {
                 p.setPosedBy(actor != null ? actor : user);
             }
         }
         
          p.setUpdatedBy(actor != null ? actor : user);
          Prothesis saved = repository.save(p);
          publishProthesisRealtime(saved, "STATUS_CHANGED_BY_DENTIST", saved.getStatus());
          return saved;
      }

    public List<Prothesis> findByPractitionerAndStatus(User user, String status) {
        if (user.getRole() == UserRole.ADMIN) {
            return repository.findByStatus(status).stream()
                    .filter(p -> p != null && p.getRecordStatus() == RecordStatus.ACTIVE)
                    .toList();
        }
        return repository.findByPractitionerAndStatus(user, status).stream()
                .filter(p -> p != null && p.getRecordStatus() == RecordStatus.ACTIVE)
                .toList();
}

public List<Prothesis> findByPatientAndPractitioner(Long patientId, User user) {
    if (user.getRole() == UserRole.ADMIN) {
        return repository.findByPatientId(patientId).stream()
                .filter(p -> p != null && p.getRecordStatus() == RecordStatus.ACTIVE)
                .toList();
    }
    return repository.findByPatientIdAndPractitioner(patientId, user).stream()
            .filter(p -> p != null && p.getRecordStatus() == RecordStatus.ACTIVE)
            .toList();
}

public List<Prothesis> findByPatientAndPractitionerIncludingCancelled(Long patientId, User user) {
    if (user.getRole() == UserRole.ADMIN) {
        return repository.findByPatientId(patientId).stream()
                .filter(p -> p != null && p.getRecordStatus() != RecordStatus.ARCHIVED)
                .toList();
    }
    return repository.findByPatientIdAndPractitioner(patientId, user).stream()
            .filter(p -> p != null && p.getRecordStatus() != RecordStatus.ARCHIVED)
            .toList();
}

    public Page<Prothesis> searchPatientProtheses(
            Long patientId,
            User user,
            String statusNorm,
            boolean fromEnabled,
            LocalDateTime fromDateTime,
            boolean toEnabled,
            LocalDateTime toDateTimeExclusive,
            String qLike,
            String fieldKey,
            Pageable pageable
    ) {
        if (patientId == null || user == null) {
            return Page.empty(pageable);
        }

        User practitionerFilter = user.getRole() == UserRole.ADMIN ? null : user;

        return repository.searchPatientProtheses(
                patientId,
                practitionerFilter,
                RecordStatus.ARCHIVED,
                statusNorm,
                fromEnabled,
                fromDateTime,
                toEnabled,
                toDateTimeExclusive,
                qLike,
                fieldKey,
                pageable
        );
    }

    public Page<Prothesis> searchPatientProthesesSortedByTeeth(
            Long patientId,
            User user,
            String statusNorm,
            boolean fromEnabled,
            LocalDateTime fromDateTime,
            boolean toEnabled,
            LocalDateTime toDateTimeExclusive,
            String qLike,
            String fieldKey,
            boolean desc,
            Pageable pageable
    ) {
        if (patientId == null || user == null) {
            return Page.empty(pageable);
        }

        User practitionerFilter = user.getRole() == UserRole.ADMIN ? null : user;

        if (desc) {
            return repository.searchPatientProthesesSortByToothDesc(
                    patientId,
                    practitionerFilter,
                    RecordStatus.ARCHIVED,
                    statusNorm,
                    fromEnabled,
                    fromDateTime,
                    toEnabled,
                    toDateTimeExclusive,
                    qLike,
                    fieldKey,
                    pageable
            );
        }

        return repository.searchPatientProthesesSortByToothAsc(
                patientId,
                practitionerFilter,
                RecordStatus.ARCHIVED,
                statusNorm,
                fromEnabled,
                fromDateTime,
                toEnabled,
                toDateTimeExclusive,
                qLike,
                fieldKey,
                pageable
        );
    }

    @Transactional
    public void delete(Long id, User user, User actor, String reason) {
        Prothesis p = requireProthesisOwnedBy(id, user);
        if (p.getPatient() != null && p.getPatient().getArchivedAt() != null) {
            throw new BadRequestException(java.util.Map.of("_", "Patient archivé : lecture seule."));
        }
        // If this prothesis is assigned to a connected lab account, the lab must confirm cancellation.
        if (p.getLaboratory() != null
                && p.getLaboratory().getCreatedBy() != null
                && p.getLaboratory().getCreatedBy().getRole() == UserRole.LAB
                && user.getRole() != UserRole.ADMIN) {

            boolean connected = laboratoryConnectionRepository.existsByDentistAndLaboratoryAndStatus(
                    user,
                    p.getLaboratory(),
                    LaboratoryConnectionStatus.ACCEPTED
            );
            if (connected) {
                if (p.getCancelRequestDecision() == CancellationRequestDecision.PENDING) {
                    throw new BadRequestException(java.util.Map.of("_", "Annulation deja en attente de confirmation du laboratoire."));
                }

                p.setCancelRequestedAt(LocalDateTime.now());
                p.setCancelRequestedBy(actor != null ? actor : user);
                String normalizedReason = reason != null ? reason.trim() : "";
                p.setCancelRequestReason(normalizedReason.isBlank() ? null : normalizedReason);
                p.setCancelRequestDecision(CancellationRequestDecision.PENDING);
                 p.setCancelRequestDecidedAt(null);
                 p.setCancelRequestDecidedBy(null);
                 p.setUpdatedBy(actor != null ? actor : user);
                 Prothesis saved = repository.save(p);
                 publishProthesisRealtime(saved, "CANCEL_REQUESTED", "PENDING");
                 return;
             }
         }

        boolean changed = false;
        if (p.getRecordStatus() != RecordStatus.CANCELLED) {
            p.setRecordStatus(RecordStatus.CANCELLED);
            p.setCancelledAt(LocalDateTime.now());
            changed = true;
        } else if (p.getCancelledAt() == null) {
            p.setCancelledAt(LocalDateTime.now());
            changed = true;
        }

        if (actor != null && p.getCancelledBy() == null) {
            p.setCancelledBy(actor);
            changed = true;
        }

        String normalizedReason = reason != null ? reason.trim() : "";
        if (!normalizedReason.isBlank() && (p.getCancelReason() == null || p.getCancelReason().isBlank())) {
            p.setCancelReason(normalizedReason);
            changed = true;
        }

         if (changed) {
             p.setUpdatedBy(actor != null ? actor : user);
             Prothesis saved = repository.save(p);
             publishProthesisRealtime(saved, "CANCELLED", null);
         }
     }

    private void publishProthesisRealtime(Prothesis prothesis, String action, String decision) {
        if (prothesis == null || prothesis.getId() == null) return;

        User clinicOwner = prothesis.getPractitioner();
        UUID dentistPublicId = clinicOwner != null ? clinicOwner.getPublicId() : null;
        Laboratory lab = prothesis.getLaboratory();
        UUID labPublicId = lab != null ? lab.getPublicId() : null;

        eventPublisher.publishEvent(new LabOpsChangedEvent(
                realtimeRecipientsService.clinicPhones(clinicOwner),
                realtimeRecipientsService.labPhones(lab),
                "PROTHESIS_UPDATED",
                action != null ? action : "UPDATED",
                Collections.singletonList(prothesis.getId()),
                decision,
                dentistPublicId,
                labPublicId
        ));
    }

    private Double resolveCatalogAmount(Double defaultAmount, boolean isFlatFee, List<Integer> teeth) {
        double amount = defaultAmount != null ? defaultAmount : 0.0;
        if (isFlatFee) {
            return amount;
        }
        int count = (teeth != null && !teeth.isEmpty()) ? teeth.size() : 1;
        return amount * count;
    }

    private Prothesis requireProthesisOwnedBy(Long id, User user) {
        // Use the lightweight fetch graph to avoid Postgres "target lists can have at most 1664 columns"
        // (caused by eager-join explosion on User -> profiles/subscriptions/permissions).
        return repository.findForResponseById(id)
                .filter(item -> user.getRole() == UserRole.ADMIN
                        || (item.getPractitioner() != null
                            && item.getPractitioner().getId() != null
                            && user.getId() != null
                            && item.getPractitioner().getId().equals(user.getId())))
                .orElseThrow(() -> new NotFoundException("Prothese introuvable"));
    }

    private Patient requirePatientOwnedBy(Long patientId, User user) {
        Patient patient = user.getRole() == UserRole.ADMIN
                ? patientRepository.findById(patientId).orElse(null)
                : patientRepository.findByIdAndCreatedBy(patientId, user).orElse(null);
        if (patient == null) {
            throw new BadRequestException(java.util.Map.of("patientId", "Patient introuvable"));
        }
        if (patient.getArchivedAt() != null) {
            throw new BadRequestException(java.util.Map.of("_", "Patient archivé : lecture seule."));
        }
        return patient;
    }

    private ProthesisCatalog requireCatalogOwnedBy(Long catalogId, User user) {
        ProthesisCatalog catalog = user.getRole() == UserRole.ADMIN
                ? catalogRepository.findById(catalogId).orElse(null)
                : catalogRepository.findByIdAndCreatedBy(catalogId, user).orElse(null);
        if (catalog == null) {
            throw new BadRequestException(java.util.Map.of("catalogId", "Element du catalogue introuvable"));
        }
        return catalog;
    }

    private void assertCatalogRules(ProthesisCatalog catalog, List<Integer> teeth) {
        if (catalog == null) {
            throw new BadRequestException(java.util.Map.of("catalogId", "Prothese obligatoire"));
        }
        List<Integer> safeTeeth = teeth != null ? teeth : List.of();
        if (!catalog.isFlatFee() && !catalog.isMultiUnit() && safeTeeth.size() > 1) {
            throw new BadRequestException(java.util.Map.of("teeth", "Pour unitaire, veuillez selectionner une seule dent"));
        }
    }

    private List<Integer> normalizeTeeth(List<Integer> teeth) {
        return teeth == null ? List.of() : new ArrayList<>(teeth);
    }

    private void assertAmounts(Double finalPrice, Double labCost) {
        if (finalPrice != null && labCost != null && finalPrice < labCost) {
            throw new BadRequestException(java.util.Map.of("finalPrice", "Le prix doit etre superieur ou egal au cout labo"));
        }
    }

    private String normalizeStatus(String status) {
        if (status == null) return "";
        return status.trim().toUpperCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String v = value.trim();
        return v.isEmpty() ? null : v;
    }


    private void assertUniqueLabCode(String labCode, User practitioner, Long excludeProthesisId) {
        String normalized = trimToNull(labCode);
        if (normalized == null) return;

        boolean exists = excludeProthesisId == null
                ? repository.existsByPractitionerAndLabCodeIgnoreCase(practitioner, normalized)
                : repository.existsByPractitionerAndLabCodeIgnoreCaseAndIdNot(practitioner, normalized, excludeProthesisId);

        if (exists) {
            throw new BadRequestException(java.util.Map.of("labCode", "Ce code est deja utilise"));
        }
    }

    private boolean isAllowedStatusTransition(String current, String next) {
        if (current == null || current.isBlank()) current = "PENDING";
        if (current.equals(next)) return true;

        return switch (current) {
            case "PENDING" -> "SENT_TO_LAB".equals(next);
            case "SENT_TO_LAB" -> "PRETE".equals(next) || "RECEIVED".equals(next);
            case "PRETE" -> "RECEIVED".equals(next);
            case "RECEIVED" -> "FITTED".equals(next);
            case "FITTED" -> false;
            default -> false;
        };
    }
}
