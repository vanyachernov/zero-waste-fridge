package ua.zwf.api.household;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.security.access.prepost.PreAuthorize;

/**
 * B-50: дія дозволена лише ролі з цим правом у своєму домогосподарстві. Інакше — 403 {@code FORBIDDEN}.
 *
 * <pre>{@code @RequiresPermission(HouseholdPermission.MANAGE_MEMBERS)}</pre>
 *
 * Шаблон {@code {value}} підставляє {@code AnnotationTemplateExpressionDefaults} з {@code MethodSecurityConfig}.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@PreAuthorize("@householdAccess.can(principal, '{value}')")
public @interface RequiresPermission {

	HouseholdPermission value();

}
