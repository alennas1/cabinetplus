package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.cabinetplus.backend.enums.ClinicAccessRole;
import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.util.PhoneNumberUtil;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // ===============================
    // BASIC CRUD
    // ===============================
    public User save(User user) {
        assertBusinessRules(user);

        if (user.getCreatedAt() == null) {
            user.setCreatedAt(LocalDateTime.now());
        }
        if (user.getPlanStatus() == null) {
            user.setPlanStatus(UserPlanStatus.PENDING);
        }
        if (user.isCanDeleteAdmin() == false) {
            user.setCanDeleteAdmin(false);
        }
        return userRepository.save(user);
    }

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> findByPhoneNumber(String phoneNumber) {
        var candidates = PhoneNumberUtil.algeriaStoredCandidates(phoneNumber);
        if (candidates.isEmpty()) {
            return Optional.empty();
        }
        return userRepository.findFirstByPhoneNumberInOrderByIdAsc(candidates);
    }

    public void delete(Long id) {
        userRepository.deleteById(id);
    }

    public List<User> findByPlanStatus(UserPlanStatus status) {
        return userRepository.findByPlanStatus(status);
    }

    public List<User> getAllDentists() {
        return userRepository.findByRole(UserRole.DENTIST);
    }

    public User resolveClinicOwner(User user) {
        if (user == null) return null;
        if (user.getRole() != UserRole.DENTIST) return user;

        ClinicAccessRole clinicRole = user.getClinicAccessRole();
        if (clinicRole != null && clinicRole != ClinicAccessRole.DENTIST && user.getOwnerDentist() != null) {
            return user.getOwnerDentist();
        }
        return user;
    }

    public boolean isOwnerDentist(User user) {
        if (user == null || user.getRole() != UserRole.DENTIST) return false;
        return user.getClinicAccessRole() == null || user.getClinicAccessRole() == ClinicAccessRole.DENTIST;
    }

    // ===============================
    // ADMIN METHODS
    // ===============================

    // Normal admin sees only regular admins; super-admin sees all admins
    public List<User> getAllAdmins(User currentUser) {
        if (currentUser.isCanDeleteAdmin()) {
            return userRepository.findByRole(UserRole.ADMIN);
        } else {
            return userRepository.findByRole(UserRole.ADMIN)
                    .stream()
                    .filter(u -> !u.isCanDeleteAdmin()) // hide super-admins
                    .collect(Collectors.toList());
        }
    }

    // Only super-admin can delete another admin
    public void deleteUser(User currentUser, User targetUser) {
        if (targetUser.getRole() == UserRole.ADMIN && !currentUser.isCanDeleteAdmin()) {
            throw new AccessDeniedException("Vous ne pouvez pas supprimer un compte admin");
        }
        userRepository.delete(targetUser);
    }

    // Create admin: only super-admin can create another super-admin
    public User createAdmin(User currentUser, User newAdmin) {
        if (newAdmin.isCanDeleteAdmin() && !currentUser.isCanDeleteAdmin()) {
            throw new AccessDeniedException("Seul le super-admin peut creer un autre super-admin");
        }

        assertBusinessRules(newAdmin);

        newAdmin.setRole(UserRole.ADMIN);
        if (newAdmin.getCreatedAt() == null) newAdmin.setCreatedAt(LocalDateTime.now());
        if (newAdmin.getPlanStatus() == null) newAdmin.setPlanStatus(UserPlanStatus.PENDING);
        if (!newAdmin.isCanDeleteAdmin()) newAdmin.setCanDeleteAdmin(false);
        if (newAdmin.getFirstname() == null) newAdmin.setFirstname("");
        if (newAdmin.getLastname() == null) newAdmin.setLastname("");
        newAdmin.setPhoneVerified(false);

        return userRepository.save(newAdmin);
    }

    // ===============================
    // PLAN METHODS
    // ===============================
    public List<User> getUsersExpiringInDays(int days) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime targetDateStart = now.plusDays(days).withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime targetDateEnd = targetDateStart.plusDays(1); // full day
        return userRepository.findUsersWithExpiringPlans(targetDateStart, targetDateEnd);
    }

    private void assertBusinessRules(User user) {
        if (user == null) {
            throw new BadRequestException(java.util.Map.of("_", "Corps de requete invalide"));
        }

        String phone = PhoneNumberUtil.trimToNull(user.getPhoneNumber());
        phone = PhoneNumberUtil.canonicalAlgeriaForStorage(phone);
        user.setPhoneNumber(phone);

        if (phone == null || phone.isBlank()) {
            throw new BadRequestException(java.util.Map.of("phoneNumber", "Le numero de telephone est obligatoire"));
        }

        var candidates = PhoneNumberUtil.algeriaStoredCandidates(phone);
        boolean exists = user.getId() == null
                ? userRepository.existsByPhoneNumberIn(candidates)
                : userRepository.existsByPhoneNumberInAndIdNot(candidates, user.getId());
        if (exists) {
            throw new BadRequestException(java.util.Map.of("phoneNumber", "Ce numero de telephone est deja utilise"));
        }

        // Clinic scoping invariant: staff dentist accounts must be attached to an owner dentist.
        if (user.getRole() == UserRole.DENTIST) {
            ClinicAccessRole role = user.getClinicAccessRole();
            if (role != null && role != ClinicAccessRole.DENTIST && user.getOwnerDentist() == null) {
                throw new BadRequestException(java.util.Map.of("ownerDentist", "Le compte staff doit etre lie au proprietaire"));
            }
        }
    }
}
