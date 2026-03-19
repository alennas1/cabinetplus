package com.cabinetplus.backend.models;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.cabinetplus.backend.security.EncryptionConverter;
import jakarta.persistence.*;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "protheses")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Prothesis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "prothesis_catalog_id")
    private ProthesisCatalog prothesisCatalog;

    @ManyToOne
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @ManyToOne
    @JoinColumn(name = "practitioner_id")
    private User practitioner;

    // --- Laboratory & Workflow ---
    @ManyToOne
    @JoinColumn(name = "laboratory_id")
    private Laboratory laboratory; // Assigned when sent to lab

    private Double labCost; // Expense paid to the lab (DZD)
    
    // Status e.g., "PENDING", "SENT_TO_LAB", "RECEIVED", "FITTED"
    private String status = "PENDING"; 
    
    private LocalDateTime dateCreated = LocalDateTime.now();
    private LocalDateTime sentToLabDate;
    private LocalDateTime actualReturnDate;

    // --- Pricing & Details ---
    private Double finalPrice; // Calculated: (catalog.price * teeth.size()) or flat fee
    private String code;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String notes;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
        name = "prothesis_teeth",
        joinColumns = @JoinColumn(name = "prothesis_id")
    )
    @Column(name = "tooth_number")
    private List<Integer> teeth = new ArrayList<>();
}
