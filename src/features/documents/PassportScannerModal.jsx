import React, { useState, useRef, useEffect } from 'react';
import { passportApi } from './passportApi';
import { useI18n } from '../../context/i18nContext';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  ArrowRight,
  ShieldAlert,
  Eye,
  Plus,
  Trash2,
  Building2,
  Globe,
  Info
} from 'lucide-react';

const FLAG_EMOJIS = {
  TJK: '🇹🇯',
  RUS: '🇷🇺',
  UZB: '🇺🇿',
  KAZ: '🇰🇿',
  KGZ: '🇰🇬',
  BLR: '🇧🇾',
  ARM: '🇦🇲',
  AZE: '🇦🇿'
};

export const PassportScannerModal = ({
  isOpen,
  onClose,
  onConfirmData,
  existingClientData = null
}) => {
  const { lang, t } = useI18n();

  const [step, setStep] = useState('UPLOAD'); // 'UPLOAD' | 'ANALYZING' | 'REVIEW'
  const [files, setFiles] = useState([
    { id: 'front', label: 'Основная страница / Лицевая сторона', file: null, previewUrl: null }
  ]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);

  // Form fields state for human review & editing
  const [fields, setFields] = useState({
    full_name: '',
    passport_series: '',
    passport_number: '',
    passport_issued_by: '',
    passport_issue_date: '',
    birth_date: '',
    registration_address: '',
    inn: '',
    sex: '',
    country: '',
    country_name: '',
    document_type: ''
  });

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [activeUploadSlotIndex, setActiveUploadSlotIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    // Revoke object URLs to avoid memory leaks
    files.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setStep('UPLOAD');
    setFiles([
      { id: 'front', label: 'Основная страница / Лицевая сторона', file: null, previewUrl: null }
    ]);
    setActivePreviewIndex(0);
    setIsLoading(false);
    setErrorMessage('');
    setAnalysisResult(null);
    setFields({
      full_name: '',
      passport_series: '',
      passport_number: '',
      passport_issued_by: '',
      passport_issue_date: '',
      birth_date: '',
      registration_address: '',
      inn: '',
      sex: '',
      country: '',
      country_name: '',
      document_type: ''
    });
  };

  if (!isOpen) return null;

  const handleFileSelect = (slotIndex, selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('image/')) {
      setErrorMessage('Разрешены только изображения (JPG, PNG, WEBP)');
      return;
    }

    const previewUrl = URL.createObjectURL(selectedFile);

    setFiles((prev) => {
      const copy = [...prev];
      if (copy[slotIndex]?.previewUrl) {
        URL.revokeObjectURL(copy[slotIndex].previewUrl);
      }
      copy[slotIndex] = {
        ...copy[slotIndex],
        file: selectedFile,
        previewUrl
      };
      return copy;
    });

    setErrorMessage('');
  };

  const addImageSlot = () => {
    if (files.length >= 4) return;
    const nextSlotNum = files.length + 1;
    setFiles((prev) => [
      ...prev,
      {
        id: `slot_${nextSlotNum}`,
        label: `Дополнительная страница ${nextSlotNum}`,
        file: null,
        previewUrl: null
      }
    ]);
  };

  const removeImageSlot = (index) => {
    if (files.length <= 1) return;
    setFiles((prev) => {
      const copy = [...prev];
      if (copy[index]?.previewUrl) {
        URL.revokeObjectURL(copy[index].previewUrl);
      }
      copy.splice(index, 1);
      return copy;
    });
  };

  const triggerUpload = (slotIndex, useCamera = false) => {
    setActiveUploadSlotIndex(slotIndex);
    if (useCamera && cameraInputRef.current) {
      cameraInputRef.current.click();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const startAnalysis = async () => {
    const validFiles = files.filter((f) => f.file).map((f) => f.file);
    if (validFiles.length === 0) {
      setErrorMessage('Пожалуйста, добавьте хотя бы одну фотографию документа');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setStep('ANALYZING');

    try {
      const res = await passportApi.analyzePassport(
        validFiles,
        existingClientData?.id || null
      );

      setAnalysisResult(res);

      if (!res.quality?.acceptable) {
        setStep('UPLOAD');
        setErrorMessage(
          res.warnings?.[0] || 'Изображение непригодно для распознавания. Сделайте более чёткое фото.'
        );
        setIsLoading(false);
        return;
      }

      const doc = res.document || {};

      // Compose full name from surname, given_name, patronymic
      let fullNameCalculated = [doc.surname, doc.given_name, doc.patronymic]
        .filter(Boolean)
        .join(' ');

      if (!fullNameCalculated && (doc.surname_latin || doc.given_name_latin)) {
        fullNameCalculated = [doc.surname_latin, doc.given_name_latin].filter(Boolean).join(' ');
      }

      // Parse series vs number if series combined in doc.document_number
      let pSeries = '';
      let pNum = doc.document_number || '';
      if (doc.document_number) {
        const parts = doc.document_number.trim().split(/\s+/);
        if (parts.length >= 2 && parts[0].length <= 4 && /^[A-Za-zА-Яа-я0-9]+$/.test(parts[0])) {
          pSeries = parts[0];
          pNum = parts.slice(1).join('');
        }
      }

      setFields({
        full_name: fullNameCalculated || '',
        passport_series: pSeries,
        passport_number: pNum,
        passport_issued_by: doc.issuing_authority || '',
        passport_issue_date: doc.issue_date || '',
        birth_date: doc.birth_date || '',
        registration_address: doc.registered_address || '',
        inn: doc.inn || doc.personal_number || '',
        sex: doc.sex || '',
        country: doc.country || 'TJK',
        country_name: doc.country_name || 'Таджикистан',
        document_type: doc.document_type || 'passport'
      });

      setStep('REVIEW');
    } catch (err) {
      console.error('Analysis failed:', err);
      setStep('UPLOAD');
      setErrorMessage(
        err.message || 'Ошибка распознавания. Попробуйте еще раз или введите данные вручную.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (field, val) => {
    setFields((prev) => ({ ...prev, [field]: val }));
  };

  const handleConfirmAndFill = async () => {
    if (onConfirmData) {
      onConfirmData(fields);
    }

    try {
      await passportApi.confirmPassport({
        client_id: existingClientData?.id || null,
        document_country: fields.country,
        document_type: fields.document_type
      });
    } catch (e) {
      console.error('Failed to log confirm audit:', e);
    }

    onClose();
  };

  const isLowConfidence = (fieldName) => {
    if (!analysisResult?.confidence || !analysisResult?.threshold) return false;
    const score = analysisResult.confidence[fieldName];
    return score !== null && score !== undefined && score < analysisResult.threshold;
  };

  const hasExistingValueDiff = (fieldName, newValue) => {
    if (!existingClientData) return false;
    const existingVal = existingClientData[fieldName];
    if (!existingVal || !String(existingVal).trim()) return false;
    return String(existingVal).trim().toLowerCase() !== String(newValue || '').trim().toLowerCase();
  };

  const selectedCountryFlag = FLAG_EMOJIS[fields.country] || '🌐';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => handleFileSelect(activeUploadSlotIndex, e.target.files?.[0])}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileSelect(activeUploadSlotIndex, e.target.files?.[0])}
      />

      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 shadow-inner">
              <Sparkles className="h-5 w-5 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold tracking-tight">AI Passport Scanner V2</h3>
                {step === 'REVIEW' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/30 px-2.5 py-0.5 text-xs font-semibold text-indigo-200 border border-indigo-400/30">
                    <span>{selectedCountryFlag}</span>
                    <span>{fields.country_name || fields.country}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Интеллектуальное распознавание паспортов и ID-карт с нейросетевым Vision AI
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-start gap-3 text-rose-800 text-xs font-medium shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage('')}
              className="text-rose-500 hover:text-rose-700 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* STEP 1: UPLOAD & PHOTO CAPTURE */}
        {step === 'UPLOAD' && (
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h4 className="text-base font-bold text-slate-900">Загрузите или сфотографируйте документ</h4>
              <p className="text-xs text-slate-500">
                Поддерживаются паспорта, ID-карты и загранпаспорта Таджикистана, России, Узбекистана и других стран. Для документов с двумя сторонами загрузите обе фотографии.
              </p>
            </div>

            {/* Photo Slots Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {files.map((slot, index) => (
                <div
                  key={slot.id}
                  className={`relative rounded-2xl border-2 transition p-4 flex flex-col items-center justify-center text-center ${
                    slot.file
                      ? 'border-indigo-500/50 bg-indigo-50/20'
                      : 'border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/50'
                  }`}
                >
                  <div className="w-full flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-700">{slot.label}</span>
                    {files.length > 1 && (
                      <button
                        onClick={() => removeImageSlot(index)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="Удалить страницу"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {slot.previewUrl ? (
                    <div className="relative w-full h-44 rounded-xl overflow-hidden group border border-slate-200 bg-slate-900">
                      <img
                        src={slot.previewUrl}
                        alt={slot.label}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          onClick={() => triggerUpload(index, false)}
                          className="px-3 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-md hover:bg-slate-100 transition cursor-pointer"
                        >
                          Заменить
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-44 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-4 bg-white space-y-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-700">Выберите источник</p>
                        <p className="text-[11px] text-slate-400">JPG, PNG, WEBP до 10MB</p>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => triggerUpload(index, true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition cursor-pointer"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          <span>Камера</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerUpload(index, false)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition cursor-pointer"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>Файл</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add More Slots */}
            {files.length < 4 && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={addImageSlot}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 text-xs font-bold transition cursor-pointer bg-white"
                >
                  <Plus className="h-4 w-4" />
                  <span>Добавить оборотную сторону / страницу 2</span>
                </button>
              </div>
            )}

            {/* Action Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer text-xs"
              >
                Заполнить вручную
              </button>

              <button
                type="button"
                onClick={startAnalysis}
                disabled={!files.some((f) => f.file)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>Распознать через AI</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ANALYZING SPINNER */}
        {step === 'ANALYZING' && (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-5 my-auto">
            <div className="relative flex items-center justify-center">
              <div className="h-20 w-20 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
              <Sparkles className="h-8 w-8 text-indigo-600 absolute" />
            </div>

            <div className="space-y-2">
              <h4 className="text-base font-bold text-slate-900">Выполняется распознавание документа...</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Нейросеть обрабатывает изображение, проверяет качество, считывает макроструктуру и MRZ. Это займёт 2–5 секунд.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: HUMAN VERIFICATION SCREEN (SPLIT VIEW) */}
        {step === 'REVIEW' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            
            {/* LEFT SIDE: Image Viewer & Zoom */}
            <div className="lg:w-1/2 bg-slate-950 p-4 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 shrink-0">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-indigo-400" />
                  <span>Фотография документа</span>
                </span>
                
                {/* Thumbnail switcher if multiple files */}
                {files.filter((f) => f.previewUrl).length > 1 && (
                  <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    {files.filter((f) => f.previewUrl).map((f, idx) => (
                      <button
                        key={f.id}
                        onClick={() => setActivePreviewIndex(idx)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          activePreviewIndex === idx
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Стр. {idx + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 relative rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-800 min-h-[260px]">
                {files[activePreviewIndex]?.previewUrl && (
                  <img
                    src={files[activePreviewIndex].previewUrl}
                    alt="Паспорт"
                    className="max-h-full max-w-full object-contain p-2"
                  />
                )}
              </div>
            </div>

            {/* RIGHT SIDE: Editable Extracted Fields */}
            <div className="lg:w-1/2 p-6 overflow-y-auto space-y-4 bg-white flex flex-col justify-between">
              <div className="space-y-4">
                
                {/* Header Badge & Warnings */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Проверьте данные документа</h4>
                    <p className="text-[11px] text-slate-500">
                      Сверьте извлеченные поля с оригиналом фотографии перед сохранением
                    </p>
                  </div>
                </div>

                {/* Conflict Warnings */}
                {analysisResult?.conflicts?.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                      <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Обнаружено расхождение между визуальной зоной и MRZ</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Проверьте документ вручную. Значения в визуальной текстовой части и в машиносчитываемой строке различаются:
                    </p>
                    <ul className="text-[11px] space-y-1 pl-4 list-disc text-amber-900 font-mono">
                      {analysisResult.conflicts.map((c, i) => (
                        <li key={i}>
                          <strong>{c.field}:</strong> Текст = "{c.visual_value}" vs MRZ = "{c.mrz_value}"
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Form Fields Grid */}
                <div className="space-y-3 text-xs">
                  
                  {/* Full Name */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-slate-800">
                        ФИО Покупателя <span className="text-rose-500">*</span>
                      </label>
                      {isLowConfidence('surname') && (
                        <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Проверьте значение
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={fields.full_name}
                      onChange={(e) => handleFieldChange('full_name', e.target.value)}
                      className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition ${
                        isLowConfidence('surname')
                          ? 'border-amber-400 bg-amber-50/30 focus:border-amber-500'
                          : 'border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white'
                      }`}
                    />
                    {hasExistingValueDiff('full_name', fields.full_name) && (
                      <p className="text-[10px] text-slate-500 mt-1">
                        Текущее значение клиента: <u className="font-bold">{existingClientData.full_name}</u>
                      </p>
                    )}
                  </div>

                  {/* Passport Series & Number */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Серия</label>
                      <input
                        type="text"
                        value={fields.passport_series}
                        onChange={(e) => handleFieldChange('passport_series', e.target.value)}
                        placeholder="А"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div className="col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-slate-800">Номер паспорта</label>
                        {isLowConfidence('document_number') && (
                          <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Проверьте
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={fields.passport_number}
                        onChange={(e) => handleFieldChange('passport_number', e.target.value)}
                        className={`w-full rounded-xl border px-3 py-2 text-xs font-mono font-bold outline-none transition ${
                          isLowConfidence('document_number')
                            ? 'border-amber-400 bg-amber-50/30 focus:border-amber-500'
                            : 'border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Issued By & Issue Date */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-slate-800">Кем выдан</label>
                        {isLowConfidence('issuing_authority') && (
                          <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Проверьте
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={fields.passport_issued_by}
                        onChange={(e) => handleFieldChange('passport_issued_by', e.target.value)}
                        className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition ${
                          isLowConfidence('issuing_authority')
                            ? 'border-amber-400 bg-amber-50/30 focus:border-amber-500'
                            : 'border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Дата выдачи</label>
                      <input
                        type="date"
                        value={fields.passport_issue_date}
                        onChange={(e) => handleFieldChange('passport_issue_date', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Birth Date & INN */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Дата рождения</label>
                      <input
                        type="date"
                        value={fields.birth_date}
                        onChange={(e) => handleFieldChange('birth_date', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">ИНН / РМА</label>
                      <input
                        type="text"
                        value={fields.inn}
                        onChange={(e) => handleFieldChange('inn', e.target.value)}
                        placeholder="665151074"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono font-bold outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Registration Address */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-slate-800">Адрес прописки / регистрации</label>
                      {isLowConfidence('registered_address') && (
                        <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Проверьте
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={fields.registration_address}
                      onChange={(e) => handleFieldChange('registration_address', e.target.value)}
                      className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition ${
                        isLowConfidence('registered_address')
                          ? 'border-amber-400 bg-amber-50/30 focus:border-amber-500'
                          : 'border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white'
                      }`}
                    />
                  </div>

                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setStep('UPLOAD')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Пересканировать</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAndFill}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Подтвердить и заполнить</span>
                </button>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};
