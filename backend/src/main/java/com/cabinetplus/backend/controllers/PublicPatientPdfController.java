package com.cabinetplus.backend.controllers;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.security.JwtUtil;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.PatientFichePdfService;
import com.cabinetplus.backend.services.PublicIdResolutionService;

import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/public/patients")
public class PublicPatientPdfController {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final PublicIdResolutionService publicIdResolutionService;
    private final PatientFichePdfService patientFichePdfService;
    private final AuditService auditService;

    public PublicPatientPdfController(
            JwtUtil jwtUtil,
            UserRepository userRepository,
            PublicIdResolutionService publicIdResolutionService,
            PatientFichePdfService patientFichePdfService,
            AuditService auditService
    ) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
        this.publicIdResolutionService = publicIdResolutionService;
        this.patientFichePdfService = patientFichePdfService;
        this.auditService = auditService;
    }

    @GetMapping("/{patientPublicId}/fiche-pdf")
    public void downloadPatientFichePublic(
            @PathVariable String patientPublicId,
            @RequestParam("token") String token,
            HttpServletResponse response
    ) throws Exception {
        JwtUtil.PublicPatientFichePdfToken claims;
        try {
            claims = jwtUtil.validatePublicPatientFichePdfToken(token);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Lien invalide ou expiré");
        }

        UUID requestedPublicId;
        try {
            requestedPublicId = UUID.fromString(patientPublicId);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient introuvable");
        }

        if (!requestedPublicId.equals(claims.patientPublicId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Lien invalide");
        }

        User clinicOwner = userRepository.findById(claims.ownerDentistId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Lien invalide"));

        Patient patient = publicIdResolutionService.requirePatientOwnedBy(patientPublicId, clinicOwner);
        auditService.logSuccessAsUser(
                clinicOwner,
                AuditEventType.PATIENT_PDF_DOWNLOAD,
                "PATIENT",
                String.valueOf(patient.getId()),
                "Fiche patient PDF téléchargée (lien public)"
        );

        String todayDate = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy"));
        String fileName = String.format("fiche_patient_%s_%s.pdf", patientPublicId, todayDate);
        patientFichePdfService.writePatientFichePdf(clinicOwner, patient, fileName, response);
    }
}
