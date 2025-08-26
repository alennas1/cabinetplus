package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.models.TreatmentCatalog;
import com.cabinetplus.backend.services.TreatmentCatalogService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/treatment-catalog")
public class TreatmentCatalogController {

    private final TreatmentCatalogService treatmentCatalogService;

    public TreatmentCatalogController(TreatmentCatalogService treatmentCatalogService) {
        this.treatmentCatalogService = treatmentCatalogService;
    }

    @GetMapping
    public List<TreatmentCatalog> getAllTreatmentCatalogs() {
        return treatmentCatalogService.findAll();
    }

    @GetMapping("/{id}")
    public Optional<TreatmentCatalog> getTreatmentCatalogById(@PathVariable Long id) {
        return treatmentCatalogService.findById(id);
    }

    @PostMapping
    public TreatmentCatalog createTreatmentCatalog(@RequestBody TreatmentCatalog catalog) {
        return treatmentCatalogService.save(catalog);
    }

    @PutMapping("/{id}")
    public TreatmentCatalog updateTreatmentCatalog(@PathVariable Long id, @RequestBody TreatmentCatalog catalog) {
        catalog.setId(id);
        return treatmentCatalogService.save(catalog);
    }

    @DeleteMapping("/{id}")
    public void deleteTreatmentCatalog(@PathVariable Long id) {
        treatmentCatalogService.delete(id);
    }
}
