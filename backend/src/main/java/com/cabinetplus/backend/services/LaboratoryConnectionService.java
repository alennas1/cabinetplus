package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.cabinetplus.backend.enums.LaboratoryConnectionStatus;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.LaboratoryConnection;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.LaboratoryConnectionRepository;
import com.cabinetplus.backend.repositories.LaboratoryPaymentRepository;
import com.cabinetplus.backend.repositories.LaboratoryRepository;
import com.cabinetplus.backend.repositories.ProthesisRepository;

@Service
public class LaboratoryConnectionService {

    private final LaboratoryRepository laboratoryRepository;
    private final LaboratoryConnectionRepository laboratoryConnectionRepository;
    private final PublicIdResolutionService publicIdResolutionService;
    private final LaboratoryAccessService laboratoryAccessService;
    private final ProthesisRepository prothesisRepository;
    private final LaboratoryPaymentRepository laboratoryPaymentRepository;

    public LaboratoryConnectionService(
            LaboratoryRepository laboratoryRepository,
            LaboratoryConnectionRepository laboratoryConnectionRepository,
            PublicIdResolutionService publicIdResolutionService,
            LaboratoryAccessService laboratoryAccessService,
            ProthesisRepository prothesisRepository,
            LaboratoryPaymentRepository laboratoryPaymentRepository
    ) {
        this.laboratoryRepository = laboratoryRepository;
        this.laboratoryConnectionRepository = laboratoryConnectionRepository;
        this.publicIdResolutionService = publicIdResolutionService;
        this.laboratoryAccessService = laboratoryAccessService;
        this.prothesisRepository = prothesisRepository;
        this.laboratoryPaymentRepository = laboratoryPaymentRepository;
    }

    @Transactional
    public LaboratoryConnection invite(User dentist, String labPublicId, String mergeFromLabIdOrPublicId) {
        if (dentist == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
        }
        if (labPublicId == null || labPublicId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ID laboratoire invalide");
        }

        UUID publicId;
        try {
            publicId = UUID.fromString(labPublicId.trim());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ID laboratoire invalide");
        }

        Laboratory target = laboratoryRepository.findByPublicId(publicId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Laboratoire introuvable"));

        if (target.getCreatedBy() == null || target.getCreatedBy().getRole() != UserRole.LAB) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ce laboratoire n'a pas de compte.");
        }

        LaboratoryConnection existing = laboratoryConnectionRepository.findByDentistAndLaboratory(dentist, target).orElse(null);
        if (existing != null && existing.getStatus() == LaboratoryConnectionStatus.ACCEPTED) {
            return existing;
        }

        LaboratoryConnection connection = existing != null ? existing : new LaboratoryConnection();
        connection.setDentist(dentist);
        connection.setLaboratory(target);
        connection.setStatus(LaboratoryConnectionStatus.PENDING);
        connection.setRespondedAt(null);

        if (mergeFromLabIdOrPublicId != null && !mergeFromLabIdOrPublicId.isBlank()) {
            Laboratory mergeFrom = publicIdResolutionService.requireLaboratoryOwnedBy(mergeFromLabIdOrPublicId, dentist);
            connection.setMergeFromLaboratory(mergeFrom);
        } else if (existing == null) {
            connection.setMergeFromLaboratory(null);
        }

        return laboratoryConnectionRepository.save(connection);
    }

    public List<LaboratoryConnection> getPendingInvitationsForLab(User labUser) {
        Laboratory lab = laboratoryAccessService.requireMyLab(labUser);
        return laboratoryConnectionRepository.findByLaboratoryAndStatusOrderByInvitedAtDesc(lab, LaboratoryConnectionStatus.PENDING);
    }

    public List<LaboratoryConnection> getAcceptedDentistsForLab(User labUser) {
        Laboratory lab = laboratoryAccessService.requireMyLab(labUser);
        return laboratoryConnectionRepository.findByLaboratoryAndStatusOrderByDentist_LastnameAsc(lab, LaboratoryConnectionStatus.ACCEPTED);
    }

    @Transactional
    public LaboratoryConnection acceptInvitation(User labUser, Long connectionId) {
        Laboratory lab = laboratoryAccessService.requireMyLab(labUser);
        LaboratoryConnection connection = laboratoryConnectionRepository.findById(connectionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation introuvable"));

        if (connection.getLaboratory() == null || connection.getLaboratory().getId() == null
                || lab.getId() == null || !connection.getLaboratory().getId().equals(lab.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
        }
        if (connection.getStatus() != LaboratoryConnectionStatus.PENDING) {
            return connection;
        }

        connection.setStatus(LaboratoryConnectionStatus.ACCEPTED);
        connection.setRespondedAt(LocalDateTime.now());
        LaboratoryConnection saved = laboratoryConnectionRepository.save(connection);

        Laboratory mergeFrom = saved.getMergeFromLaboratory();
        if (mergeFrom != null && saved.getDentist() != null) {
            prothesisRepository.migrateLaboratoryForDentist(saved.getDentist(), mergeFrom, lab);
            laboratoryPaymentRepository.migrateLaboratoryForDentist(saved.getDentist(), mergeFrom, lab);

            if (mergeFrom.getRecordStatus() == RecordStatus.ACTIVE && mergeFrom.getArchivedAt() == null) {
                mergeFrom.setRecordStatus(RecordStatus.ARCHIVED);
                mergeFrom.setArchivedAt(LocalDateTime.now());
                laboratoryRepository.save(mergeFrom);
            }
        }

        return saved;
    }

    @Transactional
    public LaboratoryConnection rejectInvitation(User labUser, Long connectionId) {
        Laboratory lab = laboratoryAccessService.requireMyLab(labUser);
        LaboratoryConnection connection = laboratoryConnectionRepository.findById(connectionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation introuvable"));

        if (connection.getLaboratory() == null || connection.getLaboratory().getId() == null
                || lab.getId() == null || !connection.getLaboratory().getId().equals(lab.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
        }

        if (connection.getStatus() != LaboratoryConnectionStatus.PENDING) {
            return connection;
        }

        connection.setStatus(LaboratoryConnectionStatus.REJECTED);
        connection.setRespondedAt(LocalDateTime.now());
        return laboratoryConnectionRepository.save(connection);
    }
}

