package com.cabinetplus.backend.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cabinetplus.backend.dto.AppointmentRequest;
import com.cabinetplus.backend.enums.AppointmentStatus;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.ConflictException;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Appointment;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.AppointmentRepository;
import com.cabinetplus.backend.repositories.PatientRepository;

class AppointmentServiceTest {

    private AppointmentRepository appointmentRepository;
    private PatientRepository patientRepository;
    private AppointmentService appointmentService;

    @BeforeEach
    void setUp() {
        appointmentRepository = mock(AppointmentRepository.class);
        patientRepository = mock(PatientRepository.class);
        appointmentService = new AppointmentService(appointmentRepository, patientRepository);
    }

    @Test
    void createAppointmentWhenEndBeforeStartThrows400WithFieldErrors() {
        User practitioner = new User();
        practitioner.setId(1L);

        LocalDateTime start = LocalDateTime.parse("2026-03-10T10:00:00");
        LocalDateTime end = LocalDateTime.parse("2026-03-10T09:00:00");
        AppointmentRequest request = new AppointmentRequest(start, end, AppointmentStatus.SCHEDULED, null, 5L);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> appointmentService.createAppointment(request, practitioner));
        assertEquals("La date de fin doit etre apres la date de debut", ex.getFieldErrors().get("dateTimeEnd"));
    }

    @Test
    void createAppointmentWhenOverlapsThrows409() {
        User practitioner = new User();
        practitioner.setId(1L);

        LocalDateTime start = LocalDateTime.parse("2026-03-10T10:00:00");
        LocalDateTime end = LocalDateTime.parse("2026-03-10T10:30:00");
        AppointmentRequest request = new AppointmentRequest(start, end, AppointmentStatus.SCHEDULED, null, 5L);

        when(appointmentRepository.existsOverlapping(eq(practitioner), eq(start), eq(end), eq(null))).thenReturn(true);

        assertThrows(ConflictException.class, () -> appointmentService.createAppointment(request, practitioner));
    }

    @Test
    void createAppointmentWhenPatientMissingThrows404() {
        User practitioner = new User();
        practitioner.setId(1L);

        LocalDateTime start = LocalDateTime.parse("2026-03-10T10:00:00");
        LocalDateTime end = LocalDateTime.parse("2026-03-10T10:30:00");
        AppointmentRequest request = new AppointmentRequest(start, end, AppointmentStatus.SCHEDULED, null, 99L);

        when(appointmentRepository.existsOverlapping(eq(practitioner), eq(start), eq(end), eq(null))).thenReturn(false);
        when(patientRepository.findByIdAndCreatedBy(99L, practitioner)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> appointmentService.createAppointment(request, practitioner));
    }

    @Test
    void createAppointmentSuccessPersistsAppointment() {
        User practitioner = new User();
        practitioner.setId(1L);

        Patient patient = new Patient();
        patient.setId(5L);

        LocalDateTime start = LocalDateTime.parse("2026-03-10T10:00:00");
        LocalDateTime end = LocalDateTime.parse("2026-03-10T10:30:00");
        AppointmentRequest request = new AppointmentRequest(start, end, AppointmentStatus.SCHEDULED, "notes", 5L);

        when(appointmentRepository.existsOverlapping(eq(practitioner), eq(start), eq(end), eq(null))).thenReturn(false);
        when(patientRepository.findByIdAndCreatedBy(5L, practitioner)).thenReturn(Optional.of(patient));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(inv -> inv.getArgument(0));

        Appointment saved = appointmentService.createAppointment(request, practitioner);
        assertEquals(start, saved.getDateTimeStart());
        assertEquals(end, saved.getDateTimeEnd());
        assertEquals(AppointmentStatus.SCHEDULED, saved.getStatus());
        assertEquals("notes", saved.getNotes());
        assertEquals(patient, saved.getPatient());
        assertEquals(practitioner, saved.getPractitioner());
    }
}

