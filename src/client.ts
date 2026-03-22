import {
  API_HOST,
  BASE_URL,
  DEFAULT_COUNTRY,
  DEFAULT_LANGUAGE,
  DEFAULT_PROVIDER_ID,
  DEFAULT_TIMEZONE_ID,
  DEFAULT_TIMEZONE_OFFSET,
  DEFAULT_TOKEN,
  DEFAULT_USER_AGENT,
  SUPPORTED_SEARCH_TYPES,
} from "./constants.js";
import {
  APIError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
} from "./errors.js";
import {
  type CommentsResponse,
  type Recipe,
  type SearchResponse,
  type UsersResponse,
  parseCommentsResponse,
  parseRecipe,
  parseSearchResponse,
  parseUsersResponse,
} from "./types.js";

export interface CookpadOptions {
  token?: string;
  country?: string;
  language?: string;
  timezoneId?: string;
  timezoneOffset?: string;
  userAgent?: string;
  providerId?: string;
}

export interface SearchRecipesOptions {
  page?: number;
  perPage?: number;
  order?: "recent" | "popular" | "date";
  mustHaveCooksnaps?: boolean;
  minimumCooksnaps?: number;
  mustHavePhotoInSteps?: boolean;
  includedIngredients?: string;
  excludedIngredients?: string;
}

/**
 * Cookpad API client.
 *
 * @example
 * ```ts
 * const client = new Cookpad();
 * const results = await client.searchRecipes("カレー");
 * for (const recipe of results.recipes) {
 *   console.log(recipe.title);
 * }
 * client.close();
 * ```
 */
export class Cookpad {
  private token: string;
  private country: string;
  private language: string;
  private timezoneId: string;
  private timezoneOffset: string;
  private userAgent: string;
  private providerId: string;

  constructor(options: CookpadOptions = {}) {
    this.token = options.token ?? DEFAULT_TOKEN;
    this.country = options.country ?? DEFAULT_COUNTRY;
    this.language = options.language ?? DEFAULT_LANGUAGE;
    this.timezoneId = options.timezoneId ?? DEFAULT_TIMEZONE_ID;
    this.timezoneOffset = options.timezoneOffset ?? DEFAULT_TIMEZONE_OFFSET;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.providerId = options.providerId ?? DEFAULT_PROVIDER_ID;
  }

  private headers(): Record<string, string> {
    return {
      Host: API_HOST,
      Authorization: `Bearer ${this.token}`,
      "X-Cookpad-Country-Selected": this.country,
      "X-Cookpad-Timezone-Id": this.timezoneId,
      "X-Cookpad-Provider-Id": this.providerId,
      "X-Cookpad-Timezone-Offset": this.timezoneOffset,
      "X-Cookpad-Guid": crypto.randomUUID().toUpperCase(),
      "Accept-Encoding": "gzip",
      "Accept-Language": this.language,
      Accept: "*/*",
      "User-Agent": this.userAgent,
    };
  }

  private async request(
    path: string,
    params?: Record<string, string | number | boolean>,
  ): Promise<Record<string, unknown>> {
    const url = new URL(`${BASE_URL}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }
    }

    const resp = await fetch(url, { headers: this.headers() });

    if (resp.status === 401) {
      throw new AuthenticationError();
    }
    if (resp.status === 404) {
      throw new NotFoundError(`Not found: ${path}`);
    }
    if (resp.status === 429) {
      throw new RateLimitError();
    }
    if (resp.status >= 400) {
      const text = await resp.text();
      throw new APIError(`API error (${resp.status}): ${text}`, resp.status);
    }

    return (await resp.json()) as Record<string, unknown>;
  }

  // --- Recipe search ---

  async searchRecipes(
    query: string,
    options: SearchRecipesOptions = {},
  ): Promise<SearchResponse> {
    const {
      page = 1,
      perPage = 30,
      order = "recent",
      mustHaveCooksnaps = false,
      minimumCooksnaps = 0,
      mustHavePhotoInSteps = false,
      includedIngredients = "",
      excludedIngredients = "",
    } = options;

    const params: Record<string, string | number | boolean> = {
      query,
      page,
      per_page: perPage,
      order,
      must_have_cooksnaps: mustHaveCooksnaps,
      minimum_number_of_cooksnaps: minimumCooksnaps,
      must_have_photo_in_steps: mustHavePhotoInSteps,
      from_delicious_ways: false,
      search_source: "recipe.search.typed_query",
      supported_types: SUPPORTED_SEARCH_TYPES,
    };
    if (includedIngredients) {
      params.included_ingredients = includedIngredients;
    }
    if (excludedIngredients) {
      params.excluded_ingredients = excludedIngredients;
    }

    const data = await this.request("/search_results", params);
    return parseSearchResponse(data);
  }

  // --- Recipe detail ---

  async getRecipe(recipeId: number): Promise<Recipe> {
    const data = await this.request(`/recipes/${recipeId}`);
    return parseRecipe(data.result as Record<string, unknown>);
  }

  // --- Similar recipes ---

  async getSimilarRecipes(
    recipeId: number,
    options: { page?: number; perPage?: number } = {},
  ): Promise<Recipe[]> {
    const { page = 1, perPage = 30 } = options;
    const data = await this.request(`/recipes/${recipeId}/similar_recipes`, {
      page,
      per_page: perPage,
    });
    const result = (data.result ?? []) as Record<string, unknown>[];
    return result.map(parseRecipe);
  }

  // --- Comments ---

  async getComments(
    recipeId: number,
    options: { limit?: number; after?: string; label?: string } = {},
  ): Promise<CommentsResponse> {
    const { limit = 20, after = "", label = "cooksnap" } = options;
    const data = await this.request(`/recipes/${recipeId}/comments`, {
      limit,
      after,
      label,
    });
    return parseCommentsResponse(data);
  }

  // --- User search ---

  async searchUsers(
    query: string,
    options: { page?: number; perPage?: number } = {},
  ): Promise<UsersResponse> {
    const { page = 1, perPage = 20 } = options;
    const data = await this.request("/users", {
      query,
      page,
      per_page: perPage,
    });
    return parseUsersResponse(data);
  }

  // --- Search suggestions ---

  async searchKeywords(query = ""): Promise<Record<string, unknown>> {
    const data = await this.request("/search_keywords", { query });
    return (data.result ?? {}) as Record<string, unknown>;
  }

  // --- Search history ---

  async getSearchHistory(
    localHistory: string[] = [],
  ): Promise<Record<string, unknown>> {
    const data = await this.request("/search_history", {
      local_search_history: JSON.stringify(localHistory),
    });
    return data;
  }
}
