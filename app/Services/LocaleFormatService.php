<?php
// *************************************************************************
// *                                                                       *
// * DEPRIXA PLUS - The All-in-One Courier  & Logistics Platform           *
// * Copyright (c) CODDINGPRO. All Rights Reserved                         *
// *                                                                       *
// *************************************************************************
// *                                                                       *
// * Email: soporte@coddingpro.com                                         *
// * Website: https://code-market.shop                                     *
// *                                                                       *
// *************************************************************************
// *                                                                       *
// * This software is furnished under a license and may be used and copied *
// * only  in  accordance  with  the  terms  of such  license and with the *
// * inclusion of the above copyright notice.                              *
// * If you Purchased from Codecanyon, Please read the full License from   *
// * here- http://codecanyon.net/licenses/standard                         *
// *                                                                       *
// *************************************************************************

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class LocaleFormatService
{
    protected SettingsService $settings;

    public function __construct(SettingsService $settings)
    {
        $this->settings = $settings;
        
        // Set organization context if user is authenticated
        if (Auth::check() && Auth::user()->organization_id) {
            $this->settings->forOrganization(Auth::user()->organization_id);
        }
    }

    /**
     * Set organization context manually.
     */
    public function forOrganization(int $id): self
    {
        $this->settings->forOrganization($id);
        return $this;
    }

    /**
     * Get locale settings with defaults.
     */
    protected function getLocaleSettings(): array
    {
        return [
            'timezone' => $this->settings->get('locale', 'timezone', 'UTC'),
            'date_format' => $this->settings->get('locale', 'date_format', 'd/m/Y'),
            'time_format' => $this->settings->get('locale', 'time_format', '24h'),
        ];
    }

    /**
     * Format a date according to locale settings.
     *
     * @param string|Carbon|\DateTime|null $date
     * @param string|null $format Optional format override
     * @return string
     */
    public function formatDate($date, ?string $format = null): string
    {
        if (!$date) {
            return '';
        }

        $settings = $this->getLocaleSettings();
        $timezone = $settings['timezone'];
        $dateFormat = $format ?? $settings['date_format'];

        try {
            // Convert to Carbon if needed
            if (is_string($date)) {
                $carbon = Carbon::parse($date);
            } elseif ($date instanceof Carbon) {
                $carbon = $date;
            } elseif ($date instanceof \DateTime) {
                $carbon = Carbon::instance($date);
            } else {
                return '';
            }

            // Set timezone
            $carbon->setTimezone($timezone);

            // Format according to locale format
            return $carbon->format($dateFormat);
        } catch (\Exception $e) {
            // Fallback to default format if parsing fails
            try {
                $carbon = Carbon::parse($date);
                return $carbon->format('Y-m-d');
            } catch (\Exception $e2) {
                return '';
            }
        }
    }

    /**
     * Format a time according to locale settings.
     *
     * @param string|Carbon|\DateTime|null $time
     * @param string|null $format Optional format override
     * @return string
     */
    public function formatTime($time, ?string $format = null): string
    {
        if (!$time) {
            return '';
        }

        $settings = $this->getLocaleSettings();
        $timezone = $settings['timezone'];
        $timeFormat = $settings['time_format'];

        try {
            // Convert to Carbon if needed
            if (is_string($time)) {
                $carbon = Carbon::parse($time);
            } elseif ($time instanceof Carbon) {
                $carbon = $time;
            } elseif ($time instanceof \DateTime) {
                $carbon = Carbon::instance($time);
            } else {
                return '';
            }

            // Set timezone
            $carbon->setTimezone($timezone);

            // Format according to locale format
            if ($format) {
                return $carbon->format($format);
            }

            // Use locale time format setting
            if ($timeFormat === '12h') {
                return $carbon->format('h:i A'); // 01:00 PM
            } else {
                return $carbon->format('H:i'); // 13:00
            }
        } catch (\Exception $e) {
            // Fallback to default format if parsing fails
            try {
                $carbon = Carbon::parse($time);
                return $carbon->format('H:i');
            } catch (\Exception $e2) {
                return '';
            }
        }
    }

    /**
     * Format a datetime according to locale settings.
     *
     * @param string|Carbon|\DateTime|null $datetime
     * @return string
     */
    public function formatDateTime($datetime): string
    {
        if (!$datetime) {
            return '';
        }

        $date = $this->formatDate($datetime);
        $time = $this->formatTime($datetime);

        if (!$date || !$time) {
            return '';
        }

        return "{$date} {$time}";
    }

    /**
     * Get timezone for current organization.
     */
    public function getTimezone(): string
    {
        return $this->getLocaleSettings()['timezone'];
    }

    /**
     * Convert a date to organization timezone.
     *
     * @param string|Carbon|\DateTime|null $date
     * @return Carbon|null
     */
    public function toOrganizationTimezone($date): ?Carbon
    {
        if (!$date) {
            return null;
        }

        try {
            if (is_string($date)) {
                $carbon = Carbon::parse($date);
            } elseif ($date instanceof Carbon) {
                $carbon = $date;
            } elseif ($date instanceof \DateTime) {
                $carbon = Carbon::instance($date);
            } else {
                return null;
            }

            $timezone = $this->getTimezone();
            return $carbon->setTimezone($timezone);
        } catch (\Exception $e) {
            return null;
        }
    }
}
