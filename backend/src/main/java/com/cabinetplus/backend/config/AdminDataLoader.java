package com.cabinetplus.backend.config;

import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;

import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PlanRepository;
import com.cabinetplus.backend.repositories.UserRepository;

@Configuration
@Profile("dev")
public class AdminDataLoader {

    private static final Logger logger = LoggerFactory.getLogger(AdminDataLoader.class);

    @Value("${app.seed.enabled:false}")
    private boolean seedEnabled;

    @Value("${app.seed.default-admin:false}")
    private boolean seedDefaultAdmin;

    @Value("${app.seed.default-dentist:false}")
    private boolean seedDefaultDentist;

    @Value("${app.seed.default-admin.username:admin}")
    private String defaultAdminUsername;

    @Value("${app.seed.default-admin.password:}")
    private String defaultAdminPassword;

    @Value("${app.seed.default-dentist.username:dentist12}")
    private String defaultDentistUsername;

    @Value("${app.seed.default-dentist.password:}")
    private String defaultDentistPassword;

    @Bean
    @Order(1)
    CommandLineRunner initDatabase(UserRepository userRepo, PlanRepository planRepo, PasswordEncoder encoder) {
        return args -> {
            if (!seedEnabled) {
                logger.info("Seed data disabled (app.seed.enabled=false).");
                return;
            }

            // ---------------- Ensure default plans exist ----------------
            ensureDefaultPlan(planRepo, "FREE_TRIAL", "Essai Gratuit", 0, 0, 7, 1, 2, 50, 2.0);
            ensureDefaultPlan(planRepo, "BASIC", "Basic", 6000, 5000, 30, 2, 8, 500, 10.0);
            ensureDefaultPlan(planRepo, "PRO", "Pro", 9000, 7500, 30, 5, 25, 2000, 50.0);

            // ---------------- Create admin ----------------
            if (seedDefaultAdmin) {
                if (defaultAdminPassword == null || defaultAdminPassword.isBlank()) {
                    throw new IllegalStateException("app.seed.default-admin.password must be set when seeding a default admin.");
                }
                userRepo.findByUsername(defaultAdminUsername).orElseGet(() -> {
                    User u = new User();
                    u.setUsername(defaultAdminUsername);
                    u.setPasswordHash(encoder.encode(defaultAdminPassword));
                    u.setRole(UserRole.ADMIN);
                    u.setFirstname("Super");
                    u.setLastname("Admin");
                    u.setPlanStatus(UserPlanStatus.ACTIVE);
                    u.setCreatedAt(LocalDateTime.now());
                    u.setCanDeleteAdmin(true);
                    userRepo.save(u);
                    logger.info("Seeded default admin user '{}'.", defaultAdminUsername);
                    return u;
                });
            } else {
                logger.info("Default admin seed skipped (app.seed.default-admin=false).");
            }

            // ---------------- Create or update default dentist ----------------
            if (!seedDefaultDentist) {
                logger.info("Default dentist seed skipped (app.seed.default-dentist=false).");
                return;
            }
            if (defaultDentistPassword == null || defaultDentistPassword.isBlank()) {
                throw new IllegalStateException("app.seed.default-dentist.password must be set when seeding a default dentist.");
            }

            User dentist = userRepo.findByUsername(defaultDentistUsername).orElse(new User());
            dentist.setUsername(defaultDentistUsername);
            dentist.setPasswordHash(encoder.encode(defaultDentistPassword));
            dentist.setRole(UserRole.DENTIST);
            dentist.setFirstname("Leila");
            dentist.setLastname("Dentist");
            dentist.setPhoneNumber("+1234567890");
            dentist.setPhoneVerified(true);
            dentist.setPlanStatus(UserPlanStatus.ACTIVE);
            dentist.setCreatedAt(LocalDateTime.now());

            // Assign a valid plan
            Plan basicPlan = planRepo.findByCode("BASIC").orElse(null);
            dentist.setPlan(basicPlan);

            if (basicPlan != null && basicPlan.getDurationDays() != null) {
                dentist.setExpirationDate(LocalDateTime.now().plusDays(basicPlan.getDurationDays()));
            }

            // Clinic info
            dentist.setClinicName("Dentist Clinic");
            dentist.setAddress("123 Main Street, City");

            userRepo.save(dentist);
            logger.info("Seeded default dentist user '{}'.", defaultDentistUsername);
        };
    }

    private void ensureDefaultPlan(
            PlanRepository planRepo,
            String code,
            String name,
            int monthlyPrice,
            int yearlyMonthlyPrice,
            int durationDays,
            int maxDentists,
            int maxEmployees,
            int maxPatients,
            double maxStorageGb
    ) {
        planRepo.findByCode(code).orElseGet(() -> {
            Plan plan = new Plan();
            plan.setCode(code);
            plan.setName(name);
            plan.setMonthlyPrice(monthlyPrice);
            plan.setYearlyMonthlyPrice(yearlyMonthlyPrice);
            plan.setDurationDays(durationDays);
            plan.setMaxDentists(maxDentists);
            plan.setMaxEmployees(maxEmployees);
            plan.setMaxPatients(maxPatients);
            plan.setMaxStorageGb(maxStorageGb);
            plan.setActive(true);
            Plan saved = planRepo.save(plan);
            System.out.println(">>> [SUCCESS] Created default plan: " + saved.getCode());
            return saved;
        });
    }
}
