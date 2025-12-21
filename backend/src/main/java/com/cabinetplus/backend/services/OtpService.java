package com.cabinetplus.backend.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message; // THIS MUST BE HERE
import com.twilio.type.PhoneNumber;

import jakarta.annotation.PostConstruct;

@Service
public class OtpService {

    private final JavaMailSender mailSender;

    @Value("${twilio.account.sid:AC_DEFAULT}")
    private String twilioSid;

    @Value("${twilio.auth.token:TOKEN_DEFAULT}")
    private String twilioToken;

    @Value("${twilio.phone.number:+10000000000}")
    private String twilioFromNumber;

    // Constructor Injection
    public OtpService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @PostConstruct
    public void initTwilio() {
        // Only init if keys are provided
        if (!"AC_DEFAULT".equals(twilioSid)) {
            Twilio.init(twilioSid, twilioToken);
        }
    }

    public void sendEmailOtp(String toEmail, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        // Add this line below
        message.setFrom("cabinetplusofficiel@gmail.com"); 
        message.setTo(toEmail);
        message.setSubject("Votre code CabinetPlus");
        message.setText("Votre code de vérification est : " + otp);
        mailSender.send(message);
    }
    public void sendSmsOtp(String toPhoneNumber, String otp) {
        Message.creator(
            new PhoneNumber(toPhoneNumber),
            new PhoneNumber(twilioFromNumber),
            "CabinetPlus : Code " + otp
        ).create();
    }
}