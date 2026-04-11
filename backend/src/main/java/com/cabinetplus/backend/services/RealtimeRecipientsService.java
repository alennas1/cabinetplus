package com.cabinetplus.backend.services;

import java.util.HashSet;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;

@Service
public class RealtimeRecipientsService {

    private final UserRepository userRepository;

    public RealtimeRecipientsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Set<String> clinicPhones(User clinicOwner) {
        Set<String> out = new HashSet<>();
        if (clinicOwner == null) return out;

        // Some records store "practitioner/createdBy" as an EMPLOYEE user. For notifications/realtime updates,
        // we want to target the whole clinic (owner dentist + all employees), not only that employee account.
        User owner = resolveClinicOwner(clinicOwner);

        add(out, owner.getPhoneNumber());
        for (User u : userRepository.findByOwnerDentist(owner)) {
            if (u != null) {
                Set<String> perms = u.getPermissions();
                if (perms != null && perms.contains("LABORATORIES_NOTIFICATIONS")) {
                    add(out, u.getPhoneNumber());
                }
            }
        }
        // Ensure we also include the passed-in user (in case of legacy data without ownerDentist linkage).
        add(out, clinicOwner.getPhoneNumber());
        return out;
    }

    public Set<String> labPhones(Laboratory lab) {
        Set<String> out = new HashSet<>();
        if (lab == null) return out;
        User owner = lab.getCreatedBy();
        if (owner == null || owner.getRole() != UserRole.LAB) return out;
        add(out, owner.getPhoneNumber());
        return out;
    }

    private void add(Set<String> set, String phone) {
        if (set == null || phone == null) return;
        String t = phone.trim();
        if (!t.isBlank()) set.add(t);
    }

    private User resolveClinicOwner(User user) {
        User cursor = user;
        int guard = 0;
        while (cursor != null && cursor.getRole() == UserRole.EMPLOYEE && cursor.getOwnerDentist() != null && guard < 5) {
            cursor = cursor.getOwnerDentist();
            guard++;
        }
        return cursor != null ? cursor : user;
    }
}
