/**
 * Helpers para formatear fechas, horas y monedas según las configuraciones de locale
 */

interface LocaleSettings {
    date_format?: string;
    time_format?: string;
    timezone?: string;
    currency?: string;
    weight_unit?: string;
    dimension_unit?: string;
}

/**
 * Obtiene las configuraciones de locale desde las props de Inertia
 */
export function getLocaleSettings(): LocaleSettings {
    const props = (window as any).page?.props || {};
    const branding = props.branding || {};
    
    return {
        date_format: branding.date_format || 'd/m/Y',
        time_format: branding.time_format || '24h',
        timezone: branding.timezone || 'UTC',
        currency: branding.currency_code || 'USD',
        weight_unit: branding.weight_unit || 'kg',
        dimension_unit: branding.dimension_unit || 'cm',
    };
}

/**
 * Convierte formato PHP a formato JavaScript para fechas
 */
function phpToJsDateFormat(phpFormat: string): string {
    const mapping: Record<string, string> = {
        'd': '2-digit',      // Day of month (01-31)
        'm': '2-digit',      // Month (01-12)
        'Y': 'numeric',      // Year (4 digits)
        'y': '2-digit',      // Year (2 digits)
        'H': '2-digit',      // Hour 24h (00-23)
        'h': '2-digit',      // Hour 12h (01-12)
        'i': '2-digit',      // Minutes (00-59)
        's': '2-digit',      // Seconds (00-59)
        'A': 'short',        // AM/PM
    };

    // Simple conversion - for more complex formats, we'll use manual formatting
    if (phpFormat === 'd/m/Y') {
        return 'dd/MM/yyyy';
    } else if (phpFormat === 'm/d/Y') {
        return 'MM/dd/yyyy';
    } else if (phpFormat === 'Y-m-d') {
        return 'yyyy-MM-dd';
    }

    return 'dd/MM/yyyy'; // Default
}

/**
 * Formatea una fecha según las configuraciones de locale
 */
export function formatDate(date: string | Date | null | undefined, format?: string): string {
    if (!date) {
        return '';
    }

    try {
        const settings = getLocaleSettings();
        const dateFormat = format || settings.date_format || 'd/m/Y';
        const dateObj = typeof date === 'string' ? new Date(date) : date;

        if (isNaN(dateObj.getTime())) {
            return '';
        }

        // Format according to PHP format string
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();

        if (dateFormat === 'd/m/Y') {
            return `${day}/${month}/${year}`;
        } else if (dateFormat === 'm/d/Y') {
            return `${month}/${day}/${year}`;
        } else if (dateFormat === 'Y-m-d') {
            return `${year}-${month}-${day}`;
        }

        // Fallback
        return `${day}/${month}/${year}`;
    } catch (error) {
        return '';
    }
}

/**
 * Formatea una hora según las configuraciones de locale
 */
export function formatTime(time: string | Date | null | undefined, format?: string): string {
    if (!time) {
        return '';
    }

    try {
        const settings = getLocaleSettings();
        const timeFormat = format || settings.time_format || '24h';
        const dateObj = typeof time === 'string' ? new Date(time) : time;

        if (isNaN(dateObj.getTime())) {
            return '';
        }

        const hours = dateObj.getHours();
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');

        if (format) {
            // Custom format provided
            return dateObj.toLocaleTimeString('en-US', { hour12: format.includes('A') || format.includes('a') });
        }

        if (timeFormat === '12h') {
            const hour12 = hours % 12 || 12;
            const ampm = hours >= 12 ? 'PM' : 'AM';
            return `${String(hour12).padStart(2, '0')}:${minutes} ${ampm}`;
        } else {
            return `${String(hours).padStart(2, '0')}:${minutes}`;
        }
    } catch (error) {
        return '';
    }
}

/**
 * Formatea fecha y hora según las configuraciones de locale
 */
export function formatDateTime(datetime: string | Date | null | undefined): string {
    if (!datetime) {
        return '';
    }

    const date = formatDate(datetime);
    const time = formatTime(datetime);

    if (!date || !time) {
        return '';
    }

    return `${date} ${time}`;
}

/**
 * Formatea una cantidad monetaria según la moneda configurada
 */
export function formatCurrency(amount: number | string | null | undefined, currencyCode?: string): string {
    if (amount === null || amount === undefined || amount === '') {
        return '';
    }

    try {
        const settings = getLocaleSettings();
        const currency = currencyCode || settings.currency || 'USD';
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

        if (isNaN(numAmount)) {
            return '';
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(numAmount);
    } catch (error) {
        return String(amount || '');
    }
}

/** Alias para formatCurrency (uso en Finance Dashboard y otros) */
export const formatCurrencyLocale = formatCurrency;

/**
 * Formatea peso con unidad
 */
export function formatWeight(weight: number | string | null | undefined, unit?: string): string {
    if (weight === null || weight === undefined || weight === '') {
        return '';
    }

    const settings = getLocaleSettings();
    const weightUnit = unit || settings.weight_unit || 'kg';
    const numWeight = typeof weight === 'string' ? parseFloat(weight) : weight;

    if (isNaN(numWeight)) {
        return '';
    }

    return `${numWeight} ${weightUnit}`;
}

/**
 * Formatea dimensiones con unidad
 */
export function formatDimensions(length: number | string | null | undefined, width: number | string | null | undefined, height: number | string | null | undefined, unit?: string): string {
    const settings = getLocaleSettings();
    const dimUnit = unit || settings.dimension_unit || 'cm';

    const l = length !== null && length !== undefined ? String(length) : '0';
    const w = width !== null && width !== undefined ? String(width) : '0';
    const h = height !== null && height !== undefined ? String(height) : '0';

    return `${l}x${w}x${h} ${dimUnit}`;
}
