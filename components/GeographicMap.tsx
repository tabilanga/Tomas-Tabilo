
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Patient } from '../types';

interface GeographicMapProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
}

const GeographicMap: React.FC<GeographicMapProps> = ({ patients, onSelectPatient }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerId = "geo-map-container";
  const mapInitialized = useRef(false);

  useEffect(() => {
    if (!mapInitialized.current) {
      const initialCenter: [number, number] = [-33.4489, -70.6693]; // Santiago de Chile por defecto
      
      const mapInstance = L.map(containerId, {
        zoomControl: false,
        attributionControl: false
      }).setView(initialCenter, 4);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapInstance);

      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);
      
      mapRef.current = mapInstance;
      mapInitialized.current = true;
    }

    const map = mapRef.current;
    if (!map) return;
    
    // Limpiar marcadores
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    const validPatients = patients.filter(p => p.locationDetails?.lat && p.locationDetails?.lng);
    
    validPatients.forEach(p => {
      const lat = p.locationDetails!.lat!;
      const lng = p.locationDetails!.lng!;

      const icon = L.divIcon({
        className: 'custom-marker',
        html: p.photoUrl 
          ? `<img src="${p.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.innerHTML='<div style=\'width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#cbd5e1;\'><i class=\'fa-solid fa-user text-xs text-white\'></i></div>'">`
          : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#cbd5e1;"><i class="fa-solid fa-user text-xs text-white"></i></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);
      
      marker.on('click', () => onSelectPatient(p));

      marker.bindTooltip(`
        <div class="p-2 font-sans">
          <p class="font-bold text-indigo-900">${p.name}</p>
          <p class="text-[10px] text-slate-500 uppercase font-black">${p.commune}</p>
        </div>
      `, {
        direction: 'top',
        offset: [0, -18],
        className: 'border-none shadow-xl rounded-lg'
      });
    });

    if (validPatients.length > 0) {
      const bounds = L.latLngBounds(validPatients.map(p => [p.locationDetails!.lat!, p.locationDetails!.lng!]));
      map.fitBounds(bounds, { padding: [100, 100] });
    }

  }, [patients, onSelectPatient]);

  return (
    <div className="w-full h-full relative">
      <div id={containerId} className="w-full h-full z-0" />
      
      {patients.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white text-center max-w-sm pointer-events-auto animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-earth-americas text-4xl text-indigo-600 animate-float"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Mapa Geográfico Vacío</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Registra un paciente y su comuna para visualizarlos en el mapa mundial. Usamos IA para geolocalizar cada entrada.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeographicMap;
