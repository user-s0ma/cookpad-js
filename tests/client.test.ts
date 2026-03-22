import { describe, expect, it } from "vitest";
import { Cookpad } from "../src/client.js";

describe("Cookpad client (integration)", () => {
  const client = new Cookpad();

  it("searches recipes", async () => {
    const results = await client.searchRecipes("カレー", { perPage: 5 });
    expect(results.totalCount).toBeGreaterThan(0);
    expect(results.recipes.length).toBeGreaterThan(0);
    expect(results.nextPage).not.toBeNull();
  });

  it("gets recipe detail", async () => {
    const recipe = await client.getRecipe(25410768);
    expect(recipe.id).toBe(25410768);
    expect(recipe.title).toBeTruthy();
    expect(recipe.steps.length).toBeGreaterThan(0);
    expect(recipe.ingredients.length).toBeGreaterThan(0);
    expect(recipe.user).not.toBeNull();
  });

  it("gets similar recipes", async () => {
    const similar = await client.getSimilarRecipes(25410768, { perPage: 5 });
    expect(similar.length).toBeGreaterThan(0);
    expect(similar[0].title).toBeTruthy();
  });

  it("gets comments", async () => {
    const result = await client.getComments(18510866, { limit: 3 });
    expect(result.comments.length).toBeGreaterThan(0);
    expect(result.comments[0].body).toBeTruthy();
  });

  it("searches users", async () => {
    const result = await client.searchUsers("test", { perPage: 5 });
    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.users.length).toBeGreaterThan(0);
  });

  it("searches keywords", async () => {
    const result = await client.searchKeywords("カレ");
    expect(result).toBeDefined();
  });

  it("gets search history", async () => {
    const result = await client.getSearchHistory();
    expect(result).toBeDefined();
  });
});
