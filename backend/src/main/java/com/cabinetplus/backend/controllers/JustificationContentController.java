package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.JustificationContentRequestDTO;
import com.cabinetplus.backend.dto.JustificationContentResponseDTO;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.models.JustificationContent;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.JustificationContentService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;
import com.cabinetplus.backend.util.PaginationUtil;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/justification-templates")
public class JustificationContentController {

    private final JustificationContentService service;
    private final UserService userService;
    private final PublicIdResolutionService publicIdResolutionService;
    private final AuditService auditService;

    public JustificationContentController(JustificationContentService service,
                                          UserService userService,
                                          PublicIdResolutionService publicIdResolutionService,
                                          AuditService auditService) {
        this.service = service;
        this.userService = userService;
        this.publicIdResolutionService = publicIdResolutionService;
        this.auditService = auditService;
    }

    private User getPractitioner(Principal principal) {
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new NotFoundException("Praticien introuvable"));
        return userService.resolveClinicOwner(user);
    }

    // =========================
    // CREATE
    // =========================
    @PostMapping
    public ResponseEntity<JustificationContentResponseDTO> create(
            @Valid @RequestBody JustificationContentRequestDTO dto,
            Principal principal) {

        User practitioner = getPractitioner(principal);

        JustificationContent entity = new JustificationContent();
        entity.setTitle(dto.getTitle());
        entity.setContent(dto.getContent());

        JustificationContent saved = service.save(entity, practitioner);
        auditService.logSuccess(
                AuditEventType.JUSTIFICATION_TEMPLATE_CREATE,
                "JUSTIFICATION_TEMPLATE",
                saved != null && saved.getId() != null ? String.valueOf(saved.getId()) : null,
                "Modèle justificatif créé"
        );

        return ResponseEntity.ok(mapToResponse(saved));
    }

    // =========================
    // GET ALL
    // =========================
    @GetMapping
    public ResponseEntity<List<JustificationContentResponseDTO>> getAll(Principal principal) {

        User practitioner = getPractitioner(principal);
        auditService.logSuccess(
                AuditEventType.JUSTIFICATION_TEMPLATE_READ,
                "JUSTIFICATION_TEMPLATE",
                null,
                "Modeles justificatif consultes"
        );

        List<JustificationContentResponseDTO> response =
                service.findByPractitioner(practitioner)
                        .stream()
                        .map(this::mapToResponse)
                        .toList();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/paged")
    public ResponseEntity<PageResponse<JustificationContentResponseDTO>> getAllPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            Principal principal
    ) {
        User practitioner = getPractitioner(principal);
        String qNorm = q != null ? q.trim().toLowerCase() : "";

        List<JustificationContent> all = service.findByPractitioner(practitioner);
        List<JustificationContent> filtered = (all == null ? List.<JustificationContent>of() : all).stream()
                .filter(j -> {
                    if (qNorm.isBlank()) return true;
                    String title = j.getTitle() != null ? j.getTitle().trim().toLowerCase() : "";
                    String content = j.getContent() != null ? j.getContent().trim().toLowerCase() : "";
                    return title.contains(qNorm) || content.contains(qNorm);
                })
                .sorted(Comparator.comparing(j -> j.getTitle() != null ? j.getTitle().toLowerCase() : ""))
                .toList();

        PageResponse<JustificationContent> pageResponse = PaginationUtil.toPageResponse(filtered, page, size);
        List<JustificationContentResponseDTO> items = pageResponse.items().stream().map(this::mapToResponse).toList();

        auditService.logSuccess(
                AuditEventType.JUSTIFICATION_TEMPLATE_READ,
                "JUSTIFICATION_TEMPLATE",
                null,
                "Modeles justificatif consultes (page)"
        );

        return ResponseEntity.ok(new PageResponse<>(
                items,
                pageResponse.page(),
                pageResponse.size(),
                pageResponse.totalElements(),
                pageResponse.totalPages()
        ));
    }

    // =========================
    // GET BY ID
    // =========================
    @GetMapping("/{id}")
    public ResponseEntity<JustificationContentResponseDTO> getById(
            @PathVariable String id,
            Principal principal) {

        User practitioner = getPractitioner(principal);

        JustificationContent entity = publicIdResolutionService.requireJustificationTemplateForPractitioner(id, practitioner);
        auditService.logSuccess(
                AuditEventType.JUSTIFICATION_TEMPLATE_READ,
                "JUSTIFICATION_TEMPLATE",
                entity != null && entity.getId() != null ? String.valueOf(entity.getId()) : null,
                "Modele justificatif consulte"
        );
        return ResponseEntity.ok(mapToResponse(entity));
    }

    // =========================
    // UPDATE
    // =========================
    @PutMapping("/{id}")
    public ResponseEntity<JustificationContentResponseDTO> update(
            @PathVariable String id,
            @Valid @RequestBody JustificationContentRequestDTO dto,
            Principal principal) {

        User practitioner = getPractitioner(principal);
        Long internalId = publicIdResolutionService.requireJustificationTemplateForPractitioner(id, practitioner).getId();

        JustificationContent updatedEntity = new JustificationContent();
        updatedEntity.setTitle(dto.getTitle());
        updatedEntity.setContent(dto.getContent());

        JustificationContent updated =
                service.update(internalId, updatedEntity, practitioner);
        auditService.logSuccess(
                AuditEventType.JUSTIFICATION_TEMPLATE_UPDATE,
                "JUSTIFICATION_TEMPLATE",
                internalId != null ? String.valueOf(internalId) : null,
                "Modèle justificatif modifié"
        );

        return ResponseEntity.ok(mapToResponse(updated));
    }

    // =========================
    // DELETE
    // =========================
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
                                       Principal principal) {

        User practitioner = getPractitioner(principal);
        Long internalId = publicIdResolutionService.requireJustificationTemplateForPractitioner(id, practitioner).getId();

        boolean deleted = service.delete(internalId, practitioner);

        if (!deleted) {
            throw new NotFoundException("Modele introuvable");
        }
        auditService.logSuccess(
                AuditEventType.JUSTIFICATION_TEMPLATE_DELETE,
                "JUSTIFICATION_TEMPLATE",
                internalId != null ? String.valueOf(internalId) : null,
                "Modèle justificatif supprimé"
        );
        return ResponseEntity.noContent().build();
    }

    // =========================
    // MAPPER
    // =========================
    private JustificationContentResponseDTO mapToResponse(JustificationContent entity) {
        return JustificationContentResponseDTO.builder()
                .id(entity.getId())
                .publicId(entity.getPublicId())
                .title(entity.getTitle())
                .content(entity.getContent())
                .build();
    }
}
