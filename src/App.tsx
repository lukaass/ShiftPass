import { useState, useEffect, FormEvent } from 'react';
import { 
  getPatients, 
  savePatientDetails, 
  createPatient, 
  resetDatabaseToMockData 
} from './lib/dbService';
import { Patient, ChecklistItem, PatientStatus, NurseUser } from './types';
import AuthModal from './components/AuthModal';
import HistoryModal from './components/HistoryModal';
import MockIntegration from './components/MockIntegration';
import { 
  Search, 
  Plus, 
  Sparkles, 
  Clock, 
  UserPlus, 
  History, 
  CheckCircle, 
  Trash2, 
  Activity, 
  Moon, 
  Sun, 
  LogOut, 
  Database, 
  ExternalLink,
  ChevronRight,
  PlusCircle,
  X,
  User as UserIcon,
  CheckCircle2,
  AlertOctagon,
  FileText
} from 'lucide-react';

export default function App() {
  // Application state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<NurseUser | null>(null);
  
  // Navigation / Modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  
  // UI preferences
  const [darkMode, setDarkMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Patient Form fields
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientBed, setNewPatientBed] = useState('');
  const [newPatientChart, setNewPatientChart] = useState('');
  const [newPatientAge, setNewPatientAge] = useState<number>(45);
  const [newPatientSex, setNewPatientSex] = useState('M');
  const [newPatientDiagnosis, setNewPatientDiagnosis] = useState('');
  const [newPatientSector, setNewPatientSector] = useState('');
  const [newPatientStatus, setNewPatientStatus] = useState<PatientStatus>('green');

  // Input state for new checklist items inside selected patient
  const [newPendingText, setNewPendingText] = useState('');

  // Load theme and auth session
  useEffect(() => {
    // 1. Theme
    const savedTheme = localStorage.getItem('shiftpass_theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // 2. Auth Session Cache
    const cachedUser = localStorage.getItem('shiftpass_user');
    if (cachedUser) {
      setCurrentUser(JSON.parse(cachedUser));
    } else {
      // Prompt auth on boot for realistic experience
      setShowAuthModal(true);
    }
  }, []);

  // Fetch patients on load or user state change
  useEffect(() => {
    const fetchPatients = async () => {
      const data = await getPatients(currentUser?.email || null);
      setPatients(data);
      if (data.length > 0 && !selectedPatient) {
        // Auto-select first patient
        setSelectedPatient(data[0]);
      }
    };
    fetchPatients();
  }, [currentUser]);

  // Dark Mode toggle
  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('shiftpass_theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('shiftpass_theme', 'dark');
    }
    setDarkMode(!darkMode);
  };

  // Auth success callback
  const handleAuthSuccess = (user: NurseUser | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('shiftpass_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('shiftpass_user');
    }
    setShowAuthModal(false);
  };

  // Filter patients based on search input (Name, Bed, Chart, Diagnosis)
  const filteredPatients = patients.filter((p) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      p.name.toLowerCase().includes(query) ||
      p.bed.toLowerCase().includes(query) ||
      p.chartNumber.toLowerCase().includes(query) ||
      p.diagnosis.toLowerCase().includes(query) ||
      p.sector.toLowerCase().includes(query)
    );
  });

  // Alertas (botões rápidos) list
  const AVAILABLE_ALERTS = [
    'Risco de queda',
    'Alergia',
    'Isolamento',
    'Contato',
    'Broncoaspiração',
    'Dieta zero',
    'Uso de contenção',
    'VM',
    'Cateter',
    'Sonda'
  ];

  // Toggle quick alert tag
  const handleToggleAlert = (alert: string) => {
    if (!selectedPatient) return;
    const currentAlerts = selectedPatient.alerts || [];
    const updatedAlerts = currentAlerts.includes(alert)
      ? currentAlerts.filter(a => a !== alert)
      : [...currentAlerts, alert];
    
    setSelectedPatient({
      ...selectedPatient,
      alerts: updatedAlerts
    });
  };

  // Toggle checklist item
  const handleToggleChecklistItem = (itemId: string) => {
    if (!selectedPatient) return;
    const updatedList = selectedPatient.pendingList.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setSelectedPatient({
      ...selectedPatient,
      pendingList: updatedList
    });
  };

  // Add checklist item
  const handleAddChecklistItem = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !newPendingText.trim()) return;

    const newItem: ChecklistItem = {
      id: Math.random().toString(36).substring(2, 9),
      text: newPendingText.trim(),
      completed: false
    };

    setSelectedPatient({
      ...selectedPatient,
      pendingList: [...(selectedPatient.pendingList || []), newItem]
    });
    setNewPendingText('');
  };

  // Delete checklist item
  const handleDeleteChecklistItem = (itemId: string) => {
    if (!selectedPatient) return;
    setSelectedPatient({
      ...selectedPatient,
      pendingList: selectedPatient.pendingList.filter(item => item.id !== itemId)
    });
  };

  // Save current patient state and register handover logs
  const handleRegisterHandover = async () => {
    if (!selectedPatient) return;
    
    // Prevent empty nextShiftSummary or situation just to guarantee minimal standard
    const summaryText = selectedPatient.nextShiftSummary?.trim() || '';
    if (!summaryText) {
      alert('Por favor, preencha o Resumo para o Próximo Plantão. É o foco da passagem!');
      return;
    }

    const currentNurseName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Enfermeiro(a) Plantonista';

    try {
      await savePatientDetails(selectedPatient, currentUser?.email || null, currentNurseName);
      
      // Update local array state
      const updatedPatients = patients.map(p => 
        p.id === selectedPatient.id ? { ...selectedPatient, lastUpdated: new Date().toISOString(), responsibleNurse: currentNurseName } : p
      );
      setPatients(updatedPatients);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);

      // Simple auto-advance flow: highlight next patient in the filtered list
      const currentIndex = filteredPatients.findIndex(p => p.id === selectedPatient.id);
      if (currentIndex !== -1 && currentIndex < filteredPatients.length - 1) {
        setSelectedPatient(filteredPatients[currentIndex + 1]);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao registrar passagem.');
    }
  };

  // Create new patient manually
  const handleCreatePatientSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim() || !newPatientBed.trim() || !newPatientChart.trim()) {
      alert('Preencha os dados obrigatórios do paciente (Nome, Leito e Prontuário).');
      return;
    }

    const patientData = {
      name: newPatientName.trim(),
      bed: newPatientBed.trim().toUpperCase(),
      chartNumber: newPatientChart.trim(),
      age: Number(newPatientAge) || 40,
      sex: newPatientSex,
      diagnosis: newPatientDiagnosis.trim() || 'Internação clínica em andamento',
      sector: newPatientSector.trim() || 'Geral',
      status: newPatientStatus,
      responsibleNurse: currentUser?.displayName || 'Enfermeiro(a) Plantonista'
    };

    try {
      const addedPatient = await createPatient(patientData, currentUser?.email || null);
      setPatients([addedPatient, ...patients]);
      setSelectedPatient(addedPatient);
      setShowAddPatientModal(false);

      // Clear form
      setNewPatientName('');
      setNewPatientBed('');
      setNewPatientChart('');
      setNewPatientAge(45);
      setNewPatientSex('M');
      setNewPatientDiagnosis('');
      setNewPatientSector('');
      setNewPatientStatus('green');
    } catch (err) {
      console.error(err);
      alert('Erro ao criar paciente.');
    }
  };

  // Import integrated patient from Mock API
  const handleImportedPatientPrefill = async (importedData: any) => {
    try {
      const added = await createPatient({
        ...importedData,
        status: 'green'
      }, currentUser?.email || null);
      
      setPatients([added, ...patients]);
      setSelectedPatient(added);
    } catch (err) {
      console.error(err);
    }
  };

  // Reset database back to pristine demo state
  const handleResetDatabase = async () => {
    if (window.confirm('Deseja redefinir todo o banco de dados para os pacientes de demonstração? Seus dados customizados serão limpos.')) {
      await resetDatabaseToMockData(currentUser?.email || null);
      const data = await getPatients(currentUser?.email || null);
      setPatients(data);
      if (data.length > 0) {
        setSelectedPatient(data[0]);
      }
    }
  };

  // Severity color maps
  const severityBadgeStyles: Record<PatientStatus, { dot: string; text: string; bg: string; border: string }> = {
    green: { 
      dot: 'bg-[#52C41A]', 
      text: 'text-[#389E0D] dark:text-[#52C41A]', 
      bg: 'bg-[#F6FFED] dark:bg-[#132B13]', 
      border: 'border-[#B7EB8F] dark:border-[#274F27]' 
    },
    yellow: { 
      dot: 'bg-[#FAAD14]', 
      text: 'text-[#D46B08] dark:text-[#FAAD14]', 
      bg: 'bg-[#FFFBE6] dark:bg-[#342D13]', 
      border: 'border-[#FFE58F] dark:border-[#524419]' 
    },
    red: { 
      dot: 'bg-[#FF4D4F]', 
      text: 'text-[#CF1322] dark:text-[#FF4D4F]', 
      bg: 'bg-[#FFF1F0] dark:bg-[#3C1314]', 
      border: 'border-[#FFA39E] dark:border-[#6B1B1C]' 
    },
    gray: { 
      dot: 'bg-[#8C8C8C]', 
      text: 'text-[#595959] dark:text-[#BFBFBF]', 
      bg: 'bg-[#F5F5F5] dark:bg-[#1F1F1F]', 
      border: 'border-[#D9D9D9] dark:border-[#434343]' 
    }
  };

  const severityDotStyles: Record<PatientStatus, string> = {
    green: '🔴 border-emerald-500', // wait, dot refers to the indicator
    yellow: '🔴 border-amber-500',
    red: '🔴 border-rose-500',
    gray: '🔴 border-slate-400'
  };

  // Parse time of update to display on patient card (e.g., "Atualizado 18:45")
  const getFormattedUpdateTime = (isoString: string) => {
    if (!isoString) return 'Não atualizado';
    const d = new Date(isoString);
    return `Atualizado ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-[#0B0D0F] font-sans text-[#1A1C1E] dark:text-slate-100 transition-colors duration-200 flex flex-col selection:bg-[#E6F7FF] dark:selection:bg-[#1C283F]">
      
      {/* Hospital digital banner header */}
      <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-200">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0052CC] flex items-center justify-center text-white shadow-md shadow-[#0052CC]/15">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-[#0052CC] dark:text-[#4C90FF] tracking-tight block font-display">
                ShiftPass
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-wide uppercase -mt-0.5 block font-sans">
                Passagem de Plantão Inteligente
              </span>
            </div>
          </div>

          {/* Quick search input (Pesquisa Inteligente) */}
          <div className="flex-1 max-w-lg relative hidden sm:block">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              id="search-input"
              type="text"
              placeholder="Pesquisar por nome, leito, prontuário ou diagnóstico..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/20 focus:border-[#0052CC] transition-all"
            />
          </div>

          {/* Action buttons (Integration, Dark Mode, Profile) */}
          <div className="flex items-center gap-2">
            
            {/* Database seed indicator */}
            <button
              id="btn-seed"
              title="Redefinir Pacientes de Demonstração"
              onClick={handleResetDatabase}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-all cursor-pointer"
            >
              <Database className="w-4.5 h-4.5" />
            </button>

            {/* REST API integration simulator toggle */}
            <button
              id="btn-trigger-api"
              onClick={() => setShowIntegrationModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-xl transition-all border border-emerald-100/50 dark:border-emerald-900/30 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Integração REST</span>
            </button>

            {/* Dark mode button */}
            <button
              id="btn-theme-toggle"
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-all cursor-pointer"
            >
              {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1"></div>

            {/* Auth section */}
            {currentUser ? (
              <button
                id="btn-user-profile"
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 pl-2 pr-3.5 py-1.5 bg-[#F0F7FF] dark:bg-[#1C283F] text-[#0052CC] dark:text-[#4C90FF] rounded-xl text-xs font-semibold hover:bg-[#E6F7FF] dark:hover:bg-[#1C283F]/80 transition-all cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-[#0052CC] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                  {currentUser.displayName ? currentUser.displayName[0] : 'E'}
                </div>
                <span className="max-w-[90px] truncate hidden md:inline font-sans">
                  {currentUser.displayName || currentUser.email}
                </span>
                <span className="text-[10px] bg-[#E6F7FF] dark:bg-[#1A2638] text-[#0052CC] dark:text-[#4C90FF] px-1.5 py-0.5 rounded-md font-bold uppercase text-[9px]">
                  {currentUser.uid === 'sandbox_guest' ? 'LOCAL' : 'CLOUD'}
                </span>
              </button>
            ) : (
              <button
                id="btn-login-trigger"
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#0052CC] dark:text-[#4C90FF] bg-[#F0F7FF] dark:bg-[#1C283F] hover:bg-[#E6F7FF] rounded-xl transition-all border border-[#E1E4E8] dark:border-slate-800 cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Identificar Enfermeiro</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main dual-column container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-6 flex flex-col lg:flex-row gap-6 overflow-hidden">
        
        {/* Left Column - Patient List */}
        <section className="w-full lg:w-[410px] shrink-0 flex flex-col bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm h-[calc(100vh-140px)] min-h-[450px]">
          
          {/* Patient list search bar on mobile, title on desktop */}
          <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-850 dark:text-slate-100 text-base tracking-tight">
                Lista de Pacientes
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Sinalização clínica e grau de prioridade
              </p>
            </div>

            <button
              id="btn-add-patient-modal"
              onClick={() => setShowAddPatientModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#0052CC] hover:bg-[#0043A3] rounded-lg shadow-sm shadow-[#0052CC]/10 hover:shadow-[#0052CC]/15 transition-all cursor-pointer font-sans"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </button>
          </div>

          {/* Search box for mobile devices */}
          <div className="p-3 border-b border-slate-150 dark:border-slate-850 shrink-0 block sm:hidden">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                id="search-input-mobile"
                type="text"
                placeholder="Pesquisar por nome, leito..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/20"
              />
            </div>
          </div>

          {/* List scroll container */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850 p-2 space-y-1 bg-white dark:bg-slate-900">
            {filteredPatients.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">Nenhum paciente encontrado para a busca.</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Experimente limpar a pesquisa ou importar um paciente via integração REST.</p>
              </div>
            ) : (
              filteredPatients.map((p) => {
                const isSelected = selectedPatient?.id === p.id;
                const statusTheme = severityBadgeStyles[p.status] || severityBadgeStyles.green;

                return (
                  <div
                    key={p.id}
                    id={`patient-card-${p.id}`}
                    onClick={() => {
                      setSelectedPatient(p);
                      setShowHistoryModal(false); // Close history view to focus on editor
                    }}
                    className={`group w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none flex items-start gap-3.5 relative overflow-hidden ${
                      isSelected
                        ? 'bg-[#F0F7FF] dark:bg-[#1C283F]/70 border-2 border-[#0052CC] shadow-sm'
                        : 'bg-white dark:bg-slate-900 border border-[#E1E4E8] dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-850/40 hover:border-slate-150 dark:hover:border-slate-850'
                    }`}
                  >
                    {/* Status side bar highlight */}
                    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${statusTheme.dot}`} />

                    {/* Bed and indicator */}
                    <div className="shrink-0 flex flex-col items-center justify-center">
                      <div className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center font-bold text-sm tracking-tight border ${statusTheme.border} ${statusTheme.bg} ${statusTheme.text}`}>
                        <span className="text-[10px] font-bold opacity-60 leading-none">LEITO</span>
                        <span className="text-sm font-black mt-0.5">{p.bed}</span>
                      </div>
                    </div>

                    {/* Patient Info */}
                    <div className="flex-1 min-w-0 space-y-0.5 font-sans">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-slate-850 dark:text-slate-100 text-sm leading-tight truncate group-hover:text-[#0052CC] dark:group-hover:text-[#4C90FF] transition-colors">
                          {p.name}
                        </h4>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wide uppercase font-mono">
                        Prontuário {p.chartNumber}
                      </p>

                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate font-medium mt-1">
                        {p.diagnosis}
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getFormattedUpdateTime(p.lastUpdated)}
                        </span>
                        
                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${statusTheme.bg} ${statusTheme.text}`}>
                          {p.status === 'red' ? 'Prioritário' : p.status === 'yellow' ? 'Atenção' : p.status === 'green' ? 'Estável' : 'Alta Prevista'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Connected state badge */}
          <div className="p-3 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200/80 dark:border-slate-800/80 shrink-0 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium font-sans">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${currentUser ? 'bg-[#0052CC]' : 'bg-slate-400'}`} />
              {currentUser ? `Plantonista: ${currentUser.displayName || currentUser.email}` : 'Modo Leitura / Demonstrativo'}
            </span>
            <span className="font-bold uppercase text-[9px] bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              v1.0.4
            </span>
          </div>
        </section>

        {/* Right Column - Handover Editor or History view */}
        <section className="flex-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm h-[calc(100vh-140px)] min-h-[450px] overflow-hidden flex flex-col relative">
          
          {selectedPatient ? (
            showHistoryModal ? (
              // Display History Log Timeline
              <HistoryModal 
                patient={selectedPatient} 
                userEmail={currentUser?.email || null} 
                onClose={() => setShowHistoryModal(false)} 
              />
            ) : (
              // Display Active Handover Editor
              <div className="flex flex-col h-full overflow-hidden">
                
                {/* Editor Header Card */}
                <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold tracking-tight shrink-0 border ${severityBadgeStyles[selectedPatient.status].border} ${severityBadgeStyles[selectedPatient.status].bg} ${severityBadgeStyles[selectedPatient.status].text}`}>
                      <span className="text-[9px] font-bold opacity-60 leading-none">LEITO</span>
                      <span className="text-base font-black mt-0.5">{selectedPatient.bed}</span>
                    </div>

                    <div className="space-y-0.5 font-sans">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-[#0052CC] dark:text-[#4C90FF] tracking-tight font-display">
                          {selectedPatient.name}
                        </h3>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${severityBadgeStyles[selectedPatient.status].border} ${severityBadgeStyles[selectedPatient.status].bg} ${severityBadgeStyles[selectedPatient.status].text}`}>
                          {selectedPatient.status === 'red' ? '🔴 ALTA PRIORIDADE' : selectedPatient.status === 'yellow' ? '🟡 NECESSITA ATENÇÃO' : selectedPatient.status === 'green' ? '🟢 ESTÁVEL' : '⚫ ALTA HOSPITALAR PREVISTA'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span><strong>Prontuário:</strong> <span className="font-mono">{selectedPatient.chartNumber}</span></span>
                        <span>•</span>
                        <span><strong>Idade/Sexo:</strong> {selectedPatient.age} anos / {selectedPatient.sex}</span>
                        <span>•</span>
                        <span><strong>Diagnóstico:</strong> {selectedPatient.diagnosis}</span>
                      </div>
                      
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-0.5 flex flex-wrap gap-x-2.5">
                        <span><strong>Setor:</strong> {selectedPatient.sector}</span>
                        <span><strong>Enfermeiro anterior:</strong> {selectedPatient.responsibleNurse || 'Não especificado'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Open History Button */}
                  <button
                    id="btn-view-history"
                    onClick={() => setShowHistoryModal(true)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#F0F7FF] hover:bg-[#E6F7FF] dark:bg-slate-800 dark:hover:bg-slate-750 text-[#0052CC] dark:text-[#4C90FF] rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border border-[#91D5FF]/40 dark:border-slate-800/30"
                  >
                    <History className="w-3.5 h-3.5 text-[#0052CC]" />
                    Histórico & Comparar
                  </button>
                </div>

                {/* Patient details scroll section */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-white dark:bg-slate-900">
                  
                  {/* FEATURE HIGHLIGHT: Resumo para o Próximo Plantão (Foco) */}
                  <div className="bg-[#F0F7FF]/50 dark:bg-[#1C283F]/20 border border-[#91D5FF]/50 dark:border-[#1C283F] rounded-2xl p-4 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#0052CC] dark:text-[#4C90FF]" />
                        <h4 className="text-sm font-bold text-[#0052CC] dark:text-[#4C90FF] font-display">
                          Resumo para o Próximo Plantão (Foco da Passagem)
                        </h4>
                      </div>
                      <span className={`text-[10px] font-semibold ${
                        (selectedPatient.nextShiftSummary?.length || 0) > 280 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-[#0052CC] dark:text-[#4C90FF]'
                      }`}>
                        {selectedPatient.nextShiftSummary?.length || 0} / 300 caracteres
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed -mt-1 block font-sans">
                      Escreva aqui a síntese clínica ultra-focada que o próximo enfermeiro precisa saber de imediato. Isso será mantido como a última anotação evolutiva da linha do tempo.
                    </p>

                    <textarea
                      id="next-shift-summary-textarea"
                      maxLength={300}
                      rows={3}
                      value={selectedPatient.nextShiftSummary || ''}
                      onChange={(e) => setSelectedPatient({ ...selectedPatient, nextShiftSummary: e.target.value })}
                      placeholder="Ex: Paciente consciente e orientado. Mantido em O₂ 2 L/min. Curativo limpo. Aguardar raio-X pela manhã. Antibiótico às 22h."
                      className="w-full mt-1.5 text-sm p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0052CC]/20 focus:border-[#0052CC] font-medium leading-relaxed resize-none shadow-sm font-sans"
                    />
                  </div>

                  {/* Double column details: Situação e Pendências */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Left Inner: Situação Atual (Campo grande de texto) */}
                    <div className="space-y-1.5 flex flex-col h-full">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-sans">
                        Situação Atual
                      </label>
                      <textarea
                        id="situation-textarea"
                        rows={10}
                        value={selectedPatient.situation || ''}
                        onChange={(e) => setSelectedPatient({ ...selectedPatient, situation: e.target.value })}
                        placeholder="Paciente consciente. Sem dor. Curativo limpo. Oxigênio 2L. Diurese preservada."
                        className="w-full flex-1 text-sm p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0052CC]/10 focus:border-[#0052CC] resize-none font-medium leading-relaxed h-[200px] font-sans"
                      />
                    </div>

                    {/* Right Inner: Pendências Checklist */}
                    <div className="space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-sans">
                          Pendências (Checklist)
                        </label>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold font-sans">
                          {selectedPatient.pendingList?.filter(p => p.completed).length || 0} / {selectedPatient.pendingList?.length || 0} Concluídas
                        </span>
                      </div>

                      {/* Checklist wrapper */}
                      <div className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-3 min-h-[150px] overflow-y-auto space-y-1.5 flex flex-col max-h-[200px]">
                        
                        {/* New Item Form Inline */}
                        <form onSubmit={handleAddChecklistItem} className="flex gap-2 mb-2">
                          <input
                            id="new-pending-input"
                            type="text"
                            placeholder="Adicionar nova pendência..."
                            value={newPendingText}
                            onChange={(e) => setNewPendingText(e.target.value)}
                            className="flex-1 text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-lg focus:outline-none focus:border-[#0052CC]"
                          />
                          <button
                            id="btn-add-pending"
                            type="submit"
                            className="p-2 bg-[#0052CC] hover:bg-[#0043A3] text-white rounded-lg transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </form>

                        {/* Checklist items list */}
                        <div className="flex-1 space-y-1">
                          {selectedPatient.pendingList?.length === 0 ? (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 italic text-center py-6 font-sans">
                              Nenhuma pendência para este paciente.
                            </p>
                          ) : (
                            selectedPatient.pendingList?.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 text-xs font-medium group/item font-sans"
                              >
                                <label className="flex items-center gap-2.5 flex-1 cursor-pointer">
                                  <input
                                    id={`checkbox-${item.id}`}
                                    type="checkbox"
                                    checked={item.completed}
                                    onChange={() => handleToggleChecklistItem(item.id)}
                                    className="w-4 h-4 rounded text-[#0052CC] border-slate-300 focus:ring-[#0052CC] cursor-pointer"
                                  />
                                  <span className={`text-slate-800 dark:text-slate-200 break-all line-clamp-2 ${
                                    item.completed ? 'line-through text-slate-400 dark:text-slate-500 font-normal' : ''
                                  }`}>
                                    {item.text}
                                  </span>
                                </label>
                                <button
                                  id={`btn-delete-pending-${item.id}`}
                                  type="button"
                                  onClick={() => handleDeleteChecklistItem(item.id)}
                                  className="text-slate-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Alertas Rápidos */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block font-sans">
                      Alertas Rápidos (Tags de Monitoramento e Risco)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_ALERTS.map((alert) => {
                        const isToggled = selectedPatient.alerts?.includes(alert);
                        return (
                          <button
                            id={`alert-toggle-${alert}`}
                            key={alert}
                            type="button"
                            onClick={() => handleToggleAlert(alert)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border select-none transition-all duration-150 font-sans ${
                              isToggled
                                ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm shadow-rose-100 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-900/60'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-950 dark:hover:bg-slate-850 dark:text-slate-400 dark:border-slate-850'
                            }`}
                          >
                            {isToggled ? `🚨 ${alert}` : alert}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Observações Livres */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block font-sans">
                      Observações Adicionais (Campo Livre)
                    </label>
                    <textarea
                      id="observations-textarea"
                      rows={3}
                      value={selectedPatient.observations || ''}
                      onChange={(e) => setSelectedPatient({ ...selectedPatient, observations: e.target.value })}
                      placeholder="Inserir notas gerais, dados de acompanhante, preferências, intercorrências do plantão anterior..."
                      className="w-full text-sm p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0052CC]/10 focus:border-[#0052CC] resize-none font-medium leading-relaxed font-sans"
                    />
                  </div>

                  {/* Severity/Status picker */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block font-sans">
                        Status de Risco Clínico
                      </span>
                      <p className="text-[10px] text-slate-400 -mt-0.5 font-sans font-medium">Sinalização de gravidade para a escala geral.</p>
                    </div>
                    <div className="flex gap-2">
                      {(['green', 'yellow', 'red', 'gray'] as PatientStatus[]).map((status) => {
                        const style = severityBadgeStyles[status];
                        const isSelected = selectedPatient.status === status;
                        return (
                          <button
                            id={`status-select-${status}`}
                            key={status}
                            type="button"
                            onClick={() => setSelectedPatient({ ...selectedPatient, status })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer font-sans ${
                              isSelected
                                ? `ring-2 ring-[#0052CC]/30 ${style.bg} ${style.text} ${style.border}`
                                : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-950 dark:border-slate-850'
                            }`}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                              {status === 'green' ? 'Estável' : status === 'yellow' ? 'Atenção' : status === 'red' ? 'Prioridade' : 'Alta Prevista'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Registrar Passagem Footer Button */}
                <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200/80 dark:border-slate-800/80 shrink-0 flex items-center justify-between gap-4 font-sans">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Clique para registrar no histórico e avançar
                  </div>

                  <div className="flex items-center gap-3">
                    {saveSuccess && (
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-pulse">
                        <CheckCircle2 className="w-4.5 h-4.5" />
                        <span>Passagem salva com sucesso!</span>
                      </div>
                    )}
                    <button
                      id="btn-register-handover"
                      type="button"
                      onClick={handleRegisterHandover}
                      className="px-6 py-3 bg-[#0052CC] hover:bg-[#0043A3] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#0052CC]/10 active:scale-98 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      Registrar Passagem de Plantão
                    </button>
                  </div>
                </div>

              </div>
            )
          ) : (
            // Select a patient fallback screen
            <div className="flex-1 flex flex-col items-center justify-center py-20 px-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mb-4">
                <Activity className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Nenhum Paciente Selecionado</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm text-center">
                Selecione um paciente na lista à esquerda para carregar sua situação atual, gerenciar pendências e registrar a evolução do plantão.
              </p>
            </div>
          )}

        </section>

      </main>

      {/* MODAL OVERLAYS */}

      {/* 1. Auth Profile Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md my-8 relative">
            <button
              id="btn-close-auth-modal"
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <AuthModal 
              currentUser={currentUser} 
              onAuthSuccess={handleAuthSuccess} 
              onClose={() => setShowAuthModal(false)} 
            />
          </div>
        </div>
      )}

      {/* 2. Integration / REST API Simulator Modal */}
      {showIntegrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-8 relative">
            <button
              id="btn-close-integration-modal-x"
              onClick={() => setShowIntegrationModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <MockIntegration 
              onImportPatient={handleImportedPatientPrefill} 
              onClose={() => setShowIntegrationModal(false)} 
            />
          </div>
        </div>
      )}

      {/* 3. Manual Patient Creator Modal */}
      {showAddPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/85 dark:border-slate-800/85 shadow-2xl p-6 relative">
            
            <button
              id="btn-close-add-patient-x"
              onClick={() => setShowAddPatientModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 font-sans">
              <div className="p-2.5 bg-[#F0F7FF] dark:bg-[#1C283F] text-[#0052CC] rounded-xl">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-850 dark:text-slate-100 font-display">
                  Adicionar Paciente Manualmente
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cadastre um novo leito para a rotina de passagens.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreatePatientSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1 col-span-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Nome Completo</label>
                  <input
                    id="new-patient-name-input"
                    type="text"
                    required
                    placeholder="Ex: Maria da Silva"
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Leito</label>
                  <input
                    id="new-patient-bed-input"
                    type="text"
                    required
                    placeholder="Ex: E1, A12"
                    value={newPatientBed}
                    onChange={(e) => setNewPatientBed(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Prontuário</label>
                  <input
                    id="new-patient-chart-input"
                    type="text"
                    required
                    placeholder="Ex: 01548796"
                    value={newPatientChart}
                    onChange={(e) => setNewPatientChart(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Idade</label>
                  <input
                    id="new-patient-age-input"
                    type="number"
                    min={0}
                    max={120}
                    placeholder="Ex: 68"
                    value={newPatientAge}
                    onChange={(e) => setNewPatientAge(Number(e.target.value))}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase block">Sexo</label>
                  <select
                    id="new-patient-sex-select"
                    value={newPatientSex}
                    onChange={(e) => setNewPatientSex(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="Prefere não dizer">Prefere não dizer</option>
                  </select>
                </div>

                <div className="space-y-1 col-span-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Diagnóstico Resumido</label>
                  <input
                    id="new-patient-diagnosis-input"
                    type="text"
                    placeholder="Ex: Pneumonia"
                    value={newPatientDiagnosis}
                    onChange={(e) => setNewPatientDiagnosis(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Setor</label>
                  <input
                    id="new-patient-sector-input"
                    type="text"
                    placeholder="Ex: Infectologia, Ala B"
                    value={newPatientSector}
                    onChange={(e) => setNewPatientSector(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase block">Severidade Inicial</label>
                  <select
                    id="new-patient-status-select"
                    value={newPatientStatus}
                    onChange={(e) => setNewPatientStatus(e.target.value as PatientStatus)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100"
                  >
                    <option value="green">Verde (Estável)</option>
                    <option value="yellow">Amarelo (Atenção)</option>
                    <option value="red">Vermelho (Prioridade)</option>
                    <option value="gray">Cinza (Alta Prevista)</option>
                  </select>
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  id="btn-cancel-add-patient"
                  type="button"
                  onClick={() => setShowAddPatientModal(false)}
                  className="py-2.5 px-4 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-submit-add-patient"
                  type="submit"
                  className="py-2.5 px-5 text-xs font-bold text-white bg-[#0052CC] hover:bg-[#0043A3] rounded-xl cursor-pointer shadow-md shadow-[#0052CC]/10"
                >
                  Criar Paciente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
