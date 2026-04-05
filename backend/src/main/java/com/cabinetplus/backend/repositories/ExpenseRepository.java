package com.cabinetplus.backend.repositories;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.models.Employee;
import com.cabinetplus.backend.models.Expense;
import com.cabinetplus.backend.models.User;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    // Existing methods
    List<Expense> findByCreatedBy(User user);
    Optional<Expense> findByIdAndCreatedBy(Long id, User user);

    @Query("""
            SELECT SUM(e.amount)
            FROM Expense e
            WHERE e.createdBy = :dentist
              AND e.date BETWEEN :start AND :end
              AND (e.recordStatus IS NULL OR e.recordStatus <> com.cabinetplus.backend.enums.RecordStatus.CANCELLED)
            """)
    Optional<Double> sumAmountByDentist(@Param("dentist") User dentist,
                                        @Param("start") LocalDate start,
                                        @Param("end") LocalDate end);

    @Query("""
        SELECT e.category, COALESCE(SUM(e.amount), 0)
        FROM Expense e
        WHERE e.createdBy = :dentist
          AND e.date BETWEEN :start AND :end
          AND (e.recordStatus IS NULL OR e.recordStatus <> com.cabinetplus.backend.enums.RecordStatus.CANCELLED)
        GROUP BY e.category
    """)
    List<Object[]> sumAmountByDentistGroupByCategory(@Param("dentist") User dentist,
                                                     @Param("start") LocalDate start,
                                                     @Param("end") LocalDate end);

    List<Expense> findByCreatedByAndDateBetween(User dentist, LocalDate start, LocalDate end);

    List<Expense> findByEmployeeAndCreatedBy(Employee employee, User dentist);

    List<Expense> findByFournisseur_IdAndCreatedByOrderByDateDesc(Long fournisseurId, User dentist);

    @Query("""
            SELECT SUM(e.amount)
            FROM Expense e
            WHERE e.createdBy = :dentist
              AND e.fournisseur.id = :fournisseurId
              AND (e.recordStatus IS NULL OR e.recordStatus <> com.cabinetplus.backend.enums.RecordStatus.CANCELLED)
            """)
    Optional<Double> sumAmountByFournisseur(@Param("dentist") User dentist, @Param("fournisseurId") Long fournisseurId);

    @Query("""
        select e
        from Expense e
        left join e.fournisseur f
        where e.createdBy = :dentist
          and (
                :qLike is null or :qLike = '' or (
                    (:fieldKey = 'title' and lower(coalesce(e.title, '')) like :qLike)
                 or (:fieldKey = 'description' and lower(coalesce(e.description, '')) like :qLike)
                 or (:fieldKey = 'category' and lower(coalesce(cast(e.category as string), '')) like :qLike)
                 or (:fieldKey = 'fournisseurName' and lower(coalesce(f.name, '')) like :qLike)
                 or (:fieldKey = 'amount' and :amountExact is not null and e.amount = :amountExact)
                 or (:fieldKey = 'date' and :dateExact is not null and e.date = :dateExact)
                 or (:fieldKey = '' and (
                        lower(coalesce(e.title, '')) like :qLike
                     or lower(coalesce(e.description, '')) like :qLike
                     or lower(coalesce(cast(e.category as string), '')) like :qLike
                     or lower(coalesce(e.otherCategoryLabel, '')) like :qLike
                     or lower(coalesce(f.name, '')) like :qLike
                     or (:amountExact is not null and e.amount = :amountExact)
                     or (:dateExact is not null and e.date = :dateExact)
                 ))
                )
          )
    """)
    Page<Expense> searchByDentist(
            @Param("dentist") User dentist,
            @Param("qLike") String qLike,
            @Param("fieldKey") String fieldKey,
            @Param("amountExact") Double amountExact,
            @Param("dateExact") LocalDate dateExact,
            Pageable pageable
    );

    @Query("""
        select e
        from Expense e
        where e.createdBy = :dentist
          and e.employee = :employee
    """)
    Page<Expense> findByEmployeeAndDentist(
            @Param("employee") Employee employee,
            @Param("dentist") User dentist,
            Pageable pageable
    );

    @Query("""
        select year(e.date), month(e.date), coalesce(sum(e.amount), 0)
        from Expense e
        where e.createdBy = :dentist
          and e.employee = :employee
          and e.date is not null
        group by year(e.date), month(e.date)
        order by year(e.date) desc, month(e.date) desc
    """)
    List<Object[]> sumEmployeeMonthlyTotals(
            @Param("employee") Employee employee,
            @Param("dentist") User dentist
    );

}
