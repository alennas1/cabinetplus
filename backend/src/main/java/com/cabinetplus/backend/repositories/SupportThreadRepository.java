package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.models.SupportThread;
import com.cabinetplus.backend.models.User;

public interface SupportThreadRepository extends JpaRepository<SupportThread, Long> {
    Optional<SupportThread> findFirstByClinicOwnerOrderByLastMessageAtDescUpdatedAtDescIdDesc(User clinicOwner);
    List<SupportThread> findByClinicOwnerOrderByLastMessageAtDescUpdatedAtDescIdDesc(User clinicOwner);
    List<SupportThread> findAllByOrderByLastMessageAtDescUpdatedAtDescIdDesc();
}
