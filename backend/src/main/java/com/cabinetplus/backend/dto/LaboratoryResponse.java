package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.cabinetplus.backend.enums.RecordStatus;

/**
 * DTO for returning Laboratory details to the frontend.
 */
public record LaboratoryResponse(
    Long id,
    UUID publicId,
    String name,
    String contactPerson,
    String phoneNumber,
    String address,
    Double totalOwed,
    Double totalPaid,
    Double remainingToPay,
    List<LaboratoryPaymentResponse> payments,
    List<LaboratoryBillingSummaryResponse> billingHistory,
    List<LaboratoryBillingEntryResponse> billingEntries,
    RecordStatus recordStatus,
    LocalDateTime archivedAt,
    boolean connected,
    boolean editable
) {}
