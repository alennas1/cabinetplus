package com.cabinetplus.backend.services;

import com.cabinetplus.backend.enums.BillingCycle;
import com.cabinetplus.backend.enums.PaymentMethod;
import com.cabinetplus.backend.enums.PaymentStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.HandPayment;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.HandPaymentRepository;
import com.cabinetplus.backend.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HandPaymentServiceTest {

    @Mock
    private HandPaymentRepository handPaymentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PlanLimitService planLimitService;

    private HandPaymentService service;

    @BeforeEach
    void setUp() {
        service = new HandPaymentService(handPaymentRepository, userRepository, planLimitService);
    }

    @Test
    void createHandPaymentSetsPendingMethodAndWaitingPlanStatus() {
        User user = new User();
        user.setPlanStatus(UserPlanStatus.PENDING);

        HandPayment payment = new HandPayment();
        payment.setUser(user);
        payment.setPlan(new Plan());
        payment.setPaymentMethod(null); // should default to HAND

        when(handPaymentRepository.save(any(HandPayment.class))).thenAnswer(inv -> inv.getArgument(0));

        HandPayment saved = service.createHandPayment(payment);

        assertEquals(PaymentStatus.PENDING, saved.getStatus());
        assertEquals(PaymentMethod.HAND, saved.getPaymentMethod());
        assertEquals(UserPlanStatus.WAITING, user.getPlanStatus());
        verify(userRepository, times(1)).save(user);
    }

    @Test
    void confirmPaymentPendingMonthlyActivatesAndSetsOneMonthExpiration() {
        User user = new User();
        user.setPlanStatus(UserPlanStatus.WAITING);

        Plan plan = new Plan();
        plan.setMonthlyPrice(3000);
        plan.setDurationDays(30);

        HandPayment payment = new HandPayment();
        payment.setId(10L);
        payment.setUser(user);
        payment.setPlan(plan);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setBillingCycle(BillingCycle.MONTHLY);

        when(handPaymentRepository.findById(10L)).thenReturn(Optional.of(payment));
        when(handPaymentRepository.save(any(HandPayment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        LocalDateTime before = LocalDateTime.now().minusSeconds(1);
        HandPayment confirmed = service.confirmPayment(10L);
        LocalDateTime afterStart = LocalDateTime.now().plusSeconds(5);
        LocalDateTime after = LocalDateTime.now().plusMonths(1).plusSeconds(1);

        assertEquals(PaymentStatus.CONFIRMED, confirmed.getStatus());
        assertEquals(UserPlanStatus.ACTIVE, user.getPlanStatus());
        assertNotNull(user.getPlanStartDate());
        assertEquals(true, !user.getPlanStartDate().isBefore(before));
        assertEquals(true, !user.getPlanStartDate().isAfter(afterStart));
        assertNotNull(user.getExpirationDate());
        // Expect around now+1 month.
        assertEquals(true, !user.getExpirationDate().isBefore(before.plusMonths(1)));
        assertEquals(true, !user.getExpirationDate().isAfter(after));
    }

    @Test
    void confirmPaymentPendingYearlySetsOneYearExpiration() {
        User user = new User();

        Plan plan = new Plan();
        plan.setMonthlyPrice(3000);

        HandPayment payment = new HandPayment();
        payment.setId(11L);
        payment.setUser(user);
        payment.setPlan(plan);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setBillingCycle(BillingCycle.YEARLY);

        when(handPaymentRepository.findById(11L)).thenReturn(Optional.of(payment));
        when(handPaymentRepository.save(any(HandPayment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        LocalDateTime before = LocalDateTime.now().minusSeconds(1);
        service.confirmPayment(11L);
        LocalDateTime afterStart = LocalDateTime.now().plusSeconds(5);
        LocalDateTime after = LocalDateTime.now().plusYears(1).plusSeconds(1);

        assertEquals(UserPlanStatus.ACTIVE, user.getPlanStatus());
        assertNotNull(user.getPlanStartDate());
        assertEquals(true, !user.getPlanStartDate().isBefore(before));
        assertEquals(true, !user.getPlanStartDate().isAfter(afterStart));
        assertNotNull(user.getExpirationDate());
        assertEquals(true, !user.getExpirationDate().isBefore(before.plusYears(1)));
        assertEquals(true, !user.getExpirationDate().isAfter(after));
    }

    @Test
    void confirmPaymentFreePlanSetsSevenDayExpiration() {
        User user = new User();

        Plan freePlan = new Plan();
        freePlan.setMonthlyPrice(0);

        HandPayment payment = new HandPayment();
        payment.setId(12L);
        payment.setUser(user);
        payment.setPlan(freePlan);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setBillingCycle(BillingCycle.MONTHLY);

        when(handPaymentRepository.findById(12L)).thenReturn(Optional.of(payment));
        when(handPaymentRepository.save(any(HandPayment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        LocalDateTime before = LocalDateTime.now().minusSeconds(1);
        service.confirmPayment(12L);
        LocalDateTime afterStart = LocalDateTime.now().plusSeconds(5);
        LocalDateTime after = LocalDateTime.now().plusDays(7).plusSeconds(1);

        assertNotNull(user.getPlanStartDate());
        assertEquals(true, !user.getPlanStartDate().isBefore(before));
        assertEquals(true, !user.getPlanStartDate().isAfter(afterStart));
        assertNotNull(user.getExpirationDate());
        assertEquals(true, !user.getExpirationDate().isBefore(before.plusDays(7)));
        assertEquals(true, !user.getExpirationDate().isAfter(after));
    }

    @Test
    void confirmPaymentAlreadyProcessedReturnsConflict() {
        HandPayment payment = new HandPayment();
        payment.setId(20L);
        payment.setStatus(PaymentStatus.CONFIRMED);

        when(handPaymentRepository.findById(20L)).thenReturn(Optional.of(payment));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.confirmPayment(20L));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertEquals("Ce paiement est deja traite", ex.getReason());
    }

    @Test
    void rejectPaymentPendingMarksRejectedAndRevertsUserToPending() {
        User user = new User();
        user.setPlanStatus(UserPlanStatus.WAITING);

        HandPayment payment = new HandPayment();
        payment.setId(30L);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setUser(user);

        when(handPaymentRepository.findById(30L)).thenReturn(Optional.of(payment));
        when(handPaymentRepository.save(any(HandPayment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        HandPayment rejected = service.rejectPayment(30L);

        assertEquals(PaymentStatus.REJECTED, rejected.getStatus());
        assertEquals(UserPlanStatus.PENDING, user.getPlanStatus());
    }

    @Test
    void checkAndUpdateExpirationSetsInactiveWhenExpired() {
        User user = new User();
        user.setPlanStatus(UserPlanStatus.ACTIVE);
        user.setExpirationDate(LocalDateTime.now().minusDays(1));

        service.checkAndUpdateExpiration(user);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertEquals(UserPlanStatus.INACTIVE, captor.getValue().getPlanStatus());
    }

    @Test
    void createHandPaymentUpgradeBlockedWhenScheduledNextPlanExists() {
        Plan currentPlan = new Plan();
        currentPlan.setId(1L);

        Plan nextPlan = new Plan();
        nextPlan.setId(2L);
        nextPlan.setMonthlyPrice(3000);

        User user = new User();
        user.setPlan(currentPlan);
        user.setExpirationDate(LocalDateTime.now().plusDays(10));
        user.setNextPlan(nextPlan);
        user.setNextPlanStartDate(LocalDateTime.now().plusDays(10));

        Plan requested = new Plan();
        requested.setId(3L);
        requested.setMonthlyPrice(3000);

        HandPayment payment = new HandPayment();
        payment.setUser(user);
        payment.setPlan(requested);
        payment.setNotes("REQUEST_TYPE=UPGRADE | REQUEST_START_MODE=AT_END_OF_CURRENT");

        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createHandPayment(payment));
        assertEquals(
                "Vous avez deja un abonnement programme. Attendez son activation avant de changer a nouveau.",
                ex.getFieldErrors().get("_")
        );
    }

    @Test
    void createHandPaymentUpgradeBlockedWhenPendingUpgradeExists() {
        Plan currentPlan = new Plan();
        currentPlan.setId(1L);

        User user = new User();
        user.setPlan(currentPlan);
        user.setExpirationDate(LocalDateTime.now().plusDays(10));

        Plan pendingRequested = new Plan();
        pendingRequested.setId(2L);

        HandPayment pending = new HandPayment();
        pending.setUser(user);
        pending.setPlan(pendingRequested);
        pending.setStatus(PaymentStatus.PENDING);
        pending.setNotes("REQUEST_TYPE=UPGRADE | REQUEST_START_MODE=AT_END_OF_CURRENT");

        Plan requested = new Plan();
        requested.setId(3L);
        requested.setMonthlyPrice(3000);

        HandPayment payment = new HandPayment();
        payment.setUser(user);
        payment.setPlan(requested);
        payment.setNotes("REQUEST_TYPE=UPGRADE | REQUEST_START_MODE=AT_END_OF_CURRENT");

        when(handPaymentRepository.findByUserAndStatus(user, PaymentStatus.PENDING)).thenReturn(List.of(pending));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createHandPayment(payment));
        assertEquals(
                "Une demande de changement de plan est deja en attente. Attendez sa validation avant d'en creer une autre.",
                ex.getFieldErrors().get("_")
        );
    }

    @Test
    void createHandPaymentRenewalBlockedWhenScheduledNextPlanExists() {
        Plan currentPlan = new Plan();
        currentPlan.setId(1L);

        Plan scheduledPlan = new Plan();
        scheduledPlan.setId(2L);

        User user = new User();
        user.setPlan(currentPlan);
        user.setExpirationDate(LocalDateTime.now().plusDays(10));
        user.setNextPlan(scheduledPlan);
        user.setNextPlanStartDate(LocalDateTime.now().plusDays(10));

        HandPayment payment = new HandPayment();
        payment.setUser(user);
        payment.setPlan(currentPlan);
        payment.setNotes("REQUEST_TYPE=RENEWAL | REQUEST_START_MODE=AT_END_OF_CURRENT");

        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createHandPayment(payment));
        assertEquals(
                "Renouvellement impossible: vous avez deja un abonnement prochain (programme ou en attente).",
                ex.getFieldErrors().get("_")
        );
    }

    @Test
    void createHandPaymentRenewalBlockedWhenPendingUpgradeExists() {
        Plan currentPlan = new Plan();
        currentPlan.setId(1L);

        User user = new User();
        user.setPlan(currentPlan);
        user.setExpirationDate(LocalDateTime.now().plusDays(10));

        Plan pendingRequested = new Plan();
        pendingRequested.setId(2L);

        HandPayment pending = new HandPayment();
        pending.setUser(user);
        pending.setPlan(pendingRequested);
        pending.setStatus(PaymentStatus.PENDING);
        pending.setNotes("REQUEST_TYPE=UPGRADE | REQUEST_START_MODE=AT_END_OF_CURRENT");

        when(handPaymentRepository.findByUserAndStatus(user, PaymentStatus.PENDING)).thenReturn(List.of(pending));

        HandPayment payment = new HandPayment();
        payment.setUser(user);
        payment.setPlan(currentPlan);
        payment.setNotes("REQUEST_TYPE=RENEWAL | REQUEST_START_MODE=AT_END_OF_CURRENT");

        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createHandPayment(payment));
        assertEquals(
                "Renouvellement impossible: vous avez deja un abonnement prochain (programme ou en attente).",
                ex.getFieldErrors().get("_")
        );
    }

    @Test
    void confirmPaymentRenewalFailsWhenScheduledNextPlanExists() {
        Plan currentPlan = new Plan();
        currentPlan.setId(1L);
        currentPlan.setMonthlyPrice(3000);

        Plan nextPlan = new Plan();
        nextPlan.setId(2L);
        nextPlan.setMonthlyPrice(3000);

        User user = new User();
        user.setPlan(currentPlan);
        user.setPlanStatus(UserPlanStatus.ACTIVE);
        LocalDateTime currentEnd = LocalDateTime.now().plusDays(5);
        user.setExpirationDate(currentEnd);
        user.setNextPlan(nextPlan);
        user.setNextPlanBillingCycle(BillingCycle.MONTHLY);
        user.setNextPlanStartDate(currentEnd);
        user.setNextPlanExpirationDate(currentEnd.plusMonths(1));

        HandPayment payment = new HandPayment();
        payment.setId(40L);
        payment.setUser(user);
        payment.setPlan(currentPlan);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setBillingCycle(BillingCycle.MONTHLY);
        payment.setNotes("REQUEST_TYPE=RENEWAL | REQUEST_START_MODE=AT_END_OF_CURRENT");

        when(handPaymentRepository.findById(40L)).thenReturn(Optional.of(payment));
        when(handPaymentRepository.save(any(HandPayment.class))).thenAnswer(inv -> inv.getArgument(0));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.confirmPayment(40L));
        assertEquals(
                "Renouvellement impossible: vous avez deja un abonnement prochain (programme ou en attente).",
                ex.getFieldErrors().get("_")
        );
    }

    @Test
    void createHandPaymentRejectedForEmployeeDentist() {
        User owner = new User();
        owner.setRole(UserRole.DENTIST);

        User employee = new User();
        employee.setRole(UserRole.DENTIST);
        employee.setOwnerDentist(owner);

        HandPayment payment = new HandPayment();
        payment.setUser(employee);
        payment.setPlan(new Plan());

        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createHandPayment(payment));
        assertEquals("Les comptes employes heritent le plan du proprietaire", ex.getFieldErrors().get("_"));
        verify(handPaymentRepository, never()).save(any(HandPayment.class));
    }

    @Test
    void confirmPaymentRejectedForEmployeeDentist() {
        User owner = new User();
        owner.setRole(UserRole.DENTIST);

        User employee = new User();
        employee.setRole(UserRole.DENTIST);
        employee.setOwnerDentist(owner);

        HandPayment payment = new HandPayment();
        payment.setId(99L);
        payment.setUser(employee);
        payment.setPlan(new Plan());
        payment.setStatus(PaymentStatus.PENDING);

        when(handPaymentRepository.findById(99L)).thenReturn(Optional.of(payment));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.confirmPayment(99L));
        assertEquals("Les comptes employes heritent le plan du proprietaire", ex.getFieldErrors().get("_"));
        verify(handPaymentRepository, never()).save(any(HandPayment.class));
    }
}
