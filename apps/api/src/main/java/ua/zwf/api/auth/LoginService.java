package ua.zwf.api.auth;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;

/** B-03: перевірка email + пароля через DaoAuthenticationProvider (BCrypt, захист від timing-атак на email). */
@Service
public class LoginService {

	private final AuthenticationManager authenticationManager;

	public LoginService(AuthenticationManager authenticationManager) {
		this.authenticationManager = authenticationManager;
	}

	public Authentication authenticate(LoginRequest request) {
		try {
			return authenticationManager.authenticate(UsernamePasswordAuthenticationToken
				.unauthenticated(Emails.normalize(request.email()), request.password()));
		}
		catch (AuthenticationException ex) {
			throw new InvalidCredentialsException();
		}
	}

}
