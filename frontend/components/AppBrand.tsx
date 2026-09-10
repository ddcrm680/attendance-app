"use client";

import { useState } from "react";
import { appBrand } from "@/lib/brand";

type AppBrandProps = {
  className?: string;
  workspace?: "admin";
  variant?: "header" | "login";
};

export default function AppBrand({
  className = "",
  workspace,
  variant = "header",
}: AppBrandProps) {
  const [logoUnavailable, setLogoUnavailable] = useState(false);
  const loginPresentation = variant === "login";
  const showWorkspaceLabel = workspace === "admin" && !loginPresentation;
  const markClassName = loginPresentation
    ? "h-14 w-14 sm:h-16 sm:w-16"
    : "h-8 w-8";

  return (
    <div
      className={
        loginPresentation
          ? `flex flex-col items-center text-center ${className}`
          : `flex min-w-0 items-center gap-2 ${className}`
      }
    >
      {appBrand.logoSrc && !logoUnavailable ? (
        <img
          src={appBrand.logoSrc}
          alt={`${appBrand.name} logo`}
          className={`${markClassName} shrink-0`}
          onError={() => setLogoUnavailable(true)}
        />
      ) : (
        <span
          aria-label={`${appBrand.name} logo`}
          className={`flex ${markClassName} shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] font-semibold tracking-tight text-[var(--on-accent)] shadow-sm ${
            loginPresentation ? "text-base" : "text-[10px]"
          }`}
        >
          {appBrand.logoFallback}
        </span>
      )}
      <div className={loginPresentation ? "mt-3" : "min-w-0"}>
        <span
          className={
            loginPresentation
              ? "whitespace-nowrap text-2xl font-semibold tracking-tight"
              : "block truncate whitespace-nowrap text-sm font-bold tracking-tight"
          }
        >
          {appBrand.name}
        </span>
        {showWorkspaceLabel && (
          <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-[.08em] leading-3 text-gray-500">
            {appBrand.adminName}
          </span>
        )}
        {loginPresentation && (
          <p className="mt-1 whitespace-nowrap text-[9px] font-medium tracking-[0.14em] text-gray-500 sm:text-[10px]">
            {appBrand.tagline}
          </p>
        )}
      </div>
    </div>
  );
}
