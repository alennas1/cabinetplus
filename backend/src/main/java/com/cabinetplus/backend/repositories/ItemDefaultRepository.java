package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.ItemDefault;
import com.cabinetplus.backend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ItemDefaultRepository extends JpaRepository<ItemDefault, Long> {

    List<ItemDefault> findByCreatedBy(User user);

    Optional<ItemDefault> findByIdAndCreatedBy(Long id, User user);
}
