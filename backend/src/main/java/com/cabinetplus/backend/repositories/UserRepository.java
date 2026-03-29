package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.enums.ClinicAccessRole;
import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.User;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findFirstByPhoneNumberOrderByIdAsc(String phoneNumber);
    Optional<User> findFirstByPhoneNumberInOrderByIdAsc(Collection<String> phoneNumbers);
    boolean existsByPhoneNumber(String phoneNumber);
    boolean existsByPhoneNumberAndIdNot(String phoneNumber, Long id);
    boolean existsByPhoneNumberIn(Collection<String> phoneNumbers);
    boolean existsByPhoneNumberInAndIdNot(Collection<String> phoneNumbers, Long id);
    List<User> findByPlanStatus(UserPlanStatus planStatus);
    List<User> findByRole(UserRole role);
    List<User> findByOwnerDentist(User ownerDentist);

    @Query("SELECT u FROM User u WHERE u.expirationDate BETWEEN :start AND :end")
    List<User> findUsersWithExpiringPlans(LocalDateTime start, LocalDateTime end);

    Optional<User> findByPublicId(UUID publicId);

    @Query("""
            select count(u) from User u
            where u.ownerDentist = :ownerDentist
              and u.clinicAccessRole = :role
            """)
    long countByOwnerDentistAndClinicAccessRole(@Param("ownerDentist") User ownerDentist,
                                                @Param("role") ClinicAccessRole role);

    @Query("""
            select count(u) from User u
            where u.ownerDentist = :ownerDentist
              and (u.clinicAccessRole is null or u.clinicAccessRole <> :excludedRole)
            """)
    long countByOwnerDentistAndClinicAccessRoleNot(@Param("ownerDentist") User ownerDentist,
                                                   @Param("excludedRole") ClinicAccessRole excludedRole);

}
