package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.Invoice;
import com.cabinetplus.backend.models.InvoiceLine;
import com.cabinetplus.backend.repositories.InvoiceLineRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class InvoiceLineService {

    private final InvoiceLineRepository invoiceLineRepository;

    public InvoiceLineService(InvoiceLineRepository invoiceLineRepository) {
        this.invoiceLineRepository = invoiceLineRepository;
    }

    public InvoiceLine save(InvoiceLine invoiceLine) {
        return invoiceLineRepository.save(invoiceLine);
    }

    public List<InvoiceLine> findAll() {
        return invoiceLineRepository.findAll();
    }

    public Optional<InvoiceLine> findById(Long id) {
        return invoiceLineRepository.findById(id);
    }

    public List<InvoiceLine> findByInvoice(Invoice invoice) {
        return invoiceLineRepository.findByInvoice(invoice);
    }

    public void delete(Long id) {
        invoiceLineRepository.deleteById(id);
    }
}
