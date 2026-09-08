import type { ReactNode } from "react";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

export default function PageHeader({
  title,
  description,
  className,
  titleClassName = "font-medium",
  descriptionClassName = "text-gray-500",
}: PageHeaderProps) {
  return (
    <div className={className}>
      <h1 className={`text-lg ${titleClassName}`}>{title}</h1>
      {description && (
        <p className={`text-sm ${descriptionClassName}`}>{description}</p>
      )}
    </div>
  );
}
