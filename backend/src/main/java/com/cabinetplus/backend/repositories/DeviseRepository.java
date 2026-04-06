package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Devise;
import com.cabinetplus.backend.models.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface DeviseRepository extends JpaRepository<Devise, Long> {
    List<Devise> findByPractitioner(User user);

    @Query("""
        select d
        from Devise d
        where d.practitioner = :practitioner
          and d.createdAt >= coalesce(:fromDt, d.createdAt)
          and d.createdAt <= coalesce(:toDt, d.createdAt)
          and d.totalAmount >= coalesce(:amountFrom, d.totalAmount)
          and d.totalAmount <= coalesce(:amountTo, d.totalAmount)
          and (
              coalesce(:qLike, '') = ''
              or lower(coalesce(d.title, '')) like :qLike
              or exists (
                  select 1
                  from DeviseItem i
                  left join i.treatmentCatalog tc
                  left join i.prothesisCatalog pc
                  left join pc.material m
                  where i.devise = d
                    and (
                        lower(coalesce(tc.name, '')) like :qLike
                        or lower(coalesce(pc.name, '')) like :qLike
                        or lower(coalesce(m.name, '')) like :qLike
                    )
              )
          )
    """)
    Page<Devise> searchByPractitionerPaged(
            @Param("practitioner") User practitioner,
            @Param("qLike") String qLike,
            @Param("amountFrom") Double amountFrom,
            @Param("amountTo") Double amountTo,
            @Param("fromDt") LocalDateTime fromDt,
            @Param("toDt") LocalDateTime toDt,
            Pageable pageable
    );
}
