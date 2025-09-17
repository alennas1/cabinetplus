package com.cabinetplus.backend.repositories;

import java.time.LocalDate;
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

    List<Item> findByCreatedBy(User user);

    Optional<Item> findByIdAndCreatedBy(Long id, User user);

    @Query("SELECT SUM(i.price) FROM Item i WHERE i.createdBy IS NOT NULL AND i.expiryDate BETWEEN :from AND :to")
    Double sumInventoryBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

   @Query("SELECT COALESCE(SUM(e.amount), 0) " +
       "FROM Expense e " +
       "WHERE EXTRACT(YEAR FROM e.date) = :year AND EXTRACT(MONTH FROM e.date) = :month")
Double sumByMonth(@Param("year") int year, @Param("month") int month);

}
