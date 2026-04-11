package com.cabinetplus.backend.events;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public record LabOpsChangedEvent(
        Set<String> clinicPhones,
        Set<String> labPhones,
        String type,
        String action,
        List<Long> ids,
        String decision,
        UUID dentistPublicId,
        UUID laboratoryPublicId,
        Double amount
) {
    public LabOpsChangedEvent(Set<String> clinicPhones, Set<String> labPhones, String type, String action, List<Long> ids, String decision, UUID dentistPublicId, UUID laboratoryPublicId) {
        this(clinicPhones, labPhones, type, action, ids, decision, dentistPublicId, laboratoryPublicId, null);
    }
}

