package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Devise;
import com.cabinetplus.backend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DeviseRepository extends JpaRepository<Devise, Long> {
    List<Devise> findByPractitioner(User user);
}