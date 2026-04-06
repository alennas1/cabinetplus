package com.cabinetplus.backend.services;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.cabinetplus.backend.enums.LaboratoryConnectionStatus;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.LaboratoryConnectionRepository;
import com.cabinetplus.backend.repositories.LaboratoryRepository;

@Service
public class LaboratoryAccessService {

    private final LaboratoryRepository laboratoryRepository;
    private final LaboratoryConnectionRepository laboratoryConnectionRepository;

    public LaboratoryAccessService(
            LaboratoryRepository laboratoryRepository,
            LaboratoryConnectionRepository laboratoryConnectionRepository
    ) {
        this.laboratoryRepository = laboratoryRepository;
        this.laboratoryConnectionRepository = laboratoryConnectionRepository;
    }

    public Laboratory requireLaboratoryByIdOrPublicId(String idOrPublicId) {
        if (idOrPublicId == null || idOrPublicId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Laboratoire introuvable");
        }
        Laboratory lab;
        if (isNumeric(idOrPublicId)) {
            lab = laboratoryRepository.findById(parseLong(idOrPublicId)).orElse(null);
        } else {
            UUID publicId = parseUuid(idOrPublicId);
            lab = laboratoryRepository.findByPublicId(publicId).orElse(null);
        }
        if (lab == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Laboratoire introuvable");
        }
        return lab;
    }

    public Laboratory requireLaboratoryAccessibleByDentist(String idOrPublicId, User dentist) {
        Laboratory lab = requireLaboratoryByIdOrPublicId(idOrPublicId);
        if (dentist == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
        }

        boolean owned = lab.getCreatedBy() != null
                && lab.getCreatedBy().getId() != null
                && dentist.getId() != null
                && lab.getCreatedBy().getId().equals(dentist.getId());
        if (owned) return lab;

        if (!isSelfRegisteredLab(lab)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
        }

        boolean connected = laboratoryConnectionRepository.existsByDentistAndLaboratoryAndStatus(
                dentist,
                lab,
                LaboratoryConnectionStatus.ACCEPTED
        );
        if (!connected) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
        }
        return lab;
    }

    public boolean isSelfRegisteredLab(Laboratory laboratory) {
        if (laboratory == null || laboratory.getCreatedBy() == null) return false;
        return laboratory.getCreatedBy().getRole() == UserRole.LAB;
    }

    public Laboratory requireMyLab(User labUser) {
        if (labUser == null || labUser.getRole() != UserRole.LAB) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
        }
        return laboratoryRepository.findFirstByCreatedByAndArchivedAtIsNullAndRecordStatusOrderByIdAsc(labUser, RecordStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Laboratoire introuvable"));
    }

    private static boolean isNumeric(String value) {
        if (value == null || value.isBlank()) return false;
        for (int i = 0; i < value.length(); i++) {
            if (!Character.isDigit(value.charAt(i))) return false;
        }
        return true;
    }

    private static Long parseLong(String value) {
        try {
            return Long.parseLong(value);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Laboratoire introuvable");
        }
    }

    private static UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Laboratoire introuvable");
        }
    }
}

