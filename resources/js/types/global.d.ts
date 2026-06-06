import { PageProps as InertiaPageProps } from '@inertiajs/core';
import { AxiosInstance } from 'axios';
import ziggyRoute, { Config as ZiggyConfig } from 'ziggy-js';

declare global {
    interface Window {
        axios: AxiosInstance;
    }

    var route: typeof ziggyRoute;
    var Ziggy: ZiggyConfig;
}

declare module '@inertiajs/core' {
    interface PageProps extends InertiaPageProps, AppPageProps { }
}

interface AppPageProps {
    auth: {
        user: {
            id: number;
            name: string;
            email: string;
            avatar_url?: string;
            organization_id?: number;
        };
    };
    ziggy: ZiggyConfig & { location: string };
    [key: string]: unknown;
}
