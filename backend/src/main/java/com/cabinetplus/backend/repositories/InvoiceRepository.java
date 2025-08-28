package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.models.Invoice;
import com.cabinetplus.backend.models.Patient;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
    List<Invoice> findByPatient(Patient patient);
    @Query("select coalesce(sum(i.totalAmount), 0) from Invoice i where i.patient.id = :patientId")
    Double sumTotalsByPatientId(@Param("patientId") Long patientId);
}
