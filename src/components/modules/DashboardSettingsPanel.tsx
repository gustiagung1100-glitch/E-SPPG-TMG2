import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../lib/store';
import {
  DASHBOARD_SECTIONS_META,
  LEADERSHIP_AND_SUPERVISOR_ROLES,
  buildDefaultDashboardLayoutConfig,
  sanitizeDashboardLayoutConfig,
} from '../../lib/dashboardConfig';
import { ALL_ROLES_LIST } from '../../lib/routeGuard';
import {
  DashboardDensity,
  DashboardKpiColumns,
  DashboardLayoutConfig,
  DashboardSectionId,
  DashboardSectionWidth,
  RoleType,
} from '../../types';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  ArrowDown,
  ArrowUp,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Columns3,
  Eye,
  EyeOff,
  LayoutGrid,
  Lock,
  Plus,
  RotateCcw,
  Save,
  Shield,
  SlidersHorizontal,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';

interface DashboardSettingsPanelProps {
  onClose?: () => void;
  compactHeader?: boolean;
}

export const DashboardSettingsPanel: React.FC<DashboardSettingsPanelProps> = ({
  onClose,
  compactHeader = false,
}) => {
  const {
    dashboardLayoutConfig,
    updateDashboardLayoutConfig,
    resetDashboardLayoutConfig,
    webAccessUsers,
    currentUser,
  } = useApp();

  const isAdmin = currentUser.role === 'Admin Utama';

  const [draft, setDraft] = useState<DashboardLayoutConfig>(() =>
    sanitizeDashboardLayoutConfig(dashboardLayoutConfig)
  );
  const [expandedSectionId, setExpandedSectionId] = useState<DashboardSectionId | null>(null);
  const [sectionSearch, setSectionSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedUserEmailBySection, setSelectedUserEmailBySection] = useState<Record<string, string>>({});
  const [customEmailInputBySection, setCustomEmailInputBySection] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  useEffect(() => {
    setDraft(sanitizeDashboardLayoutConfig(dashboardLayoutConfig));
  }, [dashboardLayoutConfig]);

  const hasUnsavedChanges = useMemo(() => {
    const normalize = (cfg: DashboardLayoutConfig) =>
      JSON.stringify({
        sectionOrder: cfg.sectionOrder,
        density: cfg.density,
        kpiColumns: cfg.kpiColumns,
        sections: cfg.sections,
      });
    return normalize(draft) !== normalize(dashboardLayoutConfig);
  }, [draft, dashboardLayoutConfig]);

  const metaById = useMemo(() => {
    const map = new Map<DashboardSectionId, (typeof DASHBOARD_SECTIONS_META)[number]>();
    for (const meta of DASHBOARD_SECTIONS_META) {
      map.set(meta.id, meta);
    }
    return map;
  }, []);

  const orderedSections = useMemo(() => {
    return draft.sectionOrder
      .map(id => {
        const meta = metaById.get(id);
        const cfg = draft.sections[id];
        if (!meta || !cfg) return null;
        return { meta, cfg };
      })
      .filter((item): item is { meta: (typeof DASHBOARD_SECTIONS_META)[number]; cfg: DashboardLayoutConfig['sections'][DashboardSectionId] } => Boolean(item));
  }, [draft, metaById]);

  const filteredOrderedSections = useMemo(() => {
    const q = sectionSearch.trim().toLowerCase();
    return orderedSections.filter(({ meta }) => {
      if (categoryFilter !== 'ALL' && meta.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        meta.title.toLowerCase().includes(q) ||
        meta.description.toLowerCase().includes(q) ||
        meta.category.toLowerCase().includes(q)
      );
    });
  }, [orderedSections, sectionSearch, categoryFilter]);

  const moveSection = (id: DashboardSectionId, direction: -1 | 1) => {
    if (!isAdmin) return;
    setDraft(prev => {
      const idx = prev.sectionOrder.indexOf(id);
      if (idx === -1) return prev;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= prev.sectionOrder.length) return prev;
      const nextOrder = [...prev.sectionOrder];
      const [moved] = nextOrder.splice(idx, 1);
      nextOrder.splice(targetIdx, 0, moved);
      return {
        ...prev,
        sectionOrder: nextOrder,
      };
    });
  };

  const toggleSectionEnabled = (id: DashboardSectionId) => {
    if (!isAdmin) return;
    setDraft(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [id]: {
          ...prev.sections[id],
          enabled: !prev.sections[id].enabled,
        },
      },
    }));
  };

  const changeSectionWidth = (id: DashboardSectionId, width: DashboardSectionWidth) => {
    if (!isAdmin) return;
    setDraft(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [id]: {
          ...prev.sections[id],
          width,
        },
      },
    }));
  };

  const toggleRoleVisibility = (id: DashboardSectionId, role: RoleType) => {
    if (!isAdmin || role === 'Admin Utama') return;
    setDraft(prev => {
      const current = prev.sections[id];
      const exists = current.allowedRoles.includes(role);
      const nextRoles = exists
        ? current.allowedRoles.filter(r => r !== role)
        : ALL_ROLES_LIST.filter(r => r === role || current.allowedRoles.includes(r));
      return {
        ...prev,
        sections: {
          ...prev.sections,
          [id]: {
            ...current,
            allowedRoles: nextRoles,
          },
        },
      };
    });
  };

  const applyRolePreset = (
    id: DashboardSectionId,
    preset: 'all' | 'leadership' | 'admin_only'
  ) => {
    if (!isAdmin) return;
    let nextRoles: RoleType[] = ['Admin Utama'];
    if (preset === 'all') {
      nextRoles = [...ALL_ROLES_LIST];
    } else if (preset === 'leadership') {
      nextRoles = [...LEADERSHIP_AND_SUPERVISOR_ROLES];
    }
    setDraft(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [id]: {
          ...prev.sections[id],
          allowedRoles: nextRoles,
        },
      },
    }));
  };

  const addUserOverride = (
    id: DashboardSectionId,
    targetType: 'allow' | 'block',
    rawEmail: string
  ) => {
    if (!isAdmin) return;
    const cleanEmail = rawEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return;

    setDraft(prev => {
      const current = prev.sections[id];
      const nextAllowed = current.allowedEmails.filter(e => e !== cleanEmail);
      const nextBlocked = current.blockedEmails.filter(e => e !== cleanEmail);

      if (targetType === 'allow') {
        nextAllowed.push(cleanEmail);
      } else {
        nextBlocked.push(cleanEmail);
      }

      return {
        ...prev,
        sections: {
          ...prev.sections,
          [id]: {
            ...current,
            allowedEmails: nextAllowed,
            blockedEmails: nextBlocked,
          },
        },
      };
    });

    setCustomEmailInputBySection(prev => ({ ...prev, [id]: '' }));
  };

  const removeUserOverride = (
    id: DashboardSectionId,
    targetType: 'allow' | 'block',
    email: string
  ) => {
    if (!isAdmin) return;
    setDraft(prev => {
      const current = prev.sections[id];
      return {
        ...prev,
        sections: {
          ...prev.sections,
          [id]: {
            ...current,
            allowedEmails:
              targetType === 'allow'
                ? current.allowedEmails.filter(e => e !== email)
                : current.allowedEmails,
            blockedEmails:
              targetType === 'block'
                ? current.blockedEmails.filter(e => e !== email)
                : current.blockedEmails,
          },
        },
      };
    });
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    setIsSaving(true);
    try {
      await updateDashboardLayoutConfig(draft);
      if (onClose) onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetConfirmed = async () => {
    setIsResetConfirmOpen(false);
    await resetDashboardLayoutConfig();
    setDraft(buildDefaultDashboardLayoutConfig());
  };

  const categories = [
    'ALL',
    'Ringkasan Utama',
    'Operasional Dapur',
    'Keuangan & Stok',
    'Gizi & Kepatuhan',
  ] as const;

  const activeSectionsCount = orderedSections.filter(s => s.cfg.enabled).length;
  const restrictedSectionsCount = orderedSections.filter(
    s =>
      s.cfg.allowedRoles.length < ALL_ROLES_LIST.length ||
      s.cfg.blockedEmails.length > 0 ||
      s.cfg.allowedEmails.length > 0
  ).length;

  return (
    <div className="space-y-5">
      {/* Header & Summary */}
      {!compactHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-[#1E3A8A] dark:text-sky-400 shrink-0" />
              <span>Pengaturan Manual Tata Letak &amp; Hak Lihat Dashboard Terpadu</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Atur urutan posisi blok, lebar kolom tampilan, serta tentukan secara spesifik peran &amp; akun yang boleh atau dilarang melihat setiap data.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-600 dark:text-slate-300 shrink-0 tabular-nums">
            <strong>{activeSectionsCount}</strong>/{orderedSections.length} Bagian Aktif ·{' '}
            <strong>{restrictedSectionsCount}</strong> Dibatasi
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            Mode Lihat Saja: Perubahan tata letak &amp; siapa yang boleh melihat data Dashboard Terpadu hanya dapat dilakukan oleh peran <strong>Admin Utama</strong>.
          </span>
        </div>
      )}

      {/* Global Layout Controls */}
      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/80 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#1E3A8A] dark:text-sky-400" />
            <span>Kerapatan Tata Letak Dashboard</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: 'compact', label: 'Ringkas' },
                { value: 'comfortable', label: 'Standar' },
                { value: 'spacious', label: 'Lega' },
              ] as { value: DashboardDensity; label: string }[]
            ).map(opt => (
              <button
                key={opt.value}
                type="button"
                disabled={!isAdmin}
                onClick={() => setDraft(prev => ({ ...prev, density: opt.value }))}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition cursor-pointer disabled:opacity-60 ${
                  draft.density === opt.value
                    ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] dark:bg-sky-600 dark:border-sky-500 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-2">
            <Columns3 className="w-3.5 h-3.5 text-[#0F766E] dark:text-teal-400" />
            <span>Jumlah Kolom Kartu KPI (Baris 1 &amp; Keuangan)</span>
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {(
              [
                { value: 'auto', label: 'Auto' },
                { value: 2, label: '2 Kol' },
                { value: 3, label: '3 Kol' },
                { value: 4, label: '4 Kol' },
                { value: 5, label: '5 Kol' },
              ] as { value: DashboardKpiColumns; label: string }[]
            ).map(opt => (
              <button
                key={String(opt.value)}
                type="button"
                disabled={!isAdmin}
                onClick={() => setDraft(prev => ({ ...prev, kpiColumns: opt.value }))}
                className={`py-2 px-2 rounded-lg text-xs font-bold border transition cursor-pointer disabled:opacity-60 ${
                  draft.kpiColumns === opt.value
                    ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter & Quick Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#1E3A8A] text-white dark:bg-sky-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {cat === 'ALL' ? `Semua (${orderedSections.length})` : cat}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={sectionSearch}
          onChange={e => setSectionSearch(e.target.value)}
          placeholder="Cari blok data dashboard..."
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 sm:w-60"
        />
      </div>

      {/* Section Order, Width & Granular Visibility Matrix */}
      <div className="space-y-2.5">
        {filteredOrderedSections.map(({ meta, cfg }) => {
          const orderIndex = draft.sectionOrder.indexOf(meta.id);
          const isFirst = orderIndex === 0;
          const isLast = orderIndex === draft.sectionOrder.length - 1;
          const isExpanded = expandedSectionId === meta.id;
          const deniedRolesCount = ALL_ROLES_LIST.length - cfg.allowedRoles.length;
          const selectedEmail = selectedUserEmailBySection[meta.id] || '';
          const customEmail = customEmailInputBySection[meta.id] || '';

          return (
            <div
              key={meta.id}
              className={`rounded-xl border transition ${
                cfg.enabled
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/60 opacity-85'
              }`}
            >
              {/* Main Row */}
              <div className="p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Left: Reorder + Title + Meta */}
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                    <button
                      type="button"
                      disabled={!isAdmin || isFirst}
                      onClick={() => moveSection(meta.id, -1)}
                      title="Geser ke atas"
                      className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={!isAdmin || isLast}
                      onClick={() => moveSection(meta.id, 1)}
                      title="Geser ke bawah"
                      className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-400">
                        #{orderIndex + 1}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {meta.title}
                      </h4>
                      {meta.isSensitive && (
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                          [Data Sensitif]
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      {meta.description}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
                      <span>
                        Boleh Lihat: <strong className="text-emerald-700 dark:text-emerald-400">{cfg.allowedRoles.length}/{ALL_ROLES_LIST.length} Peran</strong>
                      </span>
                      {deniedRolesCount > 0 && (
                        <span>
                          Ditutup: <strong className="text-rose-700 dark:text-rose-400">{deniedRolesCount} Peran</strong>
                        </span>
                      )}
                      {cfg.allowedEmails.length > 0 && (
                        <span>
                          +<strong className="text-sky-700 dark:text-sky-400">{cfg.allowedEmails.length}</strong> Akun Khusus
                        </span>
                      )}
                      {cfg.blockedEmails.length > 0 && (
                        <span>
                          -<strong className="text-rose-700 dark:text-rose-400">{cfg.blockedEmails.length}</strong> Akun Dilarang
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Width + Visibility Toggle + Configure Access Button */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 text-[11px] font-bold">
                    {(
                      [
                        { value: 'full', label: '1/1 Penuh' },
                        { value: 'half', label: '1/2' },
                        { value: 'third', label: '1/3' },
                      ] as { value: DashboardSectionWidth; label: string }[]
                    ).map(w => (
                      <button
                        key={w.value}
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => changeSectionWidth(meta.id, w.value)}
                        className={`px-2.5 py-1.5 transition cursor-pointer disabled:opacity-60 ${
                          cfg.width === w.value
                            ? 'bg-[#1E3A8A] text-white dark:bg-sky-600'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => toggleSectionEnabled(meta.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer disabled:opacity-60 ${
                      cfg.enabled
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900'
                        : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}
                  >
                    {cfg.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{cfg.enabled ? 'Tampil' : 'Sembunyi'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedSectionId(isExpanded ? null : meta.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      isExpanded
                        ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] dark:bg-sky-600'
                        : 'bg-white dark:bg-slate-800 text-[#1E3A8A] dark:text-sky-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Siapa Boleh Lihat</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expanded Granular Access Panel */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-4">
                  {/* Role Visibility Toggles */}
                  <div className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          Akses Tampilan Berdasarkan Peran (13 Peran Sistem)
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Klik setiap peran untuk mengizinkan (Dapat Melihat) atau melarang (Tidak Dapat Melihat) blok data ini.
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => applyRolePreset(meta.id, 'all')}
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900 cursor-pointer"
                          >
                            Semua Boleh Lihat
                          </button>
                          <button
                            type="button"
                            onClick={() => applyRolePreset(meta.id, 'leadership')}
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] border border-blue-200 dark:bg-blue-950/60 dark:text-sky-300 dark:border-blue-900 cursor-pointer"
                          >
                            Pimpinan &amp; Pengawas
                          </button>
                          <button
                            type="button"
                            onClick={() => applyRolePreset(meta.id, 'admin_only')}
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900 cursor-pointer"
                          >
                            Hanya Admin Utama
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {ALL_ROLES_LIST.map(role => {
                        const isLocked = role === 'Admin Utama';
                        const isAllowed = isLocked || cfg.allowedRoles.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            disabled={!isAdmin || isLocked}
                            onClick={() => toggleRoleVisibility(meta.id, role)}
                            className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left text-xs transition cursor-pointer disabled:cursor-not-allowed ${
                              isAllowed
                                ? 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800 text-slate-800 dark:text-slate-100'
                                : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/70 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <span className="font-semibold truncate">{role}</span>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold shrink-0 ${
                                isAllowed
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-rose-700 dark:text-rose-400'
                              }`}
                            >
                              {isLocked ? (
                                <>
                                  <Lock className="w-3 h-3" />
                                  <span>Selalu Lihat</span>
                                </>
                              ) : isAllowed ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Bisa Lihat</span>
                                </>
                              ) : (
                                <>
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Tidak Lihat</span>
                                </>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Per-Account Exceptions: Allowed Emails & Blocked Emails */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Pengecualian Per Akun / Pengguna Spesifik (Override Peran)
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Gunakan kontrol ini untuk mengizinkan pengguna tertentu melihat data meski perannya ditutup, atau melarang pengguna tertentu melihat data meski perannya diizinkan.
                      </p>
                    </div>

                    {isAdmin && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                        {/* Pick from registered webAccessUsers */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <select
                            value={selectedEmail}
                            onChange={e =>
                              setSelectedUserEmailBySection(prev => ({
                                ...prev,
                                [meta.id]: e.target.value,
                              }))
                            }
                            aria-label="Pilih akun pengguna terdaftar"
                            className="flex-1 min-w-[180px] px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                          >
                            <option value="">-- Pilih Akun Login Terdaftar --</option>
                            {webAccessUsers
                              .filter(u => u.role !== 'Admin Utama')
                              .map(u => (
                                <option key={u.id} value={u.email}>
                                  {u.name} ({u.role}) — {u.email}
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            disabled={!selectedEmail}
                            onClick={() => addUserOverride(meta.id, 'allow', selectedEmail)}
                            className="px-2.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Izinkan</span>
                          </button>
                          <button
                            type="button"
                            disabled={!selectedEmail}
                            onClick={() => addUserOverride(meta.id, 'block', selectedEmail)}
                            className="px-2.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Larang</span>
                          </button>
                        </div>

                        {/* Or enter email directly */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <input
                            type="email"
                            value={customEmail}
                            onChange={e =>
                              setCustomEmailInputBySection(prev => ({
                                ...prev,
                                [meta.id]: e.target.value,
                              }))
                            }
                            placeholder="Atau ketik email akun..."
                            className="flex-1 min-w-[180px] px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                          />
                          <button
                            type="button"
                            disabled={!customEmail.includes('@')}
                            onClick={() => addUserOverride(meta.id, 'allow', customEmail)}
                            className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Boleh</span>
                          </button>
                          <button
                            type="button"
                            disabled={!customEmail.includes('@')}
                            onClick={() => addUserOverride(meta.id, 'block', customEmail)}
                            className="px-2.5 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 disabled:opacity-40 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Blokir</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Two lists: Allowed & Blocked */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/70">
                        <div className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Akun Diizinkan Khusus ({cfg.allowedEmails.length})</span>
                        </div>
                        {cfg.allowedEmails.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">
                            Belum ada akun khusus yang diberi izin tambahan.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {cfg.allowedEmails.map(email => {
                              const userMatch = webAccessUsers.find(
                                u => u.email.trim().toLowerCase() === email
                              );
                              return (
                                <div
                                  key={email}
                                  className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-emerald-50/70 dark:bg-emerald-950/40 text-[11px]"
                                >
                                  <span className="truncate text-slate-800 dark:text-slate-200">
                                    {userMatch ? <strong>{userMatch.name} · </strong> : null}
                                    <span className="font-mono">{email}</span>
                                  </span>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => removeUserOverride(meta.id, 'allow', email)}
                                      className="text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                                      title="Hapus pengecualian"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/70">
                        <div className="font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1.5 mb-2">
                          <UserX className="w-3.5 h-3.5" />
                          <span>Akun Dilarang Melihat ({cfg.blockedEmails.length})</span>
                        </div>
                        {cfg.blockedEmails.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">
                            Belum ada akun yang diblokir secara khusus.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {cfg.blockedEmails.map(email => {
                              const userMatch = webAccessUsers.find(
                                u => u.email.trim().toLowerCase() === email
                              );
                              return (
                                <div
                                  key={email}
                                  className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-rose-50/70 dark:bg-rose-950/40 text-[11px]"
                                >
                                  <span className="truncate text-slate-800 dark:text-slate-200">
                                    {userMatch ? <strong>{userMatch.name} · </strong> : null}
                                    <span className="font-mono">{email}</span>
                                  </span>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => removeUserOverride(meta.id, 'block', email)}
                                      className="text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                                      title="Hapus blokir akun"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Bar */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          {hasUnsavedChanges ? (
            <span className="font-bold text-amber-700 dark:text-amber-400">
              Ada perubahan yang belum disimpan. Klik Simpan untuk menerapkan ke Dashboard Terpadu.
            </span>
          ) : dashboardLayoutConfig.updatedBy ? (
            <span>
              Terakhir disimpan oleh <strong>{dashboardLayoutConfig.updatedBy}</strong>
            </span>
          ) : (
            <span>Menggunakan tata letak &amp; hak lihat default sistem.</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1E3A8A] hover:bg-[#162C6B] dark:bg-sky-600 dark:hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Tata Letak & Hak Lihat'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetConfirmed}
        title="Reset Pengaturan Dashboard Terpadu?"
        message="Seluruh urutan blok, ukuran kolom, dan pembatasan peran/akun pada Dashboard Terpadu akan dikembalikan ke konfigurasi bawaan (semua blok tampil untuk seluruh peran)."
        confirmLabel="Ya, Reset ke Default"
      />
    </div>
  );
};
