import { useState, useEffect } from 'react';
import { HandoverHistory, Patient } from '../types';
import { getHandoverHistory } from '../lib/dbService';
import { 
  History, 
  ArrowLeftRight, 
  Calendar, 
  User, 
  Printer, 
  ChevronRight, 
  CheckSquare, 
  AlertTriangle, 
  FileText,
  Clock,
  ArrowUpRight
} from 'lucide-react';

interface HistoryModalProps {
  patient: Patient;
  userEmail: string | null;
  onClose: () => void;
}

export default function HistoryModal({ patient, userEmail, onClose }: HistoryModalProps) {
  const [historyList, setHistoryList] = useState<HandoverHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLogA, setSelectedLogA] = useState<HandoverHistory | null>(null);
  const [selectedLogB, setSelectedLogB] = useState<HandoverHistory | null>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const data = await getHandoverHistory(patient.id, userEmail);
        setHistoryList(data);
        if (data.length > 0) {
          setSelectedLogA(data[0]); // Default to latest
          if (data.length > 1) {
            setSelectedLogB(data[1]); // Default previous
          }
        }
      } catch (error) {
        console.error('Error fetching history logs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [patient.id, userEmail]);

  // Clean date-time helper
  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return {
      date: d.toLocaleDateString('pt-BR'),
      time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para gerar o PDF de impressão do relatório.');
      return;
    }

    const patientStatusLabel: Record<string, string> = {
      green: 'Estável (Verde)',
      yellow: 'Atenção (Amarelo)',
      red: 'Prioridade Alta (Vermelho)',
      gray: 'Alta Prevista (Cinza)'
    };

    const patientStatusColor: Record<string, string> = {
      green: '#10b981',
      yellow: '#f59e0b',
      red: '#ef4444',
      gray: '#6b7280'
    };

    const historyTimelineHTML = historyList.length > 0 
      ? historyList.map(h => {
          const { date, time } = formatDateTime(h.timestamp);
          return `
            <div style="border-bottom: 1px solid #e2e8f0; padding: 12px 0;">
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; color: #1e293b;">
                <span>🧑‍⚕️ ${h.recordedBy}</span>
                <span style="color: #64748b;">📅 ${date} - ⏰ ${time}</span>
              </div>
              <p style="margin: 6px 0; font-size: 13px; color: #334155;"><strong>Resumo da Passagem:</strong> "${h.nextShiftSummary || 'Sem resumo cadastrado'}"</p>
              <p style="margin: 4px 0; font-size: 12px; color: #475569;"><strong>Situação Atual:</strong> ${h.situation || 'Não especificada'}</p>
              <div style="margin-top: 6px; font-size: 12px; color: #64748b;">
                <strong>Alertas ativos:</strong> ${h.alerts.join(', ') || 'Nenhum'} | 
                <strong>Observações adicionais:</strong> ${h.observations || 'Nenhuma'}
              </div>
            </div>
          `;
        }).join('')
      : '<p style="color: #64748b; font-style: italic;">Nenhum histórico anterior registrado.</p>';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ShiftPass - Relatório de Passagem de Plantão: ${patient.name}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.5;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .header h1 {
            font-size: 24px;
            margin: 0;
            color: #0f172a;
          }
          .header p {
            margin: 4px 0 0 0;
            font-size: 12px;
            color: #64748b;
          }
          .patient-card {
            background: #f8fafc;
            border-left: 6px solid ${patientStatusColor[patient.status] || '#cbd5e1'};
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 24px;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 16px;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 6px;
            margin-top: 24px;
            margin-bottom: 12px;
            color: #0f172a;
          }
          .checklist-item {
            display: flex;
            align-items: center;
            font-size: 12px;
            margin-bottom: 4px;
          }
          .tag {
            display: inline-block;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 11px;
            margin-right: 6px;
            margin-bottom: 6px;
            font-weight: 500;
          }
          .tag-active {
            background: #fef2f2;
            color: #991b1b;
            border-color: #fca5a5;
          }
          @media print {
            body { padding: 20px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>ShiftPass</h1>
            <p>Relatório de Passagem de Plantão Clínico e Evolução</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Gerado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <p><strong>Hospital Digital</strong></p>
          </div>
        </div>

        <div class="patient-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <h2 style="margin: 0; font-size: 20px;">Leito ${patient.bed} - ${patient.name}</h2>
            <span style="background: ${patientStatusColor[patient.status]}15; color: ${patientStatusColor[patient.status]}; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 12px;">
              ${patientStatusLabel[patient.status]}
            </span>
          </div>
          <div class="grid">
            <div><strong>Prontuário:</strong> ${patient.chartNumber}</div>
            <div><strong>Idade/Sexo:</strong> ${patient.age} anos / ${patient.sex}</div>
            <div><strong>Diagnóstico:</strong> ${patient.diagnosis}</div>
            <div><strong>Última Atualização:</strong> ${new Date(patient.lastUpdated).toLocaleString('pt-BR')}</div>
          </div>
        </div>

        <div class="section-title">Última Passagem de Plantão Ativa</div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px;">
          <p><strong>Resumo para o Próximo Plantão (Foco):</strong></p>
          <p style="background: #f8fafc; padding: 12px; border-radius: 6px; font-style: italic; margin-bottom: 12px; border-left: 4px solid #6366f1;">
            "${patient.nextShiftSummary || 'Nenhum resumo adicionado.'}"
          </p>
          
          <p><strong>Situação Clínica Atual:</strong></p>
          <p style="font-size: 13px; color: #334155; margin-bottom: 12px;">${patient.situation || 'Não descrita.'}</p>

          <p><strong>Alertas Clínicos Destacados:</strong></p>
          <div>
            ${patient.alerts.length > 0 
              ? patient.alerts.map(tag => `<span class="tag tag-active">🚨 ${tag}</span>`).join('') 
              : '<p style="font-size: 12px; color: #64748b;">Sem alertas cadastrados.</p>'}
          </div>

          <p style="margin-top: 12px;"><strong>Pendências Ativas:</strong></p>
          <div>
            ${patient.pendingList.length > 0
              ? patient.pendingList.map(item => `
                  <div class="checklist-item">
                    <span>${item.completed ? '☑️' : '⬜'}</span>
                    <span style="margin-left: 8px; ${item.completed ? 'text-decoration: line-through; color: #94a3b8;' : ''}">${item.text}</span>
                  </div>
                `).join('')
              : '<p style="font-size: 12px; color: #64748b;">Nenhuma pendência.</p>'}
          </div>

          <p style="margin-top: 12px;"><strong>Observações Gerais:</strong></p>
          <p style="font-size: 13px; color: #334155;">${patient.observations || 'Nenhuma observação cadastrada.'}</p>
        </div>

        <div class="section-title">Histórico Cronológico de Evolução (Linha do Tempo)</div>
        <div>
          ${historyTimelineHTML}
        </div>

        <div style="margin-top: 40px; text-align: center;">
          <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 14px;">
            Imprimir ou Salvar como PDF
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Upper header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              Histórico de Passagens
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evolução operacional de <span className="font-semibold">{patient.name}</span>
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            id="btn-print-report"
            onClick={handlePrintReport}
            className="flex items-center gap-2 py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir Relatório (PDF)
          </button>
          <button
            id="btn-close-modal"
            onClick={onClose}
            className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Main content body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Carregando linha do tempo...</p>
          </div>
        ) : historyList.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-8">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400 font-medium text-sm">
              Nenhuma passagem anterior registrada.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
              Ao preencher os dados do paciente e clicar em "Registrar Passagem", uma cópia imutável do plantão será gerada aqui.
            </p>
          </div>
        ) : (
          <>
            {/* Comparator toggle section */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-indigo-500" />
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Comparador Diferencial de Plantões
                  </h4>
                </div>
                <button
                  id="btn-toggle-comparing"
                  onClick={() => setComparing(!comparing)}
                  className={`text-xs font-semibold py-1 px-3 rounded-lg transition-colors cursor-pointer ${
                    comparing 
                      ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400' 
                      : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400'
                  }`}
                >
                  {comparing ? 'Ocultar Comparação' : 'Iniciar Comparação'}
                </button>
              </div>

              {comparing && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Log selector A */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Plantão A (Recente)</label>
                      <select
                        id="select-log-a"
                        value={selectedLogA?.id || ''}
                        onChange={(e) => setSelectedLogA(historyList.find(h => h.id === e.target.value) || null)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                      >
                        {historyList.map(h => {
                          const { date, time } = formatDateTime(h.timestamp);
                          return (
                            <option key={h.id} value={h.id}>
                              {date} {time} — {h.recordedBy}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Log selector B */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Plantão B (Anterior)</label>
                      <select
                        id="select-log-b"
                        value={selectedLogB?.id || ''}
                        onChange={(e) => setSelectedLogB(historyList.find(h => h.id === e.target.value) || null)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                      >
                        {historyList.map(h => {
                          const { date, time } = formatDateTime(h.timestamp);
                          return (
                            <option key={h.id} value={h.id}>
                              {date} {time} — {h.recordedBy}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {selectedLogA && selectedLogB && selectedLogA.id !== selectedLogB.id && (
                    <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden mt-4 text-xs">
                      {/* Grid comparison */}
                      <div className="grid grid-cols-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-800 py-2.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        <div>A: {formatDateTime(selectedLogA.timestamp).date} {formatDateTime(selectedLogA.timestamp).time}</div>
                        <div className="border-l border-slate-200 dark:border-slate-800 pl-4">B: {formatDateTime(selectedLogB.timestamp).date} {formatDateTime(selectedLogB.timestamp).time}</div>
                      </div>

                      <div className="p-4 space-y-4">
                        {/* Summary Comparison */}
                        <div>
                          <h5 className="font-semibold text-indigo-600 dark:text-indigo-400 mb-1">Resumo do Plantão (Foco)</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border-l-2 border-indigo-500 italic">
                              "{selectedLogA.nextShiftSummary || 'Nenhum'}"
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border-l-2 border-slate-400 italic pl-4">
                              "{selectedLogB.nextShiftSummary || 'Nenhum'}"
                            </div>
                          </div>
                        </div>

                        {/* Situation Comparison */}
                        <div>
                          <h5 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Situação Clínica Atual</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg whitespace-pre-wrap">
                              {selectedLogA.situation || 'Não preenchido'}
                            </div>
                            <div className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg whitespace-pre-wrap pl-4">
                              {selectedLogB.situation || 'Não preenchido'}
                            </div>
                          </div>
                        </div>

                        {/* Alerts Comparison */}
                        <div>
                          <h5 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Alertas Destacados</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-wrap gap-1">
                              {selectedLogA.alerts.map(a => (
                                <span key={a} className="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 rounded-md text-[10px] font-medium border border-red-100 dark:border-red-900/50">
                                  {a}
                                </span>
                              ))}
                              {selectedLogA.alerts.length === 0 && <span className="text-slate-400">Nenhum</span>}
                            </div>
                            <div className="flex flex-wrap gap-1 pl-4">
                              {selectedLogB.alerts.map(a => (
                                <span key={a} className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-md text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                                  {a}
                                </span>
                              ))}
                              {selectedLogB.alerts.length === 0 && <span className="text-slate-400">Nenhum</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* General Timeline List */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Linha do Tempo de Passagens
              </h4>

              <div className="relative border-l border-slate-200 dark:border-slate-800 ml-3.5 pl-6 space-y-6">
                {historyList.map((log) => {
                  const { date, time } = formatDateTime(log.timestamp);
                  return (
                    <div key={log.id} className="relative group">
                      {/* Time node circle */}
                      <span className="absolute -left-[31px] top-1.5 flex items-center justify-center w-5.5 h-5.5 rounded-full bg-white dark:bg-slate-900 border border-indigo-500 shadow-sm text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-200">
                        <Clock className="w-3.5 h-3.5" />
                      </span>

                      {/* Content panel */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 hover:shadow-md transition-shadow duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                              🧑‍⚕️ {log.recordedBy}
                            </span>
                            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">
                              Registrado
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{date} às {time}</span>
                          </div>
                        </div>

                        {/* Summary Block */}
                        <div className="mb-4">
                          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            Resumo do Plantão (Foco):
                          </span>
                          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border-l-3 border-indigo-500 italic font-medium leading-relaxed">
                            "{log.nextShiftSummary || 'Nenhum resumo preenchido.'}"
                          </p>
                        </div>

                        {/* Detailed expansion panels */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mt-3 border-t border-slate-100 dark:border-slate-850 pt-3">
                          <div>
                            <span className="font-semibold text-slate-600 dark:text-slate-400">Situação Atual:</span>
                            <p className="text-slate-500 dark:text-slate-400 mt-1 line-clamp-4 leading-relaxed">
                              {log.situation || 'Não especificada.'}
                            </p>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-600 dark:text-slate-400">Observações adicionais:</span>
                            <p className="text-slate-500 dark:text-slate-400 mt-1 line-clamp-4 leading-relaxed">
                              {log.observations || 'Nenhuma observação geral cadastrada.'}
                            </p>
                          </div>
                        </div>

                        {/* Alertas and pending indicators */}
                        {log.alerts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-850">
                            {log.alerts.map((alert) => (
                              <span key={alert} className="inline-flex items-center gap-1 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold border border-red-100 dark:border-red-900/50">
                                <AlertTriangle className="w-3 h-3" />
                                {alert}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
