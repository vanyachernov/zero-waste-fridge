package ua.zwf.api.recipe;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RecipeRepository extends JpaRepository<Recipe, UUID> {

	List<Recipe> findBySource(RecipeSource source);

	@Query("select r.slug from Recipe r where r.source = ua.zwf.api.recipe.RecipeSource.CATALOG")
	Set<String> catalogSlugs();

}
