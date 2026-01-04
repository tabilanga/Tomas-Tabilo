
import React, { useState, useRef, useEffect } from 'react';
import { Patient } from '../types';
import { geminiService } from '../services/geminiService';

declare const gapi: any;
declare const google: any;

interface PatientFormProps {
  onSave: (patient: Patient) => void;
  onClose: () => void;
  initialData?: Patient | null;
  allPatients: Patient[];
}

const PatientForm: React.FC<PatientFormProps> = ({ onSave, onClose, initialData, allPatients }) => {
  const [formData, setFormData] = useState({
    name: '',
    commune: '',
    referrerName: '',
    relationship: '',
    notes: '',
    birthDate: '',
    sex: '' as any,
    diagnosis: '',
    medications: '',
    contraceptive: '',
    lastTreatment: '',
  });
  
  const [locationDetails, setLocationDetails] = useState<any>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoInputMethod, setPhotoInputMethod] = useState<'upload' | 'google'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzingPDF, setIsAnalyzingPDF] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  // Google API Settings
  const [googleConfig, setGoogleConfig] = useState({
    clientId: localStorage.getItem('g_client_id') || '',
    apiKey: localStorage.getItem('g_api_key') || '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const accessToken = useRef<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        commune: initialData.commune,
        referrerName: initialData.referrerName,
        relationship: initialData.relationship,
        notes: initialData.notes,
        birthDate: initialData.birthDate || '',
        sex: initialData.sex || '',
        diagnosis: initialData.diagnosis || '',
        medications: initialData.medications || '',
        contraceptive: initialData.contraceptive || '',
        lastTreatment: initialData.lastTreatment || '',
      } as any);
      
      if (initialData.photoUrl) {
        setPhoto(initialData.photoUrl);
      }
    }
  }, [initialData]);

  const initGooglePicker = async () => {
    if (!googleConfig.clientId || !googleConfig.apiKey) {
      setShowConfig(true);
      alert("Por favor, configura tus credenciales de Google primero.");
      return;
    }

    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: googleConfig.clientId,
        scope: 'https://www.googleapis.com/auth/photoslibrary.readonly',
        callback: async (response: any) => {
          if (response.error !== undefined) throw response;
          accessToken.current = response.access_token;
          createPicker();
        },
      });

      if (accessToken.current === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        createPicker();
      }
    } catch (err) {
      console.error('Error initializing Google Picker:', err);
      alert('Error de conexión. Revisa que tu Client ID sea correcto y que hayas habilitado la API de Google Picker.');
    }
  };

  const createPicker = () => {
    gapi.load('picker', () => {
      const view = new google.picker.PhotoGridView();
      const picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .setAppId(googleConfig.clientId)
        .setOAuthToken(accessToken.current)
        .addView(view)
        .setDeveloperKey(googleConfig.apiKey)
        .setCallback(pickerCallback)
        .build();
      picker.setVisible(true);
    });
  };

  const pickerCallback = (data: any) => {
    if (data.action === google.picker.Action.PICKED) {
      const doc = data.docs[0];
      setPhoto(doc.url);
      setPhotoInputMethod('google');
    }
  };

  const saveGoogleConfig = () => {
    localStorage.setItem('g_client_id', googleConfig.clientId);
    localStorage.setItem('g_api_key', googleConfig.apiKey);
    setShowConfig(false);
  };

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setIsAnalyzingPDF(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const data = await geminiService.analyzeMedicalPDF(base64);
        if (data) {
          setFormData(prev => ({
            ...prev,
            name: data.name || prev.name,
            birthDate: data.birthDate || prev.birthDate,
            sex: data.sex || prev.sex,
            diagnosis: data.diagnosis || prev.diagnosis,
            medications: data.medications || prev.medications,
            contraceptive: data.contraceptive || prev.contraceptive,
            lastTreatment: data.lastTreatment || prev.lastTreatment,
          }));
        }
        setIsAnalyzingPDF(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const processPhotoFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
        setPhotoInputMethod('upload');
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processPhotoFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient: Patient = {
      ...formData,
      id: initialData ? initialData.id : crypto.randomUUID(),
      photoUrl: photo || undefined,
      createdAt: initialData ? initialData.createdAt : Date.now(),
    } as any;
    onSave(patient);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col my-auto animate-in zoom-in duration-300 relative">
        
        {/* Botones de acción superior */}
        <div className="absolute top-8 right-8 flex items-center gap-3 z-20">
          <button 
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${showHelp ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-300 hover:text-orange-500'}`}
          >
            <i className="fa-solid fa-question text-sm"></i>
          </button>
          <button 
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${showConfig ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-300 hover:text-indigo-600'}`}
          >
            <i className="fa-solid fa-gear text-sm"></i>
          </button>
          <button onClick={onClose} className="w-10 h-10 bg-slate-50 hover:bg-rose-50 hover:text-rose-500 rounded-full transition-all text-slate-400">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="p-8 border-b border-slate-50 flex flex-col bg-white">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            {initialData ? 'Actualizar Registro' : 'Nueva Ficha Clínica Inteligente'}
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Uso Personal • Conexión GeoTopográfica</p>
        </div>

        {/* Panel de Ayuda Paso a Paso */}
        {showHelp && (
          <div className="bg-orange-50 p-8 border-b border-orange-100 animate-in slide-in-from-top duration-300">
            <h3 className="text-orange-900 font-black flex items-center gap-2 mb-4">
              <i className="fa-solid fa-lightbulb"></i> ¿Cómo conectar con Google Photos?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">1</div>
                <p className="text-xs text-orange-800 leading-relaxed font-medium">Ve a <b>Google Cloud Console</b> y crea un proyecto.</p>
              </div>
              <div className="space-y-2">
                <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">2</div>
                <p className="text-xs text-orange-800 leading-relaxed font-medium">Habilita las APIs: <b>Google Picker API</b> y <b>Photos Library API</b>.</p>
              </div>
              <div className="space-y-2">
                <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">3</div>
                <p className="text-xs text-orange-800 leading-relaxed font-medium">En "Credenciales", crea una <b>Clave de API</b> y un <b>ID de cliente OAuth</b>.</p>
              </div>
            </div>
            <p className="text-[10px] text-orange-600 mt-4 italic font-bold">Nota: Debes autorizar el dominio de esta app en los ajustes de OAuth de Google.</p>
          </div>
        )}

        {/* Panel de Configuración de Credenciales */}
        {showConfig && (
          <div className="bg-indigo-900 p-8 text-white animate-in slide-in-from-top duration-300 shadow-inner">
            <h3 className="text-lg font-black mb-4 flex items-center gap-2">
              <i className="fa-brands fa-google"></i> Credenciales de Acceso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-indigo-300 uppercase ml-2">Client ID</label>
                <input 
                  type="text" 
                  placeholder="000000000-xxxxx.apps.googleusercontent.com" 
                  className="w-full bg-indigo-800/50 border border-indigo-700 p-4 rounded-2xl text-xs outline-none focus:border-white transition-all placeholder:text-indigo-400"
                  value={googleConfig.clientId}
                  onChange={e => setGoogleConfig({...googleConfig, clientId: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-indigo-300 uppercase ml-2">API Key</label>
                <input 
                  type="password" 
                  placeholder="AIzaSyXXXXXXXXXXXXXXXXXX" 
                  className="w-full bg-indigo-800/50 border border-indigo-700 p-4 rounded-2xl text-xs outline-none focus:border-white transition-all placeholder:text-indigo-400"
                  value={googleConfig.apiKey}
                  onChange={e => setGoogleConfig({...googleConfig, apiKey: e.target.value})}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
               <button onClick={() => setShowConfig(false)} className="px-6 py-3 text-xs font-bold uppercase text-indigo-300">Cerrar</button>
               <button onClick={saveGoogleConfig} className="bg-white text-indigo-900 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl">Guardar Cambios</button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-10 space-y-10 overflow-y-auto max-h-[75vh] grid grid-cols-1 lg:grid-cols-2 gap-x-12">
          
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificación Visual del Paciente</label>
              <div 
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) processPhotoFile(file); }}
                className={`flex flex-col md:flex-row items-center gap-8 p-8 rounded-[40px] border transition-all duration-300 ${
                  isDragging ? 'bg-indigo-50 border-indigo-400 scale-[1.02] border-dashed ring-8 ring-indigo-500/10' : 'bg-slate-50 border-slate-100'
                }`}
              >
                <div className="relative group">
                  <div className="w-28 h-28 rounded-[36px] bg-white shadow-2xl flex items-center justify-center overflow-hidden border border-slate-100 relative">
                    {photo ? (
                      <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <i className="fa-solid fa-user-doctor text-4xl text-slate-200"></i>
                        <span className="text-[8px] text-slate-300 font-bold uppercase">Sin Foto</span>
                      </div>
                    )}
                    {photo && (
                       <button type="button" onClick={() => setPhoto(null)} className="absolute inset-0 bg-rose-500/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <i className="fa-solid fa-trash"></i>
                       </button>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 space-y-4 w-full">
                  <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()} 
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${photoInputMethod === 'upload' && photo ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      <i className="fa-solid fa-cloud-arrow-up"></i>
                      Local
                    </button>
                    <button 
                      type="button" 
                      onClick={initGooglePicker}
                      className={`flex-[1.5] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all ${googleConfig.clientId ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                      <img src="https://www.gstatic.com/images/branding/product/1x/photos_64dp.png" className="w-4 h-4" alt="GPhotos" />
                      Google Photos
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-400 text-center font-bold tracking-tight italic">
                    {!googleConfig.clientId ? 'Pulsa el engranaje ⚙️ para conectar con Google Photos' : 'Accede a tu biblioteca personal de Google.'}
                  </p>
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handlePhotoFileChange} accept="image/*" className="hidden" />
            </div>

            <div className="p-8 bg-indigo-50/50 rounded-[40px] border border-indigo-100 border-dashed relative overflow-hidden group hover:bg-indigo-50 transition-all cursor-pointer shadow-sm">
               {isAnalyzingPDF && (
                 <div className="absolute inset-0 bg-indigo-600/95 flex flex-col items-center justify-center text-white z-10 animate-in fade-in">
                    <i className="fa-solid fa-brain text-5xl animate-pulse mb-4"></i>
                    <p className="font-bold text-sm tracking-widest uppercase">IA Analizando Documento...</p>
                 </div>
               )}
               <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 block">Asistente de Análisis Médico</label>
               <div onClick={() => pdfInputRef.current?.click()} className="flex flex-col items-center justify-center space-y-3 py-4">
                 <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-file-pdf text-3xl text-indigo-600"></i>
                 </div>
                 <div className="text-center">
                   <p className="text-sm font-black text-indigo-950">Subir Resumen PDF</p>
                   <p className="text-[10px] text-indigo-400 font-medium italic">Extrae diagnóstico y medicamentos con un clic.</p>
                 </div>
               </div>
               <input type="file" ref={pdfInputRef} accept=".pdf" className="hidden" onChange={handlePDFUpload} />
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                <input
                  required
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-50 rounded-[28px] font-bold text-slate-900 text-xl focus:bg-white focus:border-indigo-100 transition-all outline-none shadow-inner"
                  placeholder="Ej: María José García"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">F. Nacimiento</label>
                  <input
                    type="date"
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-50 rounded-[24px] font-bold text-slate-700 outline-none"
                    value={formData.birthDate}
                    onChange={e => setFormData({...formData, birthDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sexo Biológico</label>
                  <select
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-50 rounded-[24px] font-bold text-slate-700 outline-none appearance-none"
                    value={formData.sex}
                    onChange={e => setFormData({...formData, sex: e.target.value as any})}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="no-especificado">No especificado</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8 flex flex-col justify-between">
            <div className="p-10 bg-slate-50 rounded-[48px] space-y-8 border border-slate-100/50">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                   <i className="fa-solid fa-stethoscope"></i> Antecedentes Clínicos
                </label>
                <textarea
                  rows={2}
                  className="w-full px-8 py-5 bg-white border border-slate-100 rounded-[28px] font-medium text-slate-700 resize-none outline-none focus:ring-4 focus:ring-indigo-500/5 shadow-sm placeholder:text-slate-300"
                  placeholder="Diagnóstico principal..."
                  value={formData.diagnosis}
                  onChange={e => setFormData({...formData, diagnosis: e.target.value})}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                   <i className="fa-solid fa-pills"></i> Farmacología Activa
                </label>
                <textarea
                  rows={3}
                  className="w-full px-8 py-5 bg-white border border-slate-100 rounded-[28px] font-medium text-slate-700 resize-none outline-none focus:ring-4 focus:ring-indigo-500/5 shadow-sm placeholder:text-slate-300"
                  placeholder="Listado de fármacos y dosis diaria..."
                  value={formData.medications}
                  onChange={e => setFormData({...formData, medications: e.target.value})}
                />
              </div>

              {formData.sex === 'femenino' && (
                <div className="space-y-3 animate-in slide-in-from-left duration-300">
                  <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                     <i className="fa-solid fa-calendar-check"></i> Anticoncepción
                  </label>
                  <input
                    className="w-full px-8 py-5 bg-white border border-slate-100 rounded-[28px] font-medium text-slate-700 outline-none shadow-sm placeholder:text-slate-300"
                    placeholder="Tipo de anticonceptivo..."
                    value={formData.contraceptive}
                    onChange={e => setFormData({...formData, contraceptive: e.target.value})}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Comuna / Origen</label>
                  <input
                    className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none placeholder:text-slate-300"
                    placeholder="Ciudad o Comuna"
                    value={formData.commune}
                    onChange={e => setFormData({...formData, commune: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quien Envió</label>
                  <input
                    className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none placeholder:text-slate-300"
                    placeholder="Referente"
                    value={formData.referrerName}
                    onChange={e => setFormData({...formData, referrerName: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-6 pt-6">
              <button type="button" onClick={onClose} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-3xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all">Cancelar</button>
              <button type="submit" className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">Guardar Paciente</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientForm;
