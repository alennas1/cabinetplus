package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.FeedbackCreateRequest;
import com.cabinetplus.backend.dto.FeedbackResponse;
import com.cabinetplus.backend.enums.FeedbackCategory;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Feedback;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.FeedbackRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final UserService userService;

    public FeedbackResponse create(FeedbackCreateRequest request, User actor) {
        if (request == null) {
            throw new BadRequestException(java.util.Map.of("_", "Corps de requête invalide"));
        }

        FeedbackCategory category = request.category();
        if (category == null) {
            throw new BadRequestException(java.util.Map.of("category", "Catégorie obligatoire"));
        }

        String message = request.message() != null ? request.message().trim() : null;
        if (message == null || message.isBlank()) {
            throw new BadRequestException(java.util.Map.of("message", "Message obligatoire"));
        }

        String customLabel = request.customCategoryLabel() != null ? request.customCategoryLabel().trim() : null;
        if (category == FeedbackCategory.OTHER || category == FeedbackCategory.CUSTOM) {
            if (customLabel == null || customLabel.isBlank()) {
                throw new BadRequestException(java.util.Map.of("customCategoryLabel", "Précisez la catégorie (Autre)."));
            }
        } else {
            if (customLabel != null && !customLabel.isBlank()) {
                throw new BadRequestException(java.util.Map.of("customCategoryLabel", "Catégorie personnalisée non autorisée pour cette catégorie"));
            }
            customLabel = null;
        }

        User clinicOwner = userService.resolveClinicOwner(actor);

        Feedback feedback = new Feedback();
        feedback.setClinicOwner(clinicOwner);
        feedback.setCreatedBy(actor);
        feedback.setCategory(category);
        feedback.setCustomCategoryLabel(customLabel);
        feedback.setMessage(message);
        feedback.setCreatedAt(LocalDateTime.now());

        Feedback saved = feedbackRepository.save(feedback);
        return toResponse(saved);
    }

    public List<FeedbackResponse> listMine(User actor) {
        User clinicOwner = userService.resolveClinicOwner(actor);
        return feedbackRepository.findByClinicOwnerOrderByCreatedAtDesc(clinicOwner).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<FeedbackResponse> adminListAll() {
        return feedbackRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    public FeedbackResponse adminGetById(Long id) {
        Feedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Feedback introuvable"));
        return toResponse(feedback);
    }

    private FeedbackResponse toResponse(Feedback feedback) {
        User owner = feedback.getClinicOwner();
        User createdBy = feedback.getCreatedBy();
        String ownerName = owner != null ? (nullToEmpty(owner.getFirstname()) + " " + nullToEmpty(owner.getLastname())).trim() : "";
        String createdByName = createdBy != null ? (nullToEmpty(createdBy.getFirstname()) + " " + nullToEmpty(createdBy.getLastname())).trim() : "";
        return new FeedbackResponse(
                feedback.getId(),
                feedback.getCategory(),
                feedback.getCustomCategoryLabel(),
                feedback.getMessage(),
                feedback.getCreatedAt(),
                owner != null ? owner.getId() : null,
                ownerName.isBlank() ? null : ownerName,
                owner != null ? owner.getPhoneNumber() : null,
                createdBy != null ? createdBy.getId() : null,
                createdByName.isBlank() ? null : createdByName
        );
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
