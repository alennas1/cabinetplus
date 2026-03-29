package com.cabinetplus.backend.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.cabinetplus.backend.repositories.PatientRepository;

@Component
public class PatientAgeScheduler {

    private static final Logger logger = LoggerFactory.getLogger(PatientAgeScheduler.class);
    private final PatientRepository patientRepository;

    public PatientAgeScheduler(PatientRepository patientRepository) {
        this.patientRepository = patientRepository;
    }

    @Scheduled(cron = "0 0 0 1 1 *", zone = "${app.scheduling.timezone:Africa/Lagos}")
    @Transactional
    public void incrementAgesAtNewYear() {
        int updated = patientRepository.incrementAllAges();
        logger.info("Incremented age for {} patients (Jan 1).", updated);
    }
}

