'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VehicleType, FuelType, FUEL_CONSUMPTION, FUEL_PRICES, MAINTENANCE_COST } from '../constants';
import { toast } from 'react-toastify';
import dynamic from 'next/dynamic';
import { calculateCosts, validateVehicleFuelCombination } from '../utils';
import { MapPin, Truck, Fuel, Navigation, Cloud, IndianRupee } from 'lucide-react';

const Map = dynamic(() => import('./Map'), { ssr: false });

interface WeatherData {
  name: string;
  main: {
    temp: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  coord: {
    lat: number;
    lon: number;
  };
}

interface RouteData {
  summary: {
    lengthInMeters: number;
    travelTimeInSeconds: number;
    trafficDelayInSeconds: number;
  };
  legs: Array<{
    points: Array<{
      latitude: number;
      longitude: number;
    }>;
  }>;
  color: string;
}

interface Report {
  start: string;
  end: string;
  vehicle: string;
  fuel: string;
  distance: number;
  weather_start: WeatherData;
  weather_end: WeatherData;
  routes: RouteData[];
  per_km: {
    fuel: number;
    maintenance: number;
    total: number;
  };
  total: {
    fuel: number;
    maintenance: number;
    total: number;
  };
  time: {
    fastest: { hours: number; minutes: number };
    eco: { hours: number; minutes: number };
  };
  route_comparison: {
    time_diff_minutes: number;
    distance_diff: number;
  };
}

export default function CostCalculator() {
  const [vehicle, setVehicle] = useState<VehicleType>('car');
  const [fuel, setFuel] = useState<FuelType>('petrol');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  const geocodeLocation = async (location: string) => {
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

  const getWeatherData = async (lat: number, lon: number) => {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}&units=metric`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Weather data fetch failed');
    }
    
    return response.json();
  };

  const getRoutes = async (startCoords: string, endCoords: string) => {
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${startCoords}:${endCoords}/json`;
    const routeTypes = [
      { type: 'fastest', color: 'red', params: { routeType: 'fastest', travelMode: 'truck' } },
      { type: 'eco', color: 'green', params: { routeType: 'eco', travelMode: 'truck' } }
    ];

    const routes = await Promise.all(
      routeTypes.map(async (routeType) => {
        const response = await fetch(
          `${url}?key=${process.env.NEXT_PUBLIC_TOMTOM_API_KEY}&traffic=true&${new URLSearchParams(routeType.params)}`
        );
        if (!response.ok) throw new Error(`Route calculation failed for ${routeType.type}`);
        const data = await response.json();
        return { ...data.routes[0], color: routeType.color };
      })
    );

    return routes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!start.trim() || !end.trim()) {
      toast.error('Please enter both start and end locations.');
      return;
    }
  
    setLoading(true);
  
    try {
      validateVehicleFuelCombination(vehicle, fuel);
      toast.info('Calculating route and costs...', { autoClose: 2000 });
  
      const startLocation = await geocodeLocation(start);
      const endLocation = await geocodeLocation(end);
  
      const startCoords = `${startLocation.lat},${startLocation.lon}`;
      const endCoords = `${endLocation.lat},${endLocation.lon}`;
  
      const routes = await getRoutes(startCoords, endCoords);
      const weatherStart = await getWeatherData(startLocation.lat, startLocation.lon);
      const weatherEnd = await getWeatherData(endLocation.lat, endLocation.lon);
  
      const distance = routes[0].summary.lengthInMeters / 1000;
      const costs = calculateCosts(vehicle, fuel, distance);
  
      const timeDiff = routes[1].summary.travelTimeInSeconds - routes[0].summary.travelTimeInSeconds;
      const distanceDiff = (routes[1].summary.lengthInMeters - routes[0].summary.lengthInMeters) / 1000;
  
      setReport({
        start: startLocation.formatted,
        end: endLocation.formatted,
        vehicle,
        fuel,
        distance,
        weather_start: weatherStart,
        weather_end: weatherEnd,
        routes,
        per_km: costs.perKm,
        total: costs.total,
        time: {
          fastest: {
            hours: Math.floor(routes[0].summary.travelTimeInSeconds / 3600),
            minutes: Math.floor((routes[0].summary.travelTimeInSeconds % 3600) / 60)
          },
          eco: {
            hours: Math.floor(routes[1].summary.travelTimeInSeconds / 3600),
            minutes: Math.floor((routes[1].summary.travelTimeInSeconds % 3600) / 60)
          }
        },
        route_comparison: {
          time_diff_minutes: Math.floor(timeDiff / 60),
          distance_diff: Math.round(distanceDiff * 100) / 100
        }
      });
  
      toast.success('Calculation completed successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          🚚 Delivery Cost Calculator
        </h1>
        <p className="text-xl text-gray-600">
          Calculate delivery costs with real-time weather and route information
        </p>
      </div>

      {/* Animated Form Card */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="p-8 shadow-xl bg-white/80 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-gray-600" />
                  <Label htmlFor="vehicle" className="text-lg">Vehicle Type</Label>
                </div>
                <Select value={vehicle} onValueChange={(value: VehicleType) => setVehicle(value)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Fuel className="w-5 h-5 text-gray-600" />
                  <Label htmlFor="fuel" className="text-lg">Fuel Type</Label>
                </div>
                <Select value={fuel} onValueChange={(value: FuelType) => setFuel(value)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select fuel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="petrol">Petrol</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="cng">CNG</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-600" />
                  <Label htmlFor="start" className="text-lg">Start Location</Label>
                </div>
                <Input
                  id="start"
                  className="h-12"
                  placeholder="Enter city name (e.g., Delhi)"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-gray-600" />
                  <Label htmlFor="end" className="text-lg">End Location</Label>
                </div>
                <Input
                  id="end"
                  className="h-12"
                  placeholder="Enter city name (e.g., Mumbai)"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-center mt-8">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="h-12 px-8 text-lg bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Calculating...' : 'Calculate Cost'}
                </Button>
              </motion.div>
            </div>
          </form>
        </Card>
      </motion.div>

      {report && (
        // Animated Report Section
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="mt-12 space-y-8">
            <Card className="p-8 bg-white/80 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-3xl font-bold text-gray-900">Delivery Cost Report</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold">Start:</span>
                    <span>{report.start}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold">End:</span>
                    <span>{report.end}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold">Vehicle:</span>
                    <span>{report.vehicle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Fuel className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold">Fuel:</span>
                    <span>{report.fuel}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-green-600" />
                    <span className="font-semibold">Total Cost:</span>
                    <span className="text-xl font-bold text-green-600">₹{report.total.total.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold">Weather Conditions:</span>
                    <span>{report.weather_start.weather[0].description} at start, {report.weather_end.weather[0].description} at end</span>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="p-8 bg-white/80 backdrop-blur-sm">
                <h3 className="text-2xl font-bold mb-6">Route Options</h3>
                <div className="space-y-6">
                  <div className="p-4 border rounded-lg bg-red-50">
                    <div className="font-semibold text-lg mb-2">Fastest Route</div>
                    <div className="space-y-2">
                      <p>Distance: {Math.round(report.routes[0].summary.lengthInMeters / 1000)} km</p>
                      <p>Time: {report.time.fastest.hours}h {report.time.fastest.minutes}m</p>
                      <p>Traffic Delay: {Math.round(report.routes[0].summary.trafficDelayInSeconds / 60)}m</p>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg bg-green-50">
                    <div className="font-semibold text-lg mb-2">Eco Route</div>
                    <div className="space-y-2">
                      <p>Distance: {Math.round(report.routes[1].summary.lengthInMeters / 1000)} km</p>
                      <p>Time: {report.time.eco.hours}h {report.time.eco.minutes}m</p>
                      <p>Traffic Delay: {Math.round(report.routes[1].summary.trafficDelayInSeconds / 60)}m</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-8 bg-white/80 backdrop-blur-sm">
                <h3 className="text-2xl font-bold mb-6">Cost Breakdown</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Per Kilometer</h4>
                      <p>Fuel: ₹{report.per_km.fuel}</p>
                      <p>Maintenance: ₹{report.per_km.maintenance}</p>
                      <p className="font-bold mt-2">Total: ₹{report.per_km.total}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Total Journey</h4>
                      <p>Fuel: ₹{report.total.fuel}</p>
                      <p>Maintenance: ₹{report.total.maintenance}</p>
                      <p className="font-bold mt-2">Total: ₹{report.total.total}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-8 bg-white/80 backdrop-blur-sm">
              <h3 className="text-2xl font-bold mb-6">Weather Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-4">Start Location ({report.weather_start.name})</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <img 
                        src={`http://openweathermap.org/img/w/${report.weather_start.weather[0].icon}.png`}
                        alt="Weather icon"
                        className="w-8 h-8"
                      />
                      <p>{report.weather_start.weather[0].description}</p>
                    </div>
                    <p>Temperature: {report.weather_start.main.temp}°C</p>
                    <p>Humidity: {report.weather_start.main.humidity}%</p>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-4">End Location ({report.weather_end.name})</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <img 
                        src={`http://openweathermap.org/img/w/${report.weather_end.weather[0].icon}.png`}
                        alt="Weather icon"
                        className="w-8 h-8"
                      />
                      <p>{report.weather_end.weather[0].description}</p>
                    </div>
                    <p>Temperature: {report.weather_end.main.temp}°C</p>
                    <p>Humidity: {report.weather_end.main.humidity}%</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white/80 backdrop-blur-sm">
              <h3 className="text-2xl font-bold mb-6">Route Map</h3>
              <Map report={report} />
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  );
}
