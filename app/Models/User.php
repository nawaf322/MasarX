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

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasRoles, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'gender',
        'document_id',
        'document_type',
        'date_of_birth',
        'email',
        'phone',
        'address',
        'address_line2',
        'state',
        'city',
        'country',
        'zip_code',
        'country_id',
        'state_id',
        'city_id',
        'password',
        'google_id',
        'avatar_url',
        'organization_id',
        'language',
        'is_active',
        'last_login_at',
        'branch_id',
        'department_id',
        'must_change_password',
        'two_factor_enabled',
        'last_seen_at',
        'invitation_token',
        'invitation_sent_at',
        'invitation_accepted_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'google_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'date_of_birth' => 'date',
            'password' => 'hashed',
            'last_login_at'          => 'datetime',
            'last_seen_at'           => 'datetime',
            'invitation_sent_at'     => 'datetime',
            'invitation_accepted_at' => 'datetime',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'two_factor_enabled' => 'boolean',
        ];
    }

    public function branch()
    {
        return $this->belongsTo(\App\Models\Branch::class);
    }

    public function department()
    {
        return $this->belongsTo(\App\Models\Department::class);
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function countryRelation()
    {
        return $this->belongsTo(Country::class, 'country_id');
    }

    public function stateRelation()
    {
        return $this->belongsTo(State::class, 'state_id');
    }

    public function cityRelation()
    {
        return $this->belongsTo(City::class, 'city_id');
    }

    public function manifests()
    {
        return $this->hasMany(Manifest::class, 'driver_id');
    }

    public function driverLocations()
    {
        return $this->hasMany(DriverLocation::class, 'driver_id');
    }

    public function latestDriverLocation()
    {
        return $this->hasOne(DriverLocation::class, 'driver_id')->latestOfMany('captured_at');
    }
}
