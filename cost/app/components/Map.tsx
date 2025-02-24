'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapProps {
  report: {
    weather_start: {
      coord: {
        lat: number;
        lon: number;
      };
      weather: Array<{
        main: string;
      }>;
    };
    weather_end: {
      coord: {
        lat: number;
        lon: number;
      };
      weather: Array<{
        main: string;
      }>;
    };
    routes: Array<{
      legs: Array<{
        points: Array<{
          latitude: number;
          longitude: number;
        }>;
      }>;
      color: string;
    }>;
  };
}

export default function Map({ report }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const startCoords: [number, number] = [report.weather_start.coord.lat, report.weather_start.coord.lon];
    const endCoords: [number, number] = [report.weather_end.coord.lat, report.weather_end.coord.lon];

    mapRef.current = L.map(mapContainerRef.current).setView(startCoords, 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(mapRef.current);

    // Add markers
    L.marker(startCoords).addTo(mapRef.current).bindPopup('Start').openPopup();
    L.marker(endCoords).addTo(mapRef.current).bindPopup('End');

    // Draw routes
    report.routes.forEach((route) => {
      const coordinates = route.legs[0].points.map(point => [point.latitude, point.longitude] as [number, number]);
      L.polyline(coordinates, { color: route.color }).addTo(mapRef.current!);
    });

    // Highlight bad weather areas
    if (report.weather_start.weather[0].main.toLowerCase().includes('rain') || 
        report.weather_start.weather[0].main.toLowerCase().includes('storm')) {
      L.circle(startCoords, { radius: 5000, color: 'red' })
        .addTo(mapRef.current)
        .bindPopup('Bad weather at start');
    }

    if (report.weather_end.weather[0].main.toLowerCase().includes('rain') || 
        report.weather_end.weather[0].main.toLowerCase().includes('storm')) {
      L.circle(endCoords, { radius: 5000, color: 'red' })
        .addTo(mapRef.current)
        .bindPopup('Bad weather at end');
    }

    // Fit bounds to show all markers
    const bounds = L.latLngBounds([startCoords, endCoords]);
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [report]);

  return <div ref={mapContainerRef} className="h-[400px] w-full rounded-lg" />;
}