interface LogoProps {
  variant?: "dark" | "light";
  className?: string;
  /** Rendered width in px; height follows the logo's aspect ratio. */
  width?: number;
  title?: string;
}

const RATIO = 250 / 1806;

/** Full SL Mini Golf Association lockup. Use "dark" on dark backgrounds. */
export function Logo({ variant = "dark", className, width = 280, title = "SL Mini Golf Association" }: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/brand/slmga-logo-${variant}.svg`}
      alt={title}
      width={width}
      height={Math.round(width * RATIO)}
      className={className}
    />
  );
}
