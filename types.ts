
import * as d3 from 'd3';

export interface Patient {
  id: string;
  name: string;
  photoUrl?: string;
  commune: string;
  locationDetails?: {
    formattedAddress?: string;
    uri?: string;
    lat?: number;
    lng?: number;
  };
  referrerName: string;
  relationship: string;
  notes: string;
  createdAt: number;
  // Nuevos campos clínicos
  birthDate?: string;
  sex?: 'masculino' | 'femenino' | 'no-especificado';
  diagnosis?: string;
  medications?: string;
  contraceptive?: string;
  lastTreatment?: string;
}

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'patient' | 'referrer' | 'commune';
  photoUrl?: string;
  color?: string;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string;
  target: string;
  value: number;
  relationship?: string;
}
