package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PatientRepository;

@Component
public class PatientAutoArchiveScheduler {

    private static final Logger logger = LoggerFactory.getLogger(PatientAutoArchiveScheduler.class);

    private final UserService userService;
    private final PatientRepository patientRepository;

    public PatientAutoArchiveScheduler(UserService userService, PatientRepository patientRepository) {
        this.userService = userService;
        this.patientRepository = patientRepository;
    }

    // Every day at 02:10 (clinic-local scheduling timezone)
    @Scheduled(cron = "0 10 2 * * *", zone = "${app.scheduling.timezone:Africa/Lagos}")
    @Transactional
    public void autoArchiveInactivePatients() {
        List<User> dentists = userService.getAllDentists();
        if (dentists == null || dentists.isEmpty()) return;

        LocalDateTime now = LocalDateTime.now();
        int dentistsProcessed = 0;
        int patientsArchived = 0;

        for (User dentist : dentists) {
            if (dentist == null) continue;
            if (!userService.isOwnerDentist(dentist)) continue;

            Integer months = dentist.getPatientAutoArchiveInactiveMonths();
            if (months == null || months <= 0) continue;

            LocalDateTime cutoff = now.minusMonths(months.longValue());
            int archivedForDentist = archiveForDentist(dentist, cutoff, now);
            if (archivedForDentist > 0) {
                logger.info("Auto-archived {} inactive patients for dentist {} (cutoff={}, months={}).",
                        archivedForDentist, dentist.getId(), cutoff, months);
            }

            dentistsProcessed += 1;
            patientsArchived += archivedForDentist;
        }

        if (dentistsProcessed > 0) {
            logger.info("Patient auto-archive done: dentistsProcessed={}, patientsArchived={}", dentistsProcessed, patientsArchived);
        }
    }

    private int archiveForDentist(User dentist, LocalDateTime cutoff, LocalDateTime now) {
        int totalArchived = 0;
        var page = PageRequest.of(0, 200);

        while (true) {
            List<Long> ids = patientRepository.findInactivePatientIdsByCreatedBy(dentist, cutoff, page);
            if (ids == null || ids.isEmpty()) break;

            int updated = patientRepository.archivePatientsByIds(dentist, dentist, now, ids);
            totalArchived += Math.max(0, updated);

            if (ids.size() < page.getPageSize()) {
                break;
            }
        }

        return totalArchived;
    }
}
