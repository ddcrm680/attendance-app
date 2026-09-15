import AppBrand from "@/components/AppBrand";

type AppLoadingProps = {
  message?: string;
  variant?: "page" | "inline";
  className?: string;
};

export default function AppLoading({
  message = "Loading…",
  variant = "page",
  className = "",
}: AppLoadingProps) {
  return (
    <div
      className={`app-loading app-loading-${variant} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      {variant === "page" && <AppBrand variant="login" className="app-loading-brand" />}
      <svg className="app-loading-spinner" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="app-loading-track" cx="12" cy="12" r="8.5" />
        <path className="app-loading-indicator" d="M20.5 12a8.5 8.5 0 0 0-8.5-8.5" />
      </svg>
      <p className="app-loading-message">{message}</p>
    </div>
  );
}
