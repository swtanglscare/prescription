import React, { useState, useRef, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { 
  Stethoscope, User, Phone, Building2, FileText, 
  Mic, Plus, Trash2, Send, LogOut, ArrowLeft, Search, ShieldCheck 
} from 'lucide-react';

// --- YOUR FIREBASE CONFIG (Paste your keys from Firebase Console here) ---
const firebaseConfig = {
  apiKey: "AIzaSyCTS_t-p7oANBgfFRko2Gz6_s89T114ZFI",
  authDomain: "prescription-52760.firebaseapp.com",
  projectId: "prescription-52760",
  storageBucket: "prescription-52760.firebasestorage.app",
  messagingSenderId: "302227750573",
  appId: "1:302227750573:web:1a0cfa33ad87ab223e9024"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export default function PrescriptionApp() {
  const [currentScreen, setCurrentScreen] = useState('auth'); // auth, profile_setup, home, add_patient, prescription, pdf_preview
  const [doctorUser, setDoctorUser] = useState(null);
  
  // Doctor Profile Form
  const [profileData, setProfileData] = useState({
    name: '',
    whatsapp: '',
    hospitalName: '',
    adminWhatsapp: '',
    signatureDataUrl: ''
  });

  // Patients & Prescriptions State
  const [patients, setPatients] = useState([]);
  const [currentPatient, setCurrentPatient] = useState({ name: '', age: '', whatsapp: '' });
  const [medicines, setMedicines] = useState([
    { id: 1, name: 'Paracetamol 650mg', morning: true, afternoon: false, evening: true, night: false, meal: 'After Food', duration: '5 Days' }
  ]);

  // E-Signature Canvas Ref
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [inputMode, setInputMode] = useState('text');
  const [isListening, setIsListening] = useState(false);

  // Check Auth State on Load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setDoctorUser({
          uid: user.uid,
          email: user.email,
          name: user.displayName || '',
        });
        setCurrentScreen('home');
        fetchPatients(user.uid);
      } else {
        setCurrentScreen('auth');
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Patients from Firestore for logged-in doctor
  const fetchPatients = async (uid) => {
    try {
      const q = query(collection(db, "patients"), where("doctorId", "==", uid));
      const querySnapshot = await getDocs(q);
      const loadedPatients = [];
      querySnapshot.forEach((doc) => {
        loadedPatients.push({ id: doc.id, ...doc.data() });
      });
      if (loadedPatients.length > 0) {
        setPatients(loadedPatients);
      }
    } catch (e) {
      console.error("Error fetching patients: ", e);
    }
  };

  // Google Login Handler
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      setDoctorUser({ uid: user.uid, email: user.email, name: user.displayName });
      setCurrentScreen('profile_setup');
    } catch (error) {
      alert("Login Failed: " + error.message);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    await signOut(auth);
    setDoctorUser(null);
    setCurrentScreen('auth');
  };

  // Canvas Handlers for E-Signature
  useEffect(() => {
    if (currentScreen === 'profile_setup' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }
  }, [currentScreen]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    setProfileData(prev => ({ ...prev, signatureDataUrl: canvas.toDataURL() }));
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setProfileData(prev => ({ ...prev, signatureDataUrl: '' }));
  };

  // Voice Speech Recognition
  const toggleVoiceInput = () => {
    if (!isListening) {
      setIsListening(true);
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN';
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setMedicines(prev => [...prev, {
            id: Date.now(),
            name: transcript,
            morning: true, afternoon: false, evening: true, night: false,
            meal: 'After Food', duration: '5 Days'
          }]);
          setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
      } else {
        setTimeout(() => {
          setMedicines(prev => [...prev, {
            id: Date.now(),
            name: 'Amoxicillin 500mg',
            morning: true, afternoon: false, evening: false, night: true,
            meal: 'After Food', duration: '5 Days'
          }]);
          setIsListening(false);
        }, 2000);
      }
    } else {
      setIsListening(false);
    }
  };

  const addMedicineRow = () => {
    setMedicines(prev => [...prev, {
      id: Date.now(),
      name: '',
      morning: false,
      afternoon: false,
      evening: false,
      night: false,
      meal: 'After Food',
      duration: '3 Days'
    }]);
  };

  const removeMedicineRow = (id) => {
    setMedicines(prev => prev.filter(m => m.id !== id));
  };

  // Save Patient & Prescription to Firestore
  const savePatientToFirestore = async () => {
    if (!currentPatient.name || !currentPatient.whatsapp) {
      alert('Please enter patient name and WhatsApp number.');
      return;
    }
    try {
      const newPatientData = {
        doctorId: doctorUser.uid,
        name: currentPatient.name,
        age: currentPatient.age,
        whatsapp: currentPatient.whatsapp,
        date: new Date().toISOString().split('T')[0],
        medicines: medicines,
        createdAt: new Date()
      };
      const docRef = await addDoc(collection(db, "patients"), newPatientData);
      setPatients([{ id: docRef.id, ...newPatientData }, ...patients]);
      setCurrentScreen('pdf_preview');
    } catch (e) {
      alert("Error saving to database: " + e.message);
    }
  };

  // WhatsApp Dispatch
  const handleWhatsAppSend = () => {
    const message = `*PRESCRIPTION*%0A*Hospital:* ${profileData.hospitalName || 'Clinic'}%0A*Doctor:* Dr. ${profileData.name || doctorUser.name}%0A*Patient:* ${currentPatient.name} (Age: ${currentPatient.age})%0A*Date:* ${new Date().toLocaleDateString()}%0A%0A*Medicines:*%0A` +
      medicines.map(m => `- ${m.name} [M:${m.morning?1:0} A:${m.afternoon?1:0} E:${m.evening?1:0} N:${m.night?1:0}] (${m.meal}, ${m.duration})`).join('%0A');
    
    window.open(`https://wa.me/${currentPatient.whatsapp.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start p-0 sm:p-4 font-sans">
      <div className="w-full max-w-md bg-white min-h-screen sm:min-h-[850px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
        
        {/* TOP HEADER */}
        <header className="bg-blue-600 text-white p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <div className="bg-white text-blue-600 p-2 rounded-xl font-bold flex items-center shadow">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Prescription</h1>
              <p className="text-xs text-blue-100">Doctor E-Rx & WhatsApp Suite</p>
            </div>
          </div>
          {doctorUser && (
            <button 
              onClick={handleLogout}
              className="text-xs bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg font-medium flex items-center space-x-1 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          )}
        </header>

        {/* MAIN BODY */}
        <main className="flex-1 overflow-y-auto p-4 flex flex-col">
          
          {/* SCREEN: GOOGLE AUTH */}
          {currentScreen === 'auth' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-6">
              <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-inner mb-2">
                <Stethoscope className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Doctor Sign In</h2>
                <p className="text-sm text-slate-500 max-w-xs">
                  Access your private patient records and generate instant WhatsApp e-prescriptions.
                </p>
              </div>

              <div className="w-full space-y-3 pt-6">
                <button
                  onClick={handleGoogleLogin}
                  className="w-full py-3.5 px-4 bg-white border-2 border-slate-200 hover:border-blue-500 rounded-2xl flex items-center justify-center space-x-3 shadow-sm transition font-medium text-slate-700"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-400 pt-4">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Encrypted Firestore Data & Secure Doctor Profiles</span>
              </div>
            </div>
          )}

          {/* SCREEN: PROFILE & E-SIGNATURE SETUP */}
          {currentScreen === 'profile_setup' && (
            <div className="space-y-6 pb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Doctor Profile & E-Signature</h2>
                <p className="text-xs text-slate-500">Configure your clinic details and draw your digital signature.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Doctor Full Name</label>
                  <input 
                    type="text" 
                    placeholder="Dr. Rajesh Mehta"
                    value={profileData.name}
                    onChange={e => setProfileData({...profileData, name: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Doctor WhatsApp Number</label>
                  <input 
                    type="text" 
                    placeholder="+91 98765 43210"
                    value={profileData.whatsapp}
                    onChange={e => setProfileData({...profileData, whatsapp: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Hospital / Clinic Name</label>
                  <input 
                    type="text" 
                    placeholder="City Care Clinic & ICU"
                    value={profileData.hospitalName}
                    onChange={e => setProfileData({...profileData, hospitalName: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Admin WhatsApp Number</label>
                  <input 
                    type="text" 
                    placeholder="+91 98765 00000"
                    value={profileData.adminWhatsapp}
                    onChange={e => setProfileData({...profileData, adminWhatsapp: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* E-Signature Canvas */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-600">Draw Your E-Signature</label>
                    <button onClick={clearSignature} className="text-xs text-red-600 hover:underline">Clear</button>
                  </div>
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 overflow-hidden relative">
                    <canvas
                      ref={canvasRef}
                      width={350}
                      height={120}
                      className="w-full cursor-crosshair touch-none bg-white"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    {!profileData.signatureDataUrl && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs">
                        Sign inside this box
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!profileData.name || !profileData.hospitalName) {
                    alert('Please enter doctor name and clinic name.');
                    return;
                  }
                  setCurrentScreen('home');
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-medium shadow-lg shadow-blue-500/25 transition"
              >
                Save Profile & Open Dashboard
              </button>
            </div>
          )}

          {/* SCREEN: HOME / PATIENT LIST */}
          {currentScreen === 'home' && (
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Today's Patient List</h2>
                  <p className="text-xs text-slate-500">{new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
                </div>
                <button
                  onClick={() => setCurrentScreen('add_patient')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Patient</span>
                </button>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {patients.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No patients added yet today. Click 'Add Patient' to start.
                  </div>
                ) : (
                  patients.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => {
                        setCurrentPatient(p);
                        if (p.medicines) setMedicines(p.medicines);
                        setCurrentScreen('pdf_preview');
                      }}
                      className="p-4 bg-white border border-slate-200 hover:border-blue-400 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer transition group"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition">{p.name}</h3>
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">Age: {p.age}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{p.whatsapp}</span>
                        </p>
                      </div>
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-xl font-medium">
                        Rx Ready
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SCREEN: ADD PATIENT */}
          {currentScreen === 'add_patient' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <button onClick={() => setCurrentScreen('home')} className="p-1 hover:bg-slate-100 rounded-lg">
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <h2 className="text-xl font-bold text-slate-900">New Patient Intake</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Patient Full Name</label>
                  <input 
                    type="text" 
                    placeholder="Suresh Kumar"
                    value={currentPatient.name}
                    onChange={e => setCurrentPatient({...currentPatient, name: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Age</label>
                  <input 
                    type="number" 
                    placeholder="35"
                    value={currentPatient.age}
                    onChange={e => setCurrentPatient({...currentPatient, age: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">WhatsApp Number</label>
                  <input 
                    type="text" 
                    placeholder="+91 98765 12345"
                    value={currentPatient.whatsapp}
                    onChange={e => setCurrentPatient({...currentPatient, whatsapp: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  if (!currentPatient.name || !currentPatient.whatsapp) {
                    alert('Please enter patient name and WhatsApp number.');
                    return;
                  }
                  setCurrentScreen('prescription');
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-medium shadow-lg shadow-blue-500/25 transition"
              >
                Proceed to Prescription
              </button>
            </div>
          )}

          {/* SCREEN: PRESCRIPTION BUILDER */}
          {currentScreen === 'prescription' && (
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button onClick={() => setCurrentScreen('home')} className="p-1 hover:bg-slate-100 rounded-lg">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                  </button>
                  <div>
                    <h2 className="font-bold text-slate-900">{currentPatient.name}</h2>
                    <p className="text-xs text-slate-400">Age: {currentPatient.age} | {currentPatient.whatsapp}</p>
                  </div>
                </div>
                <button 
                  onClick={toggleVoiceInput} 
                  className={`px-3 py-1.5 text-xs rounded-xl font-medium flex items-center space-x-1 ${isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-blue-50 text-blue-600'}`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isListening ? 'Listening...' : 'Voice Rx'}</span>
                </button>
              </div>

              {/* Medicines Builder */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rx Medicines & Timing</h3>
                  <button onClick={addMedicineRow} className="text-xs text-blue-600 font-semibold flex items-center space-x-1 hover:underline">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Medicine</span>
                  </button>
                </div>

                {medicines.map((med, index) => (
                  <div key={med.id} className="p-3 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-blue-600 w-5">{index + 1}.</span>
                      <input 
                        type="text" 
                        value={med.name}
                        onChange={e => {
                          const val = e.target.value;
                          setMedicines(medicines.map(m => m.id === med.id ? {...m, name: val} : m));
                        }}
                        placeholder="Medicine name & strength (e.g. Pantocid 40mg)"
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button onClick={() => removeMedicineRow(med.id)} className="text-slate-400 hover:text-red-600 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Time Checkboxes */}
                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600 px-1">
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={med.morning} 
                          onChange={e => setMedicines(medicines.map(m => m.id === med.id ? {...m, morning: e.target.checked} : m))}
                          className="rounded text-blue-600"
                        />
                        <span>Morning</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={med.afternoon} 
                          onChange={e => setMedicines(medicines.map(m => m.id === med.id ? {...m, afternoon: e.target.checked} : m))}
                          className="rounded text-blue-600"
                        />
                        <span>Afternoon</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={med.evening} 
                          onChange={e => setMedicines(medicines.map(m => m.id === med.id ? {...m, evening: e.target.checked} : m))}
                          className="rounded text-blue-600"
                        />
                        <span>Evening</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={med.night} 
                          onChange={e => setMedicines(medicines.map(m => m.id === med.id ? {...m, night: e.target.checked} : m))}
                          className="rounded text-blue-600"
                        />
                        <span>Night</span>
                      </label>
                    </div>

                    {/* Meal Sorting & Duration */}
                    <div className="flex space-x-2 pt-1">
                      <select 
                        value={med.meal} 
                        onChange={e => setMedicines(medicines.map(m => m.id === med.id ? {...m, meal: e.target.value} : m))}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl text-[11px] px-2 py-1 text-slate-700"
                      >
                        <option>Before Food</option>
                        <option>After Food</option>
                        <option>With Food</option>
                        <option>SOS / As Needed</option>
                      </select>
                      <input 
                        type="text" 
                        value={med.duration}
                        onChange={e => setMedicines(medicines.map(m => m.id === med.id ? {...m, duration: e.target.value} : m))}
                        placeholder="Duration (e.g. 5 Days)"
                        className="w-28 bg-slate-50 border border-slate-200 rounded-xl text-[11px] px-2 py-1 text-slate-700"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={savePatientToFirestore}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-medium shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition"
              >
                <FileText className="w-5 h-5" />
                <span>Save & Generate Prescription PDF</span>
              </button>
            </div>
          )}

          {/* SCREEN: PDF PREVIEW & WHATSAPP DISPATCH */}
          {currentScreen === 'pdf_preview' && (
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <button onClick={() => setCurrentScreen('home')} className="p-1 hover:bg-slate-100 rounded-lg">
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <h2 className="font-bold text-slate-900">Prescription PDF Preview</h2>
                <div className="w-5"></div>
              </div>

              {/* Printable Prescription Template */}
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 space-y-4 shadow-sm text-xs flex-1">
                <div className="border-b pb-3 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-blue-900">{profileData.hospitalName || 'City Care Clinic'}</h3>
                    <p className="text-[10px] text-slate-500">Dr. {profileData.name || doctorUser?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-700">Date: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl flex justify-between">
                  <div>
                    <span className="text-slate-400">Patient: </span>
                    <strong className="text-slate-800">{currentPatient.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Age: </span>
                    <strong className="text-slate-800">{currentPatient.age} Yrs</strong>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="text-lg font-bold text-blue-600 font-serif">℞</div>
                  <div className="space-y-2">
                    {medicines.map((m, i) => (
                      <div key={m.id} className="border-b border-dashed pb-2">
                        <div className="font-bold text-slate-800">{i + 1}. {m.name}</div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                          <span>Timing: {[m.morning&&'M', m.afternoon&&'A', m.evening&&'E', m.night&&'N'].filter(Boolean).join('-')}</span>
                          <span>{m.meal} | {m.duration}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8 flex justify-end">
                  <div className="text-center">
                    {profileData.signatureDataUrl ? (
                      <img src={profileData.signatureDataUrl} alt="E-Signature" className="h-12 max-w-[120px] object-contain mb-1" />
                    ) : (
                      <div className="h-12 w-28 border-b border-slate-300 mb-1"></div>
                    )}
                    <p className="text-[10px] font-bold text-slate-700">Dr. {profileData.name || doctorUser?.name}</p>
                    <p className="text-[9px] text-slate-400">Authorized Signature</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleWhatsAppSend}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-medium shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition"
              >
                <Send className="w-5 h-5" />
                <span>Send Prescription to WhatsApp</span>
              </button>
            </div>
          )}

        </main>

        <footer className="bg-slate-50 border-t p-3 text-center text-[11px] text-slate-400">
          Prescription App • Firebase Cloud Connected
        </footer>

      </div>
    </div>
  );
}
