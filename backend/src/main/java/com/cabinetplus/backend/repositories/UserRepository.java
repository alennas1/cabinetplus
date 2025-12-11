package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.User;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByEmail(String email);
        List<User> findByPlanStatus(UserPlanStatus planStatus);
            List<User> findByRole(UserRole role);
@Query("SELECT u FROM User u WHERE u.expirationDate BETWEEN :start AND :end")
    List<User> findUsersWithExpiringPlans(LocalDateTime start, LocalDateTime end);

}
