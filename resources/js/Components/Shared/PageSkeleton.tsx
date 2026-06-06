import React from 'react';
import { cn } from '@/lib/utils';

/** Variantes por módulo: cada una tiene estructura y estilo propio. */
export type SkeletonVariant =
    | 'dashboard'
    | 'list'      // listados: shipments, customers, billing, warehouse, dispatch, rates, locations, api-tokens
    | 'tracking'  // tracking: búsqueda + resultados tipo tarjetas
    | 'settings' // configuración: secciones con campos
    | 'form';    // formularios: create, edit

interface SkeletonProps {
    className?: string;
    /** Opcional: estilo más suave o más marcado por variante */
    subtle?: boolean;
}

const Skeleton = ({ className, subtle }: SkeletonProps) => (
    <div
        className={cn(
            "animate-pulse rounded",
            subtle ? "bg-muted/70" : "bg-muted",
            className
        )}
        role="status"
        aria-label="Loading"
    />
);

interface PageSkeletonProps {
    variant?: SkeletonVariant;
    className?: string;
}

export function PageSkeleton({ variant = 'dashboard', className }: PageSkeletonProps) {
    switch (variant) {
        case 'dashboard':
            return <DashboardSkeleton className={className} />;
        case 'list':
            return <ListSkeleton className={className} />;
        case 'tracking':
            return <TrackingSkeleton className={className} />;
        case 'settings':
            return <SettingsSkeleton className={className} />;
        case 'form':
            return <FormSkeleton className={className} />;
        default:
            return <DashboardSkeleton className={className} />;
    }
}

function DashboardSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("space-y-6", className)} data-skeleton="dashboard">
            {/* Header */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-6 border rounded-lg space-y-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                ))}
            </div>

            {/* Chart/Graph Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-6 border rounded-lg space-y-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-64 w-full" />
                </div>
                <div className="space-y-4">
                    <div className="p-6 border rounded-lg space-y-3">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                    <div className="p-6 border rounded-lg space-y-3">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg p-6 space-y-4">
                <Skeleton className="h-6 w-48" />
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            </div>
        </div>
    );
}

/** Listados: shipments, customers, billing, warehouse, dispatch, rates, locations, api-tokens. Tabla con header y filtros. */
function ListSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("space-y-3", className)} data-skeleton="list">
            <div className="flex justify-between items-center gap-4">
                <Skeleton className="h-8 w-40" />
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-24" />
                </div>
            </div>
            <div className="flex gap-3 flex-wrap">
                <Skeleton className="h-9 flex-1 min-w-[200px] max-w-sm rounded-md" />
                <Skeleton className="h-9 w-28 rounded-md" />
                <Skeleton className="h-9 w-36 rounded-md" />
            </div>
            <div className="border border-border/60 rounded-xl overflow-hidden shadow-sm">
                <div className="p-3 grid grid-cols-5 gap-3 border-b bg-muted/30">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-4 w-full rounded" />
                    ))}
                </div>
                <div className="divide-y divide-border/60">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="p-3 grid grid-cols-5 gap-3">
                            {[1, 2, 3, 4, 5].map((j) => (
                                <Skeleton key={j} className="h-4 w-full rounded" />
                            ))}
                        </div>
                    ))}
                </div>
                <div className="flex justify-between items-center px-3 py-2 border-t bg-muted/20">
                    <Skeleton className="h-4 w-36 rounded" />
                    <div className="flex gap-1">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Tracking: búsqueda prominente + resultados tipo tarjetas/timeline. */
function TrackingSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("space-y-4", className)} data-skeleton="tracking">
            <div className="space-y-2">
                <Skeleton className="h-7 w-48 rounded" />
                <Skeleton className="h-4 w-72 rounded" />
            </div>
            <div className="flex gap-3 flex-wrap">
                <Skeleton className="h-11 flex-1 min-w-[240px] max-w-md rounded-lg" />
                <Skeleton className="h-11 w-32 rounded-lg" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="border border-border/60 rounded-xl p-4 space-y-3 shadow-sm">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                            <div className="flex-1 space-y-1">
                                <Skeleton className="h-4 w-28 rounded" />
                                <Skeleton className="h-3 w-20 rounded" />
                            </div>
                        </div>
                        <Skeleton className="h-3 w-full rounded" />
                        <Skeleton className="h-3 w-4/5 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function FormSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("space-y-6", className)} data-skeleton="form">
            {/* Header */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
            </div>

            {/* Form Sections */}
            <div className="space-y-8">
                {[1, 2, 3].map((section) => (
                    <div key={section} className="border rounded-lg p-6 space-y-6">
                        <Skeleton className="h-6 w-48" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[1, 2, 3, 4].map((field) => (
                                <div key={field} className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-32" />
            </div>
        </div>
    );
}

function SettingsSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("space-y-8", className)} data-skeleton="settings">
            {/* Header */}
            <div className="border-b pb-6 space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
            </div>

            {/* Settings Sections */}
            {[1, 2, 3].map((section) => (
                <div key={section} className="border rounded-lg p-6 space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-80" />
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3].map((field) => (
                            <div key={field} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-48" />
                                </div>
                                <Skeleton className="h-6 w-12" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Save Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t p-4 flex justify-end gap-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-32" />
            </div>
        </div>
    );
}

export default PageSkeleton;
