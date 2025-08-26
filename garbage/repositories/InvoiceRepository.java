package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Invoice;
import com.cabinetplus.backend.models.Patient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
    List<Invoice> findByPatient(Patient patient);
}
