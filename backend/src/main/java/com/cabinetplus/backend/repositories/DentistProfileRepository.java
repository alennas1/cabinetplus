package com.cabinetplus.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.models.DentistProfile;

public interface DentistProfileRepository extends JpaRepository<DentistProfile, Long> {
}

