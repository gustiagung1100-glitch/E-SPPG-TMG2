import React, { useState, useEffect } from 'react';
import { MotionConfig, motion, AnimatePresence } from 'motion/react';
import {
  DynamicFieldType,
  DynamicFormField,
  DynamicFormId,
  DynamicFormSchema,
} from '../../types';
import { useApp } from '../../lib/store';
import { processFacilityImageUpload } from './FacilityTempUploadSection';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Save,
  RotateCcw,
  Code,
  Upload,
  Eye,
  X,
  HelpCircle,
  CheckCircle2,
  ListPlus,
  TableProperties,
  Sparkles,
} from 'lucide-react';

export const DYNAMIC_FIELD_TYPE_OPTIONS: { value: DynamicFieldType; label: string }[] = [
  { value: 'text', label: 'Text (Teks Singkat)' },
  { value: 'number', label: 'Number (Angka)' },
  { value: 'date', label: 'Date (Tanggal)' },
  { value: 'select', label: 'Dropdown / Select' },
  { value: 'checkbox', label: 'Checkbox (Centang Ya/Tidak)' },
  { value: 'radio', label: 'Radio Button (Pilihan Tunggal)' },
  { value: 'textarea', label: 'Textarea (Paragraf)' },
  { value: 'photo', label: 'Upload Foto (Gambar)' },
];

function slugifyFieldKey(label: string, existingKeys: Set<string>): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'kolom_baru';
  let candidate = `cf_${base}`;
  let idx = 2;
  while (existingKeys.has(candidate)) {
    candidate = `cf_${base}_${idx}`;
    idx += 1;
  }
  return candidate;
}

interface DynamicFormEditToggleBarProps {
  formId: DynamicFormId;
  isEditing: boolean;
  onToggleEdit: () => void;
  compact?: boolean;
  extraSelector?: React.ReactNode;
}

export const DynamicFormEditToggleBar: React.FC<DynamicFormEditToggleBarProps> = ({
  formId,
  isEditing,
  onToggleEdit,
  compact = false,
  extraSelector,
}) => {
  const { isAdminUser, dynamicFormSchemas } = useApp();
  if (!isAdminUser) return null;

  const schema = dynamicFormSchemas[formId];
  const totalFields = schema?.fields.length || 0;
  const customCount = schema?.fields.filter(f => !f.isSystem).length || 0;

  return (
    <div
      className={`print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
        compact
          ? 'px-3 py-2 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70'
          : 'px-4 py-3 rounded-2xl bg-linear-to-r from-slate-50 via-amber-50/60 to-blue-50/60 dark:from-slate-900 dark:via-amber-950/20 dark:to-slate-900 border border-amber-200/80 dark:border-amber-800/50 shadow-2xs'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0">
          <SlidersHorizontal className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {schema?.title || 'Konfigurasi Form'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {totalFields} Field
            </span>
            {customCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                +{customCount} Kolom Custom
              </span>
            )}
          </div>
          {!compact && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Admin/Superuser dapat mengubah label, tipe input, urutan drag-and-drop, hingga menambah kolom tabel & ekspor.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap shrink-0">
        {extraSelector}
        <button
          type="button"
          onClick={onToggleEdit}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
            isEditing
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{isEditing ? 'Tutup Mode Edit Form' : 'Edit Struktur Form'}</span>
        </button>
      </div>
    </div>
  );
};

interface DynamicFormBuilderPanelProps {
  formId: DynamicFormId;
  onClose?: () => void;
}

export const DynamicFormBuilderPanel: React.FC<DynamicFormBuilderPanelProps> = ({
  formId,
  onClose,
}) => {
  const {
    dynamicFormSchemas,
    saveDynamicFormSchema,
    resetDynamicFormSchema,
    isAdminUser,
    addToast,
  } = useApp();

  const savedSchema = dynamicFormSchemas[formId];
  const [draftSchema, setDraftSchema] = useState<DynamicFormSchema>(savedSchema);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setDraftSchema(savedSchema);
    setHasUnsavedChanges(false);
  }, [savedSchema, formId]);

  if (!isAdminUser || !draftSchema) return null;

  const updateField = (index: number, patch: Partial<DynamicFormField>) => {
    setDraftSchema(prev => {
      const nextFields = [...prev.fields];
      nextFields[index] = { ...nextFields[index], ...patch };
      return { ...prev, fields: nextFields };
    });
    setHasUnsavedChanges(true);
  };

  const handleAddField = () => {
    const existingKeys = new Set(draftSchema.fields.map(f => f.key));
    const idxNum = draftSchema.fields.filter(f => !f.isSystem).length + 1;
    const defaultLabel = `Kolom Tambahan ${idxNum}`;
    const newKey = slugifyFieldKey(defaultLabel, existingKeys);
    const newField: DynamicFormField = {
      id: `cf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      key: newKey,
      label: defaultLabel,
      type: 'text',
      placeholder: 'Masukkan nilai...',
      helperText: '',
      required: false,
      options: ['Opsi 1', 'Opsi 2'],
      isSystem: false,
      showInTable: true,
      width: 'half',
    };
    setDraftSchema(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setHasUnsavedChanges(true);
  };

  const handleRemoveField = (index: number) => {
    if (draftSchema.fields.length <= 1) {
      addToast('warning', 'Minimal 1 Field', 'Form harus memiliki minimal satu field aktif.');
      return;
    }
    setDraftSchema(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
    setHasUnsavedChanges(true);
  };

  const handleMoveField = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= draftSchema.fields.length || fromIdx === toIdx) return;
    setDraftSchema(prev => {
      const next = [...prev.fields];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { ...prev, fields: next };
    });
    setHasUnsavedChanges(true);
  };

  const handleAddOption = (fieldIndex: number, fieldId: string) => {
    const raw = (newOptionInputs[fieldId] || '').trim();
    if (!raw) return;
    const target = draftSchema.fields[fieldIndex];
    const nextOptions = [...(target.options || []), raw];
    updateField(fieldIndex, { options: nextOptions });
    setNewOptionInputs(prev => ({ ...prev, [fieldId]: '' }));
  };

  const handleUpdateOption = (fieldIndex: number, optIndex: number, value: string) => {
    const target = draftSchema.fields[fieldIndex];
    const nextOptions = [...(target.options || [])];
    nextOptions[optIndex] = value;
    updateField(fieldIndex, { options: nextOptions });
  };

  const handleRemoveOption = (fieldIndex: number, optIndex: number) => {
    const target = draftSchema.fields[fieldIndex];
    const nextOptions = (target.options || []).filter((_, idx) => idx !== optIndex);
    updateField(fieldIndex, { options: nextOptions });
  };

  const handleSave = async () => {
    const sanitizedFields = draftSchema.fields.map(f => ({
      ...f,
      label: f.label.trim() || f.key,
      options:
        f.type === 'select' || f.type === 'radio'
          ? (f.options || []).map(o => o.trim()).filter(Boolean)
          : f.options,
    }));
    await saveDynamicFormSchema(formId, {
      ...draftSchema,
      fields: sanitizedFields,
    });
    setHasUnsavedChanges(false);
  };

  const handleReset = async () => {
    await resetDynamicFormSchema(formId);
    setHasUnsavedChanges(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="print:hidden bg-white dark:bg-slate-900 rounded-2xl border-2 border-amber-400/70 dark:border-amber-700/80 shadow-lg overflow-hidden"
      >
        {/* Builder Header */}
        <div className="px-4 py-3.5 bg-amber-50/90 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Mode Edit Form Builder — {draftSchema.title}
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                v{draftSchema.version}
              </span>
              {hasUnsavedChanges && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                  Belum Disimpan
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Seret kartu field (Drag & Drop) atau gunakan panah Atas/Bawah untuk menyusun urutan. Field tambahan otomatis muncul di Tabel & Ekspor Excel/PDF.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAddField}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Kolom/Field</span>
            </button>
            <button
              type="button"
              onClick={() => setShowJsonPreview(v => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition"
            >
              <Code className="w-3.5 h-3.5" />
              <span>{showJsonPreview ? 'Tutup JSON' : 'JSON Schema'}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ke Default</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Perubahan Form</span>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="Tutup Mode Edit"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Optional Collapsible JSON Schema Inspector */}
        <AnimatePresence>
          {showJsonPreview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-slate-950 text-emerald-300"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    Struktur JSON Schema ({draftSchema.formId})
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Synced: LocalStorage & Firestore
                  </span>
                </div>
                <pre className="text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed">
                  {JSON.stringify(draftSchema, null, 2)}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Field List with Drag & Drop + Arrow Reorder + Motion Animations */}
        <div className="p-4 space-y-3 max-h-[540px] overflow-y-auto bg-slate-50/60 dark:bg-slate-950/30">
          <AnimatePresence initial={false}>
            {draftSchema.fields.map((field, index) => {
              const isDragging = draggedIdx === index;
              const isDragOver = dragOverIdx === index && draggedIdx !== index;
              const supportsOptions = field.type === 'select' || field.type === 'radio';

              return (
                <motion.div
                  key={field.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -24, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  draggable
                  onDragStart={() => setDraggedIdx(index)}
                  onDragOver={e => {
                    e.preventDefault();
                    if (dragOverIdx !== index) setDragOverIdx(index);
                  }}
                  onDrop={e => {
                    e.preventDefault();
                    if (draggedIdx !== null && draggedIdx !== index) {
                      handleMoveField(draggedIdx, index);
                    }
                    setDraggedIdx(null);
                    setDragOverIdx(null);
                  }}
                  onDragEnd={() => {
                    setDraggedIdx(null);
                    setDragOverIdx(null);
                  }}
                  className={`p-3.5 rounded-xl border bg-white dark:bg-slate-900 transition ${
                    isDragging
                      ? 'opacity-50 border-amber-500 shadow-md'
                      : isDragOver
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Top Control Strip */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        title="Seret untuk mengatur ulang urutan field"
                        className="cursor-grab active:cursor-grabbing p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                      >
                        <GripVertical className="w-4 h-4" />
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-500">
                        #{index + 1}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          field.isSystem
                            ? 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {field.isSystem ? `Field Inti (${field.key})` : `Kolom Custom (${field.key})`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveField(index, index - 1)}
                        title="Geser ke Atas"
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === draftSchema.fields.length - 1}
                        onClick={() => handleMoveField(index, index + 1)}
                        title="Geser ke Bawah"
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveField(index)}
                        title="Hapus Field"
                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Field Settings Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                    <div className="md:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Label Field
                      </label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={e => updateField(index, { label: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Tipe Input
                      </label>
                      <select
                        value={field.type}
                        onChange={e => {
                          const nextType = e.target.value as DynamicFieldType;
                          updateField(index, {
                            type: nextType,
                            options:
                              (nextType === 'select' || nextType === 'radio') &&
                              (!field.options || field.options.length === 0)
                                ? ['Pilihan 1', 'Pilihan 2']
                                : field.options,
                          });
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        {DYNAMIC_FIELD_TYPE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Placeholder
                      </label>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={e => updateField(index, { placeholder: e.target.value })}
                        placeholder="Teks contoh isian..."
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Lebar Grid
                      </label>
                      <select
                        value={field.width || 'half'}
                        onChange={e =>
                          updateField(index, { width: e.target.value as 'half' | 'full' })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="half">1/2 Baris</option>
                        <option value="full">Penuh (Full)</option>
                      </select>
                    </div>

                    <div className="md:col-span-6">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Teks Bantuan (Helper Text)
                      </label>
                      <input
                        type="text"
                        value={field.helperText || ''}
                        onChange={e => updateField(index, { helperText: e.target.value })}
                        placeholder="Penjelasan singkat di bawah kolom input (opsional)..."
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="md:col-span-6 flex flex-wrap items-center gap-4 pt-4">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={e => updateField(index, { required: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-900"
                        />
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          Wajib Diisi (Required)
                        </span>
                      </label>

                      {!field.isSystem && (
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={field.showInTable !== false}
                            onChange={e => updateField(index, { showInTable: e.target.checked })}
                            className="w-4 h-4 rounded text-emerald-600"
                          />
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                            <TableProperties className="w-3.5 h-3.5" />
                            Tampil di Tabel & Ekspor Excel/PDF
                          </span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Dropdown / Radio Options Editor */}
                  {supportsOptions && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                          <ListPlus className="w-3.5 h-3.5 text-blue-700 dark:text-sky-400" />
                          Daftar Opsi Pilihan ({field.type === 'select' ? 'Dropdown/Select' : 'Radio Button'})
                        </span>
                        {field.isSystem && (!field.options || field.options.length === 0) && (
                          <span className="text-[10px] text-amber-700 dark:text-amber-300 italic">
                            Opsi ditarik otomatis dari Master Data (bisa ditambah opsi manual)
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(field.options || []).map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-2 pr-1 py-1"
                          >
                            <input
                              type="text"
                              value={opt}
                              onChange={e => handleUpdateOption(index, optIdx, e.target.value)}
                              className="bg-transparent text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none w-32"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(index, optIdx)}
                              className="p-0.5 text-slate-400 hover:text-rose-600 rounded"
                              title="Hapus Opsi"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                        <div className="inline-flex items-center gap-1">
                          <input
                            type="text"
                            value={newOptionInputs[field.id] || ''}
                            onChange={e =>
                              setNewOptionInputs(prev => ({
                                ...prev,
                                [field.id]: e.target.value,
                              }))
                            }
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddOption(index, field.id);
                              }
                            }}
                            placeholder="Tambah opsi baru..."
                            className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:bg-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddOption(index, field.id)}
                            className="px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold"
                          >
                            + Opsi
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Builder Footer */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            Terakhir diperbarui: {new Date(draftSchema.updatedAt).toLocaleString('id-ID')}
            {draftSchema.updatedBy ? ` oleh ${draftSchema.updatedBy}` : ''}
          </span>
          <button
            type="button"
            onClick={handleAddField}
            className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Tambah Kolom/Field Baru
          </button>
        </div>
      </motion.div>
    </MotionConfig>
  );
};

export interface DynamicOptionItem {
  value: string;
  label: string;
}

interface DynamicFormRendererProps {
  schema: DynamicFormSchema;
  values: Record<string, any>;
  onChange: (key: string, value: any, field: DynamicFormField) => void;
  dynamicOptions?: Record<string, Array<DynamicOptionItem | string>>;
  excludeKeys?: string[];
  afterFieldRender?: (field: DynamicFormField) => React.ReactNode;
  customRenderField?: (field: DynamicFormField) => React.ReactNode | undefined;
  onPreviewPhoto?: (url: string) => void;
  onUploadError?: (msg: string) => void;
}

export function validateDynamicFormFields(
  schema: DynamicFormSchema | undefined,
  values: Record<string, any>,
  excludeKeys: string[] = []
): string | null {
  if (!schema) return null;
  const excluded = new Set(excludeKeys);
  for (const field of schema.fields) {
    if (excluded.has(field.key) || !field.required) continue;
    const val = values[field.key];
    if (field.type === 'checkbox') {
      if (!val) return `Field "${field.label}" wajib dicentang.`;
    } else if (field.type === 'number') {
      if (val === undefined || val === null || val === '' || Number.isNaN(Number(val))) {
        return `Field "${field.label}" wajib diisi dengan angka yang valid.`;
      }
    } else if (val === undefined || val === null || String(val).trim() === '') {
      return `Field "${field.label}" wajib diisi.`;
    }
  }
  return null;
}

export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  schema,
  values,
  onChange,
  dynamicOptions = {},
  excludeKeys = [],
  afterFieldRender,
  customRenderField,
  onPreviewPhoto,
  onUploadError,
}) => {
  const excludedSet = new Set(excludeKeys);
  const visibleFields = schema.fields.filter(f => !excludedSet.has(f.key));

  const getFieldValue = (field: DynamicFormField) => {
    const raw = values[field.key];
    if (raw !== undefined && raw !== null) return raw;
    if (field.type === 'checkbox') return Boolean(field.defaultValue ?? false);
    if (field.type === 'number') return field.defaultValue ?? '';
    return field.defaultValue ?? '';
  };

  const resolveOptions = (field: DynamicFormField): DynamicOptionItem[] => {
    const dynamicList = dynamicOptions[field.key];
    if (dynamicList && dynamicList.length > 0) {
      const normalized = dynamicList.map(item =>
        typeof item === 'string' ? { value: item, label: item } : item
      );
      const extraFromSchema = (field.options || [])
        .filter(o => !normalized.some(n => n.value === o || n.label === o))
        .map(o => ({ value: o, label: o }));
      return [...normalized, ...extraFromSchema];
    }
    return (field.options || []).map(o => ({ value: o, label: o }));
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <AnimatePresence initial={false}>
          {visibleFields.map(field => {
            const customOverride = customRenderField?.(field);
            if (customOverride !== undefined) {
              return (
                <React.Fragment key={field.id}>
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className={field.width === 'full' ? 'md:col-span-2' : 'md:col-span-1'}
                  >
                    {customOverride}
                  </motion.div>
                  {afterFieldRender?.(field)}
                </React.Fragment>
              );
            }

            const value = getFieldValue(field);
            const resolvedOptions = resolveOptions(field);
            const options =
              field.type === 'select' &&
              value !== undefined &&
              value !== null &&
              String(value).trim() !== '' &&
              !resolvedOptions.some(o => o.value === String(value))
                ? [...resolvedOptions, { value: String(value), label: String(value) }]
                : resolvedOptions;
            const colSpanClass = field.width === 'full' ? 'md:col-span-2' : 'md:col-span-1';

            return (
              <React.Fragment key={field.id}>
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className={colSpanClass}
                >
                  {field.type !== 'checkbox' && (
                    <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                      {field.label}
                      {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                    </label>
                  )}

                  {field.type === 'text' && (
                    <input
                      type="text"
                      required={field.required}
                      value={String(value)}
                      onChange={e => onChange(field.key, e.target.value, field)}
                      placeholder={field.placeholder || ''}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  )}

                  {field.type === 'number' && (
                    <input
                      type="number"
                      step="any"
                      required={field.required}
                      value={value === '' ? '' : Number(value)}
                      onChange={e =>
                        onChange(
                          field.key,
                          e.target.value === '' ? '' : Number(e.target.value),
                          field
                        )
                      }
                      placeholder={field.placeholder || '0'}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  )}

                  {field.type === 'date' && (
                    <input
                      type="date"
                      required={field.required}
                      value={String(value)}
                      onChange={e => onChange(field.key, e.target.value, field)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  )}

                  {field.type === 'select' && (
                    <select
                      required={field.required}
                      value={String(value)}
                      onChange={e => onChange(field.key, e.target.value, field)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                      {!field.required ? (
                        <option value="">-- Pilih --</option>
                      ) : (
                        options.length > 0 && (
                          <option value="" disabled>
                            -- Pilih --
                          </option>
                        )
                      )}
                      {options.length === 0 && (
                        <option value="">-- Tidak ada opsi tersedia --</option>
                      )}
                      {options.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === 'radio' && (
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {options.map(opt => {
                        const checked = String(value) === opt.value;
                        return (
                          <label
                            key={opt.value}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition ${
                              checked
                                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-sky-300 font-bold'
                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`dyn_${schema.formId}_${field.id}`}
                              value={opt.value}
                              checked={checked}
                              onChange={e => onChange(field.key, e.target.value, field)}
                              className="text-blue-900"
                            />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {field.type === 'checkbox' && (
                    <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800 transition">
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={e => onChange(field.key, e.target.checked, field)}
                        className="w-4 h-4 mt-0.5 rounded text-blue-900"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                        {field.label}
                        {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                      </span>
                    </label>
                  )}

                  {field.type === 'textarea' && (
                    <textarea
                      rows={2}
                      required={field.required}
                      value={String(value)}
                      onChange={e => onChange(field.key, e.target.value, field)}
                      placeholder={field.placeholder || ''}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  )}

                  {field.type === 'photo' && (
                    <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold cursor-pointer transition shadow-2xs">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{value ? 'Ganti Foto' : 'Upload Foto'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e =>
                              processFacilityImageUpload(
                                e,
                                url => onChange(field.key, url, field),
                                onUploadError
                              )
                            }
                          />
                        </label>
                        {value && (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Foto Terlampir
                            </span>
                            {onPreviewPhoto && (
                              <button
                                type="button"
                                onClick={() => onPreviewPhoto(String(value))}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                              >
                                <Eye className="w-3 h-3" />
                                Lihat
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onChange(field.key, '', field)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100"
                            >
                              <X className="w-3 h-3" />
                              Hapus
                            </button>
                          </div>
                        )}
                      </div>
                      {value && (
                        <img
                          src={String(value)}
                          alt={field.label}
                          onClick={() => onPreviewPhoto?.(String(value))}
                          className="h-24 w-auto rounded-lg object-cover border border-slate-200 dark:border-slate-700 cursor-pointer"
                        />
                      )}
                    </div>
                  )}

                  {field.helperText && (
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <HelpCircle className="w-3 h-3 shrink-0" />
                      <span>{field.helperText}</span>
                    </p>
                  )}
                </motion.div>
                {afterFieldRender?.(field)}
              </React.Fragment>
            );
          })}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
};
