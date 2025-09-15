package com.cabinetplus.backend.models;

import com.cabinetplus.backend.enums.ItemCategory; // import the enum
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Entity
@Table(name = "item_defaults")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ItemDefault {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ItemCategory category;

    @NotNull
    @Column(nullable = false)
    private Double defaultPrice;

    private String description;

    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy; // dentist owner
}
