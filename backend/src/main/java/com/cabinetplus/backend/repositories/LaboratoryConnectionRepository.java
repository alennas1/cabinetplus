package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.cabinetplus.backend.enums.LaboratoryConnectionStatus;
import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.LaboratoryConnection;
import com.cabinetplus.backend.models.User;

@Repository
public interface LaboratoryConnectionRepository extends JpaRepository<LaboratoryConnection, Long> {

    boolean existsByDentistAndLaboratoryAndStatus(User dentist, Laboratory laboratory, LaboratoryConnectionStatus status);

    Optional<LaboratoryConnection> findByDentistAndLaboratory(User dentist, Laboratory laboratory);

    @EntityGraph(attributePaths = {
            "dentist.publicId",
            "dentist.firstname",
            "dentist.lastname",
            "dentist.dentistProfile",
            "laboratory.publicId",
            "laboratory.name"
    })
    List<LaboratoryConnection> findByLaboratoryAndStatusOrderByInvitedAtDesc(Laboratory laboratory, LaboratoryConnectionStatus status);

    @EntityGraph(attributePaths = {
            "laboratory.publicId",
            "laboratory.name"
    })
    List<LaboratoryConnection> findByDentistAndStatusOrderByInvitedAtDesc(User dentist, LaboratoryConnectionStatus status);

    @EntityGraph(attributePaths = {
            "dentist.publicId",
            "dentist.firstname",
            "dentist.lastname",
            "dentist.dentistProfile"
    })
    List<LaboratoryConnection> findByLaboratoryAndStatusOrderByDentist_LastnameAsc(Laboratory laboratory, LaboratoryConnectionStatus status);
}

