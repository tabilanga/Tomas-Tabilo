
import React, { useState, useEffect, useCallback } from 'react';
import { Patient } from './types';
import { storageService } from './services/storage';
import { geminiService } from './services/geminiService';
import PatientForm from './components/PatientForm';
import InfinityMap from './components/InfinityMap';
import GeographicMap from './components/GeographicMap';

const App: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [aiInsight, setAiInsight] = useState<string>("Inicia sesión para analizar tu red...");
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'geo'>('map');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  useEffect(() => {
    setPatients(storageService.getPatients());
  }, []);

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleSavePatient = (patient: Patient) => {
    const updated = editingPatient ? storageService.updatePatient(patient) : storageService.savePatient(patient);
    setPatients(updated);
    if (selectedPatient?.id === patient.id) setSelectedPatient(patient);
    setShowForm(false);
    setEditingPatient(null);
  };

  const handleDeletePatient = (id: string) => {
    if (window.confirm("¿Está seguro?")) {
      setPatients(storageService.deletePatient(id));
      setSelectedPatient(null);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden text-slate-900">
      <aside className="w-16 md:w-64 bg-white border-r border-slate-200 flex flex-col z-20 shadow-2xl shadow-indigo-100/20">
        <div className="p-6 flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
            <i className="fa-solid fa-infinity text-2xl"></i>
          </div>
          <span className="hidden md:block font-black text-indigo-950 tracking-tighter text-xl">GeoInfinity</span>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {[{id:'map',icon:'fa-circle-nodes',label:'Infinity Red'},{id:'geo',icon:'fa-earth-americas',label:'Mapa Global'},{id:'list',icon:'fa-address-book',label:'Base Datos'}].map(item => (
            <button key={item.id} onClick={() => setViewMode(item.id as any)} className={`w-full flex items-center space-x-4 p-4 rounded-2xl transition-all ${viewMode === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
              <i className={`fa-solid ${item.icon} text-xl`}></i>
              <span className="hidden md:block font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={() => {setEditingPatient(null); setShowForm(true);}} className="w-full bg-indigo-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-center space-x-3 active:scale-95">
            <i className="fa-solid fa-plus-circle text-lg"></i>
            <span className="hidden md:block font-bold text-sm">Nuevo Registro</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 px-8 flex items-center justify-between z-10">
          <div className="flex-1 flex items-center space-x-4 max-w-2xl bg-slate-50 p-2 rounded-2xl">
            <i className="fa-solid fa-wand-magic-sparkles text-indigo-600 ml-4"></i>
            <p className="text-xs font-semibold text-slate-600 truncate">{aiInsight}</p>
          </div>
        </header>

        <div className="flex-1 relative">
          {viewMode === 'map' && <InfinityMap patients={patients} onSelectPatient={setSelectedPatient} />}
          {viewMode === 'geo' && <GeographicMap patients={patients} onSelectPatient={setSelectedPatient} />}
          {viewMode === 'list' && (
            <div className="p-10 overflow-y-auto h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {patients.map(p => (
                <div key={p.id} onClick={() => setSelectedPatient(p)} className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all cursor-pointer border border-slate-100 flex items-center space-x-5">
                   <div className="w-16 h-16 rounded-2xl bg-slate-50 overflow-hidden">
                      {p.photoUrl && <img src={p.photoUrl} className="w-full h-full object-cover" />}
                   </div>
                   <div>
                      <h3 className="font-bold text-indigo-950">{p.name}</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{p.commune}</p>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedPatient && (
          <div className="absolute top-0 right-0 h-full w-96 bg-white shadow-[-20px_0_40px_rgba(0,0,0,0.05)] z-30 overflow-y-auto animate-in slide-in-from-right duration-500 border-l border-slate-100">
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-start">
                <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                  {selectedPatient.photoUrl ? <img src={selectedPatient.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-200"><i className="fa-solid fa-user text-4xl"></i></div>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {setEditingPatient(selectedPatient); setShowForm(true);}} className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl"><i className="fa-solid fa-pen-nib"></i></button>
                  <button onClick={() => setSelectedPatient(null)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl"><i className="fa-solid fa-xmark"></i></button>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-none">{selectedPatient.name}</h2>
                <p className="text-xs font-bold text-indigo-600 mt-2 uppercase tracking-widest">{selectedPatient.commune}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Edad</p>
                  <p className="text-sm font-black text-slate-800">{calculateAge(selectedPatient.birthDate) || '--'} años</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sexo</p>
                  <p className="text-sm font-black text-slate-800 capitalize">{selectedPatient.sex || '--'}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                   <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                      <i className="fa-solid fa-stethoscope"></i> Antecedentes Médicos
                   </h4>
                   <div className="space-y-4">
                     <div>
                       <p className="text-[9px] font-bold text-slate-400 uppercase">Diagnóstico</p>
                       <p className="text-xs font-medium text-slate-700 leading-relaxed">{selectedPatient.diagnosis || 'No registrado'}</p>
                     </div>
                     <div>
                       <p className="text-[9px] font-bold text-slate-400 uppercase">Medicamentos</p>
                       <p className="text-xs font-medium text-slate-700 leading-relaxed">{selectedPatient.medications || 'No registrado'}</p>
                     </div>
                     {selectedPatient.sex === 'femenino' && (
                       <div>
                         <p className="text-[9px] font-bold text-rose-400 uppercase">Anticonceptivo</p>
                         <p className="text-xs font-medium text-slate-700">{selectedPatient.contraceptive || 'No mencionado'}</p>
                       </div>
                     )}
                   </div>
                </div>

                <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Último Tratamiento</p>
                  <p className="text-xs font-bold text-indigo-950 leading-relaxed">{selectedPatient.lastTreatment || 'Sin indicación reciente'}</p>
                </div>

                <div className="pt-6 border-t border-slate-100">
                   <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-3">Red de Referencia</p>
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs"><i className="fa-solid fa-link"></i></div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{selectedPatient.referrerName}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-black">{selectedPatient.relationship}</p>
                      </div>
                   </div>
                </div>
              </div>

              <button onClick={() => handleDeletePatient(selectedPatient.id)} className="w-full py-4 text-[10px] font-black text-rose-300 hover:text-rose-500 uppercase tracking-widest transition-all">Eliminar Registro</button>
            </div>
          </div>
        )}

        {showForm && <PatientForm onSave={handleSavePatient} onClose={() => setShowForm(false)} initialData={editingPatient} allPatients={patients} />}
      </main>
    </div>
  );
};

export default App;
