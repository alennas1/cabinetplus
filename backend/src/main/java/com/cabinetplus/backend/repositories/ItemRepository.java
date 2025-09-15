package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Item;
import com.cabinetplus.backend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long> {

    List<Item> findByCreatedBy(User user);
Optional<Item> findByIdAndCreatedBy(Long id, User user);

}
