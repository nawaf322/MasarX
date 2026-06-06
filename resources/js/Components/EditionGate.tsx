/**
 * EditionGate — Conditionally renders children based on edition feature availability.
 *
 * Usage:
 *   <EditionGate feature="commissions">
 *     <CommissionsMenu />
 *   </EditionGate>
 *
 *   <EditionGate feature="commissions" fallback={<UpgradeBanner />}>
 *     <CommissionsPage />
 *   </EditionGate>
 *
 *   // Require ALL features:
 *   <EditionGate features={['finance_dashboard', 'ar_ledger']}>...</EditionGate>
 */
import React from 'react';
import { useEdition } from '@/hooks/useEdition';

interface Props {
    /** Single feature key */
    feature?: string;
    /** Multiple feature keys — ALL must be available */
    features?: string[];
    /** Rendered when the feature is NOT available. Defaults to null. */
    fallback?: React.ReactNode;
    children: React.ReactNode;
}

export function EditionGate({ feature, features, fallback = null, children }: Props) {
    const edition = useEdition();

    const allowed = feature
        ? edition.has(feature)
        : features
            ? edition.hasAll(...features)
            : true;

    return <>{allowed ? children : fallback}</>;
}

export default EditionGate;
