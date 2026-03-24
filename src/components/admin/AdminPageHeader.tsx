import React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

type AdminPageHeaderProps = {
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ElementType;
  actions?: React.ReactNode;
};

export function AdminPageHeader({ title, subtitle, icon: Icon, actions }: AdminPageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-2")}>
      <div className="min-w-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 mb-1.5">
          <span className="font-medium">Admin</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground/80 font-semibold">{title}</span>
        </div>
        <h1 className="font-display font-bold text-xl md:text-2xl flex items-center gap-2.5 tracking-tight">
          {Icon ? (
            <div className="stat-icon stat-icon--accent">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
          <span className="truncate">{title}</span>
        </h1>
        {subtitle ? (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        ) : null}
        {/* Accent line */}
        <div className="mt-3 h-[2px] w-12 rounded-full bg-accent/40" />
      </div>
      {actions ? (
        <div className="flex items-center gap-2 flex-wrap">{actions}</div>
      ) : null}
    </div>
  );
}
