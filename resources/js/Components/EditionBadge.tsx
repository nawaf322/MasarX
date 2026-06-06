/**
 * EditionBadge — Small pill showing the current SaaS edition.
 * Renders "PLUS" (indigo), "PREMIUM" (violet) or "ENVATO" (amber) badge.
 */
import React from 'react';
import { useEdition } from '@/hooks/useEdition';

interface Props {
    className?: string;
}

export function EditionBadge({ className = '' }: Props) {
    const { current } = useEdition();

    const upper = current.toUpperCase();

    const colorClass =
        upper === 'PREMIUM'
            ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300'
            : upper === 'PLUS'
            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';

    return (
        <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${colorClass} ${className}`}
            title={`Deprixa ${current} edition`}
        >
            {upper}
        </span>
    );
}

export default EditionBadge;
