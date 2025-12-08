package com.cabinetplus.backend.services;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.models.Appointment;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.AppointmentRepository;

@Service
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;

    public AppointmentService(AppointmentRepository appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }

    public Appointment save(Appointment appointment) {
        return appointmentRepository.save(appointment);
    }

    public List<Appointment> findAll() {
        return appointmentRepository.findAll();
    }

    public Optional<Appointment> findById(Long id) {
        return appointmentRepository.findById(id);
    }

    public List<Appointment> findByPatient(Patient patient) {
        return appointmentRepository.findByPatient(patient);
    }

    public List<Appointment> findByPractitioner(User practitioner) {
        return appointmentRepository.findByPractitioner(practitioner);
    }

    public List<Appointment> findBetween(LocalDateTime start, LocalDateTime end) {
        return appointmentRepository.findByDateTimeStartBetween(start, end);
    }

    public void delete(Long id) {
        appointmentRepository.deleteById(id);
    }

    public Long getCompletedAppointmentsForPractitionerOnDate(User practitioner, LocalDate date) {
    return appointmentRepository.countCompletedAppointmentsForPractitionerOnDate(
            practitioner, date.atStartOfDay(), date.plusDays(1).atStartOfDay());
}

public Long getCompletedAppointmentsWithNewPatientsForPractitionerOnDate(User practitioner, LocalDate date) {
    return appointmentRepository.countCompletedAppointmentsWithNewPatientsForPractitionerOnDate(
            practitioner, date.atStartOfDay(), date.plusDays(1).atStartOfDay());
}


}
