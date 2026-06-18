import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import React from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  /**
   * The path for the home icon. Defaults to "/dashboard".
   * Pass "/" or another path to reuse this component in other layouts.
   */
  homeHref?: string;
  /**
   * Optional custom separator icon/component.
   */
  separator?: React.ReactNode;
}

export const Breadcrumbs = ({
  items,
  homeHref = "/dashboard",
  separator = <ChevronRight className="h-4 w-4" />,
}: BreadcrumbsProps) => {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-muted-foreground mb-6">
      <ol className="flex items-center gap-2 flex-wrap">
        {/* Home Item */}
        <li className="flex items-center gap-2">
          <Link
            to={homeHref}
            className="flex items-center gap-1 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Home"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
          </Link>
        </li>

        {/* Mapped Items */}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li
              key={`${item.label}-${index}`}
              className="flex items-center gap-2"
              aria-current={isLast ? "page" : undefined}
            >
              {/* Separator - Decorative only */}
              <span className="text-muted-foreground" aria-hidden="true">
                {separator}
              </span>

              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
