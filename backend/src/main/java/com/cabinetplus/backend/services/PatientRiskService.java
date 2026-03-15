package com.cabinetplus.backend.services;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.repositories.AppointmentRepository;
import com.cabinetplus.backend.repositories.PaymentRepository;
import com.cabinetplus.backend.repositories.ProthesisRepository;
import com.cabinetplus.backend.repositories.TreatmentRepository;

@Service
public class PatientRiskService {

    public record PatientRiskMetrics(long cancelledAppointmentsCount, double moneyOwed) {
    }

    private final AppointmentRepository appointmentRepository;
    private final TreatmentRepository treatmentRepository;
    private final ProthesisRepository prothesisRepository;
    private final PaymentRepository paymentRepository;

    public PatientRiskService(
            AppointmentRepository appointmentRepository,
            TreatmentRepository treatmentRepository,
            ProthesisRepository prothesisRepository,
            PaymentRepository paymentRepository
    ) {
        this.appointmentRepository = appointmentRepository;
        this.treatmentRepository = treatmentRepository;
        this.prothesisRepository = prothesisRepository;
        this.paymentRepository = paymentRepository;
    }

    public Map<Long, PatientRiskMetrics> getMetricsByPatientIds(List<Long> patientIds) {
        Map<Long, PatientRiskMetrics> result = new HashMap<>();
        if (patientIds == null || patientIds.isEmpty()) return result;

        Map<Long, Long> cancelledCounts = toLongMap(appointmentRepository.countCancelledByPatientIds(patientIds));
        Map<Long, Double> treatmentSums = toDoubleMap(treatmentRepository.sumCompletedPriceByPatientIds(patientIds));
        Map<Long, Double> prothesisSums = toDoubleMap(prothesisRepository.sumFinalPriceByPatientIds(patientIds));
        Map<Long, Double> paymentSums = toDoubleMap(paymentRepository.sumAmountByPatientIds(patientIds));

        for (Long patientId : patientIds) {
            long cancelled = cancelledCounts.getOrDefault(patientId, 0L);
            double treatmentTotal = treatmentSums.getOrDefault(patientId, 0.0);
            double prothesisTotal = prothesisSums.getOrDefault(patientId, 0.0);
            double paymentsTotal = paymentSums.getOrDefault(patientId, 0.0);

            double totalFacture = treatmentTotal + prothesisTotal;
            double reste = totalFacture - paymentsTotal;
            double owed = Math.max(0.0, reste);

            result.put(patientId, new PatientRiskMetrics(cancelled, owed));
        }

        return result;
    }

    private Map<Long, Long> toLongMap(List<Object[]> rows) {
        Map<Long, Long> map = new HashMap<>();
        if (rows == null) return map;
        for (Object[] row : rows) {
            if (row == null || row.length < 2) continue;
            Long id = row[0] != null ? ((Number) row[0]).longValue() : null;
            Long value = row[1] != null ? ((Number) row[1]).longValue() : null;
            if (id != null && value != null) map.put(id, value);
        }
        return map;
    }

    private Map<Long, Double> toDoubleMap(List<Object[]> rows) {
        Map<Long, Double> map = new HashMap<>();
        if (rows == null) return map;
        for (Object[] row : rows) {
            if (row == null || row.length < 2) continue;
            Long id = row[0] != null ? ((Number) row[0]).longValue() : null;
            Double value = row[1] != null ? ((Number) row[1]).doubleValue() : null;
            if (id != null && value != null) map.put(id, value);
        }
        return map;
    }
}

