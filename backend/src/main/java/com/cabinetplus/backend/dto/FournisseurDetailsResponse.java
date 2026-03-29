package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.cabinetplus.backend.enums.RecordStatus;

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
        List<FournisseurBillingEntryResponse> billingEntries,
        RecordStatus recordStatus,
        LocalDateTime archivedAt
) {}
