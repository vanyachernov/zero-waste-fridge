package ua.zwf.api.dictionary;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "dictionaries")
@RestController
@RequestMapping("/api/dictionaries")
class DictionaryController {

	/** Довідники змінюються лише з релізом — браузер може тримати їх годину. */
	@Operation(summary = "Categories, storage zones, units, reminder options and shelf life after opening")
	@GetMapping
	ResponseEntity<Dictionaries.Response> all() {
		return ResponseEntity.ok()
			.cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePrivate())
			.body(Dictionaries.all());
	}

}
