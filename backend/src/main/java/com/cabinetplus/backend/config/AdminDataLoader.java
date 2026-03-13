package com.cabinetplus.backend.config;

import java.time.LocalDateTime;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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
public class AdminDataLoader {

    @Value("${app.seed.default-dentist:false}")
    private boolean seedDefaultDentist;

    @Bean
    @Order(1)
    CommandLineRunner initDatabase(UserRepository userRepo, PlanRepository planRepo, PasswordEncoder encoder) {
        return args -> {
            // ---------------- Ensure default plans exist ----------------
            ensureDefaultPlan(planRepo, "FREE_TRIAL", "Essai Gratuit", 0, 0, 7, 1, 2, 50, 2.0);
            ensureDefaultPlan(planRepo, "BASIC", "Basic", 6000, 5000, 30, 2, 8, 500, 10.0);
            ensureDefaultPlan(planRepo, "PRO", "Pro", 9000, 7500, 30, 5, 25, 2000, 50.0);

            // ---------------- Create admin ----------------
            User admin = userRepo.findByUsername("admin").orElseGet(() -> {
                User u = new User();
                u.setUsername("admin");
                u.setPasswordHash(encoder.encode("admin123"));
                u.setRole(UserRole.ADMIN);
                u.setFirstname("Super");
                u.setLastname("Admin");
                u.setPlanStatus(UserPlanStatus.ACTIVE);
                u.setCreatedAt(LocalDateTime.now());
                u.setCanDeleteAdmin(true);
                userRepo.save(u);
                System.out.println(">>> [SUCCESS] Created default admin user: admin / admin123");
                return u;
            });

            // ---------------- Create or update default dentist ----------------
            if (!seedDefaultDentist) {
                System.out.println(">>> [INFO] Default dentist seed skipped. To re-enable set app.seed.default-dentist=true");
                return;
            }

            User dentist = userRepo.findByUsername("dentist12").orElse(new User());
            dentist.setUsername("dentist12");
            dentist.setPasswordHash(encoder.encode("dentist123"));
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
            System.out.println(">>> [SUCCESS] Created or updated dentist user: dentist12 / dentist123");
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
