import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  addDoc, 
  query, 
  orderBy, 
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, isFirebaseAvailable } from '../firebase';
import { Patient, HandoverHistory, ChecklistItem } from '../types';

const LOCAL_STORAGE_PATIENTS_KEY = 'shiftpass_patients';
const LOCAL_STORAGE_HISTORY_KEY = 'shiftpass_history';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// Rich initial mock data to satisfy requirements and make the app look complete immediately.
const INITIAL_MOCK_PATIENTS: Patient[] = [
  {
    id: 'p1',
    name: 'Maria da Silva',
    bed: 'E1',
    chartNumber: '01548796',
    age: 68,
    sex: 'F',
    diagnosis: 'Pneumonia Bacteriana Grave',
    sector: 'Ala de Infectologia',
    responsibleNurse: 'Enfª. Carla Souza',
    status: 'red',
    lastUpdated: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago
    situation: 'Paciente consciente e orientada, eupneica em uso de oxigênio sob cateter nasal. Sinais vitais estáveis. Curativo abdominal limpo e seco. Mantém acesso venoso periférico em membro superior direito pérvio, sem sinais de flebite.',
    pendingList: [
      { id: 'ck1', text: 'Administrar antibiótico (Ceftriaxona) às 22h', completed: false },
      { id: 'ck2', text: 'Aguardar resultado do Raio-X de tórax de controle', completed: false },
      { id: 'ck3', text: 'Trocar curativo simples da ferida cirúrgica', completed: true },
      { id: 'ck4', text: 'Avaliação médica com equipe da pneumologia', completed: false }
    ],
    alerts: ['Risco de queda', 'Isolamento', 'Sonda'],
    observations: 'Acompanhada pela filha. Refere cefaleia leve episódica, mas nega dor torácica. Diurese presente e preservada via sonda vesical de demora.',
    nextShiftSummary: 'Paciente estável com pneumonia, em oxigenioterapia leve 2L/min. Antibiótico programado para as 22h. Necessita aguardar resultado do Raio-X de controle e avaliação médica.'
  },
  {
    id: 'p2',
    name: 'João de Souza',
    bed: 'A4',
    chartNumber: '02349182',
    age: 32,
    sex: 'M',
    diagnosis: 'Pós-Operatório de Apendicectomia',
    sector: 'Clínica Cirúrgica',
    responsibleNurse: 'Enf. Lucas Amorim',
    status: 'green',
    lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    situation: 'Paciente consciente, orientado, deambulando com auxílio leve. Refere dor leve na incisão cirúrgica (nota 2/10), medicado conforme prescrição. Dieta livre aceita parcialmente. Acesso venoso em MSD heparinizado.',
    pendingList: [
      { id: 'ck5', text: 'Avaliar padrão álgico antes da medicação das 20h', completed: true },
      { id: 'ck6', text: 'Trocar acesso venoso periférico (completa 72h)', completed: false },
      { id: 'ck7', text: 'Estimular deambulação ativa no corredor', completed: true }
    ],
    alerts: ['Risco de queda', 'Alergia'],
    observations: 'Alergia referida a Dipirona (destacada em pulseira vermelha). Incisão cirúrgica com bordas coaptadas, sem sinais inflamatórios.',
    nextShiftSummary: 'Pós-operatório de apendicectomia evoluindo bem. Dor controlada, deambulando. Pendente trocar acesso venoso periférico nas próximas horas.'
  },
  {
    id: 'p3',
    name: 'Ana Beatriz Ramos',
    bed: 'B12',
    chartNumber: '04829103',
    age: 12,
    sex: 'F',
    diagnosis: 'Crise Asmática Moderada',
    sector: 'Pediatria',
    responsibleNurse: 'Enfª. Carla Souza',
    status: 'yellow',
    lastUpdated: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
    situation: 'Paciente ativa, corada, hidratada. Apresenta sibilos expiratórios discretos, sem esforço respiratório ou tiragem intercostal. Saturação em 96% em ar ambiente.',
    pendingList: [
      { id: 'ck8', text: 'Realizar inalação com broncodilatador às 21h', completed: false },
      { id: 'ck9', text: 'Medir pico de fluxo expiratório de hora em hora', completed: false }
    ],
    alerts: ['Alergia', 'Cateter'],
    observations: 'Genitora presente no leito. Alérgica a poeira e ácaros. Diurese e evacuações fisiológicas.',
    nextShiftSummary: 'Evoluindo com melhora do padrão respiratório da crise asmática. Sem esforço. Inalação pendente para as 21h.'
  },
  {
    id: 'p4',
    name: 'Roberto Santos',
    bed: 'C3',
    chartNumber: '09182374',
    age: 74,
    sex: 'M',
    diagnosis: 'AVC Isquêmico Estabilizado',
    sector: 'Neurologia',
    responsibleNurse: 'Enf. Lucas Amorim',
    status: 'gray',
    lastUpdated: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    situation: 'Paciente lúcido com sequela de hemiparesia à esquerda. Fala levemente disártrica, mas compreensível. Sinais vitais controlados, PA de 130x80 mmHg. Alta hospitalar assinada e prevista para amanhã cedo.',
    pendingList: [
      { id: 'ck10', text: 'Orientar acompanhante sobre cuidados pós-alta', completed: true },
      { id: 'ck11', text: 'Entregar receita e sumário de alta ao familiar', completed: false },
      { id: 'ck12', text: 'Retirar acesso venoso periférico antes da saída', completed: false }
    ],
    alerts: ['Risco de queda', 'Broncoaspiração', 'Uso de contenção'],
    observations: 'Acompanhante necessita de reforço na instrução sobre risco de broncoaspiração alimentar em domicílio.',
    nextShiftSummary: 'Paciente com alta prevista para amanhã de manhã. Lúcido, hemiparesia E, orientações de alta em andamento. Retirar acesso periférico no momento da alta.'
  }
];

const INITIAL_MOCK_HISTORY: HandoverHistory[] = [
  {
    id: 'h1',
    patientId: 'p1',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    recordedBy: 'Enf. Lucas Amorim',
    situation: 'Paciente com febre persistente (38.5ºC) e tosse produtiva. Iniciando protocolo de pneumonia.',
    pendingList: [
      { id: 'ck1', text: 'Administrar antibiótico (Ceftriaxona) às 22h', completed: false },
      { id: 'ck2', text: 'Aguardar resultado do Raio-X de tórax de controle', completed: false }
    ],
    alerts: ['Risco de queda'],
    observations: 'Iniciado monitoramento de oxigênio de hora em hora.',
    nextShiftSummary: 'Paciente recém-admitido com quadro respiratório de pneumonia bacteriana. Iniciando antibiótico e aguardando Raio-X.'
  },
  {
    id: 'h2',
    patientId: 'p1',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    recordedBy: 'Enfª. Carla Souza',
    situation: 'Paciente afebril há 12 horas. Melhora discreta na ausculta pulmonar. Saturação estável.',
    pendingList: [
      { id: 'ck1', text: 'Administrar antibiótico (Ceftriaxona) às 22h', completed: false },
      { id: 'ck2', text: 'Aguardar resultado do Raio-X de tórax de controle', completed: false },
      { id: 'ck3', text: 'Trocar curativo simples da ferida cirúrgica', completed: false }
    ],
    alerts: ['Risco de queda', 'Isolamento'],
    observations: 'Diurese espontânea.',
    nextShiftSummary: 'Paciente apresentando melhora clínica, mantendo-se afebril. Curativo por fazer e antibiótico a noite.'
  }
];

// Initialize LocalStorage with default mock data if empty
export const initializeLocalStorage = () => {
  if (!localStorage.getItem(LOCAL_STORAGE_PATIENTS_KEY)) {
    localStorage.setItem(LOCAL_STORAGE_PATIENTS_KEY, JSON.stringify(INITIAL_MOCK_PATIENTS));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY)) {
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(INITIAL_MOCK_HISTORY));
  }
};

// Retrieve patients list
export const getPatients = async (userEmail: string | null): Promise<Patient[]> => {
  initializeLocalStorage();
  
  if (isFirebaseAvailable && userEmail) {
    try {
      const q = query(collection(db, 'patients'));
      const snapshot = await getDocs(q);
      const patients: Patient[] = [];
      
      snapshot.forEach((docSnap) => {
        patients.push({ id: docSnap.id, ...docSnap.data() } as Patient);
      });
      
      if (patients.length === 0) {
        // Seed database with mock data for this user
        for (const patient of INITIAL_MOCK_PATIENTS) {
          const patientRef = doc(db, 'patients', patient.id);
          await setDoc(patientRef, {
            ...patient,
            lastUpdated: new Date().toISOString()
          });
          patients.push(patient);
        }
      }
      
      // Sort patients (red -> yellow -> green -> gray)
      return sortPatients(patients);
    } catch (error) {
      console.error('Error fetching patients from Firestore, using LocalStorage fallback:', error);
    }
  }
  
  // LocalStorage fallback
  const localData = localStorage.getItem(LOCAL_STORAGE_PATIENTS_KEY);
  const patients: Patient[] = localData ? JSON.parse(localData) : INITIAL_MOCK_PATIENTS;
  return sortPatients(patients);
};

// Sort helper: red (1), yellow (2), green (3), gray (4)
const sortPatients = (patients: Patient[]): Patient[] => {
  const priorityOrder: Record<string, number> = { red: 1, yellow: 2, green: 3, gray: 4 };
  return [...patients].sort((a, b) => {
    const orderA = priorityOrder[a.status] || 99;
    const orderB = priorityOrder[b.status] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.bed.localeCompare(b.bed, undefined, { numeric: true, sensitivity: 'base' });
  });
};

// Save patient details
export const savePatientDetails = async (
  patient: Patient, 
  userEmail: string | null,
  nurseName: string
): Promise<void> => {
  const updatedPatient = {
    ...patient,
    lastUpdated: new Date().toISOString(),
    responsibleNurse: nurseName || patient.responsibleNurse
  };

  // 1. Save patient state
  if (isFirebaseAvailable && userEmail) {
    try {
      const patientRef = doc(db, 'patients', patient.id);
      await setDoc(patientRef, updatedPatient);
    } catch (error) {
      console.error('Error saving patient to Firestore:', error);
      // Fallback update in local storage
      updatePatientInLocalStorage(updatedPatient);
    }
  } else {
    updatePatientInLocalStorage(updatedPatient);
  }

  // 2. Automatically log handover history entry
  const historyEntry: HandoverHistory = {
    id: generateId(),
    patientId: patient.id,
    timestamp: new Date().toISOString(),
    recordedBy: nurseName || 'Enfermeiro(a) Plantonista',
    situation: patient.situation,
    pendingList: patient.pendingList,
    alerts: patient.alerts,
    observations: patient.observations,
    nextShiftSummary: patient.nextShiftSummary
  };

  await addHandoverHistoryEntry(historyEntry, userEmail);
};

const updatePatientInLocalStorage = (patient: Patient) => {
  const localData = localStorage.getItem(LOCAL_STORAGE_PATIENTS_KEY);
  if (localData) {
    const patients: Patient[] = JSON.parse(localData);
    const index = patients.findIndex(p => p.id === patient.id);
    if (index !== -1) {
      patients[index] = patient;
    } else {
      patients.push(patient);
    }
    localStorage.setItem(LOCAL_STORAGE_PATIENTS_KEY, JSON.stringify(patients));
  }
};

// Get handover history
export const getHandoverHistory = async (
  patientId: string, 
  userEmail: string | null
): Promise<HandoverHistory[]> => {
  if (isFirebaseAvailable && userEmail) {
    try {
      const historyRef = collection(db, 'patients', patientId, 'history');
      const q = query(historyRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      const history: HandoverHistory[] = [];
      
      snapshot.forEach((docSnap) => {
        history.push({ id: docSnap.id, ...docSnap.data() } as HandoverHistory);
      });
      
      if (history.length > 0) {
        return history;
      }
    } catch (error) {
      console.error('Error fetching history from Firestore, using LocalStorage fallback:', error);
    }
  }

  // LocalStorage fallback
  const localHistoryData = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
  if (localHistoryData) {
    const allHistory: HandoverHistory[] = JSON.parse(localHistoryData);
    const filteredHistory = allHistory
      .filter(h => h.patientId === patientId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Seed initial history if none found for p1 to make history look realistic
    if (filteredHistory.length === 0 && patientId === 'p1') {
      const p1History = INITIAL_MOCK_HISTORY.filter(h => h.patientId === 'p1');
      return p1History.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    
    return filteredHistory;
  }
  
  return [];
};

// Add handover history entry
export const addHandoverHistoryEntry = async (
  entry: HandoverHistory, 
  userEmail: string | null
): Promise<void> => {
  if (isFirebaseAvailable && userEmail) {
    try {
      const historyDocRef = doc(db, 'patients', entry.patientId, 'history', entry.id);
      await setDoc(historyDocRef, {
        ...entry,
        timestamp: new Date().toISOString()
      });
      return;
    } catch (error) {
      console.error('Error adding history to Firestore:', error);
    }
  }

  // LocalStorage fallback
  const localHistoryData = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
  if (localHistoryData) {
    const allHistory: HandoverHistory[] = JSON.parse(localHistoryData);
    allHistory.push(entry);
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(allHistory));
  }
};

// Create a new patient
export const createPatient = async (
  patientData: Omit<Patient, 'id' | 'lastUpdated' | 'situation' | 'pendingList' | 'alerts' | 'observations' | 'nextShiftSummary'>,
  userEmail: string | null
): Promise<Patient> => {
  const newPatient: Patient = {
    ...patientData,
    id: 'p_' + generateId(),
    lastUpdated: new Date().toISOString(),
    situation: '',
    pendingList: [],
    alerts: [],
    observations: '',
    nextShiftSummary: ''
  };

  if (isFirebaseAvailable && userEmail) {
    try {
      const patientRef = doc(db, 'patients', newPatient.id);
      await setDoc(patientRef, newPatient);
    } catch (error) {
      console.error('Error creating patient in Firestore:', error);
      savePatientToLocalStorage(newPatient);
    }
  } else {
    savePatientToLocalStorage(newPatient);
  }

  return newPatient;
};

const savePatientToLocalStorage = (patient: Patient) => {
  initializeLocalStorage();
  const localData = localStorage.getItem(LOCAL_STORAGE_PATIENTS_KEY);
  if (localData) {
    const patients: Patient[] = JSON.parse(localData);
    patients.push(patient);
    localStorage.setItem(LOCAL_STORAGE_PATIENTS_KEY, JSON.stringify(patients));
  }
};

// Reset to default mock data (useful button in the UI)
export const resetDatabaseToMockData = async (userEmail: string | null): Promise<void> => {
  localStorage.setItem(LOCAL_STORAGE_PATIENTS_KEY, JSON.stringify(INITIAL_MOCK_PATIENTS));
  localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(INITIAL_MOCK_HISTORY));
  
  if (isFirebaseAvailable && userEmail) {
    try {
      // Since deleteCollection is complex to run client-side, we can overwrite existing patients or write them back
      for (const patient of INITIAL_MOCK_PATIENTS) {
        const patientRef = doc(db, 'patients', patient.id);
        await setDoc(patientRef, patient);
        
        // Also clear/seed subcollection history
        const p1History = INITIAL_MOCK_HISTORY.filter(h => h.patientId === patient.id);
        for (const hist of p1History) {
          const histRef = doc(db, 'patients', patient.id, 'history', hist.id);
          await setDoc(histRef, hist);
        }
      }
    } catch (error) {
      console.error('Error resetting Firestore to mock data:', error);
    }
  }
};
