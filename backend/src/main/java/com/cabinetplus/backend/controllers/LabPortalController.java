package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

import com.cabinetplus.backend.dto.LabDentistListItemResponse;
import com.cabinetplus.backend.dto.LabDentistFinancialSummaryResponse;
import com.cabinetplus.backend.dto.LabInvitationResponse;
import com.cabinetplus.backend.dto.LabMeResponse;
import com.cabinetplus.backend.dto.LabMeUpdateRequest;
import com.cabinetplus.backend.dto.LabPaymentListItemResponse;
import com.cabinetplus.backend.dto.LabPendingResponse;
import com.cabinetplus.backend.dto.LabProthesisListItemResponse;
import com.cabinetplus.backend.dto.LabProthesisStatusUpdateRequest;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.dto.CountTotalResponseDTO;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.LaboratoryConnection;
import com.cabinetplus.backend.models.LaboratoryPayment;
import com.cabinetplus.backend.models.Prothesis;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.LaboratoryRepository;
import com.cabinetplus.backend.repositories.ProthesisFileRepository;
import com.cabinetplus.backend.services.LabPortalService;
import com.cabinetplus.backend.services.LaboratoryAccessService;
import com.cabinetplus.backend.services.LaboratoryConnectionService;
import com.cabinetplus.backend.services.ProthesisFilesService;
import com.cabinetplus.backend.services.ProthesisStlService;
import com.cabinetplus.backend.services.UserService;

@RestController
@RequestMapping("/api/lab")
public class LabPortalController {

    private final UserService userService;
    private final LaboratoryAccessService laboratoryAccessService;
    private final LaboratoryConnectionService laboratoryConnectionService;
    private final LabPortalService labPortalService;
    private final LaboratoryRepository laboratoryRepository;
    private final PasswordEncoder passwordEncoder;
    private final ProthesisStlService prothesisStlService;
    private final ProthesisFilesService prothesisFilesService;
    private final ProthesisFileRepository prothesisFileRepository;

    public LabPortalController(
            UserService userService,
            LaboratoryAccessService laboratoryAccessService,
            LaboratoryConnectionService laboratoryConnectionService,
            LabPortalService labPortalService,
            LaboratoryRepository laboratoryRepository,
            PasswordEncoder passwordEncoder,
            ProthesisStlService prothesisStlService,
            ProthesisFilesService prothesisFilesService,
            ProthesisFileRepository prothesisFileRepository
    ) {
        this.userService = userService;
        this.laboratoryAccessService = laboratoryAccessService;
        this.laboratoryConnectionService = laboratoryConnectionService;
        this.labPortalService = labPortalService;
        this.laboratoryRepository = laboratoryRepository;
        this.passwordEncoder = passwordEncoder;
        this.prothesisStlService = prothesisStlService;
        this.prothesisFilesService = prothesisFilesService;
        this.prothesisFileRepository = prothesisFileRepository;
    }

    @GetMapping("/me")
    public ResponseEntity<LabMeResponse> me(Principal principal) {
        User labUser = requireLabUser(principal);
        Laboratory lab = laboratoryAccessService.requireMyLab(labUser);
        return ResponseEntity.ok(new LabMeResponse(
                lab.getPublicId(),
                lab.getInviteCode(),
                lab.getName(),
                lab.getContactPerson(),
                lab.getPhoneNumber(),
                lab.getAddress()
        ));
    }

    @PutMapping("/me")
    @Transactional
    public ResponseEntity<LabMeResponse> updateMe(@RequestBody LabMeUpdateRequest updates, Principal principal) {
        User labUser = requireLabUser(principal);
        Laboratory lab = laboratoryAccessService.requireMyLab(labUser);

        if (updates == null) {
            throw new BadRequestException(Map.of("_", "Corps de requête invalide"));
        }

        boolean hasUpdates = updates.name() != null || updates.contactPerson() != null || updates.address() != null;
        if (!hasUpdates) {
            return ResponseEntity.ok(new LabMeResponse(
                    lab.getPublicId(),
                    lab.getInviteCode(),
                    lab.getName(),
                    lab.getContactPerson(),
                    lab.getPhoneNumber(),
                    lab.getAddress()
            ));
        }

        if (lab.getArchivedAt() != null || lab.getRecordStatus() != RecordStatus.ACTIVE) {
            throw new BadRequestException(Map.of("_", "Laboratoire archivé : lecture seule."));
        }

        String password = updates.password();
        if (password == null || password.isBlank()) {
            throw new BadRequestException(Map.of("password", "Mot de passe requis"));
        }
        if (!passwordEncoder.matches(password, labUser.getPasswordHash())) {
            throw new BadRequestException(Map.of("password", "Mot de passe incorrect"));
        }

        if (updates.name() != null) {
            String name = trimToNull(updates.name());
            if (name == null) {
                throw new BadRequestException(Map.of("name", "Nom requis"));
            }
            boolean exists = laboratoryRepository.existsByCreatedByAndNameIgnoreCaseAndIdNot(labUser, name, lab.getId());
            if (exists) {
                throw new BadRequestException(Map.of("name", "Ce laboratoire existe deja"));
            }
            lab.setName(name);
        }
        if (updates.contactPerson() != null) lab.setContactPerson(trimToNull(updates.contactPerson()));
        if (updates.address() != null) lab.setAddress(trimToNull(updates.address()));

        Laboratory saved = laboratoryRepository.save(lab);
        return ResponseEntity.ok(new LabMeResponse(
                saved.getPublicId(),
                saved.getInviteCode(),
                saved.getName(),
                saved.getContactPerson(),
                saved.getPhoneNumber(),
                saved.getAddress()
        ));
    }

    @GetMapping("/invitations")
    @Transactional(readOnly = true)
    public ResponseEntity<List<LabInvitationResponse>> invitations(Principal principal) {
        User labUser = requireLabUser(principal);
        List<LaboratoryConnection> pending = laboratoryConnectionService.getPendingInvitationsForLab(labUser);
        return ResponseEntity.ok(pending.stream().map(this::mapInvitation).toList());
    }

    @PostMapping("/invitations/{id}/accept")
    @Transactional
    public ResponseEntity<LabInvitationResponse> acceptInvitation(@PathVariable Long id, Principal principal) {
        User labUser = requireLabUser(principal);
        LaboratoryConnection accepted = laboratoryConnectionService.acceptInvitation(labUser, id);
        return ResponseEntity.ok(mapInvitation(accepted));
    }

    @PostMapping("/invitations/{id}/reject")
    @Transactional
    public ResponseEntity<LabInvitationResponse> rejectInvitation(@PathVariable Long id, Principal principal) {
        User labUser = requireLabUser(principal);
        LaboratoryConnection rejected = laboratoryConnectionService.rejectInvitation(labUser, id);
        return ResponseEntity.ok(mapInvitation(rejected));
    }

    @GetMapping("/dentists")
    public ResponseEntity<List<LabDentistListItemResponse>> dentists(Principal principal) {
        User labUser = requireLabUser(principal);
        List<LaboratoryConnection> accepted = laboratoryConnectionService.getAcceptedDentistsForLab(labUser);
        return ResponseEntity.ok(accepted.stream().map(conn -> {
            User dentist = conn.getDentist();
            return new LabDentistListItemResponse(
                    dentist != null ? dentist.getPublicId() : null,
                    fullName(dentist),
                    dentist != null ? dentist.getClinicName() : null,
                    dentist != null ? dentist.getPhoneNumber() : null
            );
        }).toList());
    }

    @GetMapping("/dentists/{id}/summary")
    public ResponseEntity<LabDentistFinancialSummaryResponse> dentistSummary(@PathVariable String id, Principal principal) {
        User labUser = requireLabUser(principal);
        UUID dentistPublicId;
        try {
            dentistPublicId = UUID.fromString(id != null ? id.trim() : "");
        } catch (Exception e) {
            throw new NotFoundException("Dentiste introuvable");
        }

        List<LaboratoryConnection> accepted = laboratoryConnectionService.getAcceptedDentistsForLab(labUser);
        User dentist = accepted.stream()
                .map(LaboratoryConnection::getDentist)
                .filter(d -> d != null && dentistPublicId.equals(d.getPublicId()))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Dentiste introuvable"));

        return ResponseEntity.ok(labPortalService.getDentistFinancialSummary(labUser, dentist));
    }

    @GetMapping("/protheses/paged")
    public ResponseEntity<PageResponse<LabProthesisListItemResponse>> prothesesPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "filterBy", required = false) String filterBy,
            @RequestParam(name = "dateType", required = false) String dateType,
            @RequestParam(name = "dentistId", required = false) String dentistId,
            @RequestParam(name = "from", required = false) String from,
            @RequestParam(name = "to", required = false) String to,
            Principal principal
    ) {
        User labUser = requireLabUser(principal);
        LocalDateTime fromDt = parseDateStart(from);
        LocalDateTime toDt = parseDateEnd(to);
        UUID dentistPublicId = parseUuidOrNull(dentistId);

        var pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Order.desc("sentToLabDate"), Sort.Order.desc("dateCreated"), Sort.Order.desc("id"))
        );

        var paged = labPortalService.getMyProthesesPaged(labUser, q, status, filterBy, dateType, dentistPublicId, fromDt, toDt, pageable);
        var items = paged.getContent().stream().map(this::mapProthesis).toList();
        return ResponseEntity.ok(new PageResponse<>(
                items,
                paged.getNumber(),
                paged.getSize(),
                paged.getTotalElements(),
                paged.getTotalPages()
        ));
    }

    @PutMapping("/protheses/status")
    public ResponseEntity<List<LabProthesisListItemResponse>> updateProthesesStatus(
            @RequestBody LabProthesisStatusUpdateRequest payload,
            Principal principal
    ) {
        User labUser = requireLabUser(principal);
        List<Prothesis> updated = labPortalService.updateMyProthesesStatus(
                labUser,
                payload != null ? payload.ids() : null,
                payload != null ? payload.status() : null
        );
        return ResponseEntity.ok(updated.stream().map(this::mapProthesis).toList());
    }

    @GetMapping("/payments/paged")
    public ResponseEntity<PageResponse<LabPaymentListItemResponse>> paymentsPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "dentistId", required = false) String dentistId,
            @RequestParam(name = "from", required = false) String from,
            @RequestParam(name = "to", required = false) String to,
            Principal principal
    ) {
        User labUser = requireLabUser(principal);
        LocalDateTime fromDt = parseDateStart(from);
        LocalDateTime toDt = parseDateEnd(to);
        UUID dentistPublicId = parseUuidOrNull(dentistId);

        var pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Order.desc("paymentDate"), Sort.Order.desc("id"))
        );

        var paged = labPortalService.getMyPaymentsPaged(labUser, q, dentistPublicId, fromDt, toDt, pageable);
        var items = paged.getContent().stream().map(this::mapPayment).toList();
        return ResponseEntity.ok(new PageResponse<>(
                items,
                paged.getNumber(),
                paged.getSize(),
                paged.getTotalElements(),
                paged.getTotalPages()
        ));
    }

    @GetMapping("/payments/summary")
    public ResponseEntity<CountTotalResponseDTO> paymentsSummary(
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "dentistId", required = false) String dentistId,
            @RequestParam(name = "from", required = false) String from,
            @RequestParam(name = "to", required = false) String to,
            Principal principal
    ) {
        User labUser = requireLabUser(principal);
        LocalDateTime fromDt = parseDateStart(from);
        LocalDateTime toDt = parseDateEnd(to);
        UUID dentistPublicId = parseUuidOrNull(dentistId);
        return ResponseEntity.ok(labPortalService.getMyPaymentsSummary(labUser, q, dentistPublicId, fromDt, toDt));
    }

    @PutMapping("/protheses/{id}/cancel/approve")
    public ResponseEntity<LabProthesisListItemResponse> approveProthesisCancel(@PathVariable Long id, Principal principal) {
        User labUser = requireLabUser(principal);
        Prothesis updated = labPortalService.decideProthesisCancellation(labUser, id, true);
        return ResponseEntity.ok(mapProthesis(updated));
    }

    @PutMapping("/protheses/{id}/cancel/reject")
    public ResponseEntity<LabProthesisListItemResponse> rejectProthesisCancel(@PathVariable Long id, Principal principal) {
        User labUser = requireLabUser(principal);
        Prothesis updated = labPortalService.decideProthesisCancellation(labUser, id, false);
        return ResponseEntity.ok(mapProthesis(updated));
    }

    @GetMapping("/protheses/{id}/stl")
    public ResponseEntity<Resource> downloadProthesisStl(
            @PathVariable Long id,
            @RequestParam(name = "download", defaultValue = "true") boolean download,
            Principal principal
    ) {
        User labUser = requireLabUser(principal);
        Resource resource = prothesisStlService.getResourceForLab(id, labUser);
        MediaType mediaType = prothesisStlService.getMediaTypeForLab(id, labUser);
        String filename = prothesisStlService.getFilenameForLab(id, labUser);

        ContentDisposition disposition = (download ? ContentDisposition.attachment() : ContentDisposition.inline())
                .filename(filename, StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(resource);
    }

    @GetMapping("/protheses/{id}/files.zip")
    public ResponseEntity<org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody> downloadProthesisFilesZip(
            @PathVariable Long id,
            Principal principal
    ) {
        User labUser = requireLabUser(principal);
        String filename = prothesisFilesService.buildZipFilename(id);
        var sources = prothesisFilesService.buildZipSourcesForLab(id, labUser);

        org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody body = outputStream -> {
            try (java.util.zip.ZipOutputStream zipOut = new java.util.zip.ZipOutputStream(outputStream, StandardCharsets.UTF_8)) {
                for (var source : sources) {
                    String entryName = source.entryName() != null && !source.entryName().isBlank()
                            ? source.entryName()
                            : ("file-" + System.nanoTime());
                    java.util.zip.ZipEntry entry = new java.util.zip.ZipEntry(entryName);
                    zipOut.putNextEntry(entry);
                    try (var in = prothesisFilesService.openDecryptedStream(source.encryptedPath())) {
                        in.transferTo(zipOut);
                    }
                    zipOut.closeEntry();
                }
                zipOut.finish();
            }
        };

        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(filename, StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(body);
    }

    @PutMapping("/payments/{id}/cancel/approve")
    public ResponseEntity<LabPaymentListItemResponse> approvePaymentCancel(@PathVariable Long id, Principal principal) {
        User labUser = requireLabUser(principal);
        LaboratoryPayment updated = labPortalService.decidePaymentCancellation(labUser, id, true);
        return ResponseEntity.ok(mapPayment(updated));
    }

    @PutMapping("/payments/{id}/cancel/reject")
    public ResponseEntity<LabPaymentListItemResponse> rejectPaymentCancel(@PathVariable Long id, Principal principal) {
        User labUser = requireLabUser(principal);
        LaboratoryPayment updated = labPortalService.decidePaymentCancellation(labUser, id, false);
        return ResponseEntity.ok(mapPayment(updated));
    }

    @GetMapping("/pending")
    public ResponseEntity<LabPendingResponse> pending(Principal principal) {
        User labUser = requireLabUser(principal);
        var protheses = labPortalService.getMyPendingProthesisCancellations(labUser).stream().map(this::mapProthesis).toList();
        var payments = labPortalService.getMyPendingPaymentCancellations(labUser).stream().map(this::mapPayment).toList();
        return ResponseEntity.ok(new LabPendingResponse(protheses, payments));
    }

    private User requireLabUser(Principal principal) {
        if (principal == null || principal.getName() == null) {
            throw new NotFoundException("Utilisateur introuvable");
        }
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
        if (user.getRole() != UserRole.LAB) {
            throw new NotFoundException("Utilisateur introuvable");
        }
        return user;
    }

    private LabInvitationResponse mapInvitation(LaboratoryConnection conn) {
        User dentist = conn != null ? conn.getDentist() : null;
        Laboratory mergeFrom = conn != null ? conn.getMergeFromLaboratory() : null;
        return new LabInvitationResponse(
                conn != null ? conn.getId() : null,
                dentist != null ? dentist.getPublicId() : null,
                fullName(dentist),
                dentist != null ? dentist.getClinicName() : null,
                conn != null ? conn.getInvitedAt() : null,
                conn != null && conn.getStatus() != null ? conn.getStatus().name() : null,
                mergeFrom != null ? mergeFrom.getPublicId() : null,
                mergeFrom != null ? mergeFrom.getName() : null
        );
    }

    private LabProthesisListItemResponse mapProthesis(Prothesis p) {
        String dentistName = fullName(p != null ? p.getPractitioner() : null);
        UUID dentistPublicId = p != null && p.getPractitioner() != null ? p.getPractitioner().getPublicId() : null;
        String prothesisName = p != null && p.getProthesisCatalog() != null ? p.getProthesisCatalog().getName() : null;
        String status = p != null && p.getRecordStatus() == RecordStatus.CANCELLED ? "CANCELLED" : (p != null ? p.getStatus() : null);
        LocalDateTime billingDate = p != null ? p.getSentToLabDate() : null;
        return new LabProthesisListItemResponse(
                p != null ? p.getId() : null,
                null,
                prothesisName,
                status,
                p != null ? p.getLabCost() : null,
                billingDate,
                p != null ? p.getSentToLabDate() : null,
                p != null ? p.getReadyAt() : null,
                p != null ? p.getActualReturnDate() : null,
                dentistPublicId,
                dentistName,
                p != null ? p.getCancelledAt() : null,
                p != null && p.getCancelRequestDecision() != null ? p.getCancelRequestDecision().name() : null,
                p != null ? p.getStlFilename() : null,
                computeFilesCount(p)
        );
    }

    private Integer computeFilesCount(Prothesis p) {
        if (p == null || p.getId() == null) return 0;
        long count = prothesisFileRepository.countByProthesisId(p.getId());
        if (p.getStlPathOrUrl() != null && !p.getStlPathOrUrl().isBlank()) {
            count += 1;
        }
        if (count > Integer.MAX_VALUE) return Integer.MAX_VALUE;
        return (int) count;
    }

    private LabPaymentListItemResponse mapPayment(LaboratoryPayment lp) {
        return new LabPaymentListItemResponse(
                lp != null ? lp.getId() : null,
                lp != null ? lp.getAmount() : null,
                lp != null ? lp.getPaymentDate() : null,
                lp != null ? lp.getNotes() : null,
                lp != null ? lp.getRecordStatus() : null,
                lp != null ? lp.getCancelledAt() : null,
                lp != null && lp.getCreatedBy() != null ? lp.getCreatedBy().getPublicId() : null,
                fullName(lp != null ? lp.getCreatedBy() : null),
                lp != null && lp.getCancelRequestDecision() != null ? lp.getCancelRequestDecision().name() : null
        );
    }

    private static String fullName(User user) {
        if (user == null) return null;
        String first = user.getFirstname() != null ? user.getFirstname().trim() : "";
        String last = user.getLastname() != null ? user.getLastname().trim() : "";
        String combined = (first + " " + last).trim();
        return combined.isBlank() ? null : combined;
    }

    private static String trimToNull(String value) {
        if (value == null) return null;
        String v = value.trim();
        return v.isBlank() ? null : v;
    }

    private static LocalDateTime parseDateStart(String value) {
        if (value == null || value.isBlank()) return null;
        String raw = value.trim();
        try {
            return LocalDateTime.parse(raw);
        } catch (DateTimeParseException ignored) {
            // fall through
        }
        try {
            return LocalDate.parse(raw).atStartOfDay();
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private static LocalDateTime parseDateEnd(String value) {
        if (value == null || value.isBlank()) return null;
        String raw = value.trim();
        try {
            return LocalDateTime.parse(raw);
        } catch (DateTimeParseException ignored) {
            // fall through
        }
        try {
            return LocalDate.parse(raw).atTime(23, 59, 59, 999_999_999);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private static UUID parseUuidOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return UUID.fromString(value.trim());
        } catch (Exception e) {
            return null;
        }
    }
}
