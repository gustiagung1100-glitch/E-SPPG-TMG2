import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { PrintHeader } from '../common/PrintHeader';
import {
  BASTDocumentSheet,
  resolveBastAutoFields,
  formatBastDayDate,
  generateBastNumber,
  exportBastDocumentPDF,
} from '../common/BASTDocumentSheet';
import { exportTableToPDF, exportToExcel, triggerPrint, formatIndonesianDate } from '../../lib/exportUtils';
import { officialDocumentTemplates } from '../../lib/letterTemplatesData';
import { defaultFacilityTemperatures } from '../../lib/productionData';
import {
  FACILITY_TEMP_UNITS,
  getFacilityTempValue,
  getFacilityPhotoUrl,
} from '../common/FacilityTempUploadSection';
import {
  OutgoingDocument,
  IncomingLetter,
  OfficialDocumentType,
  DocumentTemplate,
} from '../../types';
import {
  Mail,
  Plus,
  Eye,
  FileText,
  Send,
  Inbox,
  CheckCircle,
  Clock,
  Printer,
  Copy,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  FileCheck,
  AlertCircle,
  BookOpen,
  ArrowRight,
  Download,
  Share2,
  Trash2,
  Edit,
  Building,
  UserCheck,
  Calendar,
  Lock,
  Layers,
  FileUp,
  Image as ImageIcon,
} from 'lucide-react';

export const LettersModule: React.FC = () => {
  const {
    sppgConfig,
    outgoingDocuments,
    addOutgoingDocument,
    updateOutgoingDocument,
    deleteOutgoingDocument,
    incomingLetters,
    addIncomingLetter,
    updateIncomingLetter,
    deleteIncomingLetter,
    prepRecords,
    cookingRecords,
    portioningRecords,
    institutions,
    beneficiaryAttendance,
    masterVolunteers,
    distributionLogs,
    currentUser,
    hasPermission,
    addToast,
  } = useApp();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming' | 'templates'>('outgoing');

  // Search & Filters for Outgoing
  const [outgoingSearch, setOutgoingSearch] = useState('');
  const [outgoingTypeFilter, setOutgoingTypeFilter] = useState<string>('ALL');
  const [outgoingStatusFilter, setOutgoingStatusFilter] = useState<string>('ALL');

  // Search & Filters for Incoming
  const [incomingSearch, setIncomingSearch] = useState('');
  const [incomingStatusFilter, setIncomingStatusFilter] = useState<string>('ALL');
  const [incomingCategoryFilter, setIncomingCategoryFilter] = useState<string>('ALL');

  // Modal States
  const [isCreateOutgoingOpen, setIsCreateOutgoingOpen] = useState(false);
  const [isPreviewOutgoingOpen, setIsPreviewOutgoingOpen] = useState(false);
  const [isGoogleDocsOpen, setIsGoogleDocsOpen] = useState(false);
  const [selectedOutgoing, setSelectedOutgoing] = useState<OutgoingDocument | null>(null);

  const [isRegisterIncomingOpen, setIsRegisterIncomingOpen] = useState(false);
  const [isDispositionOpen, setIsDispositionOpen] = useState(false);
  const [isScanPreviewOpen, setIsScanPreviewOpen] = useState(false);
  const [selectedIncoming, setSelectedIncoming] = useState<IncomingLetter | null>(null);

  // Template Viewer Modal
  const [viewingTemplate, setViewingTemplate] = useState<DocumentTemplate | null>(null);
  const [bastInstitutionId, setBastInstitutionId] = useState<string>('');

  // Form State for Creating a Cloned Outgoing Document (Mail Merge)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tmpl-spd');
  const [outgoingForm, setOutgoingForm] = useState({
    letterCode: 'SPD',
    letterNumber: '004/SPD/SPPG-TMG2/MBG/XI/2026',
    date: new Date().toISOString().slice(0, 10),
    subject: 'Surat Perjalanan Dinas Koordinasi Pelaksanaan Program MBG',
    recipientName: 'Dr. H. Ahmad Zaini, S.Pd., M.M.',
    recipientInstitution: 'Badan Gizi Nasional (BGN)',
    recipientAddress: 'Surabaya, Jawa Timur',
    signedBy: sppgConfig.headOfSppg,
    signedRole: 'Kepala SPPG Temenggungan 2',
    status: 'Disahkan' as OutgoingDocument['status'],
    fieldsData: {} as Record<string, string>,
  });

  // Form State for Incoming Letter
  const [incomingForm, setIncomingForm] = useState({
    letterNumber: '',
    letterDate: new Date().toISOString().slice(0, 10),
    receivedDate: new Date().toISOString().slice(0, 10),
    sender: '',
    subject: '',
    category: 'Badan Gizi Nasional (BGN)' as IncomingLetter['category'],
    dispositionTo: 'Kepala SPPG, Pengawas Gizi',
    dispositionInstruction: 'Pelajari, koordinasikan dan tindak lanjuti sesuai SOP.',
    dispositionNotes: '',
    followUpStatus: 'Diterima' as IncomingLetter['followUpStatus'],
    scannedDocumentUrl: '',
  });

  // Current selected template for form
  const activeTemplate = useMemo(() => {
    return officialDocumentTemplates.find(t => t.id === selectedTemplateId) || officialDocumentTemplates[0];
  }, [selectedTemplateId]);

  const buildInitialFieldsForTemplate = (
    tmpl: DocumentTemplate,
    targetDate?: string,
    targetInstId?: string
  ): Record<string, string> => {
    const initialFieldValues: Record<string, string> = {};
    tmpl.fields.forEach(f => {
      initialFieldValues[f.key] = f.defaultValue || '';
    });

    if (tmpl.id === 'tmpl-bast') {
      const resolved = resolveBastAutoFields({
        institutions,
        beneficiaryAttendance,
        masterVolunteers,
        distributionLogs,
        sppgConfig,
        institutionId: targetInstId || institutions[0]?.id,
        date: targetDate || new Date().toISOString().slice(0, 10),
      });
      initialFieldValues['NAMA_LEMBAGA'] = resolved.institutionName;
      initialFieldValues['JUMLAH_PORSI'] = String(resolved.totalPortions);
      initialFieldValues['NAMA_PIC'] = resolved.picName;
      initialFieldValues['NO_HP_PIC'] = resolved.picPhone;
      initialFieldValues['HARI_TANGGAL'] = formatBastDayDate(resolved.date).fullLabel;
      initialFieldValues['JAM_TERIMA'] = resolved.receiveTime;
      initialFieldValues['JAM_KEMBALI'] = resolved.returnTime || '........';
      initialFieldValues['NAMA_PETUGAS_DISTRIBUSI'] = resolved.distributorName;
      initialFieldValues['NO_HP_DISTRIBUSI'] = resolved.distributorPhone;
    }

    if (tmpl.id === 'tmpl-bap-suhu') {
      const pTemps = prepRecords[0]?.facilityTemps || defaultFacilityTemperatures;
      const cTemps = cookingRecords[0]?.facilityTemps || defaultFacilityTemperatures;
      const rTemps = portioningRecords[0]?.facilityTemps || defaultFacilityTemperatures;

      const fmt3 = (tempKey: Parameters<typeof getFacilityTempValue>[1]) =>
        `Div. Persiapan: ${getFacilityTempValue(pTemps, tempKey)}°C | Div. Pengolahan: ${getFacilityTempValue(cTemps, tempKey)}°C | Div. Pemorsian: ${getFacilityTempValue(rTemps, tempKey)}°C`;

      const coolerSummary = FACILITY_TEMP_UNITS.slice(4)
        .map(u => `${u.shortLabel}: ${getFacilityTempValue(pTemps, u.tempKey)}°C`)
        .join(' | ');

      const uploadedCount = FACILITY_TEMP_UNITS.reduce((sum, u) => {
        return (
          sum +
          [
            getFacilityPhotoUrl(pTemps, u.photoKey),
            getFacilityPhotoUrl(cTemps, u.photoKey),
            getFacilityPhotoUrl(rTemps, u.photoKey),
          ].filter(Boolean).length
        );
      }, 0);
      const totalSlots = FACILITY_TEMP_UNITS.length * 3;

      initialFieldValues['RUANG_PEMORSIAN'] = `${fmt3('portioningRoomTemp')} (Standar ≤ 24°C)`;
      initialFieldValues['RUANG_PENGOLAHAN'] = `${fmt3('cookingRoomTemp')} (Standar ≤ 28°C)`;
      initialFieldValues['GUDANG_BASAH'] = `${fmt3('wetWarehouseTemp')} (Standar 10 - 16°C)`;
      initialFieldValues['GUDANG_KERING'] = `${fmt3('dryWarehouseTemp')} (Standar ≤ 25°C)`;
      initialFieldValues['UNIT_PENDINGIN'] = coolerSummary;
      initialFieldValues['KELENGKAPAN_FOTO'] =
        `${uploadedCount}/${totalSlots} bukti foto Ruang Pemorsian, Pengolahan, Gudang Basah/Kering & 6 Pendingin telah terupload di Divisi Persiapan, Pengolahan, dan Pemorsian.`;
      initialFieldValues['PETUGAS_DIVISI'] = [
        prepRecords[0]?.officerName || 'Tim Persiapan',
        cookingRecords[0]?.officerName || 'Tim Pengolahan',
        portioningRecords[0]?.officerName || 'Tim Pemorsian',
      ].join(' • ');
    }

    return initialFieldValues;
  };

  // Helper to sync BAST fields automatically when institution or date changes
  const syncBastFormForInstitutionAndDate = (
    instId: string,
    dateStr: string,
    prevForm: typeof outgoingForm
  ): typeof outgoingForm => {
    const inst = institutions.find(i => i.id === instId) || institutions[0];
    const resolved = resolveBastAutoFields({
      institutions,
      beneficiaryAttendance,
      masterVolunteers,
      distributionLogs,
      sppgConfig,
      institutionId: inst?.id,
      date: dateStr,
    });
    const { fullLabel } = formatBastDayDate(dateStr);

    return {
      ...prevForm,
      date: dateStr,
      subject: `Berita Acara Serah Terima Paket Makanan & Alat Makan (MBG) — ${resolved.institutionName}`,
      recipientName: resolved.picName,
      recipientInstitution: resolved.institutionName,
      recipientAddress: inst?.address || prevForm.recipientAddress,
      fieldsData: {
        ...prevForm.fieldsData,
        NAMA_LEMBAGA: resolved.institutionName,
        JUMLAH_PORSI: String(resolved.totalPortions),
        NAMA_PIC: resolved.picName,
        NO_HP_PIC: resolved.picPhone,
        HARI_TANGGAL: fullLabel,
        JAM_TERIMA: prevForm.fieldsData.JAM_TERIMA || resolved.receiveTime,
        JAM_KEMBALI: prevForm.fieldsData.JAM_KEMBALI || '........',
        NAMA_PETUGAS_DISTRIBUSI: resolved.distributorName,
        NO_HP_DISTRIBUSI: resolved.distributorPhone,
      },
    };
  };

  // Handle template selection change
  const handleTemplateChange = (templateId: string) => {
    const tmpl = officialDocumentTemplates.find(t => t.id === templateId);
    if (!tmpl) return;

    setSelectedTemplateId(templateId);

    const todayStr = new Date().toISOString().slice(0, 10);
    const defaultInst = institutions[0];
    if (tmpl.id === 'tmpl-bast' && defaultInst) {
      setBastInstitutionId(defaultInst.id);
    }

    // Auto-generate number based on prefix
    const countThisType = outgoingDocuments.filter(d => d.type === tmpl.type).length + 1;
    const padded = String(countThisType).padStart(3, '0');
    const autoNumber =
      tmpl.id === 'tmpl-bast'
        ? generateBastNumber(191 + countThisType, outgoingForm.date || todayStr)
        : `${padded}/${tmpl.codePrefix}/SPPG-TMG2/MBG/XI/2026`;

    const initialFieldValues = buildInitialFieldsForTemplate(
      tmpl,
      outgoingForm.date || todayStr,
      defaultInst?.id
    );

    setOutgoingForm(prev => ({
      ...prev,
      letterCode: tmpl.codePrefix,
      letterNumber: autoNumber,
      subject:
        tmpl.id === 'tmpl-bast' && initialFieldValues['NAMA_LEMBAGA']
          ? `Berita Acara Serah Terima Paket Makanan & Alat Makan (MBG) — ${initialFieldValues['NAMA_LEMBAGA']}`
          : tmpl.defaultSubject,
      fieldsData: initialFieldValues,
      recipientName:
        tmpl.id === 'tmpl-bast'
          ? initialFieldValues['NAMA_PIC'] || 'PIC Lembaga'
          : initialFieldValues['NAMA_PETUGAS'] ||
            initialFieldValues['PIHAK_KEDUA_NAMA'] ||
            initialFieldValues['LEMBAGA_MITRA'] ||
            (tmpl.id === 'tmpl-bap-suhu' ? 'Badan Gizi Nasional / Kepala SPPG' : 'Pihak Terkait'),
      recipientInstitution:
        tmpl.id === 'tmpl-bast'
          ? initialFieldValues['NAMA_LEMBAGA'] || prev.recipientInstitution
          : prev.recipientInstitution,
      recipientAddress:
        tmpl.id === 'tmpl-bast' && defaultInst
          ? defaultInst.address
          : prev.recipientAddress,
      signedRole:
        tmpl.id === 'tmpl-bast'
          ? `Kepala ${sppgConfig.sppgName}`
          : 'Kepala SPPG Temenggungan 2',
    }));
  };

  // Open Create Outgoing Modal initialized with chosen template
  const openCreateWithTemplate = (tmpl: DocumentTemplate) => {
    setSelectedTemplateId(tmpl.id);
    const todayStr = new Date().toISOString().slice(0, 10);
    const defaultInst = institutions[0];
    if (tmpl.id === 'tmpl-bast' && defaultInst) {
      setBastInstitutionId(defaultInst.id);
    }

    const countThisType = outgoingDocuments.filter(d => d.type === tmpl.type).length + 1;
    const padded = String(countThisType).padStart(3, '0');
    const autoNumber =
      tmpl.id === 'tmpl-bast'
        ? generateBastNumber(191 + countThisType, todayStr)
        : `${padded}/${tmpl.codePrefix}/SPPG-TMG2/MBG/XI/2026`;

    const initialFieldValues = buildInitialFieldsForTemplate(tmpl, todayStr, defaultInst?.id);

    setOutgoingForm({
      letterCode: tmpl.codePrefix,
      letterNumber: autoNumber,
      date: todayStr,
      subject:
        tmpl.id === 'tmpl-bast' && initialFieldValues['NAMA_LEMBAGA']
          ? `Berita Acara Serah Terima Paket Makanan & Alat Makan (MBG) — ${initialFieldValues['NAMA_LEMBAGA']}`
          : tmpl.defaultSubject,
      recipientName:
        tmpl.id === 'tmpl-bast'
          ? initialFieldValues['NAMA_PIC'] || 'PIC Lembaga'
          : initialFieldValues['NAMA_PETUGAS'] ||
            initialFieldValues['PIHAK_KEDUA_NAMA'] ||
            (tmpl.id === 'tmpl-bap-suhu' ? 'Badan Gizi Nasional / Kepala SPPG' : 'Pihak Terkait'),
      recipientInstitution:
        tmpl.id === 'tmpl-bast'
          ? initialFieldValues['NAMA_LEMBAGA'] || 'Lembaga Penerima Manfaat'
          : tmpl.id === 'tmpl-bap-suhu'
          ? 'Badan Gizi Nasional / Dinkes'
          : 'Mitra MBG / Instansi Terkait',
      recipientAddress:
        tmpl.id === 'tmpl-bast' && defaultInst ? defaultInst.address : 'Kabupaten Probolinggo',
      signedBy: sppgConfig.headOfSppg,
      signedRole:
        tmpl.id === 'tmpl-bast'
          ? `Kepala ${sppgConfig.sppgName}`
          : 'Kepala SPPG Temenggungan 2',
      status: 'Disahkan',
      fieldsData: initialFieldValues,
    });

    setIsCreateOutgoingOpen(true);
  };

  // Mail Merge generator: takes templateBody and replaces dynamic variables
  const generateMergedBody = (template: DocumentTemplate, form: typeof outgoingForm) => {
    let text = template.templateBody;

    // Standard placeholders
    text = text.replace(/{{NOMOR_SURAT}}/g, form.letterNumber);
    text = text.replace(/{{TANGGAL_SURAT}}/g, formatIndonesianDate(form.date));
    text = text.replace(/{{NAMA_SPPG}}/g, sppgConfig.sppgName);
    text = text.replace(/{{KECAMATAN_KABUPATEN}}/g, `Kecamatan ${sppgConfig.district}, ${sppgConfig.regency}`);
    text = text.replace(/{{YAYASAN}}/g, sppgConfig.foundationName);
    text = text.replace(/{{ID_SPPG}}/g, sppgConfig.sppgId);
    text = text.replace(/{{PENANDATANGAN}}/g, form.signedBy);
    text = text.replace(/{{JABATAN_PENANDATANGAN}}/g, form.signedRole);

    // Dynamic field placeholders
    Object.entries(form.fieldsData).forEach(([key, val]) => {
      const reg = new RegExp(`{{${key}}}`, 'g');
      text = text.replace(reg, val || `[${key}]`);
    });

    return text;
  };

  // Submit Create Cloned Outgoing Document
  const handleSaveOutgoingDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outgoingForm.letterNumber || !outgoingForm.subject) {
      addToast('error', 'Validasi Gagal', 'Nomor surat dan perihal wajib diisi.');
      return;
    }

    const mergedBody = generateMergedBody(activeTemplate, outgoingForm);

    await addOutgoingDocument({
      letterCode: outgoingForm.letterCode,
      letterNumber: outgoingForm.letterNumber,
      type: activeTemplate.type,
      date: outgoingForm.date,
      subject: outgoingForm.subject,
      recipientName: outgoingForm.recipientName,
      recipientInstitution: outgoingForm.recipientInstitution,
      recipientAddress: outgoingForm.recipientAddress,
      templateId: activeTemplate.id,
      mergedBody,
      fieldsData: outgoingForm.fieldsData,
      signedBy: outgoingForm.signedBy,
      signedRole: outgoingForm.signedRole,
      status: outgoingForm.status,
    });

    setIsCreateOutgoingOpen(false);
  };

  // Submit Incoming Letter Registration
  const handleSaveIncomingLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomingForm.letterNumber || !incomingForm.sender || !incomingForm.subject) {
      addToast('error', 'Validasi Gagal', 'Nomor surat, asal surat, dan perihal wajib diisi.');
      return;
    }

    await addIncomingLetter({
      letterNumber: incomingForm.letterNumber,
      letterDate: incomingForm.letterDate,
      receivedDate: incomingForm.receivedDate,
      sender: incomingForm.sender,
      subject: incomingForm.subject,
      category: incomingForm.category,
      dispositionTo: incomingForm.dispositionTo,
      dispositionInstruction: incomingForm.dispositionInstruction,
      dispositionNotes: incomingForm.dispositionNotes,
      dispositionDate: new Date().toISOString().slice(0, 10),
      followUpStatus: incomingForm.followUpStatus,
      scannedDocumentUrl: incomingForm.scannedDocumentUrl || 'https://images.unsplash.com/photo-1554415707-9e4466b404c0?auto=format&fit=crop&w=500&q=80',
      recordedBy: currentUser.name,
    });

    setIsRegisterIncomingOpen(false);
    // Reset form
    setIncomingForm({
      letterNumber: '',
      letterDate: new Date().toISOString().slice(0, 10),
      receivedDate: new Date().toISOString().slice(0, 10),
      sender: '',
      subject: '',
      category: 'Badan Gizi Nasional (BGN)',
      dispositionTo: 'Kepala SPPG, Pengawas Gizi',
      dispositionInstruction: 'Pelajari, koordinasikan dan tindak lanjuti sesuai SOP.',
      dispositionNotes: '',
      followUpStatus: 'Diterima',
      scannedDocumentUrl: '',
    });
  };

  // Submit Update Disposition
  const handleSaveDisposition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncoming) return;

    await updateIncomingLetter(selectedIncoming.id, {
      dispositionTo: selectedIncoming.dispositionTo,
      dispositionInstruction: selectedIncoming.dispositionInstruction,
      dispositionNotes: selectedIncoming.dispositionNotes,
      dispositionDate: new Date().toISOString().slice(0, 10),
      followUpStatus: selectedIncoming.followUpStatus,
    });

    setIsDispositionOpen(false);
  };

  // Copy to Clipboard Helper for Google Docs
  const [copiedStatus, setCopiedStatus] = useState(false);
  const handleCopyGoogleDocsText = (doc: OutgoingDocument) => {
    const fullText = `=====================================================
${sppgConfig.foundationName.toUpperCase()}
${sppgConfig.sppgName.toUpperCase()}
Nomor Identitas SPPG: ${sppgConfig.sppgId} | ${sppgConfig.programName}
${sppgConfig.address}, Kec. ${sppgConfig.district}, ${sppgConfig.regency} - Jawa Timur
Kontak: ${sppgConfig.phone} | Email: ${sppgConfig.email}
=====================================================

${doc.mergedBody}

=====================================================
Dokumen ini dibuat secara resmi melalui E-SPPG Management System.
`;

    navigator.clipboard.writeText(fullText);
    setCopiedStatus(true);
    addToast('success', 'Tersalin ke Clipboard', 'Format teks Google Docs berhasil disalin. Anda dapat langsung menempelkannya (Ctrl+V) di Google Docs.');
    setTimeout(() => setCopiedStatus(false), 3000);
  };

  // Filtered lists
  const filteredOutgoing = useMemo(() => {
    return outgoingDocuments.filter(doc => {
      const matchSearch =
        doc.letterNumber.toLowerCase().includes(outgoingSearch.toLowerCase()) ||
        doc.subject.toLowerCase().includes(outgoingSearch.toLowerCase()) ||
        doc.recipientName.toLowerCase().includes(outgoingSearch.toLowerCase()) ||
        (doc.recipientInstitution && doc.recipientInstitution.toLowerCase().includes(outgoingSearch.toLowerCase()));

      const matchType = outgoingTypeFilter === 'ALL' || doc.type === outgoingTypeFilter;
      const matchStatus = outgoingStatusFilter === 'ALL' || doc.status === outgoingStatusFilter;

      return matchSearch && matchType && matchStatus;
    });
  }, [outgoingDocuments, outgoingSearch, outgoingTypeFilter, outgoingStatusFilter]);

  const filteredIncoming = useMemo(() => {
    return incomingLetters.filter(lettr => {
      const matchSearch =
        lettr.letterNumber.toLowerCase().includes(incomingSearch.toLowerCase()) ||
        lettr.sender.toLowerCase().includes(incomingSearch.toLowerCase()) ||
        lettr.subject.toLowerCase().includes(incomingSearch.toLowerCase()) ||
        lettr.dispositionTo.toLowerCase().includes(incomingSearch.toLowerCase());

      const matchStatus = incomingStatusFilter === 'ALL' || lettr.followUpStatus === incomingStatusFilter;
      const matchCategory = incomingCategoryFilter === 'ALL' || lettr.category === incomingCategoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [incomingLetters, incomingSearch, incomingStatusFilter, incomingCategoryFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalOut = outgoingDocuments.length;
    const totalIn = incomingLetters.length;
    const pendingIn = incomingLetters.filter(l => l.followUpStatus === 'Diterima' || l.followUpStatus === 'Didisposisikan' || l.followUpStatus === 'Dalam Proses Tindak Lanjut').length;
    const completedIn = incomingLetters.filter(l => l.followUpStatus === 'Selesai Tindak Lanjut' || l.followUpStatus === 'Diarsipkan').length;
    return { totalOut, totalIn, pendingIn, completedIn };
  }, [outgoingDocuments, incomingLetters]);

  // Outgoing Document Columns for DataTable
  const outgoingColumns: Column<OutgoingDocument>[] = [
    {
      key: 'letterNumber',
      header: 'No. Dokumen & Tanggal',
      render: (doc: OutgoingDocument) => (
        <div>
          <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
            {doc.letterNumber}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
            <Calendar className="w-3 h-3" />
            {formatIndonesianDate(doc.date)}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Jenis Surat / Dokumen',
      render: (doc: OutgoingDocument) => {
        let badgeColor = 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300';
        if (doc.type.includes('Berita Acara')) {
          badgeColor = 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300';
        } else if (doc.type.includes('Tugas')) {
          badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300';
        } else if (doc.type.includes('Dinas')) {
          badgeColor = 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300';
        }
        return (
          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${badgeColor}`}>
            {doc.type}
          </span>
        );
      },
    },
    {
      key: 'subject',
      header: 'Perihal & Pihak Terkait',
      render: (doc: OutgoingDocument) => (
        <div className="max-w-xs md:max-w-md">
          <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
            {doc.subject}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">{doc.recipientName}</span>
            {doc.recipientInstitution && (
              <span className="text-slate-400">({doc.recipientInstitution})</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'signedBy',
      header: 'Penandatangan',
      render: (doc: OutgoingDocument) => (
        <div className="text-xs">
          <div className="font-medium text-slate-800 dark:text-slate-200">{doc.signedBy}</div>
          <div className="text-[10px] text-slate-500">{doc.signedRole}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (doc: OutgoingDocument) => {
        const colors: Record<string, string> = {
          Konsep: 'bg-slate-100 text-slate-700 border-slate-300',
          Disahkan: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          Terkirim: 'bg-blue-100 text-blue-800 border-blue-300',
          Diarsipkan: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        };
        return (
          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${colors[doc.status] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
            {doc.status}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Aksi Dokumen',
      render: (doc: OutgoingDocument) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedOutgoing(doc);
              setIsPreviewOutgoingOpen(true);
            }}
            title="Lihat & Cetak Dokumen"
            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedOutgoing(doc);
              setIsGoogleDocsOpen(true);
            }}
            title="Generate Google Docs View"
            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 transition-colors"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedOutgoing(doc);
              setIsPreviewOutgoingOpen(true);
              setTimeout(() => triggerPrint(), 300);
            }}
            title="Cetak Cepat"
            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition-colors"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Hapus salinan dokumen nomor ${doc.letterNumber}?`)) {
                deleteOutgoingDocument(doc.id);
              }
            }}
            title="Hapus Salinan"
            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Incoming Letter Columns for DataTable
  const incomingColumns: Column<IncomingLetter>[] = [
    {
      key: 'letterNumber',
      header: 'No. Surat Asli & Tgl',
      render: (lettr: IncomingLetter) => (
        <div>
          <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
            {lettr.letterNumber}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Tgl Surat: {formatIndonesianDate(lettr.letterDate)}
          </div>
        </div>
      ),
    },
    {
      key: 'sender',
      header: 'Tgl Diterima & Asal Surat',
      render: (lettr: IncomingLetter) => (
        <div>
          <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
            {lettr.sender}
          </div>
          <div className="text-[11px] text-sky-700 dark:text-sky-400 mt-0.5 flex items-center gap-1">
            <span className="font-medium">Diterima:</span> {formatIndonesianDate(lettr.receivedDate)}
          </div>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Kategori & Perihal',
      render: (lettr: IncomingLetter) => (
        <div className="max-w-xs md:max-w-md">
          <span className="inline-block px-1.5 py-0.5 text-[9px] font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mb-1 border border-slate-200 dark:border-slate-700">
            {lettr.category}
          </span>
          <div className="font-medium text-xs text-slate-800 dark:text-slate-200 line-clamp-2">
            {lettr.subject}
          </div>
        </div>
      ),
    },
    {
      key: 'dispositionTo',
      header: 'Disposisi & Instruksi',
      render: (lettr: IncomingLetter) => (
        <div className="max-w-xs text-xs">
          <div className="font-semibold text-blue-900 dark:text-blue-300 line-clamp-1">
            Kepada: {lettr.dispositionTo}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 italic line-clamp-1 mt-0.5">
            "{lettr.dispositionInstruction}"
          </div>
        </div>
      ),
    },
    {
      key: 'followUpStatus',
      header: 'Status Tindak Lanjut',
      render: (lettr: IncomingLetter) => {
        const statusColors: Record<string, string> = {
          Diterima: 'bg-slate-100 text-slate-800 border-slate-300',
          Didisposisikan: 'bg-blue-100 text-blue-800 border-blue-300',
          'Dalam Proses Tindak Lanjut': 'bg-amber-100 text-amber-800 border-amber-300',
          'Selesai Tindak Lanjut': 'bg-emerald-100 text-emerald-800 border-emerald-300',
          Diarsipkan: 'bg-purple-100 text-purple-800 border-purple-300',
        };
        return (
          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${statusColors[lettr.followUpStatus] || 'bg-slate-100 text-slate-800 border-slate-300'}`}>
            {lettr.followUpStatus}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Aksi Surat Masuk',
      render: (lettr: IncomingLetter) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedIncoming(lettr);
              setIsDispositionOpen(true);
            }}
            title="Buka Lembar Disposisi"
            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 transition-colors"
          >
            <FileCheck className="w-4 h-4" />
          </button>
          {lettr.scannedDocumentUrl && (
            <button
              onClick={() => {
                setSelectedIncoming(lettr);
                setIsScanPreviewOpen(true);
              }}
              title="Lihat Scan Dokumen"
              className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-300 transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              if (window.confirm(`Hapus register surat masuk nomor ${lettr.letterNumber}?`)) {
                deleteIncomingLetter(lettr.id);
              }
            }}
            title="Hapus Register"
            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Export handlers
  const handleExportOutgoingPDF = () => {
    exportTableToPDF({
      title: 'Agenda Arsip Salinan Dokumen & Surat Keluar SPPG',
      subtitle: `${sppgConfig.sppgName} (ID: ${sppgConfig.sppgId})`,
      headers: ['Nomor Dokumen', 'Tanggal', 'Jenis Dokumen', 'Perihal / Subjek', 'Pihak Terkait', 'Penandatangan', 'Status'],
      rows: filteredOutgoing.map(d => [
        d.letterNumber,
        formatIndonesianDate(d.date),
        d.type,
        d.subject,
        d.recipientName + (d.recipientInstitution ? ` (${d.recipientInstitution})` : ''),
        d.signedBy,
        d.status,
      ]),
      fileName: 'Arsip_Surat_Keluar_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.headOfSppg,
      signerRole: 'Kepala SPPG Temenggungan 2',
    });
  };

  const handleExportOutgoingExcel = () => {
    const data = filteredOutgoing.map(d => ({
      'Nomor Dokumen': d.letterNumber,
      'Kode Jenis': d.letterCode,
      'Tanggal': d.date,
      'Jenis Surat': d.type,
      'Perihal': d.subject,
      'Penerima': d.recipientName,
      'Instansi Mitra': d.recipientInstitution || '-',
      'Penandatangan': d.signedBy,
      'Jabatan': d.signedRole,
      'Status': d.status,
    }));
    exportToExcel(data, 'Arsip_Salinan_Dokumen_SPPG_TMG2');
  };

  const handleExportIncomingPDF = () => {
    exportTableToPDF({
      title: 'Buku Register Surat Masuk & Lembar Disposisi',
      subtitle: `${sppgConfig.sppgName} (ID: ${sppgConfig.sppgId})`,
      headers: ['No. Surat Pengirim', 'Tgl Surat', 'Tgl Diterima', 'Asal Surat', 'Perihal', 'Disposisi Kepada', 'Status Tindak Lanjut'],
      rows: filteredIncoming.map(l => [
        l.letterNumber,
        formatIndonesianDate(l.letterDate),
        formatIndonesianDate(l.receivedDate),
        l.sender,
        l.subject,
        l.dispositionTo,
        l.followUpStatus,
      ]),
      fileName: 'Register_Surat_Masuk_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.headOfSppg,
      signerRole: 'Kepala SPPG Temenggungan 2',
    });
  };

  const handleExportIncomingExcel = () => {
    const data = filteredIncoming.map(l => ({
      'Nomor Surat Pengirim': l.letterNumber,
      'Tanggal Surat': l.letterDate,
      'Tanggal Diterima': l.receivedDate,
      'Asal Surat': l.sender,
      'Kategori': l.category,
      'Perihal': l.subject,
      'Disposisi Kepada': l.dispositionTo,
      'Instruksi Disposisi': l.dispositionInstruction,
      'Catatan': l.dispositionNotes || '-',
      'Status Tindak Lanjut': l.followUpStatus,
      'Petugas Pencatat': l.recordedBy,
    }));
    exportToExcel(data, 'Buku_Register_Surat_Masuk_SPPG_TMG2');
  };

  return (
    <div className="space-y-6">
      {/* Header and Identity */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-sky-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/60 border border-blue-400/30 text-xs font-semibold text-blue-200 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              MODUL 14 & 15: PERSURATAN RESMI & SURAT MASUK
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Administrasi Dokumen, Mailing & Disposisi
            </h1>
            <p className="text-sm text-blue-200 mt-1 max-w-3xl">
              Pengelolaan 8 jenis dokumen resmi SPPG (SPD, ST, BAST, BAP Perubahan Penerima Manfaat, BAP Kekurangan Bahan, dsb.), sistem mail merge dengan template immutable, generate Google Docs, cetak PDF, serta buku register surat masuk & lembar disposisi digital BGN.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => openCreateWithTemplate(officialDocumentTemplates[0])}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Buat Salinan Dokumen Baru
            </button>
            <button
              onClick={() => setIsRegisterIncomingOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 backdrop-blur-sm transition-all active:scale-95"
            >
              <Inbox className="w-4 h-4" />
              Registrasi Surat Masuk
            </button>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Salinan Dokumen Keluar
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {stats.totalOut}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Arsip salinan resmi tersimpan
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Surat Masuk Tercatat
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {stats.totalIn}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Buku register surat masuk
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Perlu Tindak Lanjut
            </span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {stats.pendingIn}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Surat masuk menunggu proses
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Template Master Aktif
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {officialDocumentTemplates.length}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <Lock className="w-3 h-3" /> Template Asli Terkunci (Read-Only)
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 space-x-1 sm:space-x-4">
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'outgoing'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>14. Administrasi Dokumen & Surat Keluar</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-bold">
            {outgoingDocuments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('incoming')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'incoming'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>15. Buku Register Surat Masuk & Disposisi</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-bold">
            {incomingLetters.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'templates'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Katalog Template Master</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold">
            {officialDocumentTemplates.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MODUL 14 ADMINISTRASI DOKUMEN & SURAT KELUAR */}
      {/* ========================================================================= */}
      {activeTab === 'outgoing' && (
        <div className="space-y-4">
          {/* Strict Rule Notice Box */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 p-4 rounded-r-xl text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Ketentuan Integritas Dokumen SPPG:</span> Template master resmi tidak dapat diubah secara langsung oleh pengguna. Sistem akan membuat salinan independen (cloned copy) untuk setiap surat yang diproses, mengisi variabel mail merge secara dinamis, dan menyimpannya ke dalam arsip resmi yang dapat diverifikasi oleh auditor Badan Gizi Nasional (BGN).
            </div>
          </div>

          {/* Filters & Actions Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-1 flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nomor surat, perihal, penerima..."
                  value={outgoingSearch}
                  onChange={(e) => setOutgoingSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={outgoingTypeFilter}
                onChange={(e) => setOutgoingTypeFilter(e.target.value)}
                className="py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Jenis Dokumen (8 Jenis)</option>
                <option value="Surat Perjalanan Dinas">Surat Perjalanan Dinas (SPD)</option>
                <option value="Surat Tugas">Surat Tugas (ST)</option>
                <option value="Berita Acara Serah Terima">Berita Acara Serah Terima (BAST)</option>
                <option value="Berita Acara Perubahan Penerima Manfaat">BAP Perubahan Penerima Manfaat</option>
                <option value="Berita Acara Kekurangan Bahan">BAP Kekurangan Bahan Pangan</option>
                <option value="Berita Acara Lainnya">Berita Acara Lainnya</option>
                <option value="Surat Undangan">Surat Undangan</option>
                <option value="Surat Keterangan">Surat Keterangan</option>
              </select>

              <select
                value={outgoingStatusFilter}
                onChange={(e) => setOutgoingStatusFilter(e.target.value)}
                className="py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="Konsep">Konsep</option>
                <option value="Disahkan">Disahkan</option>
                <option value="Terkirim">Terkirim</option>
                <option value="Diarsipkan">Diarsipkan</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportOutgoingPDF}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export PDF
              </button>
              <button
                onClick={handleExportOutgoingExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Export Excel
              </button>
            </div>
          </div>

          {/* DataTable of Cloned Documents */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <DataTable
              title="Daftar Salinan Dokumen & Surat Keluar"
              subtitle="Arsip salinan dokumen resmi yang telah di-generate dari master template"
              columns={outgoingColumns as any}
              data={filteredOutgoing as any}
              keyExtractor={(item: any) => item.id}
              searchPlaceholder="Cari nomor dokumen, perihal, atau penerima..."
              searchKeys={['letterNumber', 'subject', 'recipientName', 'recipientInstitution']}
              onExportPDF={handleExportOutgoingPDF}
              onExportExcel={handleExportOutgoingExcel}
              onPrint={triggerPrint}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MODUL 15 BUKU REGISTER SURAT MASUK & DISPOSISI */}
      {/* ========================================================================= */}
      {activeTab === 'incoming' && (
        <div className="space-y-4">
          {/* Filters & Actions Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-1 flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari no surat pengirim, asal surat, perihal, disposisi..."
                  value={incomingSearch}
                  onChange={(e) => setIncomingSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={incomingCategoryFilter}
                onChange={(e) => setIncomingCategoryFilter(e.target.value)}
                className="py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Kategori Pengirim</option>
                <option value="Badan Gizi Nasional (BGN)">Badan Gizi Nasional (BGN)</option>
                <option value="Dinas / Pemda">Dinas / Pemda</option>
                <option value="Sekolah / Lembaga">Sekolah / Lembaga</option>
                <option value="Supplier / Vendor">Supplier / Vendor</option>
                <option value="Yayasan / Internal">Yayasan / Internal</option>
                <option value="Umum">Umum</option>
              </select>

              <select
                value={incomingStatusFilter}
                onChange={(e) => setIncomingStatusFilter(e.target.value)}
                className="py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Status Tindak Lanjut</option>
                <option value="Diterima">Diterima</option>
                <option value="Didisposisikan">Didisposisikan</option>
                <option value="Dalam Proses Tindak Lanjut">Dalam Proses Tindak Lanjut</option>
                <option value="Selesai Tindak Lanjut">Selesai Tindak Lanjut</option>
                <option value="Diarsipkan">Diarsipkan</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportIncomingPDF}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export PDF
              </button>
              <button
                onClick={handleExportIncomingExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Export Excel
              </button>
            </div>
          </div>

          {/* DataTable of Incoming Letters */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <DataTable
              title="Buku Register Surat Masuk & Disposisi"
              subtitle="Agenda penerimaan surat dinas, instansi, dan supplier serta instruksi disposisi pimpinan"
              columns={incomingColumns as any}
              data={filteredIncoming as any}
              keyExtractor={(item: any) => item.id}
              searchPlaceholder="Cari nomor surat pengirim, asal surat, atau perihal..."
              searchKeys={['letterNumber', 'sender', 'subject', 'dispositionTo']}
              onExportPDF={handleExportIncomingPDF}
              onExportExcel={handleExportIncomingExcel}
              onPrint={triggerPrint}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KATALOG 8 TEMPLATE MASTER (READ-ONLY BLUEPRINT) */}
      {/* ========================================================================= */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
            <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Katalog {officialDocumentTemplates.length} Template Dokumen Baku Tata Naskah Dinas SPPG
            </h3>
            <p>
              Template di bawah ini adalah acuan baku sesuai petunjuk teknis Badan Gizi Nasional (BGN). Untuk menggunakan template, klik tombol <strong>"Buat Salinan Dokumen Baru"</strong> pada kartu template terkait. Sistem akan mengkloning format teks dan menyiapkan formulir mail merge tanpa mengubah cetak biru template asli.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {officialDocumentTemplates.map(tmpl => (
              <div
                key={tmpl.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                      {tmpl.codePrefix}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" /> Master Terkunci
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                    {tmpl.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3">
                    {tmpl.description}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="font-medium text-slate-500">Variabel Dinamis:</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tmpl.fields.slice(0, 3).map(f => (
                        <span key={f.key} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-700 dark:text-slate-300">
                          {`{{${f.key}}}`}
                        </span>
                      ))}
                      {tmpl.fields.length > 3 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{tmpl.fields.length - 3} lainnya
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => openCreateWithTemplate(tmpl)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Buat Salinan
                  </button>
                  <button
                    onClick={() => setViewingTemplate(tmpl)}
                    className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 text-xs transition-colors"
                    title="Lihat Format Asli Template"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: BUAT SALINAN DOKUMEN BARU (MAIL MERGE) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreateOutgoingOpen}
        onClose={() => setIsCreateOutgoingOpen(false)}
        title="Buat Salinan Dokumen Baru (Mail Merge)"
        maxWidth="4xl"
      >
        <form onSubmit={handleSaveOutgoingDocument} className="space-y-5">
          {/* Immutability Banner */}
          <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 p-3 rounded-xl flex items-center gap-3 text-xs text-sky-900 dark:text-sky-200">
            <Lock className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              <strong>Perhatian:</strong> Anda sedang membuat salinan dokumen baru. Template asli tetap aman dan tidak akan dimodifikasi.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pilih Dokumen Acuan ({officialDocumentTemplates.length} Template Master)
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                {officialDocumentTemplates.map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.codePrefix}] {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Surat Otomatis / Kustom
              </label>
              <input
                type="text"
                value={outgoingForm.letterNumber}
                onChange={(e) => setOutgoingForm({ ...outgoingForm, letterNumber: e.target.value })}
                required
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Surat
              </label>
              <input
                type="date"
                value={outgoingForm.date}
                onChange={(e) => {
                  const nextDate = e.target.value;
                  if (selectedTemplateId === 'tmpl-bast') {
                    setOutgoingForm(prev =>
                      syncBastFormForInstitutionAndDate(
                        bastInstitutionId || institutions[0]?.id || '',
                        nextDate,
                        prev
                      )
                    );
                  } else {
                    setOutgoingForm(prev => ({ ...prev, date: nextDate }));
                  }
                }}
                required
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Perihal Dokumen
              </label>
              <input
                type="text"
                value={outgoingForm.subject}
                onChange={(e) => setOutgoingForm({ ...outgoingForm, subject: e.target.value })}
                required
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Penerima / Pihak Terkait
              </label>
              <input
                type="text"
                value={outgoingForm.recipientName}
                onChange={(e) => setOutgoingForm({ ...outgoingForm, recipientName: e.target.value })}
                required
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lembaga / Instansi Penerima
              </label>
              <input
                type="text"
                value={outgoingForm.recipientInstitution}
                onChange={(e) => setOutgoingForm({ ...outgoingForm, recipientInstitution: e.target.value })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alamat / Kota Tujuan
              </label>
              <input
                type="text"
                value={outgoingForm.recipientAddress}
                onChange={(e) => setOutgoingForm({ ...outgoingForm, recipientAddress: e.target.value })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Dynamic Mail Merge Input Fields */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Variabel Mail Merge Template [{activeTemplate.codePrefix}]
              </span>
              <span className="text-[10px] text-slate-500">
                Data akan otomatis dimasukkan ke dalam teks surat
              </span>
            </div>

            {selectedTemplateId === 'tmpl-bast' && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2">
                <label className="block text-[11px] font-bold text-blue-950 dark:text-blue-200">
                  Pilih Lembaga Penerima Manfaat (Sinkron Otomatis Master Data & Presensi Harian):
                </label>
                <select
                  value={bastInstitutionId || institutions[0]?.id || ''}
                  onChange={(e) => {
                    const instId = e.target.value;
                    setBastInstitutionId(instId);
                    setOutgoingForm(prev =>
                      syncBastFormForInstitutionAndDate(instId, prev.date, prev)
                    );
                  }}
                  className="w-full py-2 px-3 text-xs rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                >
                  {institutions.map(inst => {
                    const att = beneficiaryAttendance.find(
                      a => a.institutionId === inst.id && a.date === outgoingForm.date
                    );
                    const qty = att ? att.actualPortions : inst.totalPortions;
                    return (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} — {qty} porsi | PIC: {inst.picName || inst.contactPerson} ({inst.picPhone || inst.phone})
                      </option>
                    );
                  })}
                </select>
                <p className="text-[10px] text-blue-700 dark:text-blue-300">
                  Nama Lembaga, Jumlah Porsi, PIC, Nomor HP PIC, Hari & Tanggal otomatis terisi dari Master Data & Modul Penerima Manfaat.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeTemplate.fields.map(field => (
                <div key={field.key}>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                    {field.label} <span className="font-mono text-[9px] text-blue-600 dark:text-blue-400">{`{{${field.key}}}`}</span>
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      rows={2}
                      value={outgoingForm.fieldsData[field.key] || ''}
                      placeholder={field.placeholder}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOutgoingForm(prev => ({
                          ...prev,
                          fieldsData: { ...prev.fieldsData, [field.key]: val },
                        }));
                      }}
                      className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={outgoingForm.fieldsData[field.key] || ''}
                      placeholder={field.placeholder}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOutgoingForm(prev => ({
                          ...prev,
                          fieldsData: { ...prev.fieldsData, [field.key]: val },
                        }));
                      }}
                      className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Penandatangan Dokumen
              </label>
              <input
                type="text"
                value={outgoingForm.signedBy}
                onChange={(e) => setOutgoingForm({ ...outgoingForm, signedBy: e.target.value })}
                required
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jabatan Penandatangan
              </label>
              <input
                type="text"
                value={outgoingForm.signedRole}
                onChange={(e) => setOutgoingForm({ ...outgoingForm, signedRole: e.target.value })}
                required
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status Dokumen
              </label>
              <select
                value={outgoingForm.status}
                onChange={(e) => setOutgoingForm({ ...outgoingForm, status: e.target.value as OutgoingDocument['status'] })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Konsep">Konsep (Draft)</option>
                <option value="Disahkan">Disahkan (Sah)</option>
                <option value="Terkirim">Terkirim</option>
                <option value="Diarsipkan">Diarsipkan</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateOutgoingOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            >
              Simpan & Generate Salinan Dokumen
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: PREVIEW DOKUMEN SALINAN (KOP RESMI & PRINT VIEW) */}
      {/* ========================================================================= */}
      {selectedOutgoing && (
        <Modal
          isOpen={isPreviewOutgoingOpen}
          onClose={() => setIsPreviewOutgoingOpen(false)}
          title={`Preview Salinan Dokumen Resmi: ${selectedOutgoing.letterNumber}`}
          maxWidth="4xl"
        >
          {(() => {
            const isBastDoc =
              selectedOutgoing.templateId === 'tmpl-bast' ||
              selectedOutgoing.type === 'Berita Acara Serah Terima';
            const bastData = isBastDoc
              ? resolveBastAutoFields({
                  institutions,
                  beneficiaryAttendance,
                  masterVolunteers,
                  distributionLogs,
                  sppgConfig,
                  institutionName:
                    selectedOutgoing.fieldsData?.NAMA_LEMBAGA ||
                    selectedOutgoing.recipientInstitution,
                  date: selectedOutgoing.date,
                  bastNumber: selectedOutgoing.letterNumber,
                  totalPortions:
                    selectedOutgoing.fieldsData?.JUMLAH_PORSI ||
                    selectedOutgoing.fieldsData?.TOTAL_PORSI
                      ? Number(
                          selectedOutgoing.fieldsData.JUMLAH_PORSI ||
                            selectedOutgoing.fieldsData.TOTAL_PORSI
                        )
                      : undefined,
                  picName:
                    selectedOutgoing.fieldsData?.NAMA_PIC || selectedOutgoing.recipientName,
                  picPhone: selectedOutgoing.fieldsData?.NO_HP_PIC,
                  distributorName: selectedOutgoing.fieldsData?.NAMA_PETUGAS_DISTRIBUSI,
                  distributorPhone: selectedOutgoing.fieldsData?.NO_HP_DISTRIBUSI,
                  receiveTime: selectedOutgoing.fieldsData?.JAM_TERIMA,
                  returnTime:
                    selectedOutgoing.fieldsData?.JAM_KEMBALI === '........'
                      ? ''
                      : selectedOutgoing.fieldsData?.JAM_KEMBALI,
                  headOfSppg: selectedOutgoing.signedBy || sppgConfig.headOfSppg,
                })
              : null;

            return (
              <div className="space-y-4">
                {/* Top Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 print:hidden">
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Jenis Dokumen:{' '}
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedOutgoing.type}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleCopyGoogleDocsText(selectedOutgoing)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedStatus ? 'Tersalin!' : 'Salin untuk Google Docs'}
                    </button>
                    {bastData && (
                      <button
                        onClick={() => exportBastDocumentPDF(bastData)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Unduh PDF BAST
                      </button>
                    )}
                    <button
                      onClick={() => triggerPrint()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Cetak / PDF
                    </button>
                  </div>
                </div>

                {bastData ? (
                  <BASTDocumentSheet data={bastData} />
                ) : (
                  /* Document Paper Container */
                  <div className="p-8 bg-white text-slate-900 border border-slate-200 rounded-xl shadow-lg print:shadow-none print:border-none print:p-0 font-serif leading-relaxed text-sm">
                    <PrintHeader
                      title={selectedOutgoing.type.toUpperCase()}
                      subtitle={`Program Makan Bergizi Gratis (MBG) - Badan Gizi Nasional`}
                      docNumber={selectedOutgoing.letterNumber}
                    />

                    <div className="whitespace-pre-line text-justify text-slate-800 font-sans text-xs sm:text-sm">
                      {selectedOutgoing.mergedBody}
                    </div>

                    {/* Tanda Tangan Resmi Footer */}
                    <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end text-xs font-sans">
                      <div className="text-[11px] text-slate-500">
                        <div>
                          Status Dokumen: <span className="font-semibold">{selectedOutgoing.status}</span>
                        </div>
                        <div>Dicetak melalui: E-SPPG Management System (TMG2)</div>
                        <div>Waktu Pembuatan: {selectedOutgoing.createdAt}</div>
                      </div>
                      <div className="text-center w-64">
                        <div className="text-xs text-slate-600">Disahkan oleh:</div>
                        <div className="h-16 flex items-center justify-center italic text-blue-900 font-bold text-sm">
                          [Tanda Tangan Digital BGN]
                        </div>
                        <div className="font-bold underline text-slate-900">{selectedOutgoing.signedBy}</div>
                        <div className="text-xs text-slate-600">{selectedOutgoing.signedRole}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: GENERATE GOOGLE DOCS VIEW */}
      {/* ========================================================================= */}
      {selectedOutgoing && (
        <Modal
          isOpen={isGoogleDocsOpen}
          onClose={() => setIsGoogleDocsOpen(false)}
          title="Integrasi & Ekspor Google Docs"
          maxWidth="3xl"
        >
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
              <div className="font-bold text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Format Siap Pakai Google Docs
              </div>
              <p>
                Teks di bawah ini telah diformat secara otomatis dengan kop organisasi, perihal, rincian pasal/ketentuan, dan tanda tangan resmi. Anda dapat menyalin teks ini langsung ke dokumen Google Docs Anda atau membuka tab Google Docs baru.
              </p>
            </div>

            <div className="relative">
              <textarea
                readOnly
                rows={14}
                value={`=================================================================
${sppgConfig.foundationName.toUpperCase()}
${sppgConfig.sppgName.toUpperCase()}
Nomor Identitas SPPG: ${sppgConfig.sppgId} | ${sppgConfig.programName}
${sppgConfig.address}, Kec. ${sppgConfig.district}, ${sppgConfig.regency}
=================================================================

${selectedOutgoing.mergedBody}

Diterbitkan secara sah oleh Satuan Pelayanan Pemenuhan Gizi Temenggungan 2.`}
                className="w-full p-4 font-mono text-xs bg-slate-900 text-emerald-400 rounded-xl border border-slate-700 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                Gunakan pintasan keyboard <strong>Ctrl+A</strong> lalu <strong>Ctrl+C</strong> untuk menyalin.
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyGoogleDocsText(selectedOutgoing)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedStatus ? 'Berhasil Disalin!' : 'Salin Seluruh Teks'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleCopyGoogleDocsText(selectedOutgoing);
                    window.open('https://docs.new', '_blank');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Buka Google Docs Baru (docs.new)
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: REGISTRASI SURAT MASUK */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isRegisterIncomingOpen}
        onClose={() => setIsRegisterIncomingOpen(false)}
        title="Registrasi Surat Masuk Baru"
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveIncomingLetter} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Surat Pengirim (Asli)
              </label>
              <input
                type="text"
                placeholder="Contoh: 005/BGN-WIL.JTM/MBG/XI/2026"
                value={incomingForm.letterNumber}
                onChange={(e) => setIncomingForm({ ...incomingForm, letterNumber: e.target.value })}
                required
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kategori Asal Surat
              </label>
              <select
                value={incomingForm.category}
                onChange={(e) => setIncomingForm({ ...incomingForm, category: e.target.value as IncomingLetter['category'] })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Badan Gizi Nasional (BGN)">Badan Gizi Nasional (BGN)</option>
                <option value="Dinas / Pemda">Dinas / Pemda (Dinkes / Dinas Pendidikan)</option>
                <option value="Sekolah / Lembaga">Sekolah / Lembaga Penerima Manfaat</option>
                <option value="Supplier / Vendor">Supplier / Vendor Bahan Pangan</option>
                <option value="Yayasan / Internal">Yayasan Hafshawaty / Internal SPPG</option>
                <option value="Umum">Umum / Masyarakat</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Surat Pengirim
              </label>
              <input
                type="date"
                value={incomingForm.letterDate}
                onChange={(e) => setIncomingForm({ ...incomingForm, letterDate: e.target.value })}
                required
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Diterima di SPPG
              </label>
              <input
                type="date"
                value={incomingForm.receivedDate}
                onChange={(e) => setIncomingForm({ ...incomingForm, receivedDate: e.target.value })}
                required
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Asal Surat (Nama Lembaga / Pengirim)
            </label>
            <input
              type="text"
              placeholder="Contoh: Kantor Wilayah Badan Gizi Nasional Jawa Timur"
              value={incomingForm.sender}
              onChange={(e) => setIncomingForm({ ...incomingForm, sender: e.target.value })}
              required
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Perihal / Isi Ringkas Surat Masuk
            </label>
            <textarea
              rows={2}
              placeholder="Jelaskan secara ringkas maksud dan pokok isi surat masuk..."
              value={incomingForm.subject}
              onChange={(e) => setIncomingForm({ ...incomingForm, subject: e.target.value })}
              required
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Disposisi Kepada (Penerima Tugas)
              </label>
              <input
                type="text"
                placeholder="Kepala SPPG, Pengawas Gizi, Chef, Aslap..."
                value={incomingForm.dispositionTo}
                onChange={(e) => setIncomingForm({ ...incomingForm, dispositionTo: e.target.value })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status Tindak Lanjut Awal
              </label>
              <select
                value={incomingForm.followUpStatus}
                onChange={(e) => setIncomingForm({ ...incomingForm, followUpStatus: e.target.value as IncomingLetter['followUpStatus'] })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Diterima">Diterima</option>
                <option value="Didisposisikan">Didisposisikan</option>
                <option value="Dalam Proses Tindak Lanjut">Dalam Proses Tindak Lanjut</option>
                <option value="Selesai Tindak Lanjut">Selesai Tindak Lanjut</option>
                <option value="Diarsipkan">Diarsipkan</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Petunjuk / Instruksi Disposisi Awal
            </label>
            <input
              type="text"
              placeholder="Contoh: Pelajari, koordinasikan dengan instansi terkait dan laporkan progress."
              value={incomingForm.dispositionInstruction}
              onChange={(e) => setIncomingForm({ ...incomingForm, dispositionInstruction: e.target.value })}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Upload Scan Document */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Upload Scan Dokumen Fisik / Bukti Penerimaan
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (uploadEvent) => {
                      setIncomingForm(prev => ({
                        ...prev,
                        scannedDocumentUrl: uploadEvent.target?.result as string,
                      }));
                      addToast('success', 'Scan Berhasil Dimuat', `File ${file.name} siap disimpan.`);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
              />
              {incomingForm.scannedDocumentUrl && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> File terpasang
                </span>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsRegisterIncomingOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            >
              Registrasi Surat Masuk
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: LEMBAR DISPOSISI DIGITAL SPPG */}
      {/* ========================================================================= */}
      {selectedIncoming && (
        <Modal
          isOpen={isDispositionOpen}
          onClose={() => setIsDispositionOpen(false)}
          title={`Lembar Disposisi Digital: ${selectedIncoming.letterNumber}`}
          maxWidth="3xl"
        >
          <form onSubmit={handleSaveDisposition} className="space-y-4">
            {/* Lembar Disposisi Sheet Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="text-center pb-2 border-b border-slate-200 dark:border-slate-700">
                <div className="font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                  LEMBAR DISPOSISI KEDINASAN SPPG TMG2
                </div>
                <div className="text-[11px] text-slate-500">
                  {sppgConfig.sppgName} | ID: {sppgConfig.sppgId}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div>
                  <span className="text-slate-500">Nomor Surat Asli:</span>{' '}
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedIncoming.letterNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500">Tanggal Diterima:</span>{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">{formatIndonesianDate(selectedIncoming.receivedDate)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Asal Surat:</span>{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedIncoming.sender}</span>
                </div>
                <div>
                  <span className="text-slate-500">Tanggal Surat:</span>{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">{formatIndonesianDate(selectedIncoming.letterDate)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px]">
                <span className="text-slate-500">Perihal:</span>{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedIncoming.subject}</span>
              </div>
            </div>

            {/* Disposition Editing Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Disposisi Kepada:
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Kepala SPPG', 'Pengawas Gizi', 'Pengawas Keuangan', 'Asisten Lapangan', 'Admin Gudang', 'Chef', 'Koordinator Distribusi'].map((role) => {
                    const isChecked = selectedIncoming.dispositionTo.includes(role);
                    return (
                      <button
                        type="button"
                        key={role}
                        onClick={() => {
                          let current = selectedIncoming.dispositionTo.split(',').map(s => s.trim()).filter(Boolean);
                          if (isChecked) {
                            current = current.filter(r => r !== role);
                          } else {
                            current.push(role);
                          }
                          setSelectedIncoming({
                            ...selectedIncoming,
                            dispositionTo: current.join(', '),
                          });
                        }}
                        className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${
                          isChecked
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Instruksi / Petunjuk Tindak Lanjut:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'Tindak lanjuti segera',
                    'Pelajari & koordinasikan',
                    'Siapkan laporan / data dukung',
                    'Hadiri / wakili pertemuan',
                    'Arsipkan & pedomani',
                  ].map((inst) => (
                    <button
                      type="button"
                      key={inst}
                      onClick={() => {
                        setSelectedIncoming({
                          ...selectedIncoming,
                          dispositionInstruction: inst,
                        });
                      }}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] text-slate-700 dark:text-slate-300 font-medium"
                    >
                      + {inst}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={selectedIncoming.dispositionInstruction}
                  onChange={(e) => setSelectedIncoming({ ...selectedIncoming, dispositionInstruction: e.target.value })}
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Tambahan Disposisi
                </label>
                <input
                  type="text"
                  placeholder="Catatan khusus, batas waktu atau instruksi tambahan..."
                  value={selectedIncoming.dispositionNotes || ''}
                  onChange={(e) => setSelectedIncoming({ ...selectedIncoming, dispositionNotes: e.target.value })}
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Perbarui Status Tindak Lanjut
                </label>
                <select
                  value={selectedIncoming.followUpStatus}
                  onChange={(e) => setSelectedIncoming({ ...selectedIncoming, followUpStatus: e.target.value as IncomingLetter['followUpStatus'] })}
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="Diterima">Diterima</option>
                  <option value="Didisposisikan">Didisposisikan</option>
                  <option value="Dalam Proses Tindak Lanjut">Dalam Proses Tindak Lanjut</option>
                  <option value="Selesai Tindak Lanjut">Selesai Tindak Lanjut</option>
                  <option value="Diarsipkan">Diarsipkan</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => triggerPrint()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Lembar Disposisi
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDispositionOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                >
                  Simpan Disposisi
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: PREVIEW SCAN DOKUMEN FISIK SURAT MASUK */}
      {/* ========================================================================= */}
      {selectedIncoming && (
        <Modal
          isOpen={isScanPreviewOpen}
          onClose={() => setIsScanPreviewOpen(false)}
          title={`Scan Dokumen Fisik: ${selectedIncoming.letterNumber}`}
          maxWidth="3xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div>
                Asal: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedIncoming.sender}</span>
              </div>
              <div>
                Tgl Terima: {formatIndonesianDate(selectedIncoming.receivedDate)}
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-2 min-h-[350px]">
              {selectedIncoming.scannedDocumentUrl ? (
                <img
                  src={selectedIncoming.scannedDocumentUrl}
                  alt={`Scan Dokumen ${selectedIncoming.letterNumber}`}
                  className="max-h-[500px] object-contain rounded-lg shadow-md"
                />
              ) : (
                <div className="text-center text-slate-400 p-8">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Tidak ada lampiran scan dokumen fisik.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsScanPreviewOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: VIEW MASTER TEMPLATE (READ-ONLY) */}
      {/* ========================================================================= */}
      {viewingTemplate && (
        <Modal
          isOpen={!!viewingTemplate}
          onClose={() => setViewingTemplate(null)}
          title={`Template Master: [${viewingTemplate.codePrefix}] ${viewingTemplate.title}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs print:hidden">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Lock className="w-4 h-4 text-amber-500" />
                <span>Format Master Blueprint Resmi (Tidak Dapat Diubah)</span>
              </div>
              <button
                onClick={() => {
                  const tmpl = viewingTemplate;
                  setViewingTemplate(null);
                  openCreateWithTemplate(tmpl);
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
              >
                Gunakan & Buat Salinan Dokumen
              </button>
            </div>

            {viewingTemplate.id === 'tmpl-bast' && (
              <div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Pratinjau Format Visual Resmi (Otomatis Terhubung Data Lembaga Penerima Manfaat):
                </div>
                <BASTDocumentSheet
                  data={resolveBastAutoFields({
                    institutions,
                    beneficiaryAttendance,
                    masterVolunteers,
                    distributionLogs,
                    sppgConfig,
                    institutionId: institutions[0]?.id,
                    date: new Date().toISOString().slice(0, 10),
                    bastNumber: generateBastNumber(192),
                  })}
                />
              </div>
            )}

            <div className="print:hidden">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Teks Cetak Biru Baku:
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed border border-slate-800">
                {viewingTemplate.templateBody}
              </pre>
            </div>

            <div className="pt-2 flex justify-end print:hidden">
              <button
                onClick={() => setViewingTemplate(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
