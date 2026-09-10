import type { ReactNode } from "react";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

export default function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
  titleClassName = "font-medium",
  descriptionClassName = "text-gray-500",
}: PageHeaderProps) {
  return (
    <div className={`app-page-heading ${className ?? ""}`}>
      <div>
      {eyebrow && <p className="app-eyebrow mb-2">{eyebrow}</p>}
      <h1 className={`page-header-title ${titleClassName}`}>{title}</h1>
      {description && (
        <p className={`page-header-description mt-2 ${descriptionClassName}`}>{description}</p>
      )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
