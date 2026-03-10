package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.JustificationContentRequestDTO;
import com.cabinetplus.backend.dto.JustificationContentResponseDTO;
import com.cabinetplus.backend.models.JustificationContent;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.JustificationContentService;
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

    public JustificationContentController(JustificationContentService service,
                                          UserService userService) {
        this.service = service;
        this.userService = userService;
    }

    private User getPractitioner(Principal principal) {
        return userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Praticien introuvable"));
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
            @PathVariable Long id,
            Principal principal) {

        User practitioner = getPractitioner(principal);

        return service.findById(id)
                .filter(c -> c.getPractitioner().getId().equals(practitioner.getId()))
                .map(this::mapToResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // =========================
    // UPDATE
    // =========================
    @PutMapping("/{id}")
    public ResponseEntity<JustificationContentResponseDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody JustificationContentRequestDTO dto,
            Principal principal) {

        User practitioner = getPractitioner(principal);

        JustificationContent updatedEntity = new JustificationContent();
        updatedEntity.setTitle(dto.getTitle());
        updatedEntity.setContent(dto.getContent());

        JustificationContent updated =
                service.update(id, updatedEntity, practitioner);

        return ResponseEntity.ok(mapToResponse(updated));
    }

    // =========================
    // DELETE
    // =========================
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       Principal principal) {

        User practitioner = getPractitioner(principal);

        boolean deleted = service.delete(id, practitioner);

        return deleted
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    // =========================
    // MAPPER
    // =========================
    private JustificationContentResponseDTO mapToResponse(JustificationContent entity) {
        return JustificationContentResponseDTO.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .content(entity.getContent())
                .build();
    }
}
