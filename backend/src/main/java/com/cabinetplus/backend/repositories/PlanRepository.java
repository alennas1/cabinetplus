package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.cabinetplus.backend.models.Plan;

@Repository
public interface PlanRepository extends JpaRepository<Plan, Long> {

    Optional<Plan> findByCode(String code);
    List<Plan> findByActiveTrue();

    @Modifying
    @Query("UPDATE Plan p SET p.recommended = false WHERE p.recommended = true")
    int clearRecommended();
}
