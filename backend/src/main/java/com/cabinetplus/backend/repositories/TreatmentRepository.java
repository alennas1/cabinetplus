package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Treatment;
import com.cabinetplus.backend.models.User;

public interface TreatmentRepository extends JpaRepository<Treatment, Long> {
    List<Treatment> findByPatient(Patient patient);
    List<Treatment> findByPractitioner(User practitioner);

    
    @Query("SELECT SUM(t.price) FROM Treatment t WHERE t.date BETWEEN :from AND :to")
    Double sumTreatmentsBetween(LocalDateTime from, LocalDateTime to);
}
