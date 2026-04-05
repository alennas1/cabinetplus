package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Query("SELECT u FROM User u JOIN u.dentistSubscription s WHERE s.planStatus = :planStatus")
    List<User> findByPlanStatus(@Param("planStatus") UserPlanStatus planStatus);
    List<User> findByRole(UserRole role);
    List<User> findByOwnerDentist(User ownerDentist);

    @Query("SELECT u FROM User u JOIN u.dentistSubscription s WHERE s.expirationDate BETWEEN :start AND :end")
    List<User> findUsersWithExpiringPlans(LocalDateTime start, LocalDateTime end);

    @Query("""
            select u
            from User u
            left join u.dentistSubscription s
            left join s.plan p
            where u.role = com.cabinetplus.backend.enums.UserRole.DENTIST
              and (:status is null or coalesce(s.planStatus, com.cabinetplus.backend.enums.UserPlanStatus.PENDING) = :status)
              and (
                :q is null
                or :q = ''
                or lower(coalesce(u.firstname, '')) like concat('%', :q, '%')
                or lower(coalesce(u.lastname, '')) like concat('%', :q, '%')
                or lower(coalesce(u.phoneNumber, '')) like concat('%', :q, '%')
                or lower(coalesce(p.name, '')) like concat('%', :q, '%')
              )
            """)
    Page<User> searchDentistsPaged(@Param("q") String q, @Param("status") UserPlanStatus status, Pageable pageable);

    @Query("""
            select u
            from User u
            where u.role = com.cabinetplus.backend.enums.UserRole.ADMIN
              and (:includeSuperAdmins = true or u.canDeleteAdmin = false)
              and (
                :q is null
                or :q = ''
                or lower(coalesce(u.firstname, '')) like concat('%', :q, '%')
                or lower(coalesce(u.lastname, '')) like concat('%', :q, '%')
                or lower(coalesce(u.phoneNumber, '')) like concat('%', :q, '%')
              )
            """)
    Page<User> searchAdminsPaged(@Param("q") String q, @Param("includeSuperAdmins") boolean includeSuperAdmins, Pageable pageable);

    @Query("""
            select u
            from User u
            join u.dentistSubscription s
            left join s.plan p
            where s.expirationDate between :start and :end
              and (:status is null or s.planStatus = :status)
              and (
                :q is null
                or :q = ''
                or lower(coalesce(u.firstname, '')) like concat('%', :q, '%')
                or lower(coalesce(u.lastname, '')) like concat('%', :q, '%')
                or lower(coalesce(u.phoneNumber, '')) like concat('%', :q, '%')
                or lower(coalesce(p.name, '')) like concat('%', :q, '%')
              )
            """)
    Page<User> findUsersWithExpiringPlansPaged(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("q") String q,
            @Param("status") UserPlanStatus status,
            Pageable pageable
    );

    Optional<User> findByPublicId(UUID publicId);

}
