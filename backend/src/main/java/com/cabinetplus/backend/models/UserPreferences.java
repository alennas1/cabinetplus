package com.cabinetplus.backend.models;

import java.util.Objects;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.Hibernate;

@Entity
@Table(name = "user_preferences")
@Data
@ToString(exclude = { "user" })
@NoArgsConstructor
@AllArgsConstructor
public class UserPreferences {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @JsonIgnore
    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(length = 20)
    private String workingHoursMode = "standard";

    @Column(length = 5)
    private String workingHoursStart = "08:00";

    @Column(length = 5)
    private String workingHoursEnd = "17:00";

    @Column(length = 10)
    private String timeFormat = "24h";

    @Column(length = 20)
    private String dateFormat = "dd/mm/yyyy";

    @Column(length = 20)
    private String moneyFormat = "space";

    @Column(length = 5)
    private String currencyLabel = "DA";

    @Override
    public final boolean equals(Object o) {
        if (this == o) return true;
        if (o == null) return false;
        if (Hibernate.getClass(this) != Hibernate.getClass(o)) return false;
        UserPreferences other = (UserPreferences) o;
        return userId != null && Objects.equals(userId, other.userId);
    }

    @Override
    public final int hashCode() {
        if (userId != null) return userId.hashCode();
        return Hibernate.getClass(this).hashCode();
    }
}

