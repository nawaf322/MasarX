import axios from 'axios';

export interface Country {
    id: number;
    name: string;
    iso2: string;
}

export interface State {
    id: number;
    name: string;
    iso2: string;
}

export interface City {
    id: number;
    name: string;
}

export const LocationsService = {
    getCountries: async (params?: { q?: string; active?: boolean }): Promise<Country[]> => {
        const response = await axios.get('/api/locations/countries', { params: { ...params, per_page: 300 } });
        return response.data.data;
    },

    getStates: async (countryId: number): Promise<State[]> => {
        if (!countryId) return [];
        const response = await axios.get('/api/locations/states', {
            params: { country_id: countryId, per_page: 300 }
        });
        return response.data.data;
    },

    getCities: async (stateId: number, search: string = ''): Promise<City[]> => {
        if (!stateId) return [];
        const response = await axios.get('/api/locations/cities', {
            params: { state_id: stateId, q: search, per_page: 300 }
        });
        return response.data.data;
    },

    createCountry: async (data: Partial<Country>) => {
        const response = await axios.post('/api/locations/countries', data);
        return response.data;
    },

    createState: async (data: { country_id: number; name: string; iso2: string }) => {
        const response = await axios.post('/api/locations/states', data);
        return response.data;
    },

    createCity: async (data: { state_id: number; name: string }) => {
        const response = await axios.post('/api/locations/cities', data);
        return response.data;
    }
};
