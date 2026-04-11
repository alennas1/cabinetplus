package com.cabinetplus.backend.notifications;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.cabinetplus.backend.dto.NotificationResponse;
import com.cabinetplus.backend.enums.NotificationType;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.events.LabOpsChangedEvent;
import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.LaboratoryPayment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.LaboratoryPaymentRepository;
import com.cabinetplus.backend.repositories.LaboratoryRepository;
import java.lang.reflect.Method;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.services.NotificationService;
import com.cabinetplus.backend.services.RealtimeRecipientsService;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class LabOpsInAppNotifier {

    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final LaboratoryRepository laboratoryRepository;
    private final LaboratoryPaymentRepository laboratoryPaymentRepository;
    private final RealtimeRecipientsService realtimeRecipientsService;
    private final ObjectMapper objectMapper;

    public LabOpsInAppNotifier(
            NotificationService notificationService,
            UserRepository userRepository,
            LaboratoryRepository laboratoryRepository,
            LaboratoryPaymentRepository laboratoryPaymentRepository,
            RealtimeRecipientsService realtimeRecipientsService,
            ObjectMapper objectMapper
    ) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
        this.laboratoryRepository = laboratoryRepository;
        this.laboratoryPaymentRepository = laboratoryPaymentRepository;
        this.realtimeRecipientsService = realtimeRecipientsService;
        this.objectMapper = objectMapper;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onLabOpsChanged(LabOpsChangedEvent event) {
        if (event == null) return;
        Set<String> clinicPhones = resolveClinicPhones(event);
        Set<String> labPhones = resolveLabPhones(event);

        String kind = norm(event.type());
        String action = norm(event.action());
        String decision = norm(event.decision());
        List<Long> ids = (event.ids() != null) ? event.ids().stream().filter(Objects::nonNull).toList() : List.of();
        Long firstId = ids.stream().findFirst().orElse(null);
        int count = ids.size();

        if ("PROTHESIS_UPDATED".equals(kind)) {
            handleProthesis(event, clinicPhones, labPhones, action, decision, ids, firstId, count);
            return;
        }
        if ("LAB_PAYMENT_UPDATED".equals(kind)) {
            handleLabPayment(event, event.laboratoryPublicId(), clinicPhones, labPhones, action, decision, ids, firstId, count);
            return;
        }
    }

    private void handleProthesis(LabOpsChangedEvent event,
                                 Set<String> clinicPhones,
                                 Set<String> labPhones,
                                 String action,
                                 String decision,
                                 List<Long> ids,
                                 Long firstId,
                                 int count) {
        if ("CANCEL_REQUESTED".equals(action)) {
            if (firstId == null) return;

            String titleLab = getDentistName(event);
            String bodyLab = "a demandé l'annulation d'une prothèse";
            String dataLab = jsonData(Map.of(
                    "entityType", "PROTHESIS",
                    "entityId", firstId,
                    "action", action,
                    "decision", "PENDING",
                    "otherRole", "DENTIST",
                    "actions", List.of(
                            Map.of("id", "approve", "label", "Approuver", "method", "PUT", "url", "/api/lab/protheses/" + firstId + "/cancel/approve"),
                            Map.of("id", "reject", "label", "Rejeter", "method", "PUT", "url", "/api/lab/protheses/" + firstId + "/cancel/reject")
                    )
            ));

            notifyPhones(labPhones, NotificationType.PROTHESIS_CANCELLATION_REQUESTED, titleLab, bodyLab, "/lab/pending", dataLab);
            return;
        }

        if ("CANCEL_DECIDED".equals(action)) {
            if (firstId == null) return;
            String title = getLabName(event);
            String body = isApproved(decision) ? "a approuvé l'annulation" : "a rejeté l'annulation";
            String data = jsonData(Map.of("entityType", "PROTHESIS", "entityId", firstId, "action", action, "decision", decision, "otherRole", "LAB"));
            notifyPhones(clinicPhones, NotificationType.PROTHESIS_CANCELLATION_DECIDED, title, body, "/gestion-cabinet/prosthetics-tracking", data);
            return;
        }

        boolean byDentist = "STATUS_CHANGED_BY_DENTIST".equals(action);
        boolean byLab     = "STATUS_CHANGED_BY_LAB".equals(action);
        boolean isStatusChange = byDentist || byLab || "STATUS_CHANGED".equals(action);

        if (count <= 0) return;
        String title = count == 1 ? "Prothèse · Mise à jour" : ("Prothèses · " + count + " mises à jour");
        String body = isStatusChange ? "Statut mis à jour." : "Changement détecté sur vos prothèses.";

        if (isStatusChange && count == 1) {
            if (byDentist && event != null && event.dentistPublicId() != null) {
                User creator = userRepository.findByPublicId(event.dentistPublicId()).orElse(null);
                if (creator != null) {
                    String first = creator.getFirstname() != null ? creator.getFirstname().trim() : "";
                    String last = creator.getLastname() != null ? creator.getLastname().trim() : "";
                    String fullName = (first + " " + last).trim();
                    if (!fullName.isEmpty()) title = fullName;
                }
            } else if (byLab && event != null && event.laboratoryPublicId() != null) {
                Laboratory lab = laboratoryRepository.findByPublicId(event.laboratoryPublicId()).orElse(null);
                if (lab != null && lab.getName() != null && !lab.getName().isBlank()) {
                    title = lab.getName().trim();
                }
            }
        }
        
        // Frontend expects pure "STATUS_CHANGED" for routing metadata
        String finalAction = isStatusChange ? "STATUS_CHANGED" : action;
        
        Map<String, Object> metaMap = new java.util.HashMap<>();
        metaMap.put("entityType", "PROTHESIS");
        metaMap.put("ids", ids);
        metaMap.put("action", finalAction);
        if (decision != null && !decision.isBlank()) {
            metaMap.put("decision", decision);
            if (isStatusChange) {
                metaMap.put("prothesisStatus", decision);
            }
        }
        if (isStatusChange) {
            metaMap.put("otherRole", byDentist ? "DENTIST" : "LAB");
        }
        String data = jsonData(metaMap);

        if (!byDentist) {
            notifyPhones(clinicPhones, NotificationType.PROTHESIS_STATUS_UPDATED, title, body, "/gestion-cabinet/prosthetics-tracking", data);
        }
        if (!byLab) {
            notifyPhones(labPhones, NotificationType.PROTHESIS_STATUS_UPDATED, title, body, "/lab/prosthetics", data);
        }
    }

    private void handleLabPayment(LabOpsChangedEvent event,
                                  UUID laboratoryPublicId,
                                  Set<String> clinicPhones,
                                  Set<String> labPhones,
                                  String action,
                                  String decision,
                                  List<Long> ids,
                                  Long firstId,
                                  int count) {
        if ("CREATED".equals(action)) {
            if (count <= 0) return;
            String title = "Cabinet Dentaire";
            String body = "Paiement ajouté";
            
            Double exactAmount = null; // fallback

            try {
                // If amount is directly attached to the event
                Method m = event.getClass().getMethod("amount");
                Object amountObj = m.invoke(event);
                if (amountObj instanceof Double) {
                    exactAmount = (Double) amountObj;
                }
            } catch (Exception ignored) {}

            UUID dentistId = event != null ? event.dentistPublicId() : null;
            if (dentistId != null) {
                User creator = userRepository.findByPublicId(dentistId).orElse(null);
                if (creator != null) {
                    String first = creator.getFirstname() != null ? creator.getFirstname().trim() : "";
                    String last = creator.getLastname() != null ? creator.getLastname().trim() : "";
                    String fullName = (first + " " + last).trim();
                    if (!fullName.isEmpty()) {
                        title = fullName;
                    }
                }
            }
            if (exactAmount != null) {
                body = String.format(java.util.Locale.US, "%.2f MAD", exactAmount);
            }

            Map<String, Object> metaMap = new java.util.HashMap<>();
            metaMap.put("entityType", "LAB_PAYMENT");
            metaMap.put("ids", ids);
            metaMap.put("action", action);
            metaMap.put("otherRole", "DENTIST");
            if (exactAmount != null) {
                metaMap.put("amount", exactAmount);
            }
            String data = jsonData(metaMap);
            
            System.out.println("--> [NEW CODE] Dispatching notification for Lab Payment (CREATED action) for lab: " + laboratoryPublicId);
            // Suppressing notification to clinicPhones (the dentist) for payments they themselves created
            notifyLabAccount(laboratoryPublicId, labPhones, NotificationType.LAB_PAYMENT_UPDATED, title, body, "/lab/payments", data);
            return;
        }

        if ("CANCEL_REQUESTED".equals(action)) {
            if (firstId == null) return;

            String titleLab = getDentistName(event);
            String bodyLab = "a demandé l'annulation d'un paiement";
            String dataLab = jsonData(Map.of(
                    "entityType", "LAB_PAYMENT",
                    "entityId", firstId,
                    "action", action,
                    "decision", "PENDING",
                    "otherRole", "DENTIST",
                    "actions", List.of(
                            Map.of("id", "approve", "label", "Approuver", "method", "PUT", "url", "/api/lab/payments/" + firstId + "/cancel/approve"),
                            Map.of("id", "reject", "label", "Rejeter", "method", "PUT", "url", "/api/lab/payments/" + firstId + "/cancel/reject")
                    )
            ));
            notifyLabAccount(laboratoryPublicId, labPhones, NotificationType.LAB_PAYMENT_CANCELLATION_REQUESTED, titleLab, bodyLab, "/lab/pending", dataLab);


            return;
        }

        if ("CANCEL_DECIDED".equals(action)) {
            if (firstId == null) return;
            String title = getLabName(event);
            String body = isApproved(decision) ? "a approuvé l'annulation" : "a rejeté l'annulation";
            String data = jsonData(Map.of("entityType", "LAB_PAYMENT", "entityId", firstId, "action", action, "decision", decision, "otherRole", "LAB"));
            notifyPhones(clinicPhones, NotificationType.LAB_PAYMENT_CANCELLATION_DECIDED, title, body, "/gestion-cabinet/laboratories", data);
            return;
        }

        if (count <= 0) return;
        String title = count == 1 ? "Paiement laboratoire · Mise à jour" : ("Paiements laboratoire · " + count + " mis à jour");
        String body = "Changement détecté sur vos paiements laboratoire.";
        String data = jsonData(Map.of("entityType", "LAB_PAYMENT", "ids", ids, "action", action));

        notifyPhones(clinicPhones, NotificationType.LAB_PAYMENT_UPDATED, title, body, "/gestion-cabinet/laboratories", data);
        notifyLabAccount(laboratoryPublicId, labPhones, NotificationType.LAB_PAYMENT_UPDATED, title, body, "/lab/payments", data);
    }

    private void notifyLabAccount(UUID laboratoryPublicId,
                                  Set<String> fallbackPhones,
                                  NotificationType type,
                                  String title,
                                  String body,
                                  String url,
                                  String data) {
        NotificationResponse res = notifyLabOwnerByPublicId(laboratoryPublicId, type, title, body, url, data);
        if (res != null) return;
        notifyPhones(fallbackPhones, type, title, body, url, data);
    }

    private NotificationResponse notifyLabOwnerByPublicId(UUID labPublicId,
                                                          NotificationType type,
                                                          String title,
                                                          String body,
                                                          String url,
                                                          String data) {
        if (labPublicId == null || type == null) return null;
        try {
            Laboratory lab = laboratoryRepository.findByPublicId(labPublicId).orElse(null);
            if (lab == null) return null;
            User recipient = lab.getCreatedBy();
            if (recipient == null || recipient.getId() == null || recipient.getRole() != UserRole.LAB) return null;
            String finalUrl = urlForUser(recipient, url);
            return notificationService.create(recipient, type, title, body, finalUrl, data);
        } catch (Exception ignored) {
            return null;
        }
    }

    private Set<String> resolveClinicPhones(LabOpsChangedEvent event) {
        Set<String> phones = safePhones(event != null ? event.clinicPhones() : null);
        if (!phones.isEmpty()) return phones;

        UUID dentistId = event != null ? event.dentistPublicId() : null;
        if (dentistId == null) return phones;
        try {
            User dentist = userRepository.findByPublicId(dentistId).orElse(null);
            if (dentist == null) return phones;
            return safePhones(realtimeRecipientsService.clinicPhones(dentist));
        } catch (Exception ignored) {
            return phones;
        }
    }

    private Set<String> resolveLabPhones(LabOpsChangedEvent event) {
        Set<String> phones = safePhones(event != null ? event.labPhones() : null);
        if (!phones.isEmpty()) return phones;

        UUID labId = event != null ? event.laboratoryPublicId() : null;
        if (labId == null) return phones;
        try {
            Laboratory lab = laboratoryRepository.findByPublicId(labId).orElse(null);
            if (lab == null) return phones;
            return safePhones(realtimeRecipientsService.labPhones(lab));
        } catch (Exception ignored) {
            return phones;
        }
    }

    private void notifyPhones(Set<String> phones,
                              NotificationType type,
                              String title,
                              String body,
                              String url,
                              String data) {
        for (String phone : safePhones(phones)) {
            User recipient = userRepository.findFirstByPhoneNumberOrderByIdAsc(phone).orElse(null);
            if (recipient == null || recipient.getId() == null || recipient.getRole() == null) continue;

            String finalUrl = urlForUser(recipient, url);
            try {
                notificationService.create(recipient, type, title, body, finalUrl, data);
            } catch (Exception ignored) {
                // ignore notification creation failures
            }
        }
    }

    private String urlForUser(User user, String proposedUrl) {
        String url = (proposedUrl != null) ? proposedUrl.trim() : "";
        if (!url.isBlank()) return url;
        UserRole role = user != null ? user.getRole() : null;
        return role == UserRole.LAB ? "/lab" : "/dashboard";
    }

    private Set<String> safePhones(Set<String> phones) {
        Set<String> out = new HashSet<>();
        if (phones == null) return out;
        for (String p : phones) {
            if (p == null) continue;
            String t = p.trim();
            if (!t.isBlank()) out.add(t);
        }
        return out;
    }

    private String jsonData(Map<String, Object> input) {
        if (input == null || input.isEmpty()) return null;
        try {
            Map<String, Object> data = new LinkedHashMap<>(input);
            if (data.isEmpty()) return null;
            return objectMapper.writeValueAsString(data);
        } catch (Exception e) {
            return null;
        }
    }

    private String decisionLabel(String decision) {
        if (isApproved(decision)) return "Approuvée";
        if ("REJECTED".equals(decision)) return "Rejetée";
        return "Décision";
    }

    private boolean isApproved(String decision) {
        return "APPROVED".equals(decision);
    }

    private String norm(String value) {
        return value != null ? value.trim().toUpperCase() : "";
    }

    private String getDentistName(LabOpsChangedEvent event) {
        if (event != null && event.dentistPublicId() != null) {
            User creator = userRepository.findByPublicId(event.dentistPublicId()).orElse(null);
            if (creator != null) {
                String first = creator.getFirstname() != null ? creator.getFirstname().trim() : "";
                String last = creator.getLastname() != null ? creator.getLastname().trim() : "";
                String fullName = (first + " " + last).trim();
                if (!fullName.isEmpty()) return fullName;
            }
        }
        return "Cabinet Dentaire";
    }

    private String getLabName(LabOpsChangedEvent event) {
        if (event != null && event.laboratoryPublicId() != null) {
            Laboratory lab = laboratoryRepository.findByPublicId(event.laboratoryPublicId()).orElse(null);
            if (lab != null && lab.getName() != null && !lab.getName().isBlank()) {
                return lab.getName().trim();
            }
        }
        return "Laboratoire";
    }
}
