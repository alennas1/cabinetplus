package com.cabinetplus.backend.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.twilio.Twilio;
import com.twilio.rest.verify.v2.service.Verification;
import com.twilio.rest.verify.v2.service.VerificationCheck;

import jakarta.annotation.PostConstruct;

@Service
public class PhoneVerificationService {

    @Value("${twilio.account.sid:AC_DEFAULT}")
    private String twilioSid;

    @Value("${twilio.auth.token:TOKEN_DEFAULT}")
    private String twilioToken;

    @Value("${twilio.verify.service.sid:}")
    private String verifyServiceSid;

    @PostConstruct
    public void initTwilio() {
        if (!"AC_DEFAULT".equals(twilioSid) && verifyServiceSid != null && !verifyServiceSid.isBlank()) {
            Twilio.init(twilioSid, twilioToken);
        }
    }

    public boolean isConfigured() {
        return !"AC_DEFAULT".equals(twilioSid) && verifyServiceSid != null && !verifyServiceSid.isBlank();
    }

    public void sendVerificationCode(String toPhoneNumber) {
        ensureConfigured();
        Verification.creator(verifyServiceSid, toPhoneNumber, "sms").create();
    }

    public boolean checkVerificationCode(String toPhoneNumber, String code) {
        ensureConfigured();
        VerificationCheck check = VerificationCheck.creator(verifyServiceSid)
                .setTo(toPhoneNumber)
                .setCode(code)
                .create();
        return "approved".equalsIgnoreCase(check.getStatus());
    }

    private void ensureConfigured() {
        if (!isConfigured()) {
            throw new IllegalStateException("Twilio Verify non configure");
        }
    }
}
