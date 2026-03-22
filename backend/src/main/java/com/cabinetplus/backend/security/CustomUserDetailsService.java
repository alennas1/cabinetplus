package com.cabinetplus.backend.security;

import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.util.PhoneNumberUtil;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepo;

    public CustomUserDetailsService(UserRepository userRepo) {
        this.userRepo = userRepo;
    }

    @Override
    public UserDetails loadUserByUsername(String phoneNumber) throws UsernameNotFoundException {
        var candidates = PhoneNumberUtil.algeriaStoredCandidates(phoneNumber);
        User user = userRepo.findFirstByPhoneNumberInOrderByIdAsc(candidates)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable"));

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getPhoneNumber())
                .password(user.getPasswordHash())  // stored as BCrypt hash
                .roles(user.getRole().name())
                .build();
    }
}

