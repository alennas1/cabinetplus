package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.JustificationContent;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.JustificationContentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
public class JustificationContentService {

    private final JustificationContentRepository repository;

    public JustificationContentService(JustificationContentRepository repository) {
        this.repository = repository;
    }

    // =========================
    // CREATE
    // =========================
    public JustificationContent save(JustificationContent content, User practitioner) {
        content.setPractitioner(practitioner);

        // Optional: prevent duplicate titles per practitioner
        repository.findByTitleAndPractitioner(content.getTitle(), practitioner)
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Un modele avec ce titre existe deja");
                });

        return repository.save(content);
    }

    // =========================
    // GETTERS
    // =========================
    public List<JustificationContent> findByPractitioner(User practitioner) {
        return repository.findByPractitioner(practitioner);
    }

    public Optional<JustificationContent> findById(Long id) {
        return repository.findById(id);
    }

    // =========================
    // DELETE
    // =========================
    public boolean delete(Long id, User practitioner) {
        return repository.findById(id)
                .filter(c -> c.getPractitioner().getId().equals(practitioner.getId()))
                .map(c -> {
                    repository.delete(c);
                    return true;
                })
                .orElse(false);
    }

    // =========================
    // UPDATE
    // =========================
    public JustificationContent update(Long id, JustificationContent updatedContent, User practitioner) {

        return repository.findById(id)
                .filter(c -> c.getPractitioner().getId().equals(practitioner.getId()))
                .map(existing -> {

                    // Optional: prevent duplicate title on update
                    if (updatedContent.getTitle() != null &&
                            !updatedContent.getTitle().equals(existing.getTitle())) {

                        repository.findByTitleAndPractitioner(updatedContent.getTitle(), practitioner)
                                .filter(c -> !c.getId().equals(id))
                                .ifPresent(c -> {
                                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Un modele avec ce titre existe deja");
                                });

                        existing.setTitle(updatedContent.getTitle());
                    }

                    if (updatedContent.getContent() != null) {
                        existing.setContent(updatedContent.getContent());
                    }

                    return repository.save(existing);
                })
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Modele introuvable ou non autorise"));
    }
}
