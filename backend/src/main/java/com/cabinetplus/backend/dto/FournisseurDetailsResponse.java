package com.cabinetplus.backend.dto;

import java.util.List;
import java.util.UUID;

public record FournisseurDetailsResponse(
        Long id,
        UUID publicId,
        String name,
        String contactPerson,
        String phoneNumber,
        String address,
        Double totalOwed,
        Double totalPaid,
        Double remainingToPay,
        List<FournisseurPaymentResponse> payments,
        List<FournisseurBillingSummaryResponse> billingHistory,
        List<FournisseurBillingEntryResponse> billingEntries
) {}
