package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.JustificationContentRequestDTO;
import com.cabinetplus.backend.dto.JustificationContentResponseDTO;
import com.cabinetplus.backend.models.JustificationContent;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.services.JustificationContentService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/justification-templates")
public class JustificationContentController {

    private final JustificationContentService service;
    private final UserService userService;
    private final PublicIdResolutionService publicIdResolutionService;

    public JustificationContentController(JustificationContentService service,
                                          UserService userService,
                                          PublicIdResolutionService publicIdResolutionService) {
        this.service = service;
        this.userService = userService;
        this.publicIdResolutionService = publicIdResolutionService;
    }

    private User getPractitioner(Principal principal) {
        User user = userService.findByUsername(principal.getName())
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

        return ResponseEntity.ok(mapToResponse(saved));
    }

    // =========================
    // GET ALL
    // =========================
    @GetMapping
    public ResponseEntity<List<JustificationContentResponseDTO>> getAll(Principal principal) {

        User practitioner = getPractitioner(principal);

        List<JustificationContentResponseDTO> response =
                service.findByPractitioner(practitioner)
                        .stream()
                        .map(this::mapToResponse)
                        .toList();

        return ResponseEntity.ok(response);
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
