package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.models.Invoice;
import com.cabinetplus.backend.models.InvoiceLine;
import com.cabinetplus.backend.services.InvoiceLineService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/invoice-lines")
public class InvoiceLineController {

    private final InvoiceLineService invoiceLineService;

    public InvoiceLineController(InvoiceLineService invoiceLineService) {
        this.invoiceLineService = invoiceLineService;
    }

    @GetMapping
    public List<InvoiceLine> getAllInvoiceLines() {
        return invoiceLineService.findAll();
    }

    @GetMapping("/{id}")
    public Optional<InvoiceLine> getInvoiceLineById(@PathVariable Long id) {
        return invoiceLineService.findById(id);
    }

    @PostMapping
    public InvoiceLine createInvoiceLine(@RequestBody InvoiceLine invoiceLine) {
        return invoiceLineService.save(invoiceLine);
    }

    @PutMapping("/{id}")
    public InvoiceLine updateInvoiceLine(@PathVariable Long id, @RequestBody InvoiceLine invoiceLine) {
        invoiceLine.setId(id);
        return invoiceLineService.save(invoiceLine);
    }

    @DeleteMapping("/{id}")
    public void deleteInvoiceLine(@PathVariable Long id) {
        invoiceLineService.delete(id);
    }

    // 🔍 Extra endpoint: invoice lines by invoice
    @GetMapping("/invoice/{invoiceId}")
    public List<InvoiceLine> getInvoiceLinesByInvoice(@PathVariable Long invoiceId) {
        Invoice invoice = new Invoice();
        invoice.setId(invoiceId);
        return invoiceLineService.findByInvoice(invoice);
    }
}
