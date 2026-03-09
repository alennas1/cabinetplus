package com.cabinetplus.backend.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "devises")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Devise {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title; // Name of this quote template

    @ManyToOne(optional = false)
    @JoinColumn(name = "practitioner_id", nullable = false)
    private User practitioner;

    private LocalDateTime createdAt = LocalDateTime.now();
    
    private Double totalAmount = 0.0;

   // In Devise.java
@OneToMany(mappedBy = "devise", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
private List<DeviseItem> items = new ArrayList<>();
}