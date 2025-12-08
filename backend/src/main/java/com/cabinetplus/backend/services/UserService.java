package com.cabinetplus.backend.services;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User save(User user) {
        return userRepository.save(user);
    }

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public void delete(Long id) {
        userRepository.deleteById(id);
    }
}
