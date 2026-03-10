package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.JustificationContent;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.JustificationContentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JustificationContentServiceTest {

    @Mock
    private JustificationContentRepository repository;

    private JustificationContentService service;

    @BeforeEach
    void setUp() {
        service = new JustificationContentService(repository);
    }

    @Test
    void saveDuplicateTitleThrowsConflict() {
        User practitioner = new User();
        practitioner.setId(1L);

        JustificationContent content = new JustificationContent();
        content.setTitle("Same");
        content.setContent("x");

        when(repository.findByTitleAndPractitioner("Same", practitioner))
                .thenReturn(Optional.of(new JustificationContent()));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.save(content, practitioner));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void updateNotFoundOrUnauthorizedThrowsNotFound() {
        User practitioner = new User();
        practitioner.setId(1L);

        when(repository.findById(77L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.update(77L, new JustificationContent(), practitioner));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void deleteReturnsFalseWhenOwnershipMismatch() {
        User practitioner = new User();
        practitioner.setId(1L);

        User other = new User();
        other.setId(2L);

        JustificationContent existing = new JustificationContent();
        existing.setId(10L);
        existing.setPractitioner(other);

        when(repository.findById(10L)).thenReturn(Optional.of(existing));

        boolean deleted = service.delete(10L, practitioner);
        assertFalse(deleted);
    }

    @Test
    void deleteReturnsTrueWhenOwnerMatches() {
        User practitioner = new User();
        practitioner.setId(1L);

        JustificationContent existing = new JustificationContent();
        existing.setId(10L);
        existing.setPractitioner(practitioner);

        when(repository.findById(10L)).thenReturn(Optional.of(existing));

        boolean deleted = service.delete(10L, practitioner);
        assertTrue(deleted);
        verify(repository).delete(existing);
    }

    @Test
    void updateDuplicateTitleThrowsConflict() {
        User practitioner = new User();
        practitioner.setId(1L);

        JustificationContent existing = new JustificationContent();
        existing.setId(10L);
        existing.setTitle("Old");
        existing.setContent("Body");
        existing.setPractitioner(practitioner);

        JustificationContent duplicate = new JustificationContent();
        duplicate.setId(11L);
        duplicate.setTitle("New");
        duplicate.setPractitioner(practitioner);

        JustificationContent update = new JustificationContent();
        update.setTitle("New");
        update.setContent("Changed");

        when(repository.findById(10L)).thenReturn(Optional.of(existing));
        when(repository.findByTitleAndPractitioner("New", practitioner)).thenReturn(Optional.of(duplicate));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.update(10L, update, practitioner));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }
}
