package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.cabinetplus.backend.models.Plan;

@Repository
public interface PlanRepository extends JpaRepository<Plan, Long> {

    Optional<Plan> findByCode(String code);
    List<Plan> findByActiveTrue();

    @Modifying
    @Query("UPDATE Plan p SET p.recommended = false WHERE p.recommended = true")
    int clearRecommended();

    @Query(
            value = """
                    select *
                    from plans p
                    where (
                      :q is null
                      or btrim(:q) = ''
                      or (
                        (lower(coalesce(:field, '')) = '' and (
                          lower(coalesce(p.code, '')) like concat('%', :q, '%')
                          or lower(coalesce(p.name, '')) like concat('%', :q, '%')
                          or cast(p.monthly_price as text) like concat('%', :q, '%')
                          or cast(p.yearly_monthly_price as text) like concat('%', :q, '%')
                          or cast(p.duration_days as text) like concat('%', :q, '%')
                          or cast(p.max_dentists as text) like concat('%', :q, '%')
                          or cast(p.max_employees as text) like concat('%', :q, '%')
                          or cast(p.max_patients as text) like concat('%', :q, '%')
                          or cast(p.max_storage_gb as text) like concat('%', :q, '%')
                          or cast(p.active as text) like concat('%', :q, '%')
                          or cast(p.recommended as text) like concat('%', :q, '%')
                        ))
                        or (lower(coalesce(:field, '')) = 'code' and lower(coalesce(p.code, '')) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'name' and lower(coalesce(p.name, '')) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'monthlyprice' and cast(p.monthly_price as text) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'yearlymonthlyprice' and cast(p.yearly_monthly_price as text) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'durationdays' and cast(p.duration_days as text) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'maxdentists' and cast(p.max_dentists as text) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'maxemployees' and cast(p.max_employees as text) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'maxpatients' and cast(p.max_patients as text) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'maxstoragegb' and cast(p.max_storage_gb as text) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'active' and cast(p.active as text) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'recommended' and cast(p.recommended as text) like concat('%', :q, '%'))
                      )
                    )
                    """,
            countQuery = """
                    select count(*)
                    from plans p
                    where (
                      :q is null
                      or btrim(:q) = ''
                      or (
                        (lower(coalesce(:field, '')) = '' and (
                          lower(coalesce(p.code, '')) like concat('%', :q, '%')
                          or lower(coalesce(p.name, '')) like concat('%', :q, '%')
                          or cast(p.monthly_price as text) like concat('%', :q, '%')
                          or cast(p.yearly_monthly_price as text) like concat('%', :q, '%')
                          or cast(p.duration_days as text) like concat('%', :q, '%')
                          or cast(p.max_dentists as text) like concat('%', :q, '%')
                          or cast(p.max_employees as text) like concat('%', :q, '%')
                          or cast(p.max_patients as text) like concat('%', :q, '%')
                          or cast(p.max_storage_gb as text) like concat('%', :q, '%')
                          or cast(p.active as text) like concat('%', :q, '%')
                          or cast(p.recommended as text) like concat('%', :q, '%')
                        ))
                        or (lower(coalesce(:field, '')) = 'code' and lower(coalesce(p.code, '')) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'name' and lower(coalesce(p.name, '')) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'monthlyprice' and cast(p.monthly_price as text) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'yearlymonthlyprice' and cast(p.yearly_monthly_price as text) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'durationdays' and cast(p.duration_days as text) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'maxdentists' and cast(p.max_dentists as text) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'maxemployees' and cast(p.max_employees as text) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'maxpatients' and cast(p.max_patients as text) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'maxstoragegb' and cast(p.max_storage_gb as text) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'active' and cast(p.active as text) like concat('%', :q, '%'))
                        or (lower(coalesce(:field, '')) = 'recommended' and cast(p.recommended as text) like concat('%', :q, '%'))
                      )
                    )
                    """,
            nativeQuery = true
    )
    Page<Plan> searchPagedForAdmin(@Param("q") String q, @Param("field") String field, Pageable pageable);
}
