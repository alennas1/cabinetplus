package com.cabinetplus.backend.config;

import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.util.PhoneNumberUtil;

/**
 * Production-safe bootstrap for the very first admin account.
 *
 * This runner is opt-in and does nothing unless enabled explicitly via properties/env vars.
 * It avoids hardcoded credentials and prevents accidental admin creation in production.
 */
@Configuration
public class BootstrapAdminLoader {

    private static final Logger logger = LoggerFactory.getLogger(BootstrapAdminLoader.class);

    @Value("${app.bootstrap.admin.enabled:false}")
    private Boolean enabled;

    @Value("${app.bootstrap.admin.phone-number:${app.bootstrap.admin.phoneNumber:}}")
    private String phoneNumber;

    @Value("${app.bootstrap.admin.password:}")
    private String password;

    @Value("${app.bootstrap.admin.update-password:false}")
    private Boolean updatePassword;

    @Bean
    @Order(0)
    CommandLineRunner bootstrapAdmin(UserRepository userRepo, PasswordEncoder encoder) {
        return args -> {
            if (!Boolean.TRUE.equals(enabled)) {
                return;
            }

            if (password == null || password.isBlank()) {
                throw new IllegalStateException("app.bootstrap.admin.password must be set when bootstrapping an admin.");
            }

            String canonicalPhone = PhoneNumberUtil.canonicalAlgeriaForStorage(phoneNumber);
            if (canonicalPhone == null || canonicalPhone.isBlank()) {
                throw new IllegalStateException("app.bootstrap.admin.phone-number (env: APP_BOOTSTRAP_ADMIN_PHONE_NUMBER) must be set to a valid phone number when bootstrapping an admin.");
            }

            var candidates = PhoneNumberUtil.algeriaStoredCandidates(canonicalPhone);
            User existing = userRepo.findFirstByPhoneNumberInOrderByIdAsc(candidates).orElse(null);

            if (existing != null) {
                if (existing.getRole() != UserRole.ADMIN) {
                    logger.warn("Bootstrap admin skipped: user '{}' exists but is not ADMIN (role={}).", canonicalPhone, existing.getRole());
                    return;
                }

                if (Boolean.TRUE.equals(updatePassword)) {
                    existing.setPasswordHash(encoder.encode(password));
                    userRepo.save(existing);
                    logger.info("Bootstrap admin updated password for '{}'.", canonicalPhone);
                } else {
                    logger.info("Bootstrap admin found existing admin '{}'; no changes applied.", canonicalPhone);
                }
                return;
            }

            User admin = new User();
            admin.setPhoneNumber(canonicalPhone);
            admin.setPasswordHash(encoder.encode(password));
            admin.setRole(UserRole.ADMIN);
            admin.setFirstname("Super");
            admin.setLastname("Admin");
            admin.setPhoneVerified(true);
            admin.setCreatedAt(LocalDateTime.now());
            admin.setCanDeleteAdmin(true);
            userRepo.save(admin);

            logger.info("Bootstrap admin created admin user '{}'.", canonicalPhone);
        };
    }
}
