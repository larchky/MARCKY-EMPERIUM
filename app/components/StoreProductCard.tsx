"use client";

import { FiPackage } from "react-icons/fi";
import {
  getProductDisplayImageUrl,
  getProductImageRows,
  getProductImageUrls,
  getProductStock,
  type Product,
} from "@/lib/productImages";
import AddToCartButton from "@/app/components/AddToCartButton";
import Product360Viewer from "@/app/components/Product360Viewer";

type StoreProductCardProps = {
  product: Product;
  badge?: string;
};

function formatCurrency(value: number | string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "NGN 0";

  return new Intl.NumberFormat("en-NG", {
    currency: "NGN",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

export default function StoreProductCard({
  product,
  badge,
}: StoreProductCardProps) {
  const imageUrl = getProductDisplayImageUrl(product);
  const rotationImageUrls = getProductImageUrls(product.rotation_image_urls);
  const rotationImageRows = getProductImageRows(
    product.rotation_image_rows,
    product.rotation_image_urls
  );
  const stockQuantity = getProductStock(product);
  const hasProductImage =
    Boolean(imageUrl) ||
    rotationImageUrls.length > 0 ||
    rotationImageRows.some((row) => row.length > 0);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-md border border-[#e8ded4] bg-white shadow-[0_14px_32px_rgba(30,27,24,0.08)] transition hover:-translate-y-1 hover:border-[#b88b5a]">
      <div className="relative bg-[#f7f2ec]">
        {badge && (
          <span className="absolute left-3 top-3 z-10 rounded-md bg-[#1e1b18] px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-white">
            {badge}
          </span>
        )}

        {hasProductImage ? (
          <Product360Viewer
            alt={product.name}
            imageUrl={imageUrl}
            frameUrls={rotationImageUrls}
            frameRows={rotationImageRows}
            className="h-72 rounded-none border-0 bg-[#f7f2ec]"
          />
        ) : (
          <div className="grid h-72 place-items-center bg-[#f7f2ec] px-6 text-center text-[#8b6b4d]">
            <div>
              <FiPackage className="mx-auto text-4xl" aria-hidden="true" />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.18em]">
                Marky Emporium
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold leading-6 text-[#1e1b18]">
            {product.name}
          </h3>
          <p className="shrink-0 rounded-md bg-[#fff4f9] px-2 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-accent">
            Wholesale
          </p>
        </div>

        <p
          className={[
            "mt-3 inline-flex w-fit rounded-md px-3 py-1 text-xs font-black uppercase tracking-[0.14em]",
            stockQuantity > 0
              ? "bg-emerald-100 text-emerald-800"
              : "bg-red-50 text-red-700",
          ].join(" ")}
        >
          {stockQuantity > 0 ? `${stockQuantity} in stock` : "Out of stock"}
        </p>

        <p className="mt-3 min-h-12 text-sm leading-6 text-[#64564c]">
          {product.description ||
            "Boutique-ready fashion item for your next restock."}
        </p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
          <p className="text-xl font-black text-[#1e1b18]">
            {formatCurrency(product.price)}
          </p>
          <AddToCartButton product={product} imageUrl={imageUrl} />
        </div>
      </div>
    </article>
  );
}
