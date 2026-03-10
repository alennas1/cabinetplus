package com.cabinetplus.backend.services;

import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository);
    }

    @Test
    void savePopulatesDefaultsWhenMissing() {
        User user = new User();
        user.setUsername("u1");
        user.setRole(UserRole.DENTIST);
        user.setCreatedAt(null);
        user.setPlanStatus(null);

        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User saved = userService.save(user);

        assertNotNull(saved.getCreatedAt());
        assertEquals(UserPlanStatus.PENDING, saved.getPlanStatus());
        assertEquals(false, saved.isCanDeleteAdmin());
    }

    @Test
    void deleteUserDeniesNonSuperAdminDeletingAdmin() {
        User current = new User();
        current.setCanDeleteAdmin(false);

        User target = new User();
        target.setRole(UserRole.ADMIN);

        assertThrows(AccessDeniedException.class, () -> userService.deleteUser(current, target));
    }

    @Test
    void createAdminDeniesNonSuperAdminCreatingSuperAdmin() {
        User current = new User();
        current.setCanDeleteAdmin(false);

        User newAdmin = new User();
        newAdmin.setCanDeleteAdmin(true);

        assertThrows(AccessDeniedException.class, () -> userService.createAdmin(current, newAdmin));
    }

    @Test
    void createAdminAppliesDefaultsAndSaves() {
        User current = new User();
        current.setCanDeleteAdmin(true);

        User newAdmin = new User();
        newAdmin.setUsername("admin2");
        newAdmin.setCanDeleteAdmin(false);

        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User saved = userService.createAdmin(current, newAdmin);

        assertEquals(UserRole.ADMIN, saved.getRole());
        assertEquals(UserPlanStatus.PENDING, saved.getPlanStatus());
        assertNotNull(saved.getCreatedAt());
        assertEquals("", saved.getFirstname());
        assertEquals("", saved.getLastname());
        assertEquals(false, saved.isPhoneVerified());
        verify(userRepository).save(saved);
    }
}
