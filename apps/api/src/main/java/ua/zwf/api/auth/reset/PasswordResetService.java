package ua.zwf.api.auth.reset;

import java.time.Clock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.auth.Emails;
import ua.zwf.api.auth.PasswordPolicy;
import ua.zwf.api.config.ZwfProperties;
import ua.zwf.api.mail.MailTemplates;
import ua.zwf.api.mail.Mailer;
import ua.zwf.api.user.User;
import ua.zwf.api.user.UserRepository;

/**
 * B-06: «Забули пароль?».
 * <ul>
 *   <li>Запит завжди «успішний» — не розкриваємо, чи існує email.</li>
 *   <li>Не частіше одного листа на {@code zwf.auth.password-reset-cooldown}; новий лист анулює попередні.</li>
 *   <li>Токен одноразовий, діє {@code zwf.auth.password-reset-ttl}; у БД — лише SHA-256.</li>
 *   <li>Після скидання завершуються всі сесії користувача (на всіх пристроях).</li>
 * </ul>
 */
@Service
public class PasswordResetService {

	private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

	private final UserRepository users;

	private final PasswordResetTokenRepository tokens;

	private final PasswordEncoder passwordEncoder;

	private final Mailer mailer;

	private final FindByIndexNameSessionRepository<? extends Session> sessions;

	private final ZwfProperties properties;

	private final Clock clock;

	private final MailTemplates templates;

	public PasswordResetService(UserRepository users, PasswordResetTokenRepository tokens,
			PasswordEncoder passwordEncoder, Mailer mailer, FindByIndexNameSessionRepository<? extends Session> sessions,
			ZwfProperties properties, Clock clock, MailTemplates templates) {
		this.templates = templates;
		this.users = users;
		this.tokens = tokens;
		this.passwordEncoder = passwordEncoder;
		this.mailer = mailer;
		this.sessions = sessions;
		this.properties = properties;
		this.clock = clock;
	}

	@Transactional
	public void requestReset(String rawEmail) {
		var user = users.findByEmail(Emails.normalize(rawEmail)).orElse(null);
		if (user == null) {
			log.debug("Password reset requested for unknown email");
			return;
		}
		var now = clock.instant();
		var auth = properties.auth();
		if (tokens.existsByUserIdAndCreatedAtAfter(user.getId(), now.minus(auth.passwordResetCooldown()))) {
			log.info("Password reset for user {} throttled", user.getId());
			return;
		}

		tokens.invalidateAllForUser(user.getId(), now);
		String token = ResetTokens.generate();
		tokens.save(new PasswordResetToken(user, ResetTokens.hash(token), now, now.plus(auth.passwordResetTtl())));

		var link = PasswordResetMail.link(properties.publicUrl(), token);
		try {
			mailer.send(PasswordResetMail.create(templates, user.getEmail(), user.getName(), link, auth.passwordResetTtl()));
		}
		catch (MailException ex) {
			// Відповідь клієнту однакова в будь-якому разі; користувач може повторити запит після cooldown
			log.error("Could not send password reset mail to user {}", user.getId(), ex);
		}
	}

	@Transactional
	public void resetPassword(String token, String newPassword) {
		PasswordPolicy.check(newPassword);
		var now = clock.instant();
		var resetToken = token == null || token.isBlank() ? null
				: tokens.findByTokenHash(ResetTokens.hash(token.strip())).orElse(null);
		if (resetToken == null || !resetToken.isUsable(now)) {
			throw new InvalidResetTokenException();
		}

		User user = resetToken.getUser();
		user.changePassword(passwordEncoder.encode(newPassword), now);
		resetToken.markUsed(now);
		tokens.invalidateAllForUser(user.getId(), now);

		var active = sessions.findByPrincipalName(user.getEmail()).keySet();
		active.forEach(sessions::deleteById);
		log.info("Password reset for user {}, {} session(s) terminated", user.getId(), active.size());
	}

}
