import { FUEL_CONSUMPTION, FUEL_PRICES, MAINTENANCE_COST } from './constants';
import type { VehicleType, FuelType } from './constants';

export const validateVehicleFuelCombination = (vehicle: VehicleType, fuel: FuelType) => {
  if (!FUEL_CONSUMPTION[vehicle][fuel]) {
    const availableFuels = Object.keys(FUEL_CONSUMPTION[vehicle]).join(', ');
    throw new Error(`Invalid fuel type for ${vehicle}. Available options: ${availableFuels}`);
  }
};

export const calculateCosts = (vehicle: VehicleType, fuel: FuelType, distance: number) => {
  const fuelConsumption = FUEL_CONSUMPTION[vehicle][fuel];
  const fuelPrice = FUEL_PRICES[fuel];
  
  const fuelCostKm = fuelConsumption * fuelPrice;
  const maintenanceCostKm = MAINTENANCE_COST[vehicle];
  
  return {
    perKm: {
      fuel: Number(fuelCostKm.toFixed(2)),
      maintenance: maintenanceCostKm,
      total: Number((fuelCostKm + maintenanceCostKm).toFixed(2))
    },
    total: {
      fuel: Number((fuelCostKm * distance).toFixed(2)),
      maintenance: Number((maintenanceCostKm * distance).toFixed(2)),
      total: Number(((fuelCostKm + maintenanceCostKm) * distance).toFixed(2))
    }
  };
};

export const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return {
    hours,
    minutes: minutes % 60
  };
};

export const geocodeLocation = async (location: string) => {
  const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(location)}.json`;
  const response = await fetch(`${url}?key=${process.env.NEXT_PUBLIC_TOMTOM_API_KEY}&limit=1`);
  
  if (!response.ok) {
    throw new Error('Geocoding failed');
  }
  
  const data = await response.json();
  if (!data.results?.length) {
    throw new Error(`No results found for location: ${location}`);
  }
  
  const result = data.results[0];
  return {
    lat: result.position.lat,
    lon: result.position.lon,
    formatted: result.address.freeformAddress
  };
};

export const getWeatherData = async (lat: number, lon: number) => {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}&units=metric`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Weather data fetch failed');
  }
  
  return response.json();
};

export const getRoutes = async (start: string, end: string) => {
  const url = `https://api.tomtom.com/routing/1/calculateRoute/${start}:${end}/json`;
  const response = await fetch(`${url}?key=${process.env.NEXT_PUBLIC_TOMTOM_API_KEY}&traffic=true&routeType=fastest&travelMode=truck`);
  
  if (!response.ok) {
    throw new Error('Route calculation failed');
  }
  
  return response.json();
};