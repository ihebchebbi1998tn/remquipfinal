import React from "react";
import { cn } from "@/lib/utils";

type AdminPageHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
};

export function AdminPageHeader({ title, subtitle, icon: Icon, actions }: AdminPageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3")}>
      <div className="min-w-0">
        <h1 className="font-display font-bold text-lg md:text-xl flex items-center gap-2">
          {Icon ? <Icon className="h-5 w-5 text-accent flex-shrink-0" /> : null}
          <span className="truncate">{title}</span>
        </h1>
        {subtitle ? <p className="text-sm text-muted-foreground mt-1">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2 flex-wrap">{actions}</div> : null}
    </div>
  );
}

