import { describe, expect, it } from "vitest";
import {
  parseImage,
  parseIngredient,
  parseStep,
  parseUser,
  parseRecipe,
  parseComment,
  parseSearchResponse,
  parseCommentsResponse,
  parseUsersResponse,
} from "../src/types.js";

describe("parseImage", () => {
  it("parses full data", () => {
    const img = parseImage({
      id: "12345",
      filename: "photo.jpg",
      alt_text: "A photo",
      url: "https://example.com/photo.jpg",
    });
    expect(img.url).toBe("https://example.com/photo.jpg");
    expect(img.id).toBe("12345");
    expect(img.filename).toBe("photo.jpg");
    expect(img.altText).toBe("A photo");
  });

  it("handles empty data", () => {
    const img = parseImage({});
    expect(img.url).toBe("");
    expect(img.id).toBe("");
  });
});

describe("parseIngredient", () => {
  it("parses ingredient", () => {
    const ing = parseIngredient({
      id: 100,
      name: "鶏もも肉",
      quantity: "200g",
      headline: false,
      sanitized_name: "鶏もも肉",
    });
    expect(ing.name).toBe("鶏もも肉");
    expect(ing.quantity).toBe("200g");
    expect(ing.id).toBe(100);
  });
});

describe("parseStep", () => {
  it("parses step without image", () => {
    const step = parseStep({
      id: 1,
      description: "Cut the vegetables.",
      attachments: [],
    });
    expect(step.description).toBe("Cut the vegetables.");
    expect(step.imageUrl).toBeNull();
  });

  it("parses step with image", () => {
    const step = parseStep({
      id: 2,
      description: "Fry it.",
      attachments: [{ image: { url: "https://example.com/step.jpg" } }],
    });
    expect(step.imageUrl).toBe("https://example.com/step.jpg");
  });
});

describe("parseUser", () => {
  it("parses user", () => {
    const user = parseUser({
      id: 12345,
      name: "TestUser",
      profile_message: "Hello",
      recipe_count: 10,
      follower_count: 5,
      followee_count: 3,
      cookpad_id: "cook_12345",
      href: "https://cookpad.com/jp/users/12345",
      image: { url: "https://example.com/avatar.jpg" },
    });
    expect(user.id).toBe(12345);
    expect(user.name).toBe("TestUser");
    expect(user.imageUrl).toBe("https://example.com/avatar.jpg");
    expect(user.recipeCount).toBe(10);
  });

  it("handles null profile_message", () => {
    const user = parseUser({ id: 1, name: "X", profile_message: null });
    expect(user.profileMessage).toBe("");
  });
});

describe("parseRecipe", () => {
  it("parses summary recipe", () => {
    const recipe = parseRecipe({
      id: 99999,
      title: "テストレシピ",
      story: "おいしい",
      serving: "2人分",
      cooking_time: null,
      published_at: "2026-01-01T00:00:00Z",
      hall_of_fame: true,
      cooksnaps_count: 42,
      image: { url: "https://example.com/recipe.jpg" },
      ingredients: [{ name: "卵", quantity: "2個", id: 1 }],
      user: { id: 1, name: "Chef" },
    });
    expect(recipe.id).toBe(99999);
    expect(recipe.title).toBe("テストレシピ");
    expect(recipe.hallOfFame).toBe(true);
    expect(recipe.cooksnapsCount).toBe(42);
    expect(recipe.imageUrl).toBe("https://example.com/recipe.jpg");
    expect(recipe.ingredients).toHaveLength(1);
    expect(recipe.user?.name).toBe("Chef");
  });

  it("parses full detail recipe", () => {
    const recipe = parseRecipe({
      id: 100,
      title: "Full Recipe",
      story: "A story",
      serving: "4人分",
      advice: "Some advice",
      bookmarks_count: 10,
      view_count: 500,
      comments_count: 3,
      href: "https://cookpad.com/jp/recipes/100",
      country: "JP",
      language: "ja",
      premium: false,
      steps: [
        { id: 1, description: "Step 1", attachments: [] },
        { id: 2, description: "Step 2", attachments: [] },
      ],
      ingredients: [],
    });
    expect(recipe.advice).toBe("Some advice");
    expect(recipe.bookmarksCount).toBe(10);
    expect(recipe.steps).toHaveLength(2);
    expect(recipe.steps[0].description).toBe("Step 1");
    expect(recipe.href).toBe("https://cookpad.com/jp/recipes/100");
  });
});

describe("parseComment", () => {
  it("parses comment", () => {
    const comment = parseComment({
      id: 555,
      body: "Looks great!",
      created_at: "2026-01-01T00:00:00Z",
      label: "cooksnap",
      cursor: "abc123",
      likes_count: 3,
      replies_count: 1,
      user: { id: 1, name: "Commenter" },
      image: { url: "https://example.com/snap.jpg" },
    });
    expect(comment.id).toBe(555);
    expect(comment.body).toBe("Looks great!");
    expect(comment.cursor).toBe("abc123");
    expect(comment.user?.name).toBe("Commenter");
    expect(comment.imageUrl).toBe("https://example.com/snap.jpg");
  });
});

describe("parseSearchResponse", () => {
  it("filters recipe types and extracts pagination", () => {
    const data = {
      result: [
        { type: "search_results/premium_banner", result: [] },
        { type: "search_results/title", title: "新着順" },
        { type: "search_results/recipe", id: 1, title: "Recipe 1" },
        { type: "search_results/recipe", id: 2, title: "Recipe 2" },
      ],
      extra: {
        total_count: 100,
        links: { prev: null, next: { href: "...", page: 2 } },
      },
    };
    const resp = parseSearchResponse(data);
    expect(resp.recipes).toHaveLength(2);
    expect(resp.recipes[0].id).toBe(1);
    expect(resp.recipes[1].id).toBe(2);
    expect(resp.totalCount).toBe(100);
    expect(resp.nextPage).toBe(2);
    expect(resp.raw).toEqual(data);
  });

  it("handles empty results", () => {
    const resp = parseSearchResponse({
      result: [],
      extra: { total_count: 0, links: {} },
    });
    expect(resp.recipes).toEqual([]);
    expect(resp.totalCount).toBe(0);
    expect(resp.nextPage).toBeNull();
  });
});

describe("parseCommentsResponse", () => {
  it("parses comments with cursor", () => {
    const resp = parseCommentsResponse({
      result: [
        { id: 1, body: "Nice", cursor: "cur1" },
        { id: 2, body: "Great", cursor: "cur2" },
      ],
    });
    expect(resp.comments).toHaveLength(2);
    expect(resp.nextCursor).toBe("cur2");
  });

  it("handles empty results", () => {
    const resp = parseCommentsResponse({ result: [] });
    expect(resp.comments).toEqual([]);
    expect(resp.nextCursor).toBeNull();
  });
});

describe("parseUsersResponse", () => {
  it("parses users with pagination", () => {
    const resp = parseUsersResponse({
      result: [
        { id: 1, name: "User1" },
        { id: 2, name: "User2" },
      ],
      extra: {
        total_count: 50,
        links: { next: { page: 2 } },
      },
    });
    expect(resp.users).toHaveLength(2);
    expect(resp.totalCount).toBe(50);
    expect(resp.nextPage).toBe(2);
  });
});
