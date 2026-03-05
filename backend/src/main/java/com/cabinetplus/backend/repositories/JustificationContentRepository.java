package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.JustificationContent;
import com.cabinetplus.backend.enums.JustificationType;
import com.cabinetplus.backend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JustificationContentRepository extends JpaRepository<JustificationContent, Long> {


        Optional<JustificationContent> findByTitleAndPractitioner(String title, User practitioner);


    List<JustificationContent> findByPractitioner(User practitioner);
}