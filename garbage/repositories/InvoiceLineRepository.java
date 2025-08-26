package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Invoice;
import com.cabinetplus.backend.models.InvoiceLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InvoiceLineRepository extends JpaRepository<InvoiceLine, Long> {
    List<InvoiceLine> findByInvoice(Invoice invoice);
}
