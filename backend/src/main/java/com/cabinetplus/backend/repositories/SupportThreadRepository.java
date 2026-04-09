package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.models.SupportThread;
import com.cabinetplus.backend.models.User;

import jakarta.persistence.LockModeType;

public interface SupportThreadRepository extends JpaRepository<SupportThread, Long> {
    Optional<SupportThread> findFirstByClinicOwnerOrderByLastMessageAtDescUpdatedAtDescIdDesc(User clinicOwner);
    List<SupportThread> findByClinicOwnerOrderByLastMessageAtDescUpdatedAtDescIdDesc(User clinicOwner);
    Optional<SupportThread> findFirstByClinicOwnerAndRequesterOrderByLastMessageAtDescUpdatedAtDescIdDesc(User clinicOwner, User requester);
    List<SupportThread> findByClinicOwnerAndRequesterOrderByLastMessageAtDescUpdatedAtDescIdDesc(User clinicOwner, User requester);
    List<SupportThread> findAllByOrderByLastMessageAtDescUpdatedAtDescIdDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from SupportThread t where t.id = :id")
    Optional<SupportThread> findByIdForUpdate(@Param("id") Long id);
}
