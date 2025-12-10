package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.models.User;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByEmail(String email);
        List<User> findByPlanStatus(UserPlanStatus planStatus);

}
