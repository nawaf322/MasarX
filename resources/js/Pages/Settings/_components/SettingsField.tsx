import { ReactNode } from 'react';
import { Label } from "@/Components/UI/label";
import { cn } from "@/lib/utils";

interface SettingsFieldProps {
    id?: string;
    label: string;
    required?: boolean;
    error?: string;
    help?: string;
    children: ReactNode;
    className?: string;
}

export function SettingsField({
    id,
    label,
    required,
    error,
    help,
    children,
    className
}: SettingsFieldProps) {
    return (
        <div className={cn("space-y-2", className)}>
            <Label htmlFor={id} className="flex items-center gap-1">
                {label}
                {required && <span className="text-red-500">*</span>}
            </Label>

            <div className={cn("relative", error ? "settings-error" : "")}>
                {children}
            </div>

            {error && (
                <p className="text-sm text-red-500 font-medium mt-1 animate-in slide-in-from-top-1 fade-in duration-200">
                    {error}
                </p>
            )}

            {!error && help && (
                <p className="text-xs text-muted-foreground">{help}</p>
            )}
        </div>
    );
}
