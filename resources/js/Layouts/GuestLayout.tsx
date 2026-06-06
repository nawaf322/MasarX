import { usePage } from '@inertiajs/react';
import React, { PropsWithChildren } from 'react';

export default function GuestLayout({ children }: PropsWithChildren) {
    const { props } = usePage();
    const branding = (props as any).branding || {};

    const primaryColor = branding.primary_color || '#4F46E5';
    const bgStyle = branding.login_image_url
        ? { backgroundImage: `url(${branding.login_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { backgroundColor: primaryColor };
    const formPosition = branding.login_form_position || 'right'; // left | right | center
    const welcomeText = branding.login_welcome_text || 'Welcome to our professional logistics platform';

    const formPanel = (
        <div className="flex flex-col justify-center items-center p-6 bg-white sm:p-12">
                <div className="w-full max-w-md space-y-8">
                    {children}
                </div>
            </div>
    );

    const visualPanel = (
        <div
            className="hidden lg:flex flex-col justify-center items-center relative overflow-hidden p-10 transition-all duration-500"
            style={bgStyle}
        >
            {!branding.login_image_url && (
                <div className="text-center max-w-sm z-10 p-6">
                    <h2 className="text-3xl font-bold text-white mb-4">{welcomeText}</h2>
                    <p className="text-white/80 text-lg">Log in to manage your shipments</p>
                </div>
            )}
        </div>
    );

    if (formPosition === 'center') {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-white sm:p-12">
                <div className="w-full max-w-md space-y-8">
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {formPosition === 'left' ? (
                <>
                    {formPanel}
                    {visualPanel}
                </>
            ) : (
                <>
                    {visualPanel}
                    {formPanel}
                </>
            )}
        </div>
    );
}
