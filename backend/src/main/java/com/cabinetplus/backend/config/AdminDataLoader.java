package com.cabinetplus.backend.config;

import java.time.LocalDateTime;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PlanRepository;
import com.cabinetplus.backend.repositories.UserRepository;

@Configuration
public class AdminDataLoader {

    @Bean
    CommandLineRunner initDatabase(UserRepository userRepo, PlanRepository planRepo, PasswordEncoder encoder) {
        return args -> {
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
            Plan freePlan = planRepo.findByCode("FREE_TRIAL").orElse(null);
            dentist.setPlan(freePlan);

            // Set expiration date to 2026-01-16
            dentist.setExpirationDate(LocalDateTime.of(2026, 1, 16, 22, 12, 53, 840748));

            // Phone OTP setup
            dentist.setPhoneOtp("393077");
            dentist.setPhoneOtpExpires(LocalDateTime.of(2026, 7, 24, 2, 45, 16, 998876));

            // Clinic info
            dentist.setClinicName("Dentist Clinic");
            dentist.setAddress("123 Main Street, City");

            userRepo.save(dentist);
            System.out.println(">>> [SUCCESS] Created or updated dentist user: dentist12 / dentist123");
        };
    }
}