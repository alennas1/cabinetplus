package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.Invoice;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.repositories.InvoiceRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;

    public InvoiceService(InvoiceRepository invoiceRepository) {
        this.invoiceRepository = invoiceRepository;
    }

    public Invoice save(Invoice invoice) {
        return invoiceRepository.save(invoice);
    }

    public List<Invoice> findAll() {
        return invoiceRepository.findAll();
    }

    public Optional<Invoice> findById(Long id) {
        return invoiceRepository.findById(id);
    }

    public Optional<Invoice> findByInvoiceNumber(String invoiceNumber) {
        return invoiceRepository.findByInvoiceNumber(invoiceNumber);
    }

    public List<Invoice> findByPatient(Patient patient) {
        return invoiceRepository.findByPatient(patient);
    }

    public void delete(Long id) {
        invoiceRepository.deleteById(id);
    }
}
