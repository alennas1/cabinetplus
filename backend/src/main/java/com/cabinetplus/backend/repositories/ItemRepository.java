package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    Page<Item> findByCreatedBy(User user, Pageable pageable);
    Optional<Item> findByIdAndCreatedBy(Long id, User user);

    long countByCreatedByAndItemDefault_Id(User user, Long itemDefaultId);

    @Query("""
             SELECT SUM(i.price)
             FROM Item i
             WHERE i.createdBy = :dentist
           AND i.createdAt BETWEEN :start AND :end
           AND (i.recordStatus IS NULL OR i.recordStatus <> com.cabinetplus.backend.enums.RecordStatus.CANCELLED)
         """)
    Optional<Double> sumPriceByDentist(@Param("dentist") User dentist,
                                       @Param("start") LocalDateTime start,
                                       @Param("end") LocalDateTime end);

    List<Item> findByCreatedByAndCreatedAtBetween(User dentist, LocalDateTime start, LocalDateTime end);

    boolean existsByFournisseur_IdAndCreatedBy(Long fournisseurId, User user);

    List<Item> findByFournisseur_IdAndCreatedByOrderByCreatedAtDesc(Long fournisseurId, User user);

    @Query("""
            select i
            from Item i
            join i.itemDefault d
            left join i.fournisseur f
            where i.createdBy = :owner
              and (
                coalesce(:q, '') = '' or
                lower(coalesce(d.name, '')) like lower(concat('%', :q, '%')) or
                lower(coalesce(f.name, '')) like lower(concat('%', :q, '%'))
              )
            """)
    Page<Item> searchByCreatedBy(@Param("owner") User owner, @Param("q") String q, Pageable pageable);

    @Query("""
            SELECT SUM(i.price)
            FROM Item i
            WHERE i.createdBy = :dentist
              AND i.fournisseur.id = :fournisseurId
              AND (i.recordStatus IS NULL OR i.recordStatus <> com.cabinetplus.backend.enums.RecordStatus.CANCELLED)
            """)
    Optional<Double> sumPriceByFournisseur(@Param("dentist") User dentist, @Param("fournisseurId") Long fournisseurId);

    @Query(
            value = """
                select
                    entries.reference_id,
                    entries.source,
                    entries.label,
                    entries.amount,
                    entries.billing_date,
                    entries.created_by_name
                from (
                    select
                        i.id as reference_id,
                        'ITEM' as source,
                        coalesce(d.name, 'Achat') as label,
                        coalesce(i.price, 0) as amount,
                        i.created_at as billing_date,
                        trim(concat(coalesce(u.firstname, ''), ' ', coalesce(u.lastname, ''))) as created_by_name
                    from public.items i
                    join public.item_defaults d on d.id = i.item_default_id
                    join public.users u on u.id = i.created_by
                    where i.fournisseur_id = :fournisseurId
                      and i.created_by = :createdById
                      and coalesce(i.record_status, 'ACTIVE') <> 'ARCHIVED'

                    union all

                    select
                        e.id as reference_id,
                        'EXPENSE' as source,
                        coalesce(e.title, 'Dépense') as label,
                        coalesce(e.amount, 0) as amount,
                        (e.date::timestamp) as billing_date,
                        trim(concat(coalesce(u2.firstname, ''), ' ', coalesce(u2.lastname, ''))) as created_by_name
                    from public.expenses e
                    join public.users u2 on u2.id = e.created_by
                    where e.fournisseur_id = :fournisseurId
                      and e.created_by = :createdById
                      and coalesce(e.record_status, 'ACTIVE') <> 'ARCHIVED'
                ) entries
                where (:fromDt is null or entries.billing_date >= :fromDt)
                  and (:toDt is null or entries.billing_date <= :toDt)
            """,
            countQuery = """
                select count(*)
                from (
                    select
                        i.id as reference_id,
                        'ITEM' as source,
                        coalesce(d.name, 'Achat') as label,
                        coalesce(i.price, 0) as amount,
                        i.created_at as billing_date,
                        trim(concat(coalesce(u.firstname, ''), ' ', coalesce(u.lastname, ''))) as created_by_name
                    from public.items i
                    join public.item_defaults d on d.id = i.item_default_id
                    join public.users u on u.id = i.created_by
                    where i.fournisseur_id = :fournisseurId
                      and i.created_by = :createdById
                      and coalesce(i.record_status, 'ACTIVE') <> 'ARCHIVED'

                    union all

                    select
                        e.id as reference_id,
                        'EXPENSE' as source,
                        coalesce(e.title, 'Dépense') as label,
                        coalesce(e.amount, 0) as amount,
                        (e.date::timestamp) as billing_date,
                        trim(concat(coalesce(u2.firstname, ''), ' ', coalesce(u2.lastname, ''))) as created_by_name
                    from public.expenses e
                    join public.users u2 on u2.id = e.created_by
                    where e.fournisseur_id = :fournisseurId
                      and e.created_by = :createdById
                      and coalesce(e.record_status, 'ACTIVE') <> 'ARCHIVED'
                ) entries
                where (:fromDt is null or entries.billing_date >= :fromDt)
                  and (:toDt is null or entries.billing_date <= :toDt)
            """,
            nativeQuery = true
    )
    Page<Object[]> findFournisseurBillingEntries(
            @Param("fournisseurId") Long fournisseurId,
            @Param("createdById") Long createdById,
            @Param("fromDt") LocalDateTime fromDt,
            @Param("toDt") LocalDateTime toDt,
            Pageable pageable
    );

    @Query(
            value = """
                select
                    count(*) as total_count,
                    coalesce(sum(entries.amount), 0) as total_amount
                from (
                    select
                        coalesce(i.price, 0) as amount,
                        i.created_at as billing_date
                    from public.items i
                    where i.fournisseur_id = :fournisseurId
                      and i.created_by = :createdById
                      and coalesce(i.record_status, 'ACTIVE') <> 'ARCHIVED'

                    union all

                    select
                        coalesce(e.amount, 0) as amount,
                        (e.date::timestamp) as billing_date
                    from public.expenses e
                    where e.fournisseur_id = :fournisseurId
                      and e.created_by = :createdById
                      and coalesce(e.record_status, 'ACTIVE') <> 'ARCHIVED'
                ) entries
                where (:fromDt is null or entries.billing_date >= :fromDt)
                  and (:toDt is null or entries.billing_date <= :toDt)
            """,
            nativeQuery = true
    )
    Object[] getFournisseurBillingEntriesSummary(
            @Param("fournisseurId") Long fournisseurId,
            @Param("createdById") Long createdById,
            @Param("fromDt") LocalDateTime fromDt,
            @Param("toDt") LocalDateTime toDt
    );
}
