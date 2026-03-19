package com.cabinetplus.backend.security;

import java.io.IOException;
import java.util.UUID;

import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.cabinetplus.backend.services.AuditService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class RequestTracingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String requestId = request.getHeader(AuditService.REQUEST_ID_HEADER);
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }

        MDC.put(AuditService.REQUEST_ID_KEY, requestId);
        response.setHeader(AuditService.REQUEST_ID_HEADER, requestId);

        String path = request.getRequestURI();
        if (path != null && (path.startsWith("/api/") || path.startsWith("/auth/"))) {
            response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
            response.setHeader("Pragma", "no-cache");
            response.setDateHeader("Expires", 0);
            response.setHeader("Referrer-Policy", "no-referrer");
            response.setHeader("X-Robots-Tag", "noindex, nofollow");
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(AuditService.REQUEST_ID_KEY);
        }
    }
}
