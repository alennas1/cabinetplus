package com.cabinetplus.backend.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.models.Feedback;
import com.cabinetplus.backend.models.User;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findByClinicOwnerOrderByCreatedAtDesc(User clinicOwner);
    List<Feedback> findAllByOrderByCreatedAtDesc();
}

