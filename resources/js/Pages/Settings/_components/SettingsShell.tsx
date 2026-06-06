import { ReactNode } from 'react';
import { cn } from "@/lib/utils";

interface SettingsShellProps {
    title?: string;
    description?: string;
    children: ReactNode;
    className?: string;
    headerAction?: ReactNode;
}

export function SettingsShell({
    title,
    description,
    children,
    className,
    headerAction
}: SettingsShellProps) {
    return (
        <div className={cn("max-w-5xl space-y-10", className)}>
            {(title || description) && (
                <div className="flex justify-between items-start border-b border-border/60 pb-6 mb-2">
                    <div className="space-y-1">
                        {title && <h2 className="text-xl font-semibold text-foreground tracking-tight">{title}</h2>}
                        {description && <p className="text-sm text-muted-foreground">{description}</p>}
                    </div>
                    {headerAction && <div>{headerAction}</div>}
                </div>
            )}

            <div className="space-y-10">
                {children}
            </div>
        </div>
    );
}
