import Image from "next/image";

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

export default function BrandLogo({
  compact = false,
  className = "",
}: BrandLogoProps) {
  return (
    <div className={["flex items-center gap-3", className].join(" ")}>
      <Image
        src="/api/logo"
        alt="Marky Emporium"
        width={compact ? 64 : 88}
        height={compact ? 46 : 64}
        unoptimized
        className={[
          "shrink-0 rounded-md border border-accent/20 bg-white object-cover shadow-[0_14px_34px_rgba(216,60,134,0.16)]",
          compact ? "h-12 w-16" : "h-16 w-24",
        ].join(" ")}
      />

      <div>
        <p
          className={[
            "font-serif font-bold leading-none text-primary",
            compact ? "text-2xl" : "text-4xl",
          ].join(" ")}
        >
          MARKY
        </p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-accent/80">
          Emporium
        </p>
      </div>
    </div>
  );
}
