package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.GlobalExceptionHandler;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.RefreshTokenRepository;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.security.JwtUtil;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.PhoneVerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthControllerTest {

    private MockMvc mockMvc;
    private AuthenticationManager authenticationManager;
    private JwtUtil jwtUtil;
    private UserRepository userRepository;
    private RefreshTokenRepository refreshTokenRepository;
    private PhoneVerificationService phoneVerificationService;

    @BeforeEach
    void setUp() {
        authenticationManager = mock(AuthenticationManager.class);
        jwtUtil = mock(JwtUtil.class);
        userRepository = mock(UserRepository.class);
        refreshTokenRepository = mock(RefreshTokenRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        AuditService auditService = mock(AuditService.class);
        phoneVerificationService = mock(PhoneVerificationService.class);
        MockEnvironment environment = new MockEnvironment();

        AuthController controller = new AuthController(
                authenticationManager,
                jwtUtil,
                userRepository,
                refreshTokenRepository,
                passwordEncoder,
                auditService,
                phoneVerificationService,
                environment
        );

        ReflectionTestUtils.setField(controller, "accessTokenMs", 60000L);
        ReflectionTestUtils.setField(controller, "refreshTokenMs", 86400000L);
        ReflectionTestUtils.setField(controller, "cookieSameSite", "Lax");

        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders
                .standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter())
                .setValidator(validator)
                .build();
    }

    @Test
    void loginWithInvalidCredentialsReturns401AndErrorKey() throws Exception {
        User user = new User();
        user.setPhoneNumber("0550000000");
        user.setRole(UserRole.DENTIST);
        when(userRepository.findFirstByPhoneNumberInOrderByIdAsc(any())).thenReturn(Optional.of(user));
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("bad credentials"));

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phoneNumber\":\"0550000000\",\"password\":\"bad\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.fieldErrors.password").value("Mot de passe invalide"));
    }

    @Test
    void loginWithTwoFactorEnabledReturnsChallengeToken() throws Exception {
        User user = new User();
        user.setPhoneNumber("0550000000");
        user.setRole(UserRole.DENTIST);
        user.setLoginTwoFactorEnabled(true);

        when(userRepository.findFirstByPhoneNumberInOrderByIdAsc(any())).thenReturn(Optional.of(user));
        when(authenticationManager.authenticate(any())).thenReturn(null);
        when(jwtUtil.generateLoginTwoFactorChallengeToken(anyString(), anyLong())).thenReturn("challenge");
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0, User.class));

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phoneNumber\":\"0550000000\",\"password\":\"GoodPass1!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.twoFactorRequired").value(true))
                .andExpect(jsonPath("$.challengeToken").value("challenge"));

        verify(phoneVerificationService).sendVerificationCode(anyString());
    }

    @Test
    void verifyTwoFactorCompletesLoginAndReturnsAccessToken() throws Exception {
        User user = new User();
        user.setId(1L);
        user.setPhoneNumber("0550000000");
        user.setPhoneVerified(true);
        user.setRole(UserRole.DENTIST);
        user.setLoginTwoFactorEnabled(true);

        when(jwtUtil.extractPhoneNumberFromLoginTwoFactorChallenge(anyString())).thenReturn("0550000000");
        when(userRepository.findFirstByPhoneNumberInOrderByIdAsc(any())).thenReturn(Optional.of(user));
        when(phoneVerificationService.checkVerificationCode(anyString(), anyString())).thenReturn(true);
        when(jwtUtil.generateAccessToken(any())).thenReturn("access");
        when(jwtUtil.generateRefreshToken(anyString(), anyLong())).thenReturn("refresh");

        mockMvc.perform(post("/auth/login/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"challengeToken\":\"challenge\",\"code\":\"123456\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access"));
    }

    @Test
    void registerWithDuplicatePhoneReturns400AndErrorKey() throws Exception {
        when(userRepository.existsByPhoneNumberIn(any())).thenReturn(true);

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                .content("""
                                {
                                  "password":"StrongPass1!",
                                  "firstname":"A",
                                  "lastname":"B",
                                  "phoneNumber":"0550000000",
                                  "role":"DENTIST"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.phoneNumber").value("Ce numero de telephone est deja utilise"));
    }

    @Test
    void sessionWithoutCookieReturnsEmptyAccessToken() throws Exception {
        mockMvc.perform(post("/auth/session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value(""));
    }

    @Test
    void sessionWithUnknownCookieReturnsEmptyAccessToken() throws Exception {
        when(refreshTokenRepository.findByTokenWithUser(anyString())).thenReturn(Optional.empty());
        mockMvc.perform(post("/auth/session").cookie(new jakarta.servlet.http.Cookie("refresh_token", "unknown")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value(""));
    }

    @Test
    void registerInDevWithBypassEnabledMarksPhoneVerified() throws Exception {
        AuthenticationManager authenticationManager = mock(AuthenticationManager.class);
        JwtUtil jwtUtil = mock(JwtUtil.class);
        UserRepository userRepository = mock(UserRepository.class);
        RefreshTokenRepository refreshTokenRepository = mock(RefreshTokenRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        AuditService auditService = mock(AuditService.class);
        PhoneVerificationService phoneVerificationService = mock(PhoneVerificationService.class);
        MockEnvironment environment = new MockEnvironment().withProperty("spring.profiles.active", "dev");
        environment.setActiveProfiles("dev");

        AuthController controller = new AuthController(
                authenticationManager,
                jwtUtil,
                userRepository,
                refreshTokenRepository,
                passwordEncoder,
                auditService,
                phoneVerificationService,
                environment
        );

        ReflectionTestUtils.setField(controller, "accessTokenMs", 60000L);
        ReflectionTestUtils.setField(controller, "refreshTokenMs", 86400000L);
        ReflectionTestUtils.setField(controller, "bypassPhoneVerificationLocal", true);

        when(userRepository.existsByPhoneNumberIn(any())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(jwtUtil.generateAccessToken(any())).thenReturn("access");
        when(jwtUtil.generateRefreshToken(anyString(), anyLong())).thenReturn("refresh");
        when(userRepository.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0, User.class);
            u.setId(1L);
            return u;
        });

        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        MockMvc mvc = MockMvcBuilders
                .standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter())
                .setValidator(validator)
                .build();

        mvc.perform(post("/auth/register")
                        .header("Origin", "http://localhost:5173")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "password":"StrongPass1!",
                                  "firstname":"A",
                                  "lastname":"B",
                                  "phoneNumber":"0550000000",
                                  "role":"DENTIST"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access"));

        verify(userRepository).save(argThat(u -> u != null && u.isPhoneVerified()));
    }
}
