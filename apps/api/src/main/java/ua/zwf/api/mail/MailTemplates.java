package ua.zwf.api.mail;

import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

/**
 * B-30: листи з шаблонів Thymeleaf у {@code classpath:/mail/}. Кожен лист — пара файлів:
 * {@code <name>.html} (HTML, усе з {@code th:text} екранується) і {@code <name>.txt} (текстова версія).
 * Окремий рушій, а не MVC view resolver: SPA та REST-контролери шаблонів не бачать.
 */
@Component
public class MailTemplates {

	static final Locale UK = Locale.forLanguageTag("uk");

	private final TemplateEngine engine = new TemplateEngine();

	public MailTemplates() {
		engine.addTemplateResolver(resolver(TemplateMode.HTML, "*.html", 1));
		engine.addTemplateResolver(resolver(TemplateMode.TEXT, "*.txt", 2));
	}

	private static ClassLoaderTemplateResolver resolver(TemplateMode mode, String pattern, int order) {
		var resolver = new ClassLoaderTemplateResolver();
		resolver.setPrefix("mail/");
		resolver.setTemplateMode(mode);
		resolver.setResolvablePatterns(Set.of(pattern));
		resolver.setCharacterEncoding("UTF-8");
		resolver.setCacheable(true);
		resolver.setCheckExistence(true);
		resolver.setOrder(order);
		return resolver;
	}

	public OutgoingMail render(String to, String subject, String template, Map<String, Object> variables) {
		var context = new Context(UK, variables);
		context.setVariable("subject", subject);
		String text = engine.process(template + ".txt", context);
		String html = engine.process(template + ".html", context);
		return new OutgoingMail(to, subject, text.strip() + "\n", html);
	}

}
