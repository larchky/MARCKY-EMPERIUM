"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  FiChevronDown,
  FiCreditCard,
  FiHeart,
  FiPackage,
  FiSearch,
  FiShield,
  FiShoppingBag,
  FiStar,
  FiTruck,
  FiUser,
} from "react-icons/fi";
import { supabase } from "@/lib/supabaseClient";
import {
  getProductDisplayImageUrl,
  getProductStock,
  type Product,
} from "@/lib/productImages";
import {
  getCategoryHref,
  getCategoryProducts,
  getIntentHref,
  getIntentProducts,
  getProductCategoryLabelForProduct,
  productMatchesCategory,
  productMatchesIntent,
} from "@/lib/productCategories";
import BrandLogo from "@/app/components/BrandLogo";
import CartLink from "@/app/components/CartLink";
import StoreProductCard from "@/app/components/StoreProductCard";

const megaNav = [
  {
    title: "NEW & RESTOCK",
    groups: [
      {
        title: "Drops",
        links: ["New arrivals", "Back in stock", "Best sellers"],
      },
      {
        title: "Fast edits",
        links: ["Giftable pieces", "Low stock alerts", "Wholesale packs"],
      },
    ],
  },
  {
    title: "HANDBAGS",
    groups: [
      {
        title: "Shop by category",
        links: ["Totes", "Satchels", "Crossbody bags", "Clutches"],
      },
      {
        title: "Collections",
        links: ["Structured bags", "Soft carryalls", "Event bags"],
      },
    ],
  },
  {
    title: "NIGHTWEAR",
    groups: [
      {
        title: "Sleep shop",
        links: ["Satin sets", "Robes", "Loungewear", "Slips"],
      },
      {
        title: "Buyer edits",
        links: ["Soft neutrals", "Gift sets", "Weekend restocks"],
      },
    ],
  },
  {
    title: "ACCESSORIES",
    groups: [
      {
        title: "Finishing pieces",
        links: ["Wallets", "Straps", "Jewelry", "Hair accessories"],
      },
      {
        title: "Occasion",
        links: ["Game day", "Travel", "Evening", "Everyday"],
      },
    ],
  },
];

const promoTiles = [
  {
    title: "Handbag wall",
    category: "Handbags",
    copy: "Structured totes, crossbody bags, clutches, and easy event pieces.",
  },
  {
    title: "Nightwear edit",
    category: "Nightwear",
    copy: "Soft sets, robes, slips, and loungewear for quick boutique refreshes.",
  },
];

const collectionTiles = [
  {
    title: "Back in stock",
    availability: "In stock",
    copy: "Available products ready for buyers to add to cart.",
  },
  {
    title: "Totes",
    category: "Handbags",
    search: "tote",
    copy: "Roomy handbag styles grouped for fast restocks.",
  },
  {
    title: "Crossbody bags",
    category: "Handbags",
    search: "crossbody",
    copy: "Hands-free bag picks from the handbag wall.",
  },
  {
    title: "Nightwear sets",
    category: "Nightwear",
    copy: "Sleepwear and lounge pieces for the nightwear shelf.",
  },
  {
    title: "Accessories",
    category: "Accessories",
    copy: "Wallets, straps, jewelry, hair pieces, and finishing items.",
  },
  {
    title: "Giftable picks",
    intent: "giftable",
    copy: "Small, easy-to-sell products for gifting moments.",
  },
  {
    title: "Event pieces",
    intent: "event",
    copy: "Statement pieces that work well for occasion buying.",
  },
  {
    title: "New arrivals",
    category: "New stock",
    copy: "Freshly added pieces from the newest stock category.",
  },
];

const promiseStrip = [
  {
    icon: FiShield,
    title: "Wholesale only",
    copy: "A buyer-first catalog built around boutique restocks.",
  },
  {
    icon: FiTruck,
    title: "Dispatch ready",
    copy: "Stock counts and cart checks help keep orders practical.",
  },
  {
    icon: FiCreditCard,
    title: "Secure checkout",
    copy: "Cart payment stays connected to the existing checkout flow.",
  },
];

const buyerNotes = [
  {
    title: "Great mix for your fashion style",
    copy: "Curated fashion pieces make it easier to build a focused restock.",
  },
  {
    title: "Easy to shop by category",
    copy: "Handbags, nightwear, accessories, and new stock are surfaced quickly.",
  },
  {
    title: "Clear product decisions",
    copy: "Real product experience with detailed information and images.",
  },
];

function scrollToCatalog() {
  document.getElementById("catalog")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function formatCurrency(value: number | string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "NGN 0";

  return new Intl.NumberFormat("en-NG", {
    currency: "NGN",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

function getCollectionHref(collection: (typeof collectionTiles)[number]) {
  const params = new URLSearchParams();

  if ("intent" in collection && collection.intent) {
    return getIntentHref(collection.intent);
  }

  if ("category" in collection && collection.category) {
    params.set("category", collection.category);
  }

  if ("availability" in collection && collection.availability) {
    params.set("availability", collection.availability);
  }

  if (!params.has("category") && "search" in collection && collection.search) {
    params.set("search", collection.search);
  }

  return `/products${params.toString() ? `?${params.toString()}` : ""}`;
}

function getProductImageAlt(product: Product) {
  return product.name || "Marky Emporium product";
}

function ProductImageStrip({
  products,
  title,
}: {
  products: Product[];
  title: string;
}) {
  const productsWithImages = products
    .map((product) => ({
      imageUrl: getProductDisplayImageUrl(product),
      product,
    }))
    .filter((item): item is { imageUrl: string; product: Product } =>
      Boolean(item.imageUrl)
    )
    .slice(0, 3);

  if (productsWithImages.length === 0) {
    return (
      <div className="grid h-36 place-items-center rounded-md border border-[#d7c7b7] bg-white/70 text-center text-[#8b6b4d]">
        <FiPackage className="text-3xl" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="grid h-36 grid-cols-3 gap-2">
      {productsWithImages.map(({ imageUrl, product }, index) => (
        <div
          key={`${title}-${product.id}-${index}`}
          role="img"
          aria-label={getProductImageAlt(product)}
          className="h-full min-w-0 rounded-md border border-white/70 bg-white object-cover shadow-[0_10px_22px_rgba(30,27,24,0.12)]"
          style={{
            backgroundImage: `url("${imageUrl}")`,
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
        />
      ))}
    </div>
  );
}

function getProductSearchText(product: Product) {
  return `${product.name} ${product.category || ""} ${
    product.description || ""
  }`.toLowerCase();
}

function getMenuCategory(menuTitle: string) {
  if (menuTitle === "HANDBAGS") return "Handbags";
  if (menuTitle === "NIGHTWEAR") return "Nightwear";
  if (menuTitle === "ACCESSORIES") return "Accessories";
  if (menuTitle === "NEW & RESTOCK") return "New stock";

  return "";
}

function getMenuLinkHref(menuTitle: string, link: string) {
  const params = new URLSearchParams();
  const category = getMenuCategory(menuTitle);

  if (category) {
    params.set("category", category);
  }

  if (link === "Back in stock" || link === "Low stock alerts") {
    params.set("availability", "In stock");
  } else {
    params.set("search", link);
  }

  return `/products?${params.toString()}`;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from("products").select("*");

      if (!error) {
        setProducts(data || []);
      }
    };

    fetchProducts();
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    return getProductSearchText(product).includes(normalizedSearch);
  });
  const newArrivals = filteredProducts.slice(0, 8);
  const restocks = filteredProducts
    .filter((product) => getProductStock(product) > 0)
    .slice(0, 8);
  const handbagProducts = getCategoryProducts(products, "Handbags", 4);
  const nightwearProducts = getCategoryProducts(products, "Nightwear", 4);
  const giftableProducts = getIntentProducts(products, "giftable", 8);
  const eventProducts = getIntentProducts(products, "event", 8);
  const newStockProducts = getCategoryProducts(filteredProducts, "New stock", 8);
  const buyerFavorites = filteredProducts.slice(2, 10);
  const hasSearchResults = filteredProducts.length > 0;

  const getCollectionProducts = (
    collection: (typeof collectionTiles)[number]
  ) => {
    const normalizedSearch =
      "search" in collection ? String(collection.search || "").toLowerCase() : "";
    const hasCategory = "category" in collection && Boolean(collection.category);
    const hasIntent = "intent" in collection && Boolean(collection.intent);

    const filterProducts = (useSearch: boolean) =>
      products.filter((product) => {
        const matchesCategory =
          !("category" in collection) ||
          !collection.category ||
          productMatchesCategory(product, collection.category);
        const matchesAvailability =
          !("availability" in collection) ||
          collection.availability !== "In stock" ||
          getProductStock(product) > 0;
        const matchesIntent =
          !hasIntent ||
          !("intent" in collection) ||
          productMatchesIntent(product, collection.intent);
        const matchesSearch =
          !useSearch ||
          !normalizedSearch ||
          getProductSearchText(product).includes(normalizedSearch);

        return (
          matchesCategory &&
          matchesAvailability &&
          matchesIntent &&
          matchesSearch
        );
      });

    const exactProducts = filterProducts(true);
    const fallbackProducts =
      exactProducts.length === 0 && normalizedSearch && hasCategory
        ? filterProducts(false)
        : [];

    return (exactProducts.length > 0 ? exactProducts : fallbackProducts).slice(
      0,
      3
    );
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    scrollToCatalog();
  };

  const renderProductRail = (
    title: string,
    copy: string,
    items: Product[],
    badge: string,
    href = "/products"
  ) => {
    if (products.length === 0 || items.length === 0) return null;

    return (
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="mb-6 flex flex-col justify-between gap-3 border-b border-[#e8ded4] pb-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#b26a34]">
              {badge}
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#1e1b18] sm:text-3xl">
              {title}
            </h2>
          </div>
          <Link
            href={href}
            className="inline-flex w-fit items-center gap-2 rounded-md border border-[#d7c7b7] px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-[#1e1b18] transition hover:border-accent hover:text-accent"
          >
            View all
          </Link>
        </div>
        <p className="mb-6 max-w-2xl text-sm leading-6 text-[#64564c]">
          {copy}
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((product) => (
            <StoreProductCard
              key={`${title}-${product.id}`}
              product={product}
              badge={badge}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbf7f2] text-[#1e1b18]">
      <div className="bg-[#1e1b18] px-5 py-2 text-center text-xs font-black uppercase tracking-[0.18em] text-white sm:px-8">
        Wholesale only. Request a buyer account before placing bulk orders.
      </div>

      <header className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5 sm:px-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <Link href="/" aria-label="Marky Emporium home">
            <BrandLogo compact />
          </Link>

          <form
            onSubmit={handleSearchSubmit}
            className="flex min-h-12 items-center overflow-hidden rounded-md border border-[#d7c7b7] bg-[#fbf7f2]"
          >
            <FiSearch
              className="ml-4 shrink-0 text-[#8b6b4d]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search handbags, nightwear, accessories..."
              className="h-12 w-full bg-transparent px-3 text-sm text-[#1e1b18] outline-none placeholder:text-[#8b6b4d]"
            />
            <button
              type="submit"
              className="h-12 bg-accent px-5 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#bf2d73]"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md border border-[#d7c7b7] px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-[#1e1b18] transition hover:border-accent hover:text-accent"
            >
              <FiUser aria-hidden="true" />
              Account
            </Link>
            <Link
              href="/reviews"
              className="inline-flex items-center gap-2 rounded-md border border-[#d7c7b7] px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-[#1e1b18] transition hover:border-accent hover:text-accent"
            >
              <FiStar aria-hidden="true" />
              Reviews
            </Link>
            <CartLink className="border-[#1e1b18] text-[#1e1b18]" />
          </div>
        </div>

        <nav
          aria-label="Primary navigation"
          className="border-y border-[#e8ded4] bg-[#fffdfb]"
        >
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 py-3 sm:px-8 lg:overflow-visible">
            {megaNav.map((menu) => (
              <details key={menu.title} className="group relative shrink-0">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2 text-sm font-black uppercase tracking-[0.13em] text-[#1e1b18] transition hover:bg-[#f3ebe2] hover:text-accent">
                  {menu.title}
                  <FiChevronDown
                    className="transition group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <div className="z-20 mt-2 w-[min(88vw,34rem)] rounded-md border border-[#e8ded4] bg-white p-5 shadow-[0_18px_50px_rgba(30,27,24,0.16)] lg:absolute">
                  <div className="grid gap-5 sm:grid-cols-2">
                    {menu.groups.map((group) => (
                      <div key={group.title}>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b26a34]">
                          {group.title}
                        </p>
                        <div className="mt-3 grid gap-2">
                          {group.links.map((link) => (
                            <Link
                              key={link}
                              href={getMenuLinkHref(menu.title, link)}
                              className="text-sm font-semibold text-[#64564c] transition hover:text-accent"
                            >
                              {link}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            ))}
            <Link
              href="/products"
              className="shrink-0 rounded-md px-3 py-2 text-sm font-black uppercase tracking-[0.13em] text-[#1e1b18] transition hover:bg-[#f3ebe2] hover:text-accent"
            >
              All products
            </Link>
            <button
              type="button"
              onClick={scrollToCatalog}
              className="shrink-0 rounded-md px-3 py-2 text-sm font-black uppercase tracking-[0.13em] text-[#1e1b18] transition hover:bg-[#f3ebe2] hover:text-accent"
            >
              Quick shop
            </button>
          </div>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-6 sm:px-8 lg:grid-cols-[1.38fr_0.82fr]">
        <Link
          href="#catalog"
          className="group relative min-h-[28rem] overflow-hidden rounded-md bg-[#1e1b18] text-white"
        >
          <Image
            src="/marky-storefront-hero.png"
            alt="Marky Emporium boutique wholesale edit"
            fill
            priority
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover opacity-65 transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e1b18] via-[#1e1b18]/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9">
            <p className="mb-3 inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#1e1b18]">
              <FiShoppingBag aria-hidden="true" />
              New wholesale edit
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Boutique fashion stock, organized for fast restocks.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/82 sm:text-lg">
              Shop handbags, nightwear, accessories, and fresh arrivals through
              a wholesale-style storefront built for scanning and quick carting.
            </p>
          </div>
        </Link>

        <div className="grid gap-4">
          {promoTiles.map((tile) => {
            const tileProducts = getCategoryProducts(products, tile.category, 4);

            return (
              <Link
                key={tile.title}
                href={getCategoryHref(tile.category)}
                className="group relative grid min-h-72 overflow-hidden rounded-md bg-[#efe5dc] p-5"
              >
                <ProductImageStrip products={tileProducts} title={tile.title} />
                <div className="relative z-10 mt-5 flex h-full flex-col justify-end">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#b26a34]">
                    {tile.category}
                  </p>
                  <h2 className="mt-2 max-w-[13rem] text-2xl font-black text-[#1e1b18]">
                    {tile.title}
                  </h2>
                  <p className="mt-2 max-w-[15rem] text-sm leading-6 text-[#64564c]">
                    {tile.copy}
                  </p>
                  {tileProducts.length > 0 && (
                    <div className="mt-4 grid gap-2">
                      {tileProducts.slice(0, 3).map((product) => (
                        <div
                          key={`${tile.title}-${product.id}`}
                          className="flex max-w-sm items-center justify-between gap-3 rounded-md border border-[#d7c7b7] bg-white/80 px-3 py-2 text-sm"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-bold text-[#1e1b18]">
                              {product.name}
                            </span>
                            <span className="block text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#8b6b4d]">
                              {getProductCategoryLabelForProduct(product)}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-black text-accent">
                            {formatCurrency(product.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-y border-[#e8ded4] bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-5 sm:px-8 lg:grid-cols-3">
          {promiseStrip.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.title} className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#1e1b18] text-white">
                  <Icon aria-hidden="true" />
                </span>
                <div>
                  <p className="font-black text-[#1e1b18]">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#64564c]">
                    {item.copy}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section
        id="collections"
        className="mx-auto max-w-7xl px-5 py-12 sm:px-8"
      >
        <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#b26a34]">
              Collections
            </p>
            <h2 className="mt-2 text-3xl font-black text-[#1e1b18]">
              Shop the storefront by buyer intent
            </h2>
          </div>
          <Link
            href="/products"
            className="inline-flex w-fit rounded-md bg-[#1e1b18] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-accent"
          >
            Open catalog
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {collectionTiles.map((collection, index) => {
            const collectionProducts = getCollectionProducts(collection);

            return (
              <Link
                key={collection.title}
                href={getCollectionHref(collection)}
                className={[
                  "rounded-md border p-5 transition hover:-translate-y-1 hover:border-accent hover:bg-white",
                  index % 3 === 0
                    ? "border-[#d7c7b7] bg-[#efe5dc]"
                    : index % 3 === 1
                      ? "border-[#d6dfd2] bg-[#eef5eb]"
                      : "border-[#e9d5df] bg-[#fff4f9]",
                ].join(" ")}
              >
                <ProductImageStrip
                  products={collectionProducts}
                  title={collection.title}
                />
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b26a34]">
                  {collectionProducts.length} listed
                </p>
                <h3 className="mt-3 text-xl font-black text-[#1e1b18]">
                  {collection.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#64564c]">
                  {collection.copy}
                </p>
                {collectionProducts.length > 0 && (
                  <div className="mt-4 grid gap-2 border-t border-[#d7c7b7] pt-3">
                    {collectionProducts.map((product) => (
                      <div
                        key={`${collection.title}-${product.id}`}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-[#1e1b18]">
                            {product.name}
                          </span>
                          <span className="block text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#8b6b4d]">
                            {getProductCategoryLabelForProduct(product)}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-black text-accent">
                          {formatCurrency(product.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <section id="catalog" className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#b26a34]">
                Quick shop
              </p>
              <h2 className="mt-2 text-3xl font-black text-[#1e1b18]">
                Fresh stock preview
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[#64564c]">
              A concise edit of handbags, nightwear, accessories, and fresh
              arrivals for boutique restocks.
            </p>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="mt-6 flex max-w-2xl items-center overflow-hidden rounded-md border border-[#d7c7b7] bg-[#fbf7f2]"
          >
            <FiSearch
              className="ml-4 shrink-0 text-[#8b6b4d]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search the storefront..."
              className="h-12 w-full bg-transparent px-3 text-sm text-[#1e1b18] outline-none placeholder:text-[#8b6b4d]"
            />
            <button
              type="submit"
              className="h-12 bg-accent px-5 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#bf2d73]"
            >
              Find
            </button>
          </form>

          {products.length === 0 ? (
            <div className="mt-8 rounded-md border border-[#e8ded4] bg-[#fbf7f2] p-8 text-center">
              <FiPackage
                className="mx-auto text-4xl text-[#b26a34]"
                aria-hidden="true"
              />
              <h3 className="mt-4 text-2xl font-black text-[#1e1b18]">
                No products listed yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64564c]">
                New handbags, nightwear, accessories, and fashion finds will
                appear here soon.
              </p>
            </div>
          ) : !hasSearchResults ? (
            <div className="mt-8 rounded-md border border-[#e8ded4] bg-[#fbf7f2] p-8 text-center">
              <h3 className="text-2xl font-black text-[#1e1b18]">
                No matching products
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64564c]">
                Try searching handbag, nightwear, tote, wallet, or accessory.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {renderProductRail(
        "Handbag wall",
        "Handbags are grouped together so buyers can open the full handbag section without sorting through nightwear or accessories.",
        handbagProducts,
        "Handbags",
        getCategoryHref("Handbags")
      )}

      {renderProductRail(
        "Nightwear edit",
        "Nightwear has its own shelf for satin sets, robes, loungewear, and sleep pieces.",
        nightwearProducts,
        "Nightwear",
        getCategoryHref("Nightwear")
      )}

      {renderProductRail(
        "New arrivals",
        "The first shelf mirrors a wholesale new-and-restock flow, giving buyers the newest stock without extra clicks.",
        newStockProducts.length > 0 ? newStockProducts : newArrivals,
        "New",
        getCategoryHref("New stock")
      )}

      {renderProductRail(
        "Back in stock",
        "Available items are grouped again for buyers who need sellable stock right now.",
        restocks,
        "Restock",
        "/products?availability=In%20stock"
      )}

      {renderProductRail(
        "Giftable picks",
        "Products marked in admin as giftable are grouped here for buyers building easy gifting bundles.",
        giftableProducts,
        "Giftable",
        getIntentHref("giftable")
      )}

      {renderProductRail(
        "Event pieces",
        "Products marked in admin for events are grouped here for buyers shopping occasion-ready stock.",
        eventProducts,
        "Event",
        getIntentHref("event")
      )}

      {renderProductRail(
        "Buyer favorites",
        "A second product rail keeps browsing moving, similar to best-seller shelves on wholesale stores.",
        buyerFavorites.length > 0 ? buyerFavorites : newArrivals,
        "Favorite"
      )}

      <section className="border-y border-[#e8ded4] bg-[#1e1b18] text-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-12 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f2c078]">
              Buyer notes
            </p>
            <h2 className="mt-3 text-3xl font-black">
              Shop with confidence.
            </h2>
            <Link
              href="/reviews"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-[#1e1b18] transition hover:bg-[#f2c078]"
            >
              <FiHeart aria-hidden="true" />
              Read reviews
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {buyerNotes.map((note) => (
              <article
                key={note.title}
                className="rounded-md border border-white/15 bg-white/8 p-5"
              >
                <FiStar className="text-[#f2c078]" aria-hidden="true" />
                <h3 className="mt-4 font-black">{note.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/72">
                  {note.copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-white px-5 py-10 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <BrandLogo compact />
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#64564c]">
              Marky Emporium is the best store for handbags, nightwear, accessories, and fashion restocks.
            </p>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#b26a34]">
              Information
            </p>
            <div className="mt-4 grid gap-2 text-sm font-semibold text-[#64564c]">
              <Link href="/products" className="transition hover:text-accent">
                Catalog
              </Link>
              <Link href="/reviews" className="transition hover:text-accent">
                Reviews
              </Link>
              <Link href="/cart" className="transition hover:text-accent">
                Cart
              </Link>
              <Link href="/login" className="transition hover:text-accent">
                Admin
              </Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#b26a34]">
              Storefront
            </p>
            <p className="mt-4 text-sm leading-7 text-[#64564c]">
              Order and receive your favorite pieces.
            </p>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-7xl border-t border-[#e8ded4] pt-5 text-sm text-[#8b6b4d]">
          Copyright 2026 Marky Emporium. Boutique fashion, ready to restock.
        </p>
      </footer>
    </main>
  );
}
