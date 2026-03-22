import React from "react";
import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";

interface EditableSectionProps {
  sectionKey: string;
  showEdit?: boolean;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * Wraps landing page sections. When showEdit is true (admin logged in),
 * shows an edit icon that links to Admin Landing editor for that section.
 */
export function EditableSection({
  sectionKey,
  showEdit = false,
  children,
  className = "",
  id,
}: EditableSectionProps) {
  return (
    <div id={id} className={`relative group/edit ${className}`}>
      {showEdit && (
        <Link
          to={`/admin/landing#section-${sectionKey}`}
          className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-background/95 border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background shadow-sm transition-colors opacity-70 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent"
          title="Edit in CMS"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          Edit
        </Link>
      )}
      {children}
    </div>
  );
}
