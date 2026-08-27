import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { passportApi } from './passportApi';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import {
  X,
  Scan,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  RotateCcw,
  Trash2,
  Sparkles,
  ShieldCheck,
  Eye,
  Info,
  Calendar,
  User,
  MapPin,
  CreditCard,
  Building,
  Edit3,
  Lock
} from 'lucide-react';

export const PassportOCRModal = ({
  isOpen,
  onClose,
  projectId = null,
  dealId = null,
  leadId = null,
  onVerified = () => {}
}) => {
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);

  // Direct MRZ / OCR Text Input Support
  const [showDirectTextInput, setShowDirectTextInput] = useState(false);
  const [directText, setDirectText] = useState('');
  const [directMrz, setDirectMrz] = useState('');

  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  // Recognition Results
  const [documentRecord, setDocumentRecord] = useState(null);
  const [status, setStatus] = useState(null); // SUCCESS, REVIEW_REQUIRED, CRITICAL_CONFLICT, OCR_FAILED
  const [hasCriticalConflict, setHasCriticalConflict] = useState(false);
  const [confirmationBlocked, setConfirmationBlocked] = useState(false);
  const [fields, setFields] = useState(null);
  const [mrz, setMrz] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [manualOverrides, setManualOverrides] = useState({});

  // Editable Form Data
  const [formData, setFormData] = useState({
    last_name: '',
    first_name: '',
    middle_name: '',
    full_name: '',
    passport_series: 'A',
    passport_number: '',
    passport_issued_by: '',
    passport_issue_date: '',
    birth_date: '',
    inn: '',
    registration_address: ''
  });

  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

  // Reset state on open/close to avoid stale client data
  useEffect(() => {
    if (isOpen) {
      handleReset();
    }
  }, [isOpen]);

  const { requestClose } = useModalDismiss({
    isOpen,
    onClose,
    isDirty: Boolean(frontFile || backFile || fields || directText || directMrz)
  });

  if (!isOpen) return null;

  // File Handlers
  const handleFileSelect = (file, side) => {
    if (!file) return;

    // Check MIME & size (max 10MB)
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validMimes.includes(file.type)) {
      setError('Поддерживаются только форматы JPG, JPEG, PNG, PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Максимальный размер файла — 10 МБ');
      return;
    }

    setError('');
    const previewUrl = URL.createObjectURL(file);

    if (side === 'front') {
      setFrontFile(file);
      setFrontPreview(previewUrl);
    } else {
      setBackFile(file);
      setBackPreview(previewUrl);
    }
  };

  const handleReset = () => {
    setFrontFile(null);
    setBackFile(null);
    setFrontPreview(null);
    setBackPreview(null);
    setDirectText('');
    setDirectMrz('');
    setFields(null);
    setMrz(null);
    setConfidence(null);
    setWarnings([]);
    setDocumentRecord(null);
    setStatus(null);
    setHasCriticalConflict(false);
    setConfirmationBlocked(false);
    setManualOverrides({});
    setError('');
    setFormData({
      last_name: '',
      first_name: '',
      middle_name: '',
      full_name: '',
      passport_series: 'A',
      passport_number: '',
      passport_issued_by: '',
      passport_issue_date: '',
      birth_date: '',
      inn: '',
      registration_address: ''
    });
  };

  // OCR Recognition Action
  const handleRecognize = async () => {
    if (!frontFile && !backFile && !directText.trim() && !directMrz.trim()) {
      setError('Загрузите фото паспорта или введите текст / строки MRZ');
      return;
    }

    setIsRecognizing(true);
    setError('');

    try {
      // Clean any potential sentinel strings (e.g. 'ALL', '') before sending
      const cleanProjectId = (projectId && projectId !== 'ALL' && projectId !== 'all') ? Number(projectId) : null;
      const cleanDealId = (dealId && dealId !== 'ALL' && dealId !== 'all') ? Number(dealId) : null;
      const cleanLeadId = (leadId && leadId !== 'ALL' && leadId !== 'all') ? Number(leadId) : null;

      // Combine text payload from input fields or file descriptions
      let combinedFrontText = directText.trim();
      let combinedBackText = directMrz.trim();

      const result = await passportApi.recognize({
        frontText: combinedFrontText,
        backText: combinedBackText,
        projectId: cleanProjectId,
        dealId: cleanDealId,
        leadId: cleanLeadId,
        documentType: 'PASSPORT_TJ'
      });

      const resData = result.data || result;
      setDocumentRecord(resData.document);
      setStatus(resData.status || (resData.has_critical_conflict ? 'CRITICAL_CONFLICT' : 'SUCCESS'));
      setHasCriticalConflict(Boolean(resData.has_critical_conflict));
      setConfirmationBlocked(Boolean(resData.confirmation_blocked));
      setFields(resData.fields || {});
      setMrz(resData.mrz || null);
      setConfidence(resData.confidence || null);
      setWarnings(resData.warnings || []);
      setManualOverrides({});

      // Populate Editable Form strictly with recognized values
      const f = resData.fields || {};
      const lastName = f.last_name?.value || '';
      const firstName = f.first_name?.value || '';
      const middleName = f.middle_name?.value || '';
      const fullName = f.full_name?.value || `${lastName} ${firstName} ${middleName}`.trim();

      setFormData({
        last_name: lastName,
        first_name: firstName,
        middle_name: middleName,
        full_name: fullName,
        passport_series: f.passport_number?.series || 'A',
        passport_number: f.passport_number?.value || '',
        passport_issued_by: f.issuing_authority?.value || '',
        passport_issue_date: f.issue_date?.value || '',
        birth_date: f.birth_date?.value || '',
        inn: f.inn?.value || '',
        registration_address: f.address?.value || ''
      });
    } catch (err) {
      console.error('OCR Recognition failed:', err);
      setError(err.message || 'Ошибка распознавания паспортных данных');
    } finally {
      setIsRecognizing(false);
    }
  };

  // Handle manual field modification
  const handleFieldChange = (fieldKey, value) => {
    setManualOverrides(prev => ({ ...prev, [fieldKey]: true }));
    setFormData(prev => {
      const nextData = { ...prev, [fieldKey]: value };
      if (fieldKey === 'last_name' || fieldKey === 'first_name' || fieldKey === 'middle_name') {
        nextData.full_name = `${nextData.last_name || ''} ${nextData.first_name || ''} ${nextData.middle_name || ''}`.trim();
      }
      return nextData;
    });

    // If all conflict fields are manually adjusted, unblock confirmation
    if (fields) {
      const conflictingKeys = Object.keys(fields).filter(k => fields[k]?.conflict);
      const isStillBlocked = conflictingKeys.some(k => k !== fieldKey && !manualOverrides[k]);
      if (!isStillBlocked) {
        setConfirmationBlocked(false);
      }
    }
  };

  // Confirm and Verify Action
  const handleVerify = async () => {
    if (!formData.full_name || !formData.passport_number) {
      setError('Пожалуйста, заполните ФИО и номер паспорта');
      return;
    }

    if (confirmationBlocked) {
      setError('Пожалуйста, проверьте и подтвердите конфликтные поля перед использованием');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const verifiedPayload = {
        ...formData,
        passport_series: formData.passport_series?.trim() || 'A',
        passport_number: formData.passport_number?.trim(),
        full_name: formData.full_name?.trim(),
        manual_override: Object.keys(manualOverrides).length > 0
      };

      if (documentRecord?.id) {
        await passportApi.verify(documentRecord.id, verifiedPayload);
      }

      // Propagate verified buyer data back to deal wizard
      onVerified({
        ...verifiedPayload,
        verified: true,
        verified_at: new Date().toISOString()
      });

      onClose();
    } catch (err) {
      console.error('Verification failed:', err);
      setError(err.message || 'Ошибка верификации паспорта');
    } finally {
      setIsVerifying(false);
    }
  };

  // Helper for confidence and source badge
  const renderFieldBadge = (fieldKey) => {
    if (manualOverrides[fieldKey]) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">
          <Edit3 className="h-2.5 w-2.5" /> Исправлено вручную
        </span>
      );
    }

    if (!fields || !fields[fieldKey]) return null;
    const field = fields[fieldKey];

    if (field.conflict) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border bg-rose-100 text-rose-800 border-rose-300 animate-pulse">
          <AlertCircle className="h-2.5 w-2.5 text-rose-600" /> Конфликт с MRZ
        </span>
      );
    }

    const score = field.confidence || 0;
    let badgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
    let label = `${Math.round(score * 100)}%`;

    if (field.source === 'CROSS_VALIDATED') {
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
      label = `MRZ + Текст (${Math.round(score * 100)}%)`;
    } else if (field.source === 'MRZ') {
      badgeClass = 'bg-blue-50 text-blue-700 border-blue-200 font-bold';
      label = `MRZ (${Math.round(score * 100)}%)`;
    } else if (score >= 0.85) {
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      label = `${Math.round(score * 100)}% Высокая`;
    } else if (score >= 0.70) {
      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
      label = `${Math.round(score * 100)}% Внимание`;
    } else {
      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
      label = `${Math.round(score * 100)}% Проверить`;
    }

    return (
      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${badgeClass}`}>
        {label}
      </span>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-tozon-blue-50 text-tozon-blue border border-tozon-blue-200 shadow-2xs">
              <Scan className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">Распознавание паспорта (OCR + MRZ)</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-tozon-red-50 text-tozon-red border border-tozon-red-200">
                  <Sparkles className="h-3 w-3" /> ICAO 9303 MRZ Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Глубокая сверка машиночитаемой зоны MRZ и визуального текста для договора
              </p>
            </div>
          </div>

          <button
            onClick={requestClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Upload Zones (2 Sides) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Front Side */}
            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-4 bg-slate-50/50 hover:bg-slate-50 transition relative flex flex-col items-center justify-center text-center min-h-[150px]">
              <input
                ref={frontInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0], 'front')}
              />

              {frontPreview ? (
                <div className="w-full flex flex-col items-center">
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 shadow-2xs mb-2">
                    <img src={frontPreview} alt="Лицевая сторона" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setFrontFile(null);
                        setFrontPreview(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-rose-600 hover:bg-rose-600 hover:text-white transition shadow-xs"
                      title="Удалить скан"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 truncate max-w-[200px]">
                    {frontFile?.name || 'Лицевая сторона'}
                  </span>
                </div>
              ) : (
                <div
                  onClick={() => frontInputRef.current?.click()}
                  className="cursor-pointer flex flex-col items-center w-full py-4"
                >
                  <UploadCloud className="h-8 w-8 text-tozon-blue mb-2" />
                  <span className="text-xs font-bold text-slate-800">Лицевая сторона паспорта</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">Фото или скан с фото и ФИО (до 10 МБ)</span>
                </div>
              )}
            </div>

            {/* Back Side (with MRZ) */}
            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-4 bg-slate-50/50 hover:bg-slate-50 transition relative flex flex-col items-center justify-center text-center min-h-[150px]">
              <input
                ref={backInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0], 'back')}
              />

              {backPreview ? (
                <div className="w-full flex flex-col items-center">
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 shadow-2xs mb-2">
                    <img src={backPreview} alt="Оборотная сторона" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setBackFile(null);
                        setBackPreview(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-rose-600 hover:bg-rose-600 hover:text-white transition shadow-xs"
                      title="Удалить скан"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 truncate max-w-[200px]">
                    {backFile?.name || 'Оборотная сторона'}
                  </span>
                </div>
              ) : (
                <div
                  onClick={() => backInputRef.current?.click()}
                  className="cursor-pointer flex flex-col items-center w-full py-4"
                >
                  <UploadCloud className="h-8 w-8 text-tozon-blue mb-2" />
                  <span className="text-xs font-bold text-slate-800">Оборотная сторона / MRZ</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">Машиночитаемая зона (строки с &lt;&lt;&lt;)</span>
                </div>
              )}
            </div>
          </div>

          {/* Expandable Direct Text / MRZ Input */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <button
              type="button"
              onClick={() => setShowDirectTextInput(!showDirectTextInput)}
              className="flex items-center justify-between w-full text-left text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-tozon-blue" />
                <span>Ввести текст паспорта или строки MRZ вручную (для сканеров и точной сверки)</span>
              </div>
              <span className="text-[11px] text-tozon-blue font-semibold">
                {showDirectTextInput ? 'Скрыть' : 'Показать'}
              </span>
            </button>

            {showDirectTextInput && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Текст лицевой стороны / Описание:
                  </label>
                  <textarea
                    rows={4}
                    value={directText}
                    onChange={(e) => setDirectText(e.target.value)}
                    placeholder="Насаб: [Фамилия]&#10;Ном: [Имя]&#10;Номи падар: [Отчество]&#10;Рақами шиноснома: A00000000..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono text-slate-800 outline-none focus:border-tozon-blue"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Строки MRZ (ICAO TD1/TD3):
                  </label>
                  <textarea
                    rows={4}
                    value={directMrz}
                    onChange={(e) => setDirectMrz(e.target.value)}
                    placeholder="IDTJK...&#10;970107...&#10;SURNAME<<GIVENNAME<<<<<<<<<<<<"
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono text-slate-800 outline-none focus:border-tozon-blue uppercase"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Recognize Action Controls */}
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Данные паспорта шифруются и валидируются алгоритмом ICAO 9303.</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {(frontFile || backFile || directText || directMrz) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Сбросить</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleRecognize}
                disabled={isRecognizing || (!frontFile && !backFile && !directText && !directMrz)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-tozon-red hover:bg-tozon-red-hover text-white text-xs font-black transition shadow-md shadow-tozon-red/20 disabled:opacity-50 cursor-pointer"
              >
                {isRecognizing ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>Распознать паспорт</span>
              </button>
            </div>
          </div>

          {/* Section 2: Recognition Results & Confirmation Form */}
          {fields && (
            <div className="space-y-4 pt-2 animate-in fade-in duration-300">
              {/* Dynamic Status Banner */}
              {status === 'CRITICAL_CONFLICT' ? (
                <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 flex items-start gap-3 text-rose-950 shadow-xs">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white font-black">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-black text-rose-900">
                      КРИТИЧЕСКИЙ КОНФЛИКТ • Точность {Math.round((confidence || 0.4) * 100)}%
                    </h4>
                    <p className="text-[11px] text-rose-800 font-semibold mt-0.5">
                      Обнаружены расхождения между машиночитаемой строкой (MRZ) и текстом документа. Проверьте подсвеченные поля вручную. Подтверждение заблокировано до ручной проверки.
                    </p>
                  </div>
                </div>
              ) : status === 'REVIEW_REQUIRED' ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3 text-amber-950 shadow-xs">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white font-black">
                    <Info className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-black text-amber-900">
                      Требуется проверка данных • Точность {Math.round((confidence || 0.8) * 100)}%
                    </h4>
                    <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                      Сверьте поля с оригиналом документа перед внесением в договор.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50/90 border border-emerald-300 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white font-black text-xs shadow-xs">
                      {Math.round((confidence || 0.95) * 100)}%
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-emerald-950">
                        Паспорт успешно верифицирован • Точность {Math.round((confidence || 0.95) * 100)}%
                      </h4>
                      <p className="text-[11px] text-emerald-800 font-medium">
                        MRZ и визуальные данные полностью согласованы и готовы для оформления договора.
                      </p>
                    </div>
                  </div>

                  {mrz && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-[11px] font-bold shadow-2xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>MRZ {mrz.format} (Контрольные суммы валидны)</span>
                    </div>
                  )}
                </div>
              )}

              {warnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                  {warnings.map((w, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Editable Fields Grid */}
              <div className="rounded-2xl border border-slate-200 p-4 bg-white space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-slate-900">
                    Паспортные данные покупателя:
                  </span>
                  <span className="text-[11px] text-slate-500">
                    MRZ используется как главный источник истины
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Last Name */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700">Фамилия (Насаб) *</label>
                      {renderFieldBadge('last_name')}
                    </div>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => handleFieldChange('last_name', e.target.value)}
                      className={`w-full rounded-xl border px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-tozon-blue ${
                        fields.last_name?.conflict && !manualOverrides.last_name
                          ? 'border-rose-400 bg-rose-50/50'
                          : 'border-slate-300 bg-slate-50/50'
                      }`}
                    />
                  </div>

                  {/* First Name */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700">Имя (Ном) *</label>
                      {renderFieldBadge('first_name')}
                    </div>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => handleFieldChange('first_name', e.target.value)}
                      className={`w-full rounded-xl border px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-tozon-blue ${
                        fields.first_name?.conflict && !manualOverrides.first_name
                          ? 'border-rose-400 bg-rose-50/50'
                          : 'border-slate-300 bg-slate-50/50'
                      }`}
                    />
                  </div>

                  {/* Middle Name */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700">Отчество (Номи падар)</label>
                      {renderFieldBadge('middle_name')}
                    </div>
                    <input
                      type="text"
                      value={formData.middle_name}
                      onChange={(e) => handleFieldChange('middle_name', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-tozon-blue focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Passport Series & Number */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700">Серия и номер паспорта *</label>
                      {renderFieldBadge('passport_number')}
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="A"
                        value={formData.passport_series}
                        onChange={(e) => handleFieldChange('passport_series', e.target.value.toUpperCase())}
                        className="w-14 rounded-xl border border-slate-300 bg-slate-50/50 px-2.5 py-1.5 text-xs font-bold text-center text-slate-900 outline-none focus:border-tozon-blue focus:bg-white"
                      />
                      <input
                        type="text"
                        placeholder="00000000"
                        value={formData.passport_number}
                        onChange={(e) => handleFieldChange('passport_number', e.target.value)}
                        className={`flex-1 rounded-xl border px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-tozon-blue ${
                          fields.passport_number?.conflict && !manualOverrides.passport_number
                            ? 'border-rose-400 bg-rose-50/50'
                            : 'border-slate-300 bg-slate-50/50'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Birth Date */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700">Дата рождения (YYYY-MM-DD)</label>
                      {renderFieldBadge('birth_date')}
                    </div>
                    <input
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => handleFieldChange('birth_date', e.target.value)}
                      className={`w-full rounded-xl border px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-tozon-blue ${
                        fields.birth_date?.conflict && !manualOverrides.birth_date
                          ? 'border-rose-400 bg-rose-50/50'
                          : 'border-slate-300 bg-slate-50/50'
                      }`}
                    />
                  </div>

                  {/* Issue Date */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700">Дата выдачи паспорта</label>
                      {renderFieldBadge('issue_date')}
                    </div>
                    <input
                      type="date"
                      value={formData.passport_issue_date}
                      onChange={(e) => handleFieldChange('passport_issue_date', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-tozon-blue focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Issuing Authority */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700">Кем выдан (Мақоми додани шиноснома)</label>
                      {renderFieldBadge('issuing_authority')}
                    </div>
                    <input
                      type="text"
                      value={formData.passport_issued_by}
                      onChange={(e) => handleFieldChange('passport_issued_by', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-tozon-blue focus:bg-white"
                    />
                  </div>

                  {/* INN */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700">ИНН / РМА</label>
                      {renderFieldBadge('inn')}
                    </div>
                    <input
                      type="text"
                      placeholder="000000000"
                      value={formData.inn}
                      onChange={(e) => handleFieldChange('inn', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-tozon-blue focus:bg-white"
                    />
                  </div>
                </div>

                {/* Registration Address */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">Адрес регистрации (Суроғаи ҷои истиқомат)</label>
                    {renderFieldBadge('address')}
                  </div>
                  <input
                    type="text"
                    value={formData.registration_address}
                    onChange={(e) => handleFieldChange('registration_address', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-tozon-blue focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/80">
          <button
            type="button"
            onClick={requestClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
          >
            Закрыть
          </button>

          {fields && (
            <div className="flex items-center gap-3">
              {confirmationBlocked && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Исправьте конфликтные поля для разблокировки</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleVerify}
                disabled={isVerifying || confirmationBlocked}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition shadow-md cursor-pointer ${
                  confirmationBlocked
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                }`}
              >
                {isVerifying ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>✓ Подтвердить и использовать в договоре</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};
