
import { Patient } from '../types';

const STORAGE_KEY = 'georeferral_patients';

export const storageService = {
  getPatients: (): Patient[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },
  savePatient: (patient: Patient) => {
    const patients = storageService.getPatients();
    const updated = [...patients, patient];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },
  updatePatient: (updatedPatient: Patient) => {
    const patients = storageService.getPatients();
    const updated = patients.map(p => p.id === updatedPatient.id ? updatedPatient : p);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },
  deletePatient: (id: string) => {
    const patients = storageService.getPatients();
    const updated = patients.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }
};
