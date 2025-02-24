export const FUEL_PRICES = {
  petrol: 100.8,
  diesel: 92.39,
  cng: 90.5,
} as const;

export const FUEL_CONSUMPTION = {
  truck: { diesel: 0.35, cng: 0.4, petrol: 0.3 },
  van: { diesel: 0.2, petrol: 0.25, cng: 0.25 },
  car: { petrol: 0.1, diesel: 0.08, cng: 0.12 },
} as const;

export const MAINTENANCE_COST = {
  truck: 5.0,
  van: 3.0,
  car: 2.0,
} as const;

export type VehicleType = keyof typeof FUEL_CONSUMPTION;
export type FuelType = keyof typeof FUEL_PRICES;