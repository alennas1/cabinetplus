package com.cabinetplus.backend.websocket;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final MessagingWebSocketHandler messagingWebSocketHandler;
    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;
    private final JwtHandshakeHandler jwtHandshakeHandler;

    private final List<String> allowedOrigins;
    private final List<String> allowedOriginPatterns;

    public WebSocketConfig(
            MessagingWebSocketHandler messagingWebSocketHandler,
            JwtHandshakeInterceptor jwtHandshakeInterceptor,
            JwtHandshakeHandler jwtHandshakeHandler,
            @Value("${app.cors.allowed-origins}") String allowedOrigins,
            @Value("${app.cors.allowed-origin-patterns}") String allowedOriginPatterns
    ) {
        this.messagingWebSocketHandler = messagingWebSocketHandler;
        this.jwtHandshakeInterceptor = jwtHandshakeInterceptor;
        this.jwtHandshakeHandler = jwtHandshakeHandler;
        this.allowedOrigins = splitCsv(allowedOrigins);
        this.allowedOriginPatterns = splitCsv(allowedOriginPatterns);
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        var reg = registry
                .addHandler(messagingWebSocketHandler, "/ws/messaging")
                .addInterceptors(jwtHandshakeInterceptor)
                .setHandshakeHandler(jwtHandshakeHandler);

        if (!allowedOrigins.isEmpty()) {
            reg.setAllowedOrigins(allowedOrigins.toArray(new String[0]));
        }
        if (!allowedOriginPatterns.isEmpty()) {
            reg.setAllowedOriginPatterns(allowedOriginPatterns.toArray(new String[0]));
        }
    }

    private List<String> splitCsv(String value) {
        if (value == null || value.isBlank()) return List.of();
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(v -> !v.isBlank())
                .toList();
    }
}

