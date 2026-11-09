package ua.zwf.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.core.convert.converter.ConverterFactory;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import ua.zwf.api.common.Coded;

/** Query-параметри з кодами ({@code ?category=dairy}) → переліки {@link Coded}, як і в JSON. */
@Configuration(proxyBeanMethods = false)
class CodedEnumConverters implements WebMvcConfigurer {

	@Override
	public void addFormatters(FormatterRegistry registry) {
		registry.addConverterFactory(new CodedFactory());
	}

	@SuppressWarnings({ "rawtypes", "unchecked" })
	static final class CodedFactory implements ConverterFactory<String, Enum> {

		@Override
		public <T extends Enum> Converter<String, T> getConverter(Class<T> targetType) {
			if (!Coded.class.isAssignableFrom(targetType)) {
				// Звичайні переліки (ProductStatus…) — за іменем константи, без урахування регістру
				return source -> (T) Enum.valueOf(targetType, source.trim().toUpperCase(java.util.Locale.ROOT));
			}
			return source -> (T) Coded.of((Class) targetType, source);
		}

	}

}
