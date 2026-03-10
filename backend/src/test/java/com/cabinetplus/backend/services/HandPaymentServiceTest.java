package com.cabinetplus.backend.services;

import com.cabinetplus.backend.enums.BillingCycle;
import com.cabinetplus.backend.enums.PaymentMethod;
import com.cabinetplus.backend.enums.PaymentStatus;
import com.cabinetplus.backend.enums.UserPlanStatus;
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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HandPaymentServiceTest {

    @Mock
    private HandPaymentRepository handPaymentRepository;

    @Mock
    private UserRepository userRepository;

    private HandPaymentService service;

    @BeforeEach
    void setUp() {
        service = new HandPaymentService(handPaymentRepository, userRepository);
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
        LocalDateTime after = LocalDateTime.now().plusMonths(1).plusSeconds(1);

        assertEquals(PaymentStatus.CONFIRMED, confirmed.getStatus());
        assertEquals(UserPlanStatus.ACTIVE, user.getPlanStatus());
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
        LocalDateTime after = LocalDateTime.now().plusYears(1).plusSeconds(1);

        assertEquals(UserPlanStatus.ACTIVE, user.getPlanStatus());
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
        LocalDateTime after = LocalDateTime.now().plusDays(7).plusSeconds(1);

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
}
