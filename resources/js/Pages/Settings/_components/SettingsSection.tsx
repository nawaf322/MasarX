import { ReactNode } from 'react';
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
    fullWidth?: boolean;
}

export function SettingsSection({
    title,
    description,
    children,
    className,
    fullWidth = false
}: SettingsSectionProps) {
    return (
        <div className={cn("space-y-5", className, fullWidth && "col-span-full")}>
            <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground tracking-tight">
                    {title}
                </h3>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>

            {fullWidth ? (
                <div className="w-full">
                    {children}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {children}
                </div>
            )}

            <div className="border-t border-border/60 pt-1" aria-hidden />
        </div>
    );
}
