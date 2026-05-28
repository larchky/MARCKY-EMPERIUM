"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { FiMessageSquare, FiStar } from "react-icons/fi";
import BrandLogo from "@/app/components/BrandLogo";
import CartLink from "@/app/components/CartLink";

type Review = {
  id: number;
  name: string;
  product: string;
  rating: string;
  comment: string;
};

const starterReviews: Review[] = [
  {
    id: 1,
    name: "Ada C.",
    product: "Quilted Handbag",
    rating: "5",
    comment:
      "The bag quality looked even better in person. Clean stitching, lovely color, and my customers asked for more.",
  },
  {
    id: 2,
    name: "Timi A.",
    product: "Satin Nightwear Set",
    rating: "5",
    comment:
      "Soft fabric, neat packaging, and the sizes were easy to sell. Marky Emporium helped me pick fast-moving colors.",
  },
  {
    id: 3,
    name: "Mira Boutique",
    product: "Accessory Restock",
    rating: "4",
    comment:
      "Great mix for my small shop. Everything arrived neat, and the team followed up on delivery.",
  },
];

const emptyReview = {
  name: "",
  product: "",
  rating: "5",
  comment: "",
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState(starterReviews);
  const [form, setForm] = useState(emptyReview);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.comment.trim()) {
      alert("Please add your name and review.");
      return;
    }

    setReviews([
      {
        id: Date.now(),
        name: form.name.trim(),
        product: form.product.trim() || "Marky Emporium fashion item",
        rating: form.rating,
        comment: form.comment.trim(),
      },
      ...reviews,
    ]);
    setForm(emptyReview);
  };

  return (
    <main className="min-h-screen bg-studio px-5 py-8 text-champagne sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-6 border-b border-accent/15 pb-8 md:flex-row md:items-center">
          <BrandLogo compact />

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="w-fit rounded-md border border-accent/45 px-4 py-2 text-sm font-bold uppercase tracking-[0.14em] text-accent transition hover:border-accent hover:text-primary"
            >
              Home
            </Link>
            <Link
              href="/products"
              className="w-fit rounded-md border border-accent/25 px-4 py-2 text-sm font-bold uppercase tracking-[0.14em] text-champagne transition hover:border-accent/60 hover:text-primary"
            >
              Products
            </Link>
            <CartLink />
          </div>
        </header>

        <section className="grid gap-8 py-10 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.24em] text-accent">
              <FiMessageSquare aria-hidden="true" />
              Customer Reviews
            </p>
            <h1 className="mt-3 max-w-2xl font-serif text-5xl font-bold leading-tight text-primary">
              What shoppers say after stocking up.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-champagne/70">
              Real feedback from boutique owners and customers buying handbags,
              nightwear, accessories, and easy fashion pieces.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-accent/25 bg-white/90 p-6 shadow-[0_30px_80px_rgba(99,69,22,0.14)]"
          >
            <h2 className="text-2xl font-bold text-primary">Leave a review</h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <input
                name="name"
                placeholder="Your name"
                value={form.name}
                onChange={handleChange}
                className="rounded-md border border-accent/35 bg-white/90 p-3 text-primary outline-none transition placeholder:text-champagne/45 focus:border-accent"
              />
              <input
                name="product"
                placeholder="Product bought"
                value={form.product}
                onChange={handleChange}
                className="rounded-md border border-accent/35 bg-white/90 p-3 text-primary outline-none transition placeholder:text-champagne/45 focus:border-accent"
              />
              <select
                name="rating"
                value={form.rating}
                onChange={handleChange}
                className="rounded-md border border-accent/35 bg-white/90 p-3 text-primary outline-none transition focus:border-accent sm:col-span-2"
              >
                <option value="5">5/5</option>
                <option value="4">4/5</option>
                <option value="3">3/5</option>
                <option value="2">2/5</option>
                <option value="1">1/5</option>
              </select>
              <textarea
                name="comment"
                placeholder="How was your experience?"
                value={form.comment}
                onChange={handleChange}
                rows={5}
                className="resize-none rounded-md border border-accent/35 bg-white/90 p-3 text-primary outline-none transition placeholder:text-champagne/45 focus:border-accent sm:col-span-2"
              />
            </div>

            <button
              type="submit"
              className="mt-5 w-full rounded-md bg-accent px-4 py-3 font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#bf2d73]"
            >
              Submit Review
            </button>
          </form>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-lg border border-accent/15 bg-white/90 p-5 shadow-[0_18px_45px_rgba(216,60,134,0.10)]"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-bold text-primary">{review.name}</p>
                <span className="inline-flex items-center gap-1 rounded-md bg-accent/12 px-3 py-1 text-sm font-black text-accent">
                  <FiStar aria-hidden="true" />
                  {review.rating}/5
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-accent">
                {review.product}
              </p>
              <p className="mt-4 leading-7 text-champagne/72">
                {review.comment}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
