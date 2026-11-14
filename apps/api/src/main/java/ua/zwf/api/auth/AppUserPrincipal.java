package ua.zwf.api.auth;

import java.io.Serial;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import ua.zwf.api.user.User;

/**
 * Principal у сесії. Серіалізується в Spring Session (JDBC), тому тримає лише прості поля, а не JPA-сутність.
 * {@code username} = email: за ним Spring Session індексує сесії ({@code PRINCIPAL_NAME}) — потрібно,
 * щоб завершити всі сесії користувача після скидання пароля (B-06).
 */
public final class AppUserPrincipal implements UserDetails, CredentialsContainer {

	@Serial
	private static final long serialVersionUID = 1L;

	static final List<GrantedAuthority> AUTHORITIES = List.of(new SimpleGrantedAuthority("ROLE_USER"));

	private final UUID id;

	private final String email;

	private final String name;

	private String passwordHash;

	public AppUserPrincipal(UUID id, String email, String name, String passwordHash) {
		this.id = id;
		this.email = email;
		this.name = name;
		this.passwordHash = passwordHash;
	}

	public static AppUserPrincipal of(User user) {
		return new AppUserPrincipal(user.getId(), user.getEmail(), user.getName(), user.getPasswordHash());
	}

	public UUID id() {
		return id;
	}

	public String name() {
		return name;
	}

	@Override
	public String getUsername() {
		return email;
	}

	@Override
	public String getPassword() {
		return passwordHash;
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return AUTHORITIES;
	}

	@Override
	public void eraseCredentials() {
		this.passwordHash = null;
	}

}
