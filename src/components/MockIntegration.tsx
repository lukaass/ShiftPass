import { useState } from 'react';
import { Patient } from '../types';
import { Database, ArrowRight, CheckCircle2, CloudDownload, RefreshCw } from 'lucide-react';

interface MockIntegrationProps {
  onImportPatient: (patientData: Omit<Patient, 'id' | 'lastUpdated' | 'situation' | 'pendingList' | 'alerts' | 'observations' | 'nextShiftSummary' | 'status'>) => void;
  onClose: () => void;
}

// Sample hospital database records retrieved through the simulated REST API
const SIMULATED_REST_PATIENTS = [
  {
    name: 'Geraldo Alencar Santos',
    bed: 'F3',
    chartNumber: '08291048',
    age: 59,
    sex: 'M',
    diagnosis: 'DPOC Exacerbado / Insuficiência Respiratória',
    sector: 'Ala Respiratória B'
  },
  {
    name: 'Letícia de Melo Oliveira',
    bed: 'D15',
    chartNumber: '05728493',
    age: 41,
    sex: 'F',
    diagnosis: 'Pancreatite Aguda Em Investigação',
    sector: 'Clínica Médica'
  },
  {
    name: 'Juliana Barbosa Lima',
    bed: 'UTI-8',
    chartNumber: '09123847',
    age: 26,
    sex: 'F',
    diagnosis: 'Pós-Operatório de Colecistectomia por Videolaparoscopia',
    sector: 'Unidade de Terapia Intensiva'
  },
  {
    name: 'Marcos Aurelio Ferreira',
    bed: 'G1',
    chartNumber: '03849182',
    age: 71,
    sex: 'M',
    diagnosis: 'Infarto Agudo do Miocárdio de Parede Anterior',
    sector: 'Unidade Coronariana'
  }
];

export default function MockIntegration({ onImportPatient, onClose }: MockIntegrationProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);

  const handleImport = (index: number) => {
    setLoadingId(index);
    setSuccessId(null);

    // Simulate REST API latency (800ms)
    setTimeout(() => {
      const selected = SIMULATED_REST_PATIENTS[index];
      onImportPatient({
        name: selected.name,
        bed: selected.bed,
        chartNumber: selected.chartNumber,
        age: selected.age,
        sex: selected.sex,
        diagnosis: selected.diagnosis,
        sector: selected.sector,
        responsibleNurse: 'Enfermeiro Integrado'
      });
      setLoadingId(null);
      setSuccessId(index);
      
      // Clear success indicator after 1.5 seconds and close
      setTimeout(() => {
        setSuccessId(null);
        onClose();
      }, 1200);
    }, 800);
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl max-w-lg mx-auto border border-slate-200/85 dark:border-slate-800/85 shadow-xl relative">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">
            Módulo de Integração (API REST EHR)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Simulador de importação de pacientes integrados aos sistemas do hospital.
          </p>
        </div>
      </div>

      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-3.5 mb-5 text-xs text-emerald-800 dark:text-emerald-300">
        <p className="font-semibold flex items-center gap-1">
          <CloudDownload className="w-3.5 h-3.5" />
          Preparado para Integração MV, Tasy ou Prontuários Externos
        </p>
        <p className="mt-1 leading-relaxed opacity-90">
          Selecione um paciente abaixo para simular a chamada de API. O sistema irá consultar a base externa, preencher dados demográficos e de internação, de modo que você só precise redigir os dados operacionais da passagem.
        </p>
      </div>

      <div className="space-y-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
          Prontuários Disponíveis na API (/api/v1/patients/active)
        </span>

        {SIMULATED_REST_PATIENTS.map((p, idx) => (
          <div 
            key={idx}
            className="group flex items-center justify-between p-3.5 border border-slate-150 dark:border-slate-850 hover:border-emerald-200 dark:hover:border-emerald-900 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-emerald-50/10 dark:hover:bg-emerald-950/10 rounded-xl transition-all"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                  {p.bed}
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {p.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Prontuário {p.chartNumber} • {p.age} anos ({p.sex})
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium italic line-clamp-1">
                Diag: {p.diagnosis}
              </p>
            </div>

            <button
              id={`btn-import-rest-${idx}`}
              onClick={() => handleImport(idx)}
              disabled={loadingId !== null}
              className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-semibold cursor-pointer select-none border transition-all ${
                successId === idx
                  ? 'bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-400'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-850'
              }`}
            >
              {loadingId === idx ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Importando...
                </>
              ) : successId === idx ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Importado!
                </>
              ) : (
                <>
                  Importar
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button
          id="btn-close-integration-modal"
          onClick={onClose}
          className="py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 rounded-xl cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
