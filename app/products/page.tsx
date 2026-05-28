"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FiChevronDown,
  FiFilter,
  FiGrid,
  FiHome,
  FiList,
  FiSearch,
  FiSliders,
  FiX,
} from "react-icons/fi";
import { supabase } from "@/lib/supabaseClient";
import { getProductStock, type Product } from "@/lib/productImages";
import BrandLogo from "@/app/components/BrandLogo";
import CartLink from "@/app/components/CartLink";
import StoreProductCard from "@/app/components/StoreProductCard";

const categoryFilters = [
  {
    label: "All categories",
    keywords: [],
  },
  {
    label: "Handbags",
    keywords: ["handbag", "bag", "tote", "satchel", "crossbody", "clutch"],
  },
  {
    label: "Nightwear",
    keywords: ["nightwear", "sleep", "satin", "robe", "lounge", "slip"],
  },
  {
    label: "Accessories",
    keywords: ["wallet", "strap", "accessory", "jewelry", "hair", "hat"],
  },
  {
    label: "New stock",
    keywords: ["new", "arrival", "restock", "fashion"],
  },
];

const availabilityFilters = ["All stock", "In stock", "Out of stock"];

function getSearchText(product: Product) {
  return `${product.name} ${product.description || ""}`.toLowerCase();
}

function getComparableId(product: Product) {
  const numericId = Number(product.id);

  return Number.isFinite(numericId) ? numericId : String(product.id);
}

function sortProducts(products: Product[], sortOrder: string) {
  return [...products].sort((first, second) => {
    const firstPrice = Number(first.price);
    const secondPrice = Number(second.price);

    if (sortOrder === "price-low") {
      return firstPrice - secondPrice;
    }

    if (sortOrder === "price-high") {
      return secondPrice - firstPrice;
    }

    if (sortOrder === "name-asc") {
      return first.name.localeCompare(second.name);
    }

    if (sortOrder === "stock-high") {
      return getProductStock(second) - getProductStock(first);
    }

    const firstId = getComparableId(first);
    const secondId = getComparableId(second);

    if (typeof firstId === "number" && typeof secondId === "number") {
      return secondId - firstId;
    }

    return String(secondId).localeCompare(String(firstId));
  });
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [availabilityFilter, setAvailabilityFilter] = useState("All stock");
  const [sortOrder, setSortOrder] = useState("newest");
  const [displayCount, setDisplayCount] = useState(24);
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from("products").select("*");
      setProducts(data || []);
    };

    fetchProducts();

    const paymentStatus = new URLSearchParams(window.location.search).get(
      "payment"
    );
    const paymentMessages: Record<string, string> = {
      success: "Payment successful! Your order has been received.",
      unconfirmed:
        "Payment was received, but the order could not be confirmed yet. Please contact Marky Emporium.",
      failed: "Payment was not completed. Your order was not saved.",
      cancelled: "Payment was cancelled. Your order was not saved.",
    };

    if (paymentStatus && paymentMessages[paymentStatus]) {
      alert(paymentMessages[paymentStatus]);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const selectedCategory = categoryFilters.find(
    (filter) => filter.label === categoryFilter
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const searchableText = getSearchText(product);
      const stockQuantity = getProductStock(product);
      const matchesSearch =
        normalizedSearch.length === 0 ||
        searchableText.includes(normalizedSearch);
      const matchesCategory =
        !selectedCategory?.keywords.length ||
        selectedCategory.keywords.some((keyword) =>
          searchableText.includes(keyword)
        );
      const matchesAvailability =
        availabilityFilter === "All stock" ||
        (availabilityFilter === "In stock" && stockQuantity > 0) ||
        (availabilityFilter === "Out of stock" && stockQuantity <= 0);

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [availabilityFilter, products, searchTerm, selectedCategory]);

  const sortedProducts = useMemo(
    () => sortProducts(filteredProducts, sortOrder),
    [filteredProducts, sortOrder]
  );
  const visibleProducts = sortedProducts.slice(0, displayCount);
  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    categoryFilter !== "All categories" ||
    availabilityFilter !== "All stock";

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("All categories");
    setAvailabilityFilter("All stock");
    setDisplayCount(24);
  };

  return (
    <main className="min-h-screen bg-[#fbf7f2] text-[#1e1b18]">
      <div className="bg-[#1e1b18] px-5 py-2 text-center text-xs font-black uppercase tracking-[0.18em] text-white sm:px-8">
        Wholesale catalog for boutique restocks.
      </div>

      <header className="border-b border-[#e8ded4] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-5 py-5 sm:px-8 lg:flex-row lg:items-center">
          <Link href="/" aria-label="Marky Emporium home">
            <BrandLogo compact />
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-md border border-[#d7c7b7] px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-[#1e1b18] transition hover:border-accent hover:text-accent"
            >
              <FiHome aria-hidden="true" />
              Home
            </Link>
            <Link
              href="/reviews"
              className="rounded-md border border-[#d7c7b7] px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-[#1e1b18] transition hover:border-accent hover:text-accent"
            >
              Reviews
            </Link>
            <CartLink className="border-[#1e1b18] text-[#1e1b18]" />
          </div>
        </div>

        <nav
          aria-label="Catalog navigation"
          className="border-t border-[#e8ded4] bg-[#fffdfb]"
        >
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 py-3 sm:px-8">
            {categoryFilters.map((filter) => (
              <button
                key={filter.label}
                type="button"
                onClick={() => setCategoryFilter(filter.label)}
                className={[
                  "shrink-0 rounded-md px-3 py-2 text-sm font-black uppercase tracking-[0.13em] transition",
                  categoryFilter === filter.label
                    ? "bg-[#1e1b18] text-white"
                    : "text-[#1e1b18] hover:bg-[#f3ebe2] hover:text-accent",
                ].join(" ")}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#8b6b4d]">
          <Link href="/" className="transition hover:text-accent">
            Home
          </Link>
          <span>/</span>
          <span className="text-[#1e1b18]">Catalog</span>
        </div>

        <div className="mt-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[#b26a34]">
              <FiGrid aria-hidden="true" />
              Collection page
            </p>
            <h1 className="mt-3 text-4xl font-black text-[#1e1b18] sm:text-5xl">
              Fashion catalog
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#64564c]">
              Handbags, nightwear, accessories, and easy fashion pieces for
              building a focused stock order.
            </p>
          </div>

          <form
            onSubmit={(event) => event.preventDefault()}
            className="flex min-h-12 w-full max-w-xl items-center overflow-hidden rounded-md border border-[#d7c7b7] bg-white lg:w-[28rem]"
          >
            <FiSearch
              className="ml-4 shrink-0 text-[#8b6b4d]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search products..."
              className="h-12 w-full bg-transparent px-3 text-sm text-[#1e1b18] outline-none placeholder:text-[#8b6b4d]"
            />
          </form>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 pb-12 sm:px-8 lg:grid-cols-[17rem_1fr]">
        <aside className="h-fit rounded-md border border-[#e8ded4] bg-white p-5 shadow-[0_14px_32px_rgba(30,27,24,0.06)] lg:sticky lg:top-5">
          <div className="flex items-center justify-between gap-3 border-b border-[#e8ded4] pb-4">
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-[#1e1b18]">
              <FiFilter aria-hidden="true" />
              Filters
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.12em] text-accent"
              >
                <FiX aria-hidden="true" />
                Clear
              </button>
            )}
          </div>

          <div className="mt-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b26a34]">
              Category
            </p>
            <div className="mt-3 grid gap-2">
              {categoryFilters.map((filter) => (
                <button
                  key={filter.label}
                  type="button"
                  onClick={() => setCategoryFilter(filter.label)}
                  className={[
                    "rounded-md border px-3 py-2 text-left text-sm font-semibold transition",
                    categoryFilter === filter.label
                      ? "border-[#1e1b18] bg-[#1e1b18] text-white"
                      : "border-[#e8ded4] text-[#64564c] hover:border-accent hover:text-accent",
                  ].join(" ")}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b26a34]">
              Availability
            </p>
            <div className="mt-3 grid gap-2">
              {availabilityFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setAvailabilityFilter(filter)}
                  className={[
                    "rounded-md border px-3 py-2 text-left text-sm font-semibold transition",
                    availabilityFilter === filter
                      ? "border-[#1e1b18] bg-[#1e1b18] text-white"
                      : "border-[#e8ded4] text-[#64564c] hover:border-accent hover:text-accent",
                  ].join(" ")}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div>
          <div className="rounded-md border border-[#e8ded4] bg-white p-4 shadow-[0_14px_32px_rgba(30,27,24,0.06)]">
            <div className="grid gap-4 xl:grid-cols-[1fr_auto_auto_auto] xl:items-center">
              <p className="text-sm font-semibold text-[#64564c]">
                Showing{" "}
                <span className="font-black text-[#1e1b18]">
                  {visibleProducts.length}
                </span>{" "}
                of{" "}
                <span className="font-black text-[#1e1b18]">
                  {sortedProducts.length}
                </span>{" "}
                products
              </p>

              <label className="flex items-center gap-2 text-sm font-semibold text-[#64564c]">
                <span>Display</span>
                <span className="relative">
                  <select
                    value={displayCount}
                    onChange={(event) =>
                      setDisplayCount(Number(event.target.value))
                    }
                    className="h-10 appearance-none rounded-md border border-[#d7c7b7] bg-[#fbf7f2] pl-3 pr-9 text-sm font-bold text-[#1e1b18] outline-none"
                  >
                    <option value={12}>12 per page</option>
                    <option value={24}>24 per page</option>
                    <option value={36}>36 per page</option>
                    <option value={48}>48 per page</option>
                  </select>
                  <FiChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8b6b4d]"
                    aria-hidden="true"
                  />
                </span>
              </label>

              <label className="flex items-center gap-2 text-sm font-semibold text-[#64564c]">
                <span>Sort by</span>
                <span className="relative">
                  <select
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value)}
                    className="h-10 appearance-none rounded-md border border-[#d7c7b7] bg-[#fbf7f2] pl-3 pr-9 text-sm font-bold text-[#1e1b18] outline-none"
                  >
                    <option value="newest">Date, new to old</option>
                    <option value="stock-high">Stock, high to low</option>
                    <option value="price-low">Price, low to high</option>
                    <option value="price-high">Price, high to low</option>
                    <option value="name-asc">Alphabetically, A-Z</option>
                  </select>
                  <FiChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8b6b4d]"
                    aria-hidden="true"
                  />
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Grid view"
                  title="Grid view"
                  onClick={() => setViewMode("grid")}
                  className={[
                    "grid size-10 place-items-center rounded-md border transition",
                    viewMode === "grid"
                      ? "border-[#1e1b18] bg-[#1e1b18] text-white"
                      : "border-[#d7c7b7] text-[#64564c] hover:border-accent hover:text-accent",
                  ].join(" ")}
                >
                  <FiGrid aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Compact view"
                  title="Compact view"
                  onClick={() => setViewMode("compact")}
                  className={[
                    "grid size-10 place-items-center rounded-md border transition",
                    viewMode === "compact"
                      ? "border-[#1e1b18] bg-[#1e1b18] text-white"
                      : "border-[#d7c7b7] text-[#64564c] hover:border-accent hover:text-accent",
                  ].join(" ")}
                >
                  <FiList aria-hidden="true" />
                </button>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-[#e8ded4] pt-4">
                {searchTerm.trim() && (
                  <span className="rounded-md bg-[#fff4f9] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-accent">
                    Search: {searchTerm}
                  </span>
                )}
                {categoryFilter !== "All categories" && (
                  <span className="rounded-md bg-[#eef5eb] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#4d7d56]">
                    {categoryFilter}
                  </span>
                )}
                {availabilityFilter !== "All stock" && (
                  <span className="rounded-md bg-[#efe5dc] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#8b6b4d]">
                    {availabilityFilter}
                  </span>
                )}
              </div>
            )}
          </div>

          {products.length === 0 ? (
            <div className="mt-6 rounded-md border border-[#e8ded4] bg-white p-8 text-center">
              <FiSliders
                className="mx-auto text-4xl text-[#b26a34]"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-2xl font-black text-[#1e1b18]">
                No products available
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64564c]">
                New handbags, nightwear, accessories, and fashion finds will
                appear here after stock is added.
              </p>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="mt-6 rounded-md border border-[#e8ded4] bg-white p-8 text-center">
              <h2 className="text-2xl font-black text-[#1e1b18]">
                No matching products
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64564c]">
                Clear filters or search for handbag, nightwear, tote, wallet,
                or accessory.
              </p>
            </div>
          ) : (
            <div
              className={[
                "mt-6 grid gap-5",
                viewMode === "grid"
                  ? "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                  : "md:grid-cols-2",
              ].join(" ")}
            >
              {visibleProducts.map((product) => (
                <StoreProductCard
                  key={product.id}
                  product={product}
                  badge={getProductStock(product) > 0 ? "Ready" : "Check"}
                />
              ))}
            </div>
          )}

          {visibleProducts.length < sortedProducts.length && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setDisplayCount((current) => current + 12)}
                className="rounded-md bg-[#1e1b18] px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-accent"
              >
                Show more
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
