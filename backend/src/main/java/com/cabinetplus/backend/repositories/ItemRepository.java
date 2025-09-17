package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.cabinetplus.backend.models.Item;
import com.cabinetplus.backend.models.User;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long> {

    // Existing methods
    List<Item> findByCreatedBy(User user);
    Optional<Item> findByIdAndCreatedBy(Long id, User user);

 @Query("SELECT SUM(i.price) FROM Item i WHERE i.createdBy = :dentist AND i.createdAt BETWEEN :start AND :end")
    Optional<Double> sumPriceByDentist(@Param("dentist") User dentist,
                                       @Param("start") LocalDateTime start,
                                       @Param("end") LocalDateTime end);

    List<Item> findByCreatedByAndCreatedAtBetween(User dentist, LocalDateTime start, LocalDateTime end);
}
