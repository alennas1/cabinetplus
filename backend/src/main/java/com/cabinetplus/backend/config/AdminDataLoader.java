package com.cabinetplus.backend.config;

import java.time.LocalDateTime;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;

@Configuration
public class AdminDataLoader {

    @Bean
    CommandLineRunner initDatabase(UserRepository userRepo, PasswordEncoder encoder) {
        return args -> {
            // Check if the admin already exists so we don't create duplicates
            if (userRepo.findByUsername("admin").isEmpty()) {
                User admin = new User();
                admin.setUsername("admin");
                admin.setPasswordHash(encoder.encode("admin123")); // Hashed for Security
                admin.setRole(UserRole.ADMIN);
                admin.setFirstname("Super");
                admin.setLastname("Admin");
                admin.setPlanStatus(UserPlanStatus.ACTIVE);
                admin.setCreatedAt(LocalDateTime.now());
                admin.setCanDeleteAdmin(true); // Super-admin flag

                userRepo.save(admin);
                System.out.println(">>> [SUCCESS] Created default admin user: admin / admin123");
            }
        };
    }
}