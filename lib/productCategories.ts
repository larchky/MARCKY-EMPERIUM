export const ALL_CATEGORIES_LABEL = "All categories";
export const UNCATEGORIZED_CATEGORY_LABEL = "Uncategorized";

export const PRODUCT_CATEGORIES = [
  {
    label: "Handbags",
    value: "handbags",
    keywords: ["handbag", "bag", "tote", "satchel", "crossbody", "clutch"],
  },
  {
    label: "Nightwear",
    value: "nightwear",
    keywords: ["nightwear", "sleep", "satin", "robe", "lounge", "slip"],
  },
  {
    label: "Accessories",
    value: "accessories",
    keywords: ["wallet", "strap", "accessory", "jewelry", "hair", "hat"],
  },
  {
    label: "New stock",
    value: "new-stock",
    keywords: ["new", "arrival", "arrivals", "restock", "fresh"],
  },
] as const;

type CategoryProduct = {
  category?: string | null;
  description?: string | null;
  is_event_pick?: boolean | null;
  is_giftable?: boolean | null;
  name: string;
};

export const PRODUCT_INTENTS = [
  {
    label: "Giftable picks",
    value: "giftable",
  },
  {
    label: "Event pieces",
    value: "event",
  },
] as const;

export type ProductIntentValue = (typeof PRODUCT_INTENTS)[number]["value"];

export type ProductCategoryValue = (typeof PRODUCT_CATEGORIES)[number]["value"];

export function normalizeProductCategory(value?: string | null) {
  const normalizedValue = String(value || "").trim().toLowerCase();

  return (
    PRODUCT_CATEGORIES.find(
      (category) =>
        category.value === normalizedValue ||
        category.label.toLowerCase() === normalizedValue
    ) || null
  );
}

export function getProductCategoryLabel(value?: string | null) {
  return normalizeProductCategory(value)?.label || UNCATEGORIZED_CATEGORY_LABEL;
}

export function getProductCategoryValue(product: CategoryProduct) {
  const explicitCategory = normalizeProductCategory(product.category);

  if (explicitCategory) return explicitCategory.value;

  const searchableText = `${product.name} ${product.description || ""}`.toLowerCase();
  const inferredCategory = PRODUCT_CATEGORIES.find((category) =>
    category.keywords.some((keyword) => searchableText.includes(keyword))
  );

  return inferredCategory?.value || null;
}

export function getProductCategoryLabelForProduct(product: CategoryProduct) {
  const categoryValue = getProductCategoryValue(product);

  return categoryValue
    ? getProductCategoryLabel(categoryValue)
    : UNCATEGORIZED_CATEGORY_LABEL;
}

export function productMatchesCategory(
  product: CategoryProduct,
  categoryValueOrLabel: string
) {
  if (categoryValueOrLabel === ALL_CATEGORIES_LABEL) return true;

  const selectedCategory = normalizeProductCategory(categoryValueOrLabel);

  if (!selectedCategory) return true;

  return getProductCategoryValue(product) === selectedCategory.value;
}

export function getCategoryProducts<T extends CategoryProduct>(
  products: T[],
  categoryValueOrLabel: string,
  limit?: number
) {
  const matches = products.filter((product) =>
    productMatchesCategory(product, categoryValueOrLabel)
  );

  return typeof limit === "number" ? matches.slice(0, limit) : matches;
}

export function getCategoryHref(categoryValueOrLabel: string) {
  const category = normalizeProductCategory(categoryValueOrLabel);

  if (!category) return "/products";

  return `/products?category=${encodeURIComponent(category.label)}`;
}

export function normalizeProductIntent(value?: string | null) {
  const normalizedValue = String(value || "").trim().toLowerCase();

  return (
    PRODUCT_INTENTS.find(
      (intent) =>
        intent.value === normalizedValue ||
        intent.label.toLowerCase() === normalizedValue
    ) || null
  );
}

export function productMatchesIntent(
  product: CategoryProduct,
  intentValueOrLabel?: string | null
) {
  const intent = normalizeProductIntent(intentValueOrLabel);

  if (!intent) return true;

  if (intent.value === "giftable") return Boolean(product.is_giftable);
  if (intent.value === "event") return Boolean(product.is_event_pick);

  return true;
}

export function getIntentProducts<T extends CategoryProduct>(
  products: T[],
  intentValueOrLabel: string,
  limit?: number
) {
  const matches = products.filter((product) =>
    productMatchesIntent(product, intentValueOrLabel)
  );

  return typeof limit === "number" ? matches.slice(0, limit) : matches;
}

export function getIntentHref(intentValueOrLabel: string) {
  const intent = normalizeProductIntent(intentValueOrLabel);

  if (!intent) return "/products";

  return `/products?intent=${encodeURIComponent(intent.value)}`;
}
