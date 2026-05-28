import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { CartProvider } from "@/app/components/CartProvider";

export const metadata: Metadata = {
  title: "Marky Emporium",
  description: "Handbags, nightwear, and boutique fashion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Script src="https://checkout.flutterwave.com/v3.js" />

        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
