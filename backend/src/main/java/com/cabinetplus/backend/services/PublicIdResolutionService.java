package com.cabinetplus.backend.services;

import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.cabinetplus.backend.models.Employee;
import com.cabinetplus.backend.models.JustificationContent;
import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.EmployeeRepository;
import com.cabinetplus.backend.repositories.JustificationContentRepository;
import com.cabinetplus.backend.repositories.LaboratoryRepository;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.repositories.PrescriptionRepository;
import com.cabinetplus.backend.repositories.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PublicIdResolutionService {

    private final PatientRepository patientRepository;
    private final EmployeeRepository employeeRepository;
    private final LaboratoryRepository laboratoryRepository;
    private final UserRepository userRepository;
    private final JustificationContentRepository justificationContentRepository;
    private final PrescriptionRepository prescriptionRepository;

    public Optional<Patient> findPatientOwnedBy(String idOrPublicId, User ownerDentist) {
        if (isNumeric(idOrPublicId)) {
            Long id = parseLong(idOrPublicId);
            return patientRepository.findByIdAndCreatedBy(id, ownerDentist);
        }
        UUID publicId = parseUuid(idOrPublicId);
        return patientRepository.findByPublicIdAndCreatedBy(publicId, ownerDentist);
    }

    public Patient requirePatientOwnedBy(String idOrPublicId, User ownerDentist) {
        return findPatientOwnedBy(idOrPublicId, ownerDentist)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient introuvable"));
    }

    public Optional<Employee> findEmployeeOwnedBy(String idOrPublicId, User ownerDentist) {
        if (isNumeric(idOrPublicId)) {
            Long id = parseLong(idOrPublicId);
            return employeeRepository.findByIdAndDentist(id, ownerDentist);
        }
        UUID publicId = parseUuid(idOrPublicId);
        return employeeRepository.findByPublicIdAndDentist(publicId, ownerDentist);
    }

    public Employee requireEmployeeOwnedBy(String idOrPublicId, User ownerDentist) {
        return findEmployeeOwnedBy(idOrPublicId, ownerDentist)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employe introuvable"));
    }

    public Optional<Laboratory> findLaboratoryOwnedBy(String idOrPublicId, User ownerDentist) {
        if (isNumeric(idOrPublicId)) {
            Long id = parseLong(idOrPublicId);
            return laboratoryRepository.findByIdAndCreatedBy(id, ownerDentist);
        }
        UUID publicId = parseUuid(idOrPublicId);
        return laboratoryRepository.findByPublicIdAndCreatedBy(publicId, ownerDentist);
    }

    public Laboratory requireLaboratoryOwnedBy(String idOrPublicId, User ownerDentist) {
        return findLaboratoryOwnedBy(idOrPublicId, ownerDentist)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Laboratoire introuvable"));
    }

    public Optional<User> findUserByIdOrPublicId(String idOrPublicId) {
        if (isNumeric(idOrPublicId)) {
            Long id = parseLong(idOrPublicId);
            return userRepository.findById(id);
        }
        UUID publicId = parseUuid(idOrPublicId);
        return userRepository.findByPublicId(publicId);
    }

    public User requireUserByIdOrPublicId(String idOrPublicId) {
        return findUserByIdOrPublicId(idOrPublicId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
    }

    public Optional<JustificationContent> findJustificationTemplateForPractitioner(String idOrPublicId, User practitioner) {
        if (isNumeric(idOrPublicId)) {
            Long id = parseLong(idOrPublicId);
            return justificationContentRepository.findById(id)
                    .filter(c -> c.getPractitioner().getId().equals(practitioner.getId()));
        }
        UUID publicId = parseUuid(idOrPublicId);
        return justificationContentRepository.findByPublicIdAndPractitioner(publicId, practitioner);
    }

    public JustificationContent requireJustificationTemplateForPractitioner(String idOrPublicId, User practitioner) {
        return findJustificationTemplateForPractitioner(idOrPublicId, practitioner)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Modele introuvable"));
    }

    public Prescription requirePrescriptionForPractitionerWithMedications(String idOrPublicId, User practitioner) {
        Prescription rx;
        if (isNumeric(idOrPublicId)) {
            Long id = parseLong(idOrPublicId);
            rx = prescriptionRepository.findByIdWithMedications(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordonnance introuvable"));
        } else {
            UUID publicId = parseUuid(idOrPublicId);
            rx = prescriptionRepository.findByPublicIdWithMedications(publicId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordonnance introuvable"));
        }

        if (!rx.getPractitioner().getId().equals(practitioner.getId())) {
            throw new AccessDeniedException("Acces refuse a cette ordonnance");
        }
        return rx;
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
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identifiant invalide");
        }
    }

    private static UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identifiant public invalide");
        }
    }
}

