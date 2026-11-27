import React, { useState, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { NumericInput } from '../common/NumericInput';
import { PrintHeader } from '../common/PrintHeader';
import { ClassicTimeInput } from '../common/ClassicTimeInput';
import { exportTableToPDF, exportToExcel, triggerPrint, formatIndonesianDate, formatRupiah, formatNumber } from '../../lib/exportUtils';
import { toNonNegativeNumber } from '../../lib/numberUtils';
import {
  sortPOItemsBahanThenOperasional,
  isOperasionalPOItem,
  resolvePOItemDistributionDate,
  resolvePOItemApprovalStatus,
  resolvePOItemSupplierConfirmed,
  resolvePOItemSupplierDeliveryStatus,
  resolvePOItemQCInfo,
  resolvePOItemPrepDamagedInfo,
  getPODisplayCategoryRank,
} from '../../lib/supplyChainSync';
import {
  PurchaseOrder,
  PurchaseOrderItem,
  SupplierDocument,
  MasterSupplier,
  QCStatusPLOK,
  QualityControlRecord,
} from '../../types';
import {
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Upload,
  Calendar,
  Phone,
  Building,
  ShieldCheck,
  PackageCheck,
  Eye,
  Printer,
  XCircle,
  Send,
  Download,
  Search,
  Filter,
  Check,
  X,
  Lock,
  UserCheck,
  FileCheck,
  Image as ImageIcon,
  ExternalLink,
  Link2,
  RotateCcw,
  Edit3,
  MinusCircle,
  PlusCircle,
} from 'lucide-react';

export const SupplierPortalModule: React.FC = () => {
  const {
    purchaseOrders,
    rabItems,
    menuItems,
    qualityControlRecords,
    prepRecords,
    masterUnits,
    supplierConfirmPO,
    supplierUpdatePOStatus,
    supplierRejectPO,
    supplierConfirmPOItem,
    supplierUpdatePOItemStatus,
    supplierRejectPOItem,
    supplierResetPOItem,
    supplierReducePOItemQuantity,
    supplierCoverPOItemShortage,
    supplierEditDeliveredPOItem,
    supplierUploadDocument,
    currentUser,
    masterSuppliers,
    sppgConfig,
    addToast,
  } = useApp();

  const activeSupplierName = (currentUser.supplierName || '').trim() || 'PT Unggas Barokah Probolinggo';

  // Active Tab
  const [activeTab, setActiveTab] = useState<'active_po' | 'delivered' | 'history' | 'profile'>('active_po');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deliveryDateFilter, setDeliveryDateFilter] = useState<string>('ALL');

  // Modals
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [selectedPOItem, setSelectedPOItem] = useState<PurchaseOrderItem | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isReducePOQtyModalOpen, setIsReducePOQtyModalOpen] = useState(false);
  const [isCoverShortageModalOpen, setIsCoverShortageModalOpen] = useState(false);
  const [isEditDeliveredModalOpen, setIsEditDeliveredModalOpen] = useState(false);

  // Form States
  const [confirmForm, setConfirmForm] = useState({
    estimatedDeliveryDate: new Date().toISOString().slice(0, 10),
    estimatedDeliveryTime: '04:00 WIB',
    driverName: 'Budi Santoso',
    driverPhone: '0813-8822-1100',
    vehicleNumber: 'N 8922 UB',
    notes: 'Siap dikirim tepat waktu sesuai spesifikasi mutu BGN.',
  });

  const [updateStatusForm, setUpdateStatusForm] = useState({
    status: 'Sedang Dipersiapkan' as NonNullable<PurchaseOrder['supplierDeliveryStatus']>,
    notes: 'Bahan telah disortir dan masuk proses packing pendingin.',
  });

  const [rejectReason, setRejectReason] = useState('');

  const [uploadDocForm, setUploadDocForm] = useState({
    type: 'Surat Jalan' as SupplierDocument['type'],
    fileName: 'Surat_Jalan_Pengiriman.pdf',
    fileUrl: '',
  });

  const [reducePOForm, setReducePOForm] = useState({
    currentOrderedQty: 0,
    deliveredQty: 0,
    damagedQty: 0,
    qcPassedQty: 0,
    newOrderedQty: 0,
    unit: 'kg',
    notes: '',
  });

  const [coverShortageForm, setCoverShortageForm] = useState({
    shortageQty: 0,
    addedQty: 0,
    unit: 'kg',
    deliveredAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    condition: 'Baik' as QualityControlRecord['condition'],
    qualityGrade: 'Grade A (Sangat Baik)' as QualityControlRecord['qualityGrade'],
    notes: '',
  });

  const [editDeliveredForm, setEditDeliveredForm] = useState({
    deliveredAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    orderedQuantity: 0,
    deliveredQuantity: 0,
    damagedQuantity: 0,
    unit: 'kg',
    status: 'Diterima' as QCStatusPLOK,
    notes: '',
  });

  // Data Purchase Order diambil langsung dari data Purchase Order PLOK (Bahan Pangan & Operasional)
  const supplierPOs = useMemo(() => {
    return purchaseOrders;
  }, [purchaseOrders]);

  // Split into Active vs Completed/History
  const activePOs = useMemo(() => {
    return supplierPOs.filter(po =>
      po.status !== 'Diterima di Gudang' && po.status !== 'Ditolak' && po.status !== 'Dibatalkan'
    );
  }, [supplierPOs]);

  const historyPOs = useMemo(() => {
    return supplierPOs.filter(po =>
      po.status === 'Diterima di Gudang' || po.status === 'Ditolak' || po.status === 'Dibatalkan'
    );
  }, [supplierPOs]);

  // Data Bahan & Operasional Terkirim (All delivered / QC-inspected / arrived items from PLOK)
  const allDeliveredRows = useMemo(() => {
    const flattened = supplierPOs.flatMap(po => {
      const rawItemsList =
        po.items && po.items.length > 0
          ? po.items
          : [
              {
                itemId: po.id,
                itemName: po.notes || 'Pesanan PO',
                quantity: 1,
                unit: 'paket',
                unitPrice: po.totalAmount,
                subtotal: po.totalAmount,
                rabId: po.rabId,
              },
            ];
      const sortedItems = sortPOItemsBahanThenOperasional(rawItemsList, po, rabItems);

      return sortedItems
        .map((it, itemIdx) => {
          const isOpsItem = isOperasionalPOItem(it, po, rabItems);
          const linkedRab = rabItems.find(r => r.id === (it.rabId || po.rabId));
          const itemApprovalStatus = resolvePOItemApprovalStatus(it, po);
          const itemDeliveryStatus = resolvePOItemSupplierDeliveryStatus(it, po);
          const itemQCInfo = resolvePOItemQCInfo(it, po, qualityControlRecords);
          const orderedQty = Number(it.quantity || 0);
          const qcRecordedReceivedQty = itemQCInfo.itemQCs.reduce(
            (sum, q) => sum + Number(q.receivedQuantity || 0),
            0
          );
          const deliveredQty = itemQCInfo.qcCount > 0 ? qcRecordedReceivedQty : 0;
          const qcPassedQty = Number(itemQCInfo.receivedQuantity || 0);
          const prepDamagedInfo = resolvePOItemPrepDamagedInfo({
            item: it,
            po,
            prepRecords,
            rabItems,
            menuItems,
            masterUnits,
            qcTimestamp: itemQCInfo.acceptedAt || itemQCInfo.latestInspectedAt,
          });
          const prepDamagedQty = prepDamagedInfo.damagedQuantity;
          const isPOFullyReceivedWithQC =
            (po.status === 'Diterima di Gudang' || po.status === 'Selesai diterima') &&
            po.qcStatus !== 'Belum QC';
          const isDeliveredItem =
            itemQCInfo.qcStatus !== 'Belum QC' || isPOFullyReceivedWithQC;

          if (!isDeliveredItem) return null;
          if (itemApprovalStatus === 'Ditolak' && itemQCInfo.qcCount === 0) return null;

          const hasQCEvaluation =
            itemQCInfo.qcCount > 0 ||
            qcPassedQty > 0 ||
            prepDamagedQty > 0 ||
            po.status === 'Diterima di Gudang' ||
            po.status === 'Selesai diterima' ||
            itemQCInfo.qcStatus === 'Ditolak';
          const netUsableQty =
            itemQCInfo.qcStatus === 'Ditolak'
              ? 0
              : Math.round((deliveredQty - prepDamagedQty) * 1000) / 1000;
          const totalSelisih =
            itemQCInfo.qcCount > 0 || deliveredQty > 0 || itemQCInfo.qcStatus === 'Ditolak'
              ? Math.round((netUsableQty - orderedQty) * 1000) / 1000
              : prepDamagedQty > 0
              ? -prepDamagedQty
              : 0;

          const receivedTimeRaw = itemQCInfo.acceptedAt || '';

          return {
            po,
            it,
            itemIdx,
            isOpsItem,
            linkedRab,
            itemApprovalStatus,
            itemDeliveryStatus,
            itemQCInfo,
            prepDamagedInfo,
            prepDamagedQty,
            netUsableQty,
            orderedQty,
            deliveredQty,
            qcPassedQty,
            totalSelisih,
            hasQCEvaluation,
            receivedTimeRaw,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);
    });

    return flattened.sort((a, b) => {
      const catA = a.isOpsItem ? 1 : 0;
      const catB = b.isOpsItem ? 1 : 0;
      if (catA !== catB) return catA - catB;
      const timeDiff = (b.receivedTimeRaw || b.po.deliveryDate || '').localeCompare(
        a.receivedTimeRaw || a.po.deliveryDate || ''
      );
      if (timeDiff !== 0) return timeDiff;
      const poDiff = (a.po.poNumber || '').localeCompare(b.po.poNumber || '');
      if (poDiff !== 0) return poDiff;
      return a.itemIdx - b.itemIdx;
    });
  }, [supplierPOs, rabItems, menuItems, qualityControlRecords, prepRecords, masterUnits]);

  // Available Delivery Target Days (Hari Target Kirim) for current tab
  const deliveryDateOptions = useMemo(() => {
    const countMap = new Map<string, number>();
    if (activeTab === 'delivered') {
      allDeliveredRows.forEach(row => {
        const dateStr = (row.po.deliveryDate || '').trim();
        if (!dateStr) return;
        countMap.set(dateStr, (countMap.get(dateStr) || 0) + 1);
      });
    } else {
      const sourceList = activeTab === 'history' ? historyPOs : activePOs;
      sourceList.forEach(po => {
        const dateStr = (po.deliveryDate || '').trim();
        if (!dateStr) return;
        countMap.set(dateStr, (countMap.get(dateStr) || 0) + 1);
      });
    }
    return Array.from(countMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        count,
      }));
  }, [activeTab, activePOs, historyPOs, allDeliveredRows]);

  // Filtered List based on tab, delivery target day, status, and search (sorted: Bahan dahulu, lalu Operasional)
  const displayedPOs = useMemo(() => {
    const sourceList = activeTab === 'history' ? historyPOs : activePOs;
    const query = searchQuery.trim().toLowerCase();
    return sourceList
      .filter(po => {
        const matchSearch =
          !query ||
          po.poNumber.toLowerCase().includes(query) ||
          po.items.some(i => i.itemName.toLowerCase().includes(query)) ||
          (po.supplierDriverName && po.supplierDriverName.toLowerCase().includes(query));

        const resolvedDeliveryStatus =
          po.supplierDeliveryStatus ||
          (po.supplierConfirmed ? 'Dikonfirmasi Supplier' : 'Menunggu Konfirmasi');
        const hasItemMatchingStatus =
          statusFilter !== 'ALL' &&
          (po.items || []).some(
            it => resolvePOItemSupplierDeliveryStatus(it, po) === statusFilter
          );
        const matchStatus =
          statusFilter === 'ALL' ||
          po.supplierDeliveryStatus === statusFilter ||
          resolvedDeliveryStatus === statusFilter ||
          hasItemMatchingStatus;

        const matchDeliveryDate =
          deliveryDateFilter === 'ALL' || (po.deliveryDate || '').trim() === deliveryDateFilter;

        return matchSearch && matchStatus && matchDeliveryDate;
      })
      .sort((a, b) => {
        const rankDiff =
          getPODisplayCategoryRank(a, rabItems) - getPODisplayCategoryRank(b, rabItems);
        if (rankDiff !== 0) return rankDiff;
        const dateDiff = (a.deliveryDate || '').localeCompare(b.deliveryDate || '');
        if (dateDiff !== 0) return dateDiff;
        return (a.poNumber || '').localeCompare(b.poNumber || '');
      });
  }, [activeTab, activePOs, historyPOs, searchQuery, statusFilter, deliveryDateFilter, rabItems]);

  // Item rows terurut ketat: seluruh item Nama Bahan terlebih dahulu, lalu dilanjutkan Item Operasional
  const activePORows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const flattened = displayedPOs.flatMap(po => {
      const rawItemsList =
        po.items && po.items.length > 0
          ? po.items
          : [
              {
                itemId: po.id,
                itemName: po.notes || 'Pesanan PO',
                quantity: 1,
                unit: 'paket',
                unitPrice: po.totalAmount,
                subtotal: po.totalAmount,
                rabId: po.rabId,
              },
            ];
      const sortedItems = sortPOItemsBahanThenOperasional(rawItemsList, po, rabItems);

      return sortedItems
        .map((it, itemIdx) => {
          const isOpsItem = isOperasionalPOItem(it, po, rabItems);
          const linkedRab = rabItems.find(r => r.id === (it.rabId || po.rabId));
          const itemApprovalStatus = resolvePOItemApprovalStatus(it, po);
          const itemConfirmed = resolvePOItemSupplierConfirmed(it, po);
          const itemDeliveryStatus = resolvePOItemSupplierDeliveryStatus(it, po);
          const itemQCInfo = resolvePOItemQCInfo(it, po, qualityControlRecords);
          const resolvedDistDate = resolvePOItemDistributionDate(it, po, rabItems, menuItems);
          const itemEstimatedDelivery =
            it.supplierEstimatedDelivery ||
            (itemConfirmed ? po.supplierEstimatedDelivery : undefined);
          const itemDriverName =
            it.supplierDriverName || (itemConfirmed ? po.supplierDriverName : undefined);
          const itemVehicleNumber =
            it.supplierVehicleNumber || (itemConfirmed ? po.supplierVehicleNumber : undefined);
          const itemRejectionReason =
            it.supplierRejectionReason ||
            (itemApprovalStatus === 'Ditolak' ? po.supplierRejectionReason : undefined);

          return {
            po,
            it,
            itemIdx,
            isOpsItem,
            linkedRab,
            itemApprovalStatus,
            itemConfirmed,
            itemDeliveryStatus,
            itemQCInfo,
            resolvedDistDate,
            itemEstimatedDelivery,
            itemDriverName,
            itemVehicleNumber,
            itemRejectionReason,
          };
        })
        .filter(row => {
          if (statusFilter !== 'ALL') {
            if (
              row.itemDeliveryStatus !== statusFilter &&
              row.po.supplierDeliveryStatus !== statusFilter
            ) {
              return false;
            }
          }
          if (query) {
            const matchPo = row.po.poNumber.toLowerCase().includes(query);
            const matchItem = row.it.itemName.toLowerCase().includes(query);
            const matchDriver = (row.itemDriverName || row.po.supplierDriverName || '')
              .toLowerCase()
              .includes(query);
            if (!matchPo && !matchItem && !matchDriver) {
              return false;
            }
          }
          return true;
        });
    });

    return flattened.sort((a, b) => {
      const catA = a.isOpsItem ? 1 : 0;
      const catB = b.isOpsItem ? 1 : 0;
      if (catA !== catB) return catA - catB;
      const dateDiff = (a.po.deliveryDate || '').localeCompare(b.po.deliveryDate || '');
      if (dateDiff !== 0) return dateDiff;
      const poDiff = (a.po.poNumber || '').localeCompare(b.po.poNumber || '');
      if (poDiff !== 0) return poDiff;
      return a.itemIdx - b.itemIdx;
    });
  }, [displayedPOs, rabItems, menuItems, qualityControlRecords, statusFilter, searchQuery]);

  const deliveredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allDeliveredRows.filter(row => {
      const matchDeliveryDate =
        deliveryDateFilter === 'ALL' || (row.po.deliveryDate || '').trim() === deliveryDateFilter;
      const matchStatus =
        statusFilter === 'ALL' ||
        row.itemDeliveryStatus === statusFilter ||
        row.itemQCInfo.qcStatus === statusFilter ||
        row.po.supplierDeliveryStatus === statusFilter;
      const matchSearch =
        !query ||
        row.po.poNumber.toLowerCase().includes(query) ||
        row.it.itemName.toLowerCase().includes(query) ||
        row.itemQCInfo.qcStatus.toLowerCase().includes(query) ||
        (row.po.supplierDriverName || '').toLowerCase().includes(query);
      return matchDeliveryDate && matchStatus && matchSearch;
    });
  }, [allDeliveredRows, deliveryDateFilter, statusFilter, searchQuery]);

  // Statistics for Current Supplier
  const stats = useMemo(() => {
    const total = supplierPOs.length;
    const needConfirm = supplierPOs.filter(p => !p.supplierConfirmed && p.status !== 'Ditolak' && p.status !== 'Dibatalkan').length;
    const inDelivery = supplierPOs.filter(p => p.supplierDeliveryStatus === 'Dalam Pengiriman' || p.supplierDeliveryStatus === 'Sedang Dipersiapkan').length;
    const completed = supplierPOs.filter(p => p.status === 'Diterima di Gudang').length;
    const totalNominal = supplierPOs.reduce((sum, p) => sum + p.totalAmount, 0);
    return { total, needConfirm, inDelivery, completed, totalNominal };
  }, [supplierPOs]);

  // Supplier Profile Info from Master Suppliers
  const supplierInfo: MasterSupplier = useMemo(() => {
    return masterSuppliers.find(s => s.name.toLowerCase() === activeSupplierName.toLowerCase()) || {
      id: 'sup-curr',
      code: 'SUP-ACT',
      name: activeSupplierName,
      address: 'Kabupaten Probolinggo, Jawa Timur',
      contactPerson: 'PIC Rekanan Mitra Pangan',
      phone: '0812-3456-7890',
      suppliedCategories: ['Bahan Pangan Segar', 'Lauk Pauk'],
      bankName: 'Bank BRI',
      accountNumber: '0034-01-08992-50-2',
      bankAccountName: activeSupplierName,
      isActive: true,
    };
  }, [masterSuppliers, activeSupplierName]);

  // Handle Confirm PO / Item Submit
  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    const fullEstimated = `${formatIndonesianDate(confirmForm.estimatedDeliveryDate)} - ${confirmForm.estimatedDeliveryTime}`;
    if (selectedPOItem) {
      await supplierConfirmPOItem(
        selectedPO.id,
        { itemId: selectedPOItem.itemId, itemName: selectedPOItem.itemName },
        fullEstimated,
        confirmForm.driverName,
        confirmForm.driverPhone,
        confirmForm.vehicleNumber
      );
    } else {
      await supplierConfirmPO(
        selectedPO.id,
        fullEstimated,
        confirmForm.driverName,
        confirmForm.driverPhone,
        confirmForm.vehicleNumber
      );
    }

    setIsConfirmModalOpen(false);
    setSelectedPOItem(null);
  };

  // Handle Status Update Submit
  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    if (selectedPOItem) {
      await supplierUpdatePOItemStatus(
        selectedPO.id,
        { itemId: selectedPOItem.itemId, itemName: selectedPOItem.itemName },
        updateStatusForm.status,
        updateStatusForm.notes
      );
    } else {
      await supplierUpdatePOStatus(selectedPO.id, updateStatusForm.status, updateStatusForm.notes);
    }
    setIsUpdateStatusModalOpen(false);
    setSelectedPOItem(null);
  };

  // Handle Reject Submit
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;
    if (!rejectReason.trim()) {
      addToast('error', 'Alasan Wajib', 'Mohon isi alasan penolakan pesanan.');
      return;
    }

    if (selectedPOItem) {
      await supplierRejectPOItem(
        selectedPO.id,
        { itemId: selectedPOItem.itemId, itemName: selectedPOItem.itemName },
        rejectReason.trim()
      );
    } else {
      await supplierRejectPO(selectedPO.id, rejectReason.trim());
    }
    setIsRejectModalOpen(false);
    setSelectedPOItem(null);
    setRejectReason('');
  };

  // Handle Upload Document Submit
  const handleUploadDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    await supplierUploadDocument(selectedPO.id, {
      type: uploadDocForm.type,
      fileName: uploadDocForm.fileName,
      fileUrl: uploadDocForm.fileUrl || 'https://images.unsplash.com/photo-1554415707-9e4466b404c0?auto=format&fit=crop&w=500&q=80',
    });

    setIsUploadDocModalOpen(false);
    setUploadDocForm({
      type: 'Surat Jalan',
      fileName: 'Surat_Jalan_Pengiriman.pdf',
      fileUrl: '',
    });
  };

  const formatReceivedTimeLabel = (
    rawTime: string,
    _fallbackDeliveryDate: string,
    _deliveryStatus: string,
    qcStatus?: QCStatusPLOK
  ) => {
    const trimmed = (rawTime || '').trim();
    if (trimmed) {
      const dateMatch = /^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?/.exec(trimmed);
      if (dateMatch) {
        const formattedDate = formatIndonesianDate(dateMatch[1]);
        return dateMatch[2] ? `${formattedDate} · ${dateMatch[2]} WIB` : formattedDate;
      }
      return trimmed;
    }
    if (qcStatus === 'Ditolak') {
      return 'Ditolak QC (Belum Diterima)';
    }
    if (qcStatus === 'Perlu pemeriksaan ulang') {
      return 'Karantina / Perlu Pemeriksaan Ulang';
    }
    return 'Belum Diterima di QC PLOK';
  };

  const handleReducePOQtySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO || !selectedPOItem) return;
    const cleanQty = Math.min(
      toNonNegativeNumber(reducePOForm.currentOrderedQty, 0),
      toNonNegativeNumber(reducePOForm.newOrderedQty, 0)
    );
    await supplierReducePOItemQuantity(
      selectedPO.id,
      { itemId: selectedPOItem.itemId, itemName: selectedPOItem.itemName },
      cleanQty,
      reducePOForm.notes.trim() || undefined
    );
    setIsReducePOQtyModalOpen(false);
    setSelectedPOItem(null);
  };

  const handleCoverShortageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO || !selectedPOItem) return;
    const cleanAdded = toNonNegativeNumber(coverShortageForm.addedQty, 0);
    if (cleanAdded <= 0) {
      addToast('error', 'Jumlah Tidak Valid', 'Masukkan jumlah tambahan pengiriman lebih dari 0.');
      return;
    }
    await supplierCoverPOItemShortage(
      selectedPO.id,
      { itemId: selectedPOItem.itemId, itemName: selectedPOItem.itemName },
      cleanAdded,
      {
        deliveredAt: coverShortageForm.deliveredAt,
        condition: coverShortageForm.condition,
        qualityGrade: coverShortageForm.qualityGrade,
        notes: coverShortageForm.notes,
      }
    );
    setIsCoverShortageModalOpen(false);
    setSelectedPOItem(null);
  };

  const handleEditDeliveredSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO || !selectedPOItem) return;
    await supplierEditDeliveredPOItem(
      selectedPO.id,
      { itemId: selectedPOItem.itemId, itemName: selectedPOItem.itemName },
      {
        deliveredAt: editDeliveredForm.deliveredAt,
        orderedQuantity: toNonNegativeNumber(editDeliveredForm.orderedQuantity, 0),
        deliveredQuantity: toNonNegativeNumber(editDeliveredForm.deliveredQuantity, 0),
        damagedQuantity: toNonNegativeNumber(editDeliveredForm.damagedQuantity, 0),
        status: editDeliveredForm.status,
        notes: editDeliveredForm.notes,
      }
    );
    setIsEditDeliveredModalOpen(false);
    setSelectedPOItem(null);
  };

  // Export handlers
  const handleExportPDF = () => {
    if (activeTab === 'delivered') {
      exportTableToPDF({
        title: `DATA BAHAN & OPERASIONAL TERKIRIM`,
        subtitle: `Rekapitulasi Penerimaan, Hasil QC & Selisih Purchase Order PLOK | SPPG Temenggungan 2`,
        headers: [
          'Nomor',
          'Nama Bahan dan Operasional',
          'Waktu Diterima',
          'Jumlah Dipesan',
          'Jumlah Diterima',
          'Jumlah Hasil QC',
          'Total Selisih',
          'Status',
        ],
        rows: deliveredRows.map((row, idx) => [
          String(idx + 1),
          `${row.it.itemName} (${row.po.poNumber})`,
          formatReceivedTimeLabel(
            row.receivedTimeRaw,
            row.po.deliveryDate,
            row.itemDeliveryStatus,
            row.itemQCInfo.qcStatus
          ),
          `${formatNumber(row.orderedQty)} ${row.it.unit}`,
          `${formatNumber(row.deliveredQty)} ${row.it.unit}`,
          `${formatNumber(row.prepDamagedQty)} ${row.it.unit}`,
          `${row.totalSelisih > 0 ? `+${formatNumber(row.totalSelisih)}` : formatNumber(row.totalSelisih)} ${row.it.unit}`,
          row.itemQCInfo.qcStatus,
        ]),
        fileName: `Data_Bahan_Operasional_Terkirim`,
        sppgConfig,
        signerName: currentUser.name,
        signerRole: 'Koordinator Pengadaan & Mitra',
      });
      return;
    }

    exportTableToPDF({
      title: `REKAPITULASI PURCHASE ORDER (PO) BAHAN & OPERASIONAL`,
      subtitle: `Sumber Data: Purchase Order PLOK | SPPG Temenggungan 2`,
      headers: ['Nomor PO', 'Tanggal PO', 'Bahan & Operasional Dipesan', 'Total Nilai (Rp)', 'Target / Estimasi Kirim', 'Status Pengiriman'],
      rows: displayedPOs.map(p => {
        const sorted = sortPOItemsBahanThenOperasional(p.items || [], p, rabItems);
        return [
          p.poNumber,
          formatIndonesianDate(p.date),
          sorted.map(i => `${i.itemName} (${i.quantity} ${i.unit})`).join(', '),
          formatRupiah(p.totalAmount),
          p.supplierEstimatedDelivery || formatIndonesianDate(p.deliveryDate),
          p.supplierDeliveryStatus || p.status,
        ];
      }),
      fileName: `PO_Bahan_Operasional_PLOK`,
      sppgConfig,
      signerName: currentUser.name,
      signerRole: 'Koordinator Pengadaan & Mitra',
    });
  };

  const handleExportExcel = () => {
    if (activeTab === 'delivered') {
      const data = deliveredRows.map((row, idx) => ({
        'Nomor': idx + 1,
        'Nomor PO': row.po.poNumber,
        'Kategori Item': row.isOpsItem ? 'Operasional' : 'Bahan Pangan',
        'Nama Bahan dan Operasional': row.it.itemName,
        'Waktu Bahan dan Operasional diterima': formatReceivedTimeLabel(
          row.receivedTimeRaw,
          row.po.deliveryDate,
          row.itemDeliveryStatus,
          row.itemQCInfo.qcStatus
        ),
        'Jumlah yang pesan': row.orderedQty,
        'Jumlah yang diterima': row.deliveredQty,
        'Jumlah Hasil QC (Rusak Persiapan)': row.prepDamagedQty,
        'Total Selisih': row.totalSelisih,
        'Satuan': row.it.unit,
        'Status QC': row.itemQCInfo.qcStatus,
        'Status Pengiriman': row.itemDeliveryStatus,
      }));
      exportToExcel(data, `Data_Bahan_Operasional_Terkirim`);
      return;
    }

    const data = activePORows.map(({
      po,
      it,
      isOpsItem,
      itemApprovalStatus,
      itemConfirmed,
      itemDeliveryStatus,
      itemQCInfo,
      itemEstimatedDelivery,
      itemDriverName,
      itemVehicleNumber,
    }) => ({
      'Nomor PO': po.poNumber,
      'Kategori Item': isOpsItem ? 'Operasional' : 'Bahan Pangan',
      'Nama Bahan dan Operasional': it.itemName,
      'Jumlah': it.quantity,
      'Satuan': it.unit,
      'Harga Dasar': it.unitPrice,
      'Subtotal': it.subtotal,
      'Target Kirim (H-1)': formatIndonesianDate(po.deliveryDate),
      'Tanggal Terbit': formatIndonesianDate(po.date),
      'Estimasi Pengiriman': itemEstimatedDelivery || '-',
      'Nama Driver': itemDriverName || '-',
      'Nomor Polisi': itemVehicleNumber || '-',
      'Status Persetujuan Item': itemApprovalStatus,
      'Status Konfirmasi': itemConfirmed ? 'Dikonfirmasi' : 'Belum Konfirmasi',
      'Status Pengiriman': itemDeliveryStatus,
      'Status QC Item': itemQCInfo.qcStatus,
      'Qty Diterima QC': itemQCInfo.receivedQuantity,
    }));
    exportToExcel(data, `PO_Bahan_Operasional_PLOK`);
  };

  // Table Columns
  const poColumns: Column<PurchaseOrder>[] = [
    {
      key: 'poNumber',
      header: 'No. PO & Tanggal',
      render: (po: PurchaseOrder) => (
        <div>
          <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
            {po.poNumber}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>Terbit: {formatIndonesianDate(po.date)}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Bahan Makanan Dipesan',
      render: (po: PurchaseOrder) => (
        <div className="space-y-1 max-w-xs md:max-w-sm">
          {po.items.map((it, idx) => (
            <div key={idx} className="text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200">{it.itemName}</span>
              <span className="text-slate-500 ml-1.5 font-mono text-[11px]">
                {formatNumber(it.quantity)} {it.unit} @ {formatRupiah(it.unitPrice)}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total Nilai Pesanan',
      render: (po: PurchaseOrder) => (
        <div>
          <div className="font-bold text-xs text-blue-900 dark:text-sky-400 font-mono">
            {formatRupiah(po.totalAmount)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {po.items.length} jenis bahan
          </div>
        </div>
      ),
    },
    {
      key: 'delivery',
      header: 'Estimasi & Jadwal Kirim',
      render: (po: PurchaseOrder) => (
        <div className="text-xs">
          {po.supplierEstimatedDelivery ? (
            <div className="font-semibold text-emerald-700 dark:text-emerald-400">
              {po.supplierEstimatedDelivery}
            </div>
          ) : (
            <div className="text-slate-500 italic text-[11px]">
              Target: {formatIndonesianDate(po.deliveryDate)}
            </div>
          )}
          {po.supplierDriverName && (
            <div className="text-[10px] text-slate-500 mt-0.5">
              Driver: {po.supplierDriverName} ({po.supplierVehicleNumber || '-'})
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status Pengiriman Mitra',
      render: (po: PurchaseOrder) => {
        const statusColors: Record<string, string> = {
          'Menunggu Konfirmasi': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300',
          'Dikonfirmasi Supplier': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300',
          'Sedang Dipersiapkan': 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300',
          'Dalam Pengiriman': 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300',
          'Telah Tiba di Gudang': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300',
          'Ditolak Supplier': 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300',
        };
        const currentDeliveryStatus = po.supplierDeliveryStatus || (po.supplierConfirmed ? 'Dikonfirmasi Supplier' : 'Menunggu Konfirmasi');

        return (
          <div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full border ${statusColors[currentDeliveryStatus] || 'bg-slate-100 text-slate-800 border-slate-300'}`}>
              {currentDeliveryStatus}
            </span>
            {po.supplierDocuments && po.supplierDocuments.length > 0 && (
              <div className="text-[10px] text-blue-600 dark:text-sky-400 font-semibold mt-1 flex items-center gap-1">
                <FileCheck className="w-3 h-3" />
                {po.supplierDocuments.length} Dokumen Unggahan
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Tindakan Pesanan',
      render: (po: PurchaseOrder) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setSelectedPO(po);
              setIsDetailModalOpen(true);
            }}
            title="Lihat Rincian PO"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>

          {!po.supplierConfirmed && po.status !== 'Ditolak' && (
            <button
              type="button"
              onClick={() => {
                setSelectedPO(po);
                setConfirmForm({
                  estimatedDeliveryDate: po.deliveryDate || new Date().toISOString().slice(0, 10),
                  estimatedDeliveryTime: '04:00 WIB',
                  driverName: 'Budi Santoso',
                  driverPhone: '0813-8822-1100',
                  vehicleNumber: 'N 8922 UB',
                  notes: 'Sanggup memenuhi dan siap kirim tepat waktu.',
                });
                setIsConfirmModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Konfirmasi</span>
            </button>
          )}

          {po.supplierConfirmed && po.status !== 'Diterima di Gudang' && (
            <button
              type="button"
              onClick={() => {
                setSelectedPO(po);
                setUpdateStatusForm({
                  status: (po.supplierDeliveryStatus as any) || 'Sedang Dipersiapkan',
                  notes: '',
                });
                setIsUpdateStatusModalOpen(true);
              }}
              title="Perbarui Status Pengiriman"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Update Status</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setSelectedPO(po);
              setUploadDocForm({
                type: 'Surat Jalan',
                fileName: `Surat_Jalan_${po.poNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
                fileUrl: '',
              });
              setIsUploadDocModalOpen(true);
            }}
            title="Unggah Dokumen Pendukung (Surat Jalan/Faktur/Halal)"
            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors"
          >
            <Upload className="w-4 h-4" />
          </button>

          {!po.supplierConfirmed && po.status !== 'Ditolak' && (
            <button
              type="button"
              onClick={() => {
                setSelectedPO(po);
                setRejectReason('');
                setIsRejectModalOpen(true);
              }}
              title="Tolak Pesanan"
              className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Strict Security & Isolation Notice Banner */}
      <div className="bg-gradient-to-r from-[#1E3A8A] via-slate-900 to-indigo-950 text-white p-5 rounded-xl shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/60 border border-blue-400/30 text-[11px] font-semibold text-blue-100 mb-1.5">
              <Lock className="w-3.5 h-3.5 text-sky-300" />
              PORTAL SUPPLIER TERISOLASI • RBAC KEAMANAN TINGKAT TINGGI
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">
              Portal Mitra Supplier Bahan Pangan
            </h1>
            <p className="text-xs text-blue-100 mt-1 max-w-3xl">
              Portal mandiri rekanan SPPG untuk konfirmasi Purchase Order (PO), pemutakhiran jadwal pengiriman bahan pangan segar/kering, pengunggahan dokumen Surat Jalan & sertifikasi halal, tanpa akses ke data keuangan internal atau data penerima manfaat.
            </p>
          </div>

        </div>

        {/* Decorative blur */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col justify-between h-full transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Total PO Masuk
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#1E3A8A] dark:text-blue-400">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white mt-2">
            {stats.total}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            Total nilai: {formatRupiah(stats.totalNominal)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col justify-between h-full transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Perlu Konfirmasi
            </span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-[#D97706] dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-nums text-[#D97706] dark:text-amber-400 mt-2">
            {stats.needConfirm}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            Menunggu kesanggupan pasokan
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col justify-between h-full transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Dalam Proses Kirim
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#1E3A8A] dark:text-sky-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-nums text-[#1E3A8A] dark:text-sky-400 mt-2">
            {stats.inDelivery}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            Packing / armada menuju SPPG
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col justify-between h-full transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Selesai Diterima Gudang
            </span>
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-[#0D9488] dark:text-teal-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-nums text-[#0D9488] dark:text-teal-400 mt-2">
            {stats.completed}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            Telah lolos inspeksi QC
          </div>
        </div>
      </div>

      {/* Responsive Pill Tabs */}
      <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-nowrap sm:flex-wrap overflow-x-auto no-scrollbar items-center gap-1.5 pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('active_po');
              setStatusFilter('ALL');
            }}
            className={`inline-flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-semibold transition-all duration-200 ease-in-out whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'active_po'
                ? 'bg-[#1E3A8A] text-white shadow-sm dark:bg-sky-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            <PackageCheck className="w-4 h-4 shrink-0" />
            <span>Pesanan Aktif (PO Berjalan)</span>
            <span className={`px-2 py-0.5 text-[11px] rounded-full font-bold tabular-nums ${
              activeTab === 'active_po'
                ? 'bg-white/20 text-white'
                : 'bg-blue-50 text-[#1E3A8A] dark:bg-blue-900/50 dark:text-blue-300'
            }`}>
              {activePOs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('delivered');
              setStatusFilter('ALL');
            }}
            className={`inline-flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-semibold transition-all duration-200 ease-in-out whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'delivered'
                ? 'bg-[#1E3A8A] text-white shadow-sm dark:bg-sky-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            <Truck className="w-4 h-4 shrink-0" />
            <span>Data Bahan &amp; Operasional Terkirim</span>
            <span className={`px-2 py-0.5 text-[11px] rounded-full font-bold tabular-nums ${
              activeTab === 'delivered'
                ? 'bg-white/20 text-white'
                : 'bg-teal-50 text-[#0D9488] dark:bg-teal-900/50 dark:text-teal-300'
            }`}>
              {allDeliveredRows.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              setStatusFilter('ALL');
            }}
            className={`inline-flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-semibold transition-all duration-200 ease-in-out whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#1E3A8A] text-white shadow-sm dark:bg-sky-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            <FileCheck className="w-4 h-4 shrink-0" />
            <span>Riwayat PO Selesai & QC</span>
            <span className={`px-2 py-0.5 text-[11px] rounded-full font-bold tabular-nums ${
              activeTab === 'history'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              {historyPOs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`inline-flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-semibold transition-all duration-200 ease-in-out whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#1E3A8A] text-white shadow-sm dark:bg-sky-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            <Building className="w-4 h-4 shrink-0" />
            <span>Legalitas & Rekening Rekanan</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1, 2 & 3: DAFTAR PO AKTIF, TERKIRIM & RIWAYAT */}
      {/* ========================================================================= */}
      {(activeTab === 'active_po' || activeTab === 'delivered' || activeTab === 'history') && (
        <div key={activeTab} className="space-y-4 animate-fadeIn">
          {/* Filters & Actions Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 print:hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-1 flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nomor PO, nama bahan & operasional, atau driver..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {activeTab === 'delivered' ? (
                    <>
                      <option value="ALL">Semua Status QC / Diterima</option>
                      <option value="Diterima">QC: Diterima</option>
                      <option value="Diterima sebagian">QC: Diterima sebagian</option>
                      <option value="Lolos Penuh">QC: Lolos Penuh</option>
                      <option value="Lolos Sebagian">QC: Lolos Sebagian</option>
                      <option value="Perlu pemeriksaan ulang">QC: Perlu pemeriksaan ulang</option>
                      <option value="Ditolak">QC: Ditolak</option>
                      <option value="Telah Tiba di Gudang">Telah Tiba di Gudang</option>
                    </>
                  ) : (
                    <>
                      <option value="ALL">Semua Status Pengiriman & QC</option>
                      <option value="Menunggu Konfirmasi">Menunggu Konfirmasi</option>
                      <option value="Dikonfirmasi Supplier">Dikonfirmasi Supplier</option>
                      <option value="Sedang Dipersiapkan">Sedang Dipersiapkan</option>
                      <option value="Dalam Pengiriman">Dalam Pengiriman</option>
                      <option value="Telah Tiba di Gudang">Telah Tiba di Gudang</option>
                      <option value="Ditolak Supplier">Ditolak Supplier</option>
                    </>
                  )}
                </select>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export PDF
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Export Excel
                </button>
                <button
                  type="button"
                  onClick={() => triggerPrint()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak
                </button>
              </div>
            </div>

            {/* Filter Berdasarkan Hari Target Kirim */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mr-1">
                  <Calendar className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Hari Target Kirim:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setDeliveryDateFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                    deliveryDateFilter === 'ALL'
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-2xs dark:bg-sky-600 dark:border-sky-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  Semua Hari (
                  {activeTab === 'delivered'
                    ? allDeliveredRows.length
                    : activeTab === 'history'
                    ? historyPOs.length
                    : activePOs.length}
                  )
                </button>
                {deliveryDateOptions.map(opt => {
                  const isActive = deliveryDateFilter === opt.date;
                  return (
                    <button
                      key={opt.date}
                      type="button"
                      onClick={() => setDeliveryDateFilter(opt.date)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        isActive
                          ? 'bg-[#0D9488] text-white border-[#0D9488] shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50 hover:border-teal-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <span>{formatIndonesianDate(opt.date)}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {opt.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    aria-label="Pilih Tanggal Target Kirim"
                    value={deliveryDateFilter === 'ALL' ? '' : deliveryDateFilter}
                    onChange={(e) => setDeliveryDateFilter(e.target.value || 'ALL')}
                    className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                {(deliveryDateFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery.trim() !== '') && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryDateFilter('ALL');
                      setStatusFilter('ALL');
                      setSearchQuery('');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition cursor-pointer"
                    title="Reset semua filter"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {activeTab === 'active_po' ? (
            /* Format Kolom Daftar Purchase Order (PO) Bahan & Operasional */
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden print:shadow-none">
              <div className="p-4 hidden print:block">
                <PrintHeader
                  title="PURCHASE ORDER (PO) AKTIF BAHAN & OPERASIONAL"
                  subtitle="Data Purchase Order PLOK — Nama Bahan dan Operasional"
                />
              </div>

              <div className="px-4 py-2.5 bg-[#C6E0B4] dark:bg-emerald-950/70 border-b border-slate-300 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-emerald-100">
                    PURCHASE ORDER (PO) AKTIF BAHAN &amp; OPERASIONAL ({displayedPOs.length} PO)
                  </span>
                  {deliveryDateFilter !== 'ALL' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/85 dark:bg-slate-900/75 text-[#0D9488] dark:text-teal-300 border border-teal-700/25">
                      Target Kirim: {formatIndonesianDate(deliveryDateFilter)}
                    </span>
                  )}
                  {statusFilter !== 'ALL' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900/70 text-slate-700 dark:text-emerald-200 border border-emerald-700/20">
                      Status: {statusFilter}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-emerald-200 font-mono">
                  Total Baris Pesanan: {activePORows.length} Item (Bahan → Operasional)
                </span>
              </div>

              {activePORows.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    variant={searchQuery || deliveryDateFilter !== 'ALL' || statusFilter !== 'ALL' ? 'search' : 'data'}
                    title="Belum ada Pesanan Aktif (PO Berjalan)"
                    description={
                      deliveryDateFilter !== 'ALL'
                        ? `Tidak ada PO aktif pada Purchase Order PLOK dengan target kirim hari ${formatIndonesianDate(deliveryDateFilter)}.`
                        : searchQuery || statusFilter !== 'ALL'
                        ? 'Tidak ada pesanan aktif yang cocok dengan pencarian atau filter status pengiriman Anda.'
                        : 'Belum ada Purchase Order bahan atau operasional yang aktif pada data Purchase Order PLOK.'
                    }
                    actionLabel={
                      deliveryDateFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery.trim() !== ''
                        ? 'Tampilkan Semua PO Aktif'
                        : undefined
                    }
                    onAction={
                      deliveryDateFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery.trim() !== ''
                        ? () => {
                            setDeliveryDateFilter('ALL');
                            setStatusFilter('ALL');
                            setSearchQuery('');
                          }
                        : undefined
                    }
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      {/* Numbered Spreadsheet Column Strip */}
                      <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 text-center">
                        <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 w-10">1</th>
                        <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 sticky left-0 z-10 bg-slate-100 dark:bg-slate-800">2</th>
                        <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">3</th>
                        <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">4</th>
                        <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">5</th>
                        <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">6</th>
                        <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">7</th>
                        <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">8</th>
                        <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">9</th>
                        <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 print:hidden">
                          Aksi
                        </th>
                      </tr>

                      {/* Main Olive Green Column Headers matching Procurement PO Bahan & Operasional */}
                      <tr className="bg-[#548235] dark:bg-emerald-900 text-white text-[11px] font-extrabold tracking-wide">
                        <th className="border border-slate-400/70 dark:border-slate-700 px-2.5 py-2 text-center w-10">
                          NO
                        </th>
                        <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-left min-w-[240px] sticky left-0 z-10 bg-[#548235] dark:bg-emerald-900">
                          NAMA BAHAN DAN OPERASIONAL
                        </th>
                        <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-left min-w-[215px] whitespace-nowrap">
                          NO. PO &amp; TARGET H-1
                        </th>
                        <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-center whitespace-nowrap">
                          Jumlah
                        </th>
                        <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-center whitespace-nowrap">
                          Satuan
                        </th>
                        <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-right whitespace-nowrap">
                          HARGA DASAR
                        </th>
                        <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-right whitespace-nowrap">
                          Jumlah
                        </th>
                        <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-center whitespace-nowrap">
                          Status PO
                        </th>
                        <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-center whitespace-nowrap">
                          Status QC Bahan
                        </th>
                        <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-right whitespace-nowrap print:hidden">
                          Aksi &amp; Alur PO
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {activePORows.map((entry, rowIdx) => {
                        const {
                          po,
                          it,
                          itemIdx,
                          isOpsItem,
                          linkedRab,
                          itemApprovalStatus,
                          itemConfirmed,
                          itemDeliveryStatus,
                          itemQCInfo,
                          resolvedDistDate,
                          itemEstimatedDelivery,
                          itemDriverName,
                          itemVehicleNumber,
                          itemRejectionReason,
                        } = entry;

                        const deliveryStatusColors: Record<string, string> = {
                          'Menunggu Konfirmasi':
                            'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300',
                          'Dikonfirmasi Supplier':
                            'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300',
                          'Sedang Dipersiapkan':
                            'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300',
                          'Dalam Pengiriman':
                            'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300',
                          'Telah Tiba di Gudang':
                            'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300',
                          'Ditolak Supplier':
                            'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300',
                        };

                        const isItemRejected = itemApprovalStatus === 'Ditolak';
                        const isItemClosed =
                          po.status === 'Diterima di Gudang' || po.status === 'Selesai diterima';

                        return (
                          <tr
                            key={`${po.id}-${itemIdx}-${isOpsItem ? 'op' : 'bh'}`}
                            className={`transition-colors ${
                              isItemRejected
                                ? 'bg-rose-50/30 dark:bg-rose-950/15 opacity-75'
                                : isOpsItem
                                ? 'bg-amber-50/20 hover:bg-amber-50/50 dark:bg-amber-950/10 dark:hover:bg-slate-800/60'
                                : 'hover:bg-blue-50/40 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            {/* Col 1: NO */}
                            <td className="border border-slate-300 dark:border-slate-700 px-2.5 py-2 text-center font-mono text-slate-700 dark:text-slate-300 align-top">
                              {rowIdx + 1}
                            </td>

                            {/* Col 2: NAMA BAHAN DAN OPERASIONAL */}
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 align-top sticky left-0 z-10 bg-white dark:bg-slate-900">
                              <div
                                className={`font-bold text-xs ${
                                  isItemRejected
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {it.itemName}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    isOpsItem
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-teal-100 text-[#0D9488] dark:bg-teal-950 dark:text-teal-300'
                                  }`}
                                >
                                  {isOpsItem ? 'Operasional' : 'Bahan Pangan'}
                                </span>
                                {linkedRab && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                                    <Link2 className="w-2.5 h-2.5" />
                                    <span>RAB: {linkedRab.budgetCode}</span>
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Col 3: NO. PO & TARGET H-1 (Berdasarkan Item Bahan & Operasional) */}
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 align-top">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="font-mono text-xs font-bold text-blue-900 dark:text-sky-300">
                                  {po.poNumber}
                                </span>
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    isOpsItem
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-teal-100 text-[#0D9488] dark:bg-teal-950 dark:text-teal-300'
                                  }`}
                                >
                                  {isOpsItem ? 'Operasional' : 'Bahan'}
                                </span>
                              </div>
                              {resolvedDistDate && (
                                <div className="text-[10px] text-[#0D9488] dark:text-teal-300 font-semibold mt-0.5">
                                  Distribusi Menu: {formatIndonesianDate(resolvedDistDate)}
                                </div>
                              )}
                              <div className="text-[10px] text-slate-600 dark:text-slate-300">
                                Target Kirim (H-1):{' '}
                                <strong className="text-blue-900 dark:text-sky-300">
                                  {formatIndonesianDate(po.deliveryDate)}
                                </strong>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Terbit: {formatIndonesianDate(po.date)}
                              </div>
                              {(itemEstimatedDelivery || itemDriverName || itemRejectionReason) && (
                                <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                                  {itemEstimatedDelivery && (
                                    <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                      Estimasi Mitra: {itemEstimatedDelivery}
                                    </div>
                                  )}
                                  {itemDriverName && (
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                      Driver: {itemDriverName} ({itemVehicleNumber || '-'})
                                    </div>
                                  )}
                                  {itemRejectionReason && (
                                    <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                                      Alasan Tolak: {itemRejectionReason}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Col 4: Jumlah (QTY) */}
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-center font-mono font-bold tabular-nums text-slate-900 dark:text-white align-top">
                              {formatNumber(it.quantity)}
                            </td>

                            {/* Col 5: Satuan */}
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-center text-slate-700 dark:text-slate-300 align-top">
                              {it.unit}
                            </td>

                            {/* Col 6: HARGA DASAR */}
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200 align-top whitespace-nowrap">
                              {formatRupiah(it.unitPrice)}
                            </td>

                            {/* Col 7: Jumlah (Subtotal Item) */}
                            <td
                              className={`border border-slate-300 dark:border-slate-700 px-3 py-2 text-right font-mono font-bold tabular-nums align-top whitespace-nowrap ${
                                isItemRejected
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {formatRupiah(it.subtotal)}
                            </td>

                            {/* Col 8: Status PO (Per Item) */}
                            <td className="border border-slate-300 dark:border-slate-700 px-2.5 py-2 text-center align-top whitespace-nowrap">
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                    itemApprovalStatus === 'Disetujui'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : itemApprovalStatus === 'Ditolak'
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  }`}
                                >
                                  {itemApprovalStatus === 'Disetujui' ? (
                                    <CheckCircle className="w-3 h-3" />
                                  ) : itemApprovalStatus === 'Ditolak' ? (
                                    <XCircle className="w-3 h-3" />
                                  ) : (
                                    <Clock className="w-3 h-3" />
                                  )}
                                  <span>
                                    {itemApprovalStatus === 'Disetujui'
                                      ? 'Disetujui'
                                      : itemApprovalStatus === 'Ditolak'
                                      ? 'Ditolak'
                                      : 'Menunggu'}
                                  </span>
                                </span>

                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                                    deliveryStatusColors[itemDeliveryStatus] ||
                                    'bg-slate-100 text-slate-800 border-slate-300'
                                  }`}
                                >
                                  {itemDeliveryStatus}
                                </span>

                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  PO: {po.status}
                                </span>

                                {po.supplierDocuments && po.supplierDocuments.length > 0 && (
                                  <span className="text-[10px] text-blue-600 dark:text-sky-400 font-semibold flex items-center gap-1">
                                    <FileCheck className="w-3 h-3" />
                                    {po.supplierDocuments.length} Dokumen
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Col 9: Status QC Bahan (Berdasarkan Item Bahan & Operasional) */}
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-center align-top whitespace-nowrap">
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    itemQCInfo.qcStatus === 'Lolos Penuh' ||
                                    itemQCInfo.qcStatus === 'Diterima'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : itemQCInfo.qcStatus === 'Lolos Sebagian' ||
                                        itemQCInfo.qcStatus === 'Diterima sebagian'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      : itemQCInfo.qcStatus === 'Ditolak'
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                      : itemQCInfo.qcStatus === 'Perlu pemeriksaan ulang'
                                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  }`}
                                >
                                  {itemQCInfo.qcStatus}
                                </span>
                                {itemQCInfo.qcCount > 0 && (
                                  <>
                                    <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300">
                                      Masuk: {formatNumber(itemQCInfo.receivedQuantity)}/{formatNumber(it.quantity)} {it.unit}
                                    </span>
                                    {itemQCInfo.latestGrade && (
                                      <span className="text-[9px] text-slate-500 dark:text-slate-400">
                                        {itemQCInfo.latestGrade}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Col 10: Aksi & Alur PO (Konfirmasi/Persetujuan Per Item) */}
                            <td className="border border-slate-300 dark:border-slate-700 px-2.5 py-2 align-top print:hidden">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap min-w-[165px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPO(po);
                                    setSelectedPOItem(it);
                                    setIsDetailModalOpen(true);
                                  }}
                                  title={`Lihat Rincian ${it.itemName}`}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {!itemConfirmed &&
                                  !isItemRejected &&
                                  po.status !== 'Ditolak' &&
                                  po.status !== 'Dibatalkan' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedPO(po);
                                        setSelectedPOItem(it);
                                        setConfirmForm({
                                          estimatedDeliveryDate:
                                            po.deliveryDate || new Date().toISOString().slice(0, 10),
                                          estimatedDeliveryTime: '04:00 WIB',
                                          driverName: itemDriverName || 'Budi Santoso',
                                          driverPhone: it.supplierDriverPhone || po.supplierDriverPhone || '0813-8822-1100',
                                          vehicleNumber: itemVehicleNumber || 'N 8922 UB',
                                          notes: `Sanggup memenuhi item ${it.itemName} dan siap kirim tepat waktu.`,
                                        });
                                        setIsConfirmModalOpen(true);
                                      }}
                                      title={`Konfirmasi & Setujui item ${it.itemName}`}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Konfirmasi</span>
                                    </button>
                                  )}

                                {itemConfirmed && !isItemRejected && !isItemClosed && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPO(po);
                                      setSelectedPOItem(it);
                                      setUpdateStatusForm({
                                        status:
                                          itemDeliveryStatus === 'Dikonfirmasi Supplier' ||
                                          itemDeliveryStatus === 'Menunggu Konfirmasi'
                                            ? 'Sedang Dipersiapkan'
                                            : itemDeliveryStatus,
                                        notes: '',
                                      });
                                      setIsUpdateStatusModalOpen(true);
                                    }}
                                    title={`Perbarui Status Pengiriman ${it.itemName}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                                  >
                                    <Truck className="w-3.5 h-3.5" />
                                    <span>Update Status</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPO(po);
                                    setSelectedPOItem(it);
                                    setUploadDocForm({
                                      type: 'Surat Jalan',
                                      fileName: `Surat_Jalan_${po.poNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
                                      fileUrl: '',
                                    });
                                    setIsUploadDocModalOpen(true);
                                  }}
                                  title="Unggah Dokumen Pendukung (Surat Jalan/Faktur/Halal)"
                                  className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors cursor-pointer"
                                >
                                  <Upload className="w-4 h-4" />
                                </button>

                                {!itemConfirmed &&
                                  !isItemRejected &&
                                  po.status !== 'Ditolak' &&
                                  po.status !== 'Dibatalkan' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedPO(po);
                                        setSelectedPOItem(it);
                                        setRejectReason('');
                                        setIsRejectModalOpen(true);
                                      }}
                                      title={`Tolak item ${it.itemName}`}
                                      className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 transition-colors cursor-pointer"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}

                                {(itemConfirmed || isItemRejected) && !isItemClosed && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      supplierResetPOItem(po.id, {
                                        itemId: it.itemId,
                                        itemName: it.itemName,
                                      })
                                    }
                                    title={`Kembalikan ${it.itemName} ke Menunggu Konfirmasi`}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === 'delivered' ? (
            /* Sub Menu: Data Bahan & Operasional Terkirim */
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden print:shadow-none">
              <div className="p-4 hidden print:block">
                <PrintHeader
                  title="DATA BAHAN & OPERASIONAL TERKIRIM"
                  subtitle="Rincian Penerimaan, Hasil QC, Selisih & Penyesuaian PO Mitra"
                />
              </div>

              <div className="px-4 py-2.5 bg-[#C6E0B4] dark:bg-emerald-950/70 border-b border-slate-300 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-emerald-100">
                    DATA BAHAN &amp; OPERASIONAL TERKIRIM ({deliveredRows.length} Item)
                  </span>
                  {deliveryDateFilter !== 'ALL' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/85 dark:bg-slate-900/75 text-[#0D9488] dark:text-teal-300 border border-teal-700/25">
                      Target Kirim: {formatIndonesianDate(deliveryDateFilter)}
                    </span>
                  )}
                  {statusFilter !== 'ALL' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900/70 text-slate-700 dark:text-emerald-200 border border-emerald-700/20">
                      Status: {statusFilter}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-emerald-200 font-mono">
                  Total Item Terkirim: {deliveredRows.length} Baris (Bahan → Operasional)
                </span>
              </div>

              {deliveredRows.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    variant={searchQuery || deliveryDateFilter !== 'ALL' || statusFilter !== 'ALL' ? 'search' : 'data'}
                    title="Belum ada Data Bahan & Operasional Terkirim"
                    description={
                      deliveryDateFilter !== 'ALL'
                        ? `Tidak ada data bahan atau operasional berstatus telah di-QC/diterima untuk target kirim hari ${formatIndonesianDate(deliveryDateFilter)}.`
                        : searchQuery || statusFilter !== 'ALL'
                        ? 'Tidak ada data terkirim yang cocok dengan pencarian atau filter status Anda.'
                        : 'Belum ada item PO bahan pangan maupun operasional yang berstatus telah di-QC atau diterima di gudang.'
                    }
                    actionLabel={
                      deliveryDateFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery.trim() !== ''
                        ? 'Tampilkan Semua Data Terkirim'
                        : undefined
                    }
                    onAction={
                      deliveryDateFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery.trim() !== ''
                        ? () => {
                            setDeliveryDateFilter('ALL');
                            setStatusFilter('ALL');
                            setSearchQuery('');
                          }
                        : undefined
                    }
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#548235] dark:bg-emerald-900 text-white text-[11px] font-extrabold tracking-wide">
                        <th className="border border-slate-400/70 dark:border-slate-700 px-2.5 py-2.5 text-center w-12">
                          Nomor
                        </th>
                        <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2.5 text-left min-w-[230px] sticky left-0 z-10 bg-[#548235] dark:bg-emerald-900">
                          Nama Bahan dan Operasional
                        </th>
                        <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2.5 text-left min-w-[185px]">
                          Waktu Bahan dan Operasional diterima
                        </th>
                        <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2.5 text-center whitespace-nowrap">
                          Jumlah yang pesan
                        </th>
                        <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2.5 text-center whitespace-nowrap">
                          Jumlah yang diterima
                        </th>
                        <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2.5 text-center whitespace-nowrap">
                          Jumlah Hasil QC
                        </th>
                        <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2.5 text-center whitespace-nowrap">
                          Total Selisih
                        </th>
                        <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2.5 text-center whitespace-nowrap">
                          Status
                        </th>
                        <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2.5 text-right whitespace-nowrap print:hidden">
                          Tindakan
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveredRows.map((row, rowIdx) => {
                        const {
                          po,
                          it,
                          itemIdx,
                          isOpsItem,
                          linkedRab,
                          itemDeliveryStatus,
                          itemQCInfo,
                          prepDamagedInfo,
                          prepDamagedQty,
                          netUsableQty,
                          orderedQty,
                          deliveredQty,
                          totalSelisih,
                          hasQCEvaluation,
                          receivedTimeRaw,
                        } = row;

                        const receivedTimeLabel = formatReceivedTimeLabel(
                          receivedTimeRaw,
                          po.deliveryDate,
                          itemDeliveryStatus,
                          itemQCInfo.qcStatus
                        );
                        const isShortage = totalSelisih < 0;
                        const isSurplus = totalSelisih > 0;
                        const shortageAmount =
                          totalSelisih < 0
                            ? Math.abs(totalSelisih)
                            : Math.max(0, Math.round((orderedQty - netUsableQty) * 1000) / 1000);
                        const nowLocal = new Date();
                        const pad2 = (n: number) => String(n).padStart(2, '0');
                        const localNowStamp = `${nowLocal.getFullYear()}-${pad2(nowLocal.getMonth() + 1)}-${pad2(nowLocal.getDate())} ${pad2(nowLocal.getHours())}:${pad2(nowLocal.getMinutes())}`;
                        const defaultStamp =
                          receivedTimeRaw && /^\d{4}-\d{2}-\d{2}/.test(receivedTimeRaw)
                            ? receivedTimeRaw.slice(0, 16)
                            : localNowStamp;

                        return (
                          <tr
                            key={`deliv-${po.id}-${itemIdx}-${isOpsItem ? 'op' : 'bh'}`}
                            className={`transition-colors ${
                              isOpsItem
                                ? 'bg-amber-50/20 hover:bg-amber-50/50 dark:bg-amber-950/10 dark:hover:bg-slate-800/60'
                                : 'hover:bg-blue-50/40 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            {/* 1. Nomor */}
                            <td className="border border-slate-300 dark:border-slate-700 px-2.5 py-2.5 text-center font-mono text-slate-700 dark:text-slate-300 align-top">
                              {rowIdx + 1}
                            </td>

                            {/* 2. Nama Bahan dan Operasional */}
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2.5 align-top sticky left-0 z-10 bg-white dark:bg-slate-900">
                              <div className="font-bold text-xs text-slate-900 dark:text-white">
                                {it.itemName}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    isOpsItem
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-teal-100 text-[#0D9488] dark:bg-teal-950 dark:text-teal-300'
                                  }`}
                                >
                                  {isOpsItem ? 'Operasional' : 'Bahan Pangan'}
                                </span>
                                <span className="text-[10px] font-mono font-semibold text-blue-800 dark:text-sky-300">
                                  {po.poNumber}
                                </span>
                                {linkedRab && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                                    <Link2 className="w-2.5 h-2.5" />
                                    <span>RAB: {linkedRab.budgetCode}</span>
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 3. Waktu Bahan dan Operasional diterima (Dari Rekam Status QC & Stok PLOK) */}
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2.5 align-top text-slate-700 dark:text-slate-300">
                              <div
                                className={`font-semibold text-xs flex items-center gap-1.5 ${
                                  receivedTimeRaw
                                    ? 'text-slate-900 dark:text-slate-100'
                                    : 'text-slate-500 italic dark:text-slate-400'
                                }`}
                              >
                                <Calendar className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                                <span>{receivedTimeLabel}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {receivedTimeRaw
                                  ? `Status QC & Stok PLOK: ${itemQCInfo.qcStatus}`
                                  : 'Menunggu perubahan status diterima pada QC PLOK'}
                              </div>
                            </td>

                            {/* 4. Jumlah yang pesan */}
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-center font-mono font-bold tabular-nums text-slate-900 dark:text-white align-top whitespace-nowrap">
                              {formatNumber(orderedQty)} {it.unit}
                            </td>

                            {/* 5. Jumlah yang diterima (Diambil dari PLOK Sub menu Quality Control) */}
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-center align-top whitespace-nowrap">
                              <div className="font-mono font-bold tabular-nums text-blue-900 dark:text-sky-300">
                                {formatNumber(deliveredQty)} {it.unit}
                              </div>
                              <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {itemQCInfo.qcCount > 0 ? 'Data QC PLOK' : 'Belum Input QC'}
                              </div>
                            </td>

                            {/* 6. Jumlah Hasil QC (Diambil dari Jumlah Rusak masing-masing bahan di Divisi Persiapan) */}
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-center align-top whitespace-nowrap">
                              <div
                                className={`font-mono font-bold tabular-nums ${
                                  prepDamagedQty > 0
                                    ? 'text-rose-700 dark:text-rose-400'
                                    : 'text-emerald-700 dark:text-emerald-400'
                                }`}
                              >
                                {formatNumber(prepDamagedQty)} {it.unit}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-[190px] whitespace-normal leading-tight">
                                {prepDamagedInfo.matchedEntries.length > 0 ? (
                                  <span>
                                    Rusak Persiapan:{' '}
                                    {prepDamagedInfo.matchedEntries
                                      .map(m => `${m.damagedName}`)
                                      .join(', ')}
                                  </span>
                                ) : prepDamagedInfo.hasPrepRecordForDate ? (
                                  <span>Nihil bahan rusak (Div. Persiapan)</span>
                                ) : (
                                  <span>Belum input inspeksi Div. Persiapan</span>
                                )}
                              </div>
                            </td>

                            {/* 7. Total Selisih */}
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-center align-top whitespace-nowrap">
                              {hasQCEvaluation || deliveredQty > 0 || prepDamagedQty > 0 ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-extrabold ${
                                      isShortage
                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                        : isSurplus
                                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    }`}
                                  >
                                    {totalSelisih > 0
                                      ? `+${formatNumber(totalSelisih)}`
                                      : formatNumber(totalSelisih)}{' '}
                                    {it.unit}
                                  </span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {isShortage
                                      ? `Kurang ${formatNumber(Math.abs(totalSelisih))} ${it.unit}`
                                      : isSurplus
                                      ? `Lebih +${formatNumber(totalSelisih)} ${it.unit}`
                                      : 'Sesuai Pesanan'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Menunggu QC</span>
                              )}
                            </td>

                            {/* 8. Status */}
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-center align-top whitespace-nowrap">
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    itemQCInfo.qcStatus === 'Lolos Penuh' ||
                                    itemQCInfo.qcStatus === 'Diterima'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : itemQCInfo.qcStatus === 'Lolos Sebagian' ||
                                        itemQCInfo.qcStatus === 'Diterima sebagian'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      : itemQCInfo.qcStatus === 'Ditolak'
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                      : itemQCInfo.qcStatus === 'Perlu pemeriksaan ulang'
                                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  }`}
                                >
                                  {itemQCInfo.qcStatus}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                  {itemDeliveryStatus}
                                </span>
                              </div>
                            </td>

                            {/* 9. Tindakan: Kurangi Jumlah PO, Tutupi kekurangan, dan Edit */}
                            <td className="border border-slate-300 dark:border-slate-700 px-2.5 py-2.5 align-top print:hidden">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap min-w-[260px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPO(po);
                                    setSelectedPOItem(it);
                                    const usableBase =
                                      netUsableQty > 0
                                        ? Math.min(orderedQty, netUsableQty)
                                        : deliveredQty > 0
                                        ? Math.min(orderedQty, deliveredQty)
                                        : orderedQty;
                                    const suggestedNewQty =
                                      Math.round(Math.max(0, usableBase) * 1000) / 1000;
                                    setReducePOForm({
                                      currentOrderedQty: orderedQty,
                                      deliveredQty,
                                      damagedQty: prepDamagedQty,
                                      qcPassedQty: Math.max(0, netUsableQty),
                                      newOrderedQty: suggestedNewQty,
                                      unit: it.unit,
                                      notes:
                                        shortageAmount > 0
                                          ? `Penyesuaian jumlah PO sesuai jumlah terima & rusak persiapan (${suggestedNewQty} ${it.unit}).`
                                          : '',
                                    });
                                    setIsReducePOQtyModalOpen(true);
                                  }}
                                  title={`Kurangi Jumlah PO untuk ${it.itemName}`}
                                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs transition-colors cursor-pointer"
                                >
                                  <MinusCircle className="w-3.5 h-3.5" />
                                  <span>Kurangi Jumlah PO</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPO(po);
                                    setSelectedPOItem(it);
                                    const suggestedCover =
                                      shortageAmount > 0 ? shortageAmount : 0;
                                    setCoverShortageForm({
                                      shortageQty: shortageAmount,
                                      addedQty: suggestedCover > 0 ? suggestedCover : 1,
                                      unit: it.unit,
                                      deliveredAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
                                      condition: 'Baik',
                                      qualityGrade: 'Grade A (Sangat Baik)',
                                      notes:
                                        shortageAmount > 0
                                          ? `Pengiriman susulan untuk menutupi kekurangan ${shortageAmount} ${it.unit}.`
                                          : `Pengiriman tambahan untuk ${it.itemName}.`,
                                    });
                                    setIsCoverShortageModalOpen(true);
                                  }}
                                  title={`Tutupi kekurangan untuk ${it.itemName}`}
                                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-colors cursor-pointer"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                  <span>Tutupi kekurangan</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPO(po);
                                    setSelectedPOItem(it);
                                    setEditDeliveredForm({
                                      deliveredAt: defaultStamp,
                                      orderedQuantity: orderedQty,
                                      deliveredQuantity: deliveredQty,
                                      damagedQuantity: prepDamagedQty,
                                      unit: it.unit,
                                      status: itemQCInfo.qcStatus,
                                      notes: itemQCInfo.latestNotes || '',
                                    });
                                    setIsEditDeliveredModalOpen(true);
                                  }}
                                  title={`Edit data terkirim ${it.itemName}`}
                                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-xs transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Tab Riwayat PO Selesai & QC */
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <DataTable
                title="Riwayat PO & Verifikasi QC"
                subtitle="Menampilkan riwayat Purchase Order bahan & operasional dari Purchase Order PLOK"
                columns={poColumns as any}
                data={displayedPOs as any}
                keyExtractor={(item: any) => item.id}
                searchPlaceholder="Cari data pesanan..."
                searchKeys={['poNumber', 'supplierDriverName']}
                onExportPDF={handleExportPDF}
                onExportExcel={handleExportExcel}
                onPrint={triggerPrint}
                stickyFirstColumn
              />
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PROFIL REKENING & LEGALITAS MITRA */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div key="profile" className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 flex items-center justify-center font-bold text-lg">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {supplierInfo.name}
              </h3>
              <p className="text-xs text-slate-500">
                Kode Rekanan: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{supplierInfo.code}</span> • Terdaftar dalam Program Makan Bergizi Gratis (MBG)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2">
              <div className="font-semibold text-slate-500">Alamat Fasilitas / Gudang Rekanan:</div>
              <div className="font-medium text-slate-800 dark:text-slate-200">{supplierInfo.address}</div>

              <div className="font-semibold text-slate-500 pt-2">Nomor Telepon / Narahubung:</div>
              <div className="font-medium text-slate-800 dark:text-slate-200">{supplierInfo.phone}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2">
              <div className="font-semibold text-slate-500">Nomor Rekening Pembayaran Pembelian:</div>
              <div className="font-mono font-bold text-blue-900 dark:text-sky-400 text-sm">
                {supplierInfo.accountNumber ? `${supplierInfo.accountNumber} (${supplierInfo.bankName || 'Bank'})` : '0034-01-08992-50-2 (Bank BRI)'}
              </div>

              <div className="font-semibold text-slate-500 pt-2">Kategori Pasokan Bahan Pangan:</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {(supplierInfo.suppliedCategories || []).map((cat: string, idx: number) => (
                  <span key={idx} className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 text-[10px] font-bold">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
            <div className="font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Jaminan Keamanan Pangan & Sertifikasi Halal
            </div>
            <p>
              Seluruh rekanan supplier wajib mematuhi standar Good Manufacturing Practice (GMP), rantai dingin (cold-chain), batas bebas residu antibiotik & pestisida, serta menyertakan sertifikat halal RPH/RPU aktif pada setiap pengiriman bahan baku ke SPPG Temenggungan 2.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: KONFIRMASI PESANAN & ESTIMASI PENGIRIMAN */}
      {/* ========================================================================= */}
      {selectedPO && (
        <Modal
          isOpen={isConfirmModalOpen}
          onClose={() => {
            setIsConfirmModalOpen(false);
            setSelectedPOItem(null);
          }}
          title={
            selectedPOItem
              ? `Konfirmasi Item PO: ${selectedPOItem.itemName} (${selectedPO.poNumber})`
              : `Konfirmasi Pesanan: ${selectedPO.poNumber}`
          }
          maxWidth="2xl"
        >
          <form onSubmit={handleConfirmSubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="text-slate-500">
                {selectedPOItem ? 'Rincian Item yang Dikonfirmasi:' : 'Rincian Bahan Dipesan:'}
              </div>
              {selectedPOItem ? (
                <>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    • {selectedPOItem.itemName}: {formatNumber(selectedPOItem.quantity)}{' '}
                    {selectedPOItem.unit} @ {formatRupiah(selectedPOItem.unitPrice)} ={' '}
                    {formatRupiah(selectedPOItem.subtotal)}
                  </div>
                  <div className="text-blue-900 dark:text-sky-400 font-bold pt-1">
                    Nilai Item: {formatRupiah(selectedPOItem.subtotal)}
                  </div>
                </>
              ) : (
                <>
                  {selectedPO.items.map((it, idx) => (
                    <div key={idx} className="font-bold text-slate-800 dark:text-slate-200">
                      • {it.itemName}: {formatNumber(it.quantity)} {it.unit} @{' '}
                      {formatRupiah(it.unitPrice)} = {formatRupiah(it.subtotal)}
                    </div>
                  ))}
                  <div className="text-blue-900 dark:text-sky-400 font-bold pt-1">
                    Total Nilai: {formatRupiah(selectedPO.totalAmount)}
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Estimasi Tanggal Pengiriman Tiba
                </label>
                <input
                  type="date"
                  value={confirmForm.estimatedDeliveryDate}
                  onChange={(e) => setConfirmForm({ ...confirmForm, estimatedDeliveryDate: e.target.value })}
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Estimasi Jam Tiba di SPPG
                </label>
                <ClassicTimeInput
                  placeholder="Contoh: 03:30 WIB"
                  value={confirmForm.estimatedDeliveryTime}
                  onChange={val => setConfirmForm({ ...confirmForm, estimatedDeliveryTime: val })}
                  format="HH:mm WIB"
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Driver / Supir Armada
                </label>
                <input
                  type="text"
                  placeholder="Nama pengemudi..."
                  value={confirmForm.driverName}
                  onChange={(e) => setConfirmForm({ ...confirmForm, driverName: e.target.value })}
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor HP / Kontak Driver
                </label>
                <input
                  type="text"
                  placeholder="Nomor telepon..."
                  value={confirmForm.driverPhone}
                  onChange={(e) => setConfirmForm({ ...confirmForm, driverPhone: e.target.value })}
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Polisi Kendaraan Pengangkut
              </label>
              <input
                type="text"
                placeholder="Contoh: N 8922 UB"
                value={confirmForm.vehicleNumber}
                onChange={(e) => setConfirmForm({ ...confirmForm, vehicleNumber: e.target.value })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Kesanggupan Supplier
              </label>
              <textarea
                rows={2}
                value={confirmForm.notes}
                onChange={(e) => setConfirmForm({ ...confirmForm, notes: e.target.value })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setSelectedPOItem(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-bold"
              >
                Konfirmasi Sanggup Memenuhi
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UPDATE STATUS PENGIRIMAN */}
      {/* ========================================================================= */}
      {selectedPO && (
        <Modal
          isOpen={isUpdateStatusModalOpen}
          onClose={() => {
            setIsUpdateStatusModalOpen(false);
            setSelectedPOItem(null);
          }}
          title={
            selectedPOItem
              ? `Perbarui Status Item: ${selectedPOItem.itemName} (${selectedPO.poNumber})`
              : `Perbarui Status Pengiriman: ${selectedPO.poNumber}`
          }
          maxWidth="md"
        >
          <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status Saat Ini
              </label>
              <select
                value={updateStatusForm.status}
                onChange={(e) => setUpdateStatusForm({ ...updateStatusForm, status: e.target.value as any })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                <option value="Sedang Dipersiapkan">Sedang Dipersiapkan (Sortir / Packing)</option>
                <option value="Dalam Pengiriman">Dalam Pengiriman (Menuju Dapur SPPG)</option>
                <option value="Telah Tiba di Gudang">Telah Tiba di Gudang (Loading Dock SPPG)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Perjalanan / Posisi Pengiriman
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Armada telah keluar dari cold storage pukul 03:00, perkiraan tiba di SPPG 03:25 WIB..."
                value={updateStatusForm.notes}
                onChange={(e) => setUpdateStatusForm({ ...updateStatusForm, notes: e.target.value })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsUpdateStatusModalOpen(false);
                  setSelectedPOItem(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Simpan Pembaruan Status
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: UNGGAH DOKUMEN PENDUKUNG (SURAT JALAN / FAKTUR / HALAL) */}
      {/* ========================================================================= */}
      {selectedPO && (
        <Modal
          isOpen={isUploadDocModalOpen}
          onClose={() => {
            setIsUploadDocModalOpen(false);
            setSelectedPOItem(null);
          }}
          title={`Unggah Dokumen Pendukung: ${selectedPO.poNumber}`}
          maxWidth="md"
        >
          <form onSubmit={handleUploadDocSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jenis Dokumen
              </label>
              <select
                value={uploadDocForm.type}
                onChange={(e) => setUploadDocForm({ ...uploadDocForm, type: e.target.value as any })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                <option value="Surat Jalan">Surat Jalan Pengiriman</option>
                <option value="Faktur">Faktur Penjualan / Invoice</option>
                <option value="Sertifikat Halal">Sertifikat Halal RPH / RPU</option>
                <option value="Hasil Uji Lab">Hasil Uji Bebas Residu / Mutu</option>
                <option value="Foto Bahan">Foto Bahan Baku Siap Kirim</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama File Dokumen
              </label>
              <input
                type="text"
                value={uploadDocForm.fileName}
                onChange={(e) => setUploadDocForm({ ...uploadDocForm, fileName: e.target.value })}
                required
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pilih File (Foto / Scan Dokumen)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (loadEvt) => {
                      setUploadDocForm(prev => ({
                        ...prev,
                        fileName: file.name,
                        fileUrl: loadEvt.target?.result as string,
                      }));
                      addToast('success', 'File Terpilih', `${file.name} siap diunggah.`);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsUploadDocModalOpen(false);
                  setSelectedPOItem(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Simpan & Lampirkan Dokumen
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DETAIL PO & RIWAYAT DOKUMEN SUPPLIER */}
      {/* ========================================================================= */}
      {selectedPO && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedPOItem(null);
          }}
          title={`Rincian Purchase Order: ${selectedPO.poNumber}`}
          maxWidth="3xl"
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">Nomor PO:</span>{' '}
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedPO.poNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500">Tanggal Terbit:</span>{' '}
                  <span className="font-bold text-slate-900 dark:text-white">{formatIndonesianDate(selectedPO.date)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Kategori PO:</span>{' '}
                  <span className="font-bold text-slate-900 dark:text-white">{selectedPO.poCategory || 'Bahan Pangan & Operasional'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Target Kirim (H-1):</span>{' '}
                  <span className="font-bold text-slate-900 dark:text-white">{formatIndonesianDate(selectedPO.deliveryDate)}</span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <div className="font-semibold text-xs text-slate-700 dark:text-slate-300 mb-2">
                Daftar Nama Bahan &amp; Operasional (Purchase Order PLOK):
              </div>
              <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="p-2.5">Nama Bahan dan Operasional</th>
                    <th className="p-2.5 text-right">Kuantitas</th>
                    <th className="p-2.5 text-right">Harga Satuan</th>
                    <th className="p-2.5 text-center">Status Item</th>
                    <th className="p-2.5 text-center">Status QC</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {sortPOItemsBahanThenOperasional(selectedPO.items || [], selectedPO, rabItems).map((it, idx) => {
                    const stDelivery = resolvePOItemSupplierDeliveryStatus(it, selectedPO);
                    const qcItem = resolvePOItemQCInfo(it, selectedPO, qualityControlRecords);
                    const isFocused =
                      selectedPOItem &&
                      selectedPOItem.itemName === it.itemName &&
                      selectedPOItem.itemId === it.itemId;
                    return (
                      <tr key={idx} className={isFocused ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''}>
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">{it.itemName}</td>
                        <td className="p-2.5 text-right font-mono">{formatNumber(it.quantity)} {it.unit}</td>
                        <td className="p-2.5 text-right font-mono">{formatRupiah(it.unitPrice)}</td>
                        <td className="p-2.5 text-center text-[10px] font-semibold">{stDelivery}</td>
                        <td className="p-2.5 text-center text-[10px] font-semibold">{qcItem.qcStatus}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-blue-900 dark:text-sky-400">{formatRupiah(it.subtotal)}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold">
                    <td colSpan={5} className="p-2.5 text-right uppercase">Total PO:</td>
                    <td className="p-2.5 text-right font-mono text-sm text-blue-900 dark:text-sky-300">{formatRupiah(selectedPO.totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Uploaded Documents List */}
            {selectedPO.supplierDocuments && selectedPO.supplierDocuments.length > 0 && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  Dokumen Pendukung yang Telah Dilampirkan:
                </div>
                <div className="space-y-1.5">
                  {selectedPO.supplierDocuments.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
                          {doc.type}
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{doc.fileName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Diunggah: {doc.uploadedAt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => triggerPrint()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Lembar PO
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedPOItem(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: TOLAK PESANAN PO */}
      {/* ========================================================================= */}
      {selectedPO && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => {
            setIsRejectModalOpen(false);
            setSelectedPOItem(null);
          }}
          title={
            selectedPOItem
              ? `Tolak Item PO: ${selectedPOItem.itemName} (${selectedPO.poNumber})`
              : `Tolak Pesanan: ${selectedPO.poNumber}`
          }
          maxWidth="md"
        >
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              {selectedPOItem
                ? `Apakah Anda yakin tidak sanggup memenuhi item ${selectedPOItem.itemName} (${formatNumber(selectedPOItem.quantity)} ${selectedPOItem.unit}) pada PO ${selectedPO.poNumber}? Informasi penolakan item akan dikirimkan ke Kepala SPPG & Admin Gudang.`
                : 'Apakah Anda yakin tidak sanggup memenuhi pesanan ini? Informasi penolakan akan dikirimkan ke Kepala SPPG & Admin Gudang untuk mencari rekanan cadangan.'}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alasan Penolakan
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Stok ayam broiler panen hari ini tidak mencukupi standar berat gramasi yang diminta SPPG..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setSelectedPOItem(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Konfirmasi Tolak Pesanan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: KURANGI JUMLAH PO (DATA TERKIRIM) */}
      {/* ========================================================================= */}
      {selectedPO && selectedPOItem && (
        <Modal
          isOpen={isReducePOQtyModalOpen}
          onClose={() => {
            setIsReducePOQtyModalOpen(false);
            setSelectedPOItem(null);
          }}
          title={`Kurangi Jumlah PO: ${selectedPOItem.itemName} (${selectedPO.poNumber})`}
          maxWidth="md"
        >
          <form onSubmit={handleReducePOQtySubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Jumlah yang dipesan saat ini:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatNumber(reducePOForm.currentOrderedQty)} {reducePOForm.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Jumlah yang diterima (QC PLOK):</span>
                <span className="font-mono font-bold text-blue-800 dark:text-sky-300">
                  {formatNumber(reducePOForm.deliveredQty)} {reducePOForm.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Jumlah Hasil QC / Rusak (Div. Persiapan):</span>
                <span className="font-mono font-bold text-rose-700 dark:text-rose-400">
                  {formatNumber(reducePOForm.damagedQty)} {reducePOForm.unit}
                </span>
              </div>
              <div className="flex justify-between border-t border-amber-200/70 dark:border-amber-800/50 pt-1">
                <span className="text-slate-600 dark:text-slate-300 font-semibold">Bersih layak pakai:</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {formatNumber(reducePOForm.qcPassedQty)} {reducePOForm.unit}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jumlah PO Baru ({reducePOForm.unit})
              </label>
              <NumericInput
                min={0}
                max={reducePOForm.currentOrderedQty}
                value={reducePOForm.newOrderedQty}
                onValueChange={(val) =>
                  setReducePOForm({
                    ...reducePOForm,
                    newOrderedQty: val,
                  })
                }
                required
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Pengurangan PO otomatis menyesuaikan nilai subtotal item, selisih QC, dan melepaskan sisa anggaran RAB.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Penyesuaian PO
              </label>
              <textarea
                rows={2}
                value={reducePOForm.notes}
                onChange={(e) => setReducePOForm({ ...reducePOForm, notes: e.target.value })}
                placeholder="Alasan penyesuaian jumlah PO..."
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsReducePOQtyModalOpen(false);
                  setSelectedPOItem(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Simpan Pengurangan PO
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: TUTUPI KEKURANGAN (PENGIRIMAN SUSULAN) */}
      {/* ========================================================================= */}
      {selectedPO && selectedPOItem && (
        <Modal
          isOpen={isCoverShortageModalOpen}
          onClose={() => {
            setIsCoverShortageModalOpen(false);
            setSelectedPOItem(null);
          }}
          title={`Tutupi Kekurangan: ${selectedPOItem.itemName} (${selectedPO.poNumber})`}
          maxWidth="md"
        >
          <form onSubmit={handleCoverShortageSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-300">Total Kekurangan Saat Ini:</span>
              <span className="font-mono font-bold text-rose-700 dark:text-rose-400">
                {formatNumber(coverShortageForm.shortageQty)} {coverShortageForm.unit}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jumlah Tambahan Dikirim ({coverShortageForm.unit})
                </label>
                <NumericInput
                  min={0.01}
                  value={coverShortageForm.addedQty}
                  onValueChange={(val) =>
                    setCoverShortageForm({
                      ...coverShortageForm,
                      addedQty: val,
                    })
                  }
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Waktu Diterima Susulan
                </label>
                <input
                  type="text"
                  value={coverShortageForm.deliveredAt}
                  onChange={(e) =>
                    setCoverShortageForm({ ...coverShortageForm, deliveredAt: e.target.value })
                  }
                  placeholder="YYYY-MM-DD HH:mm"
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kondisi Bahan / Barang
                </label>
                <select
                  value={coverShortageForm.condition}
                  onChange={(e) =>
                    setCoverShortageForm({
                      ...coverShortageForm,
                      condition: e.target.value as QualityControlRecord['condition'],
                    })
                  }
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Baik">Baik</option>
                  <option value="Kemasan Cacat">Kemasan Cacat</option>
                  <option value="Rusak Ringan">Rusak Ringan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mutu QC
                </label>
                <select
                  value={coverShortageForm.qualityGrade}
                  onChange={(e) =>
                    setCoverShortageForm({
                      ...coverShortageForm,
                      qualityGrade: e.target.value as QualityControlRecord['qualityGrade'],
                    })
                  }
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Grade A (Sangat Baik)">Grade A (Sangat Baik)</option>
                  <option value="Grade B (Standar)">Grade B (Standar)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Pengiriman Susulan
              </label>
              <textarea
                rows={2}
                value={coverShortageForm.notes}
                onChange={(e) =>
                  setCoverShortageForm({ ...coverShortageForm, notes: e.target.value })
                }
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCoverShortageModalOpen(false);
                  setSelectedPOItem(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Simpan Penutupan Kekurangan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: EDIT DATA BAHAN & OPERASIONAL TERKIRIM */}
      {/* ========================================================================= */}
      {selectedPO && selectedPOItem && (
        <Modal
          isOpen={isEditDeliveredModalOpen}
          onClose={() => {
            setIsEditDeliveredModalOpen(false);
            setSelectedPOItem(null);
          }}
          title={`Edit Data Terkirim: ${selectedPOItem.itemName} (${selectedPO.poNumber})`}
          maxWidth="lg"
        >
          <form onSubmit={handleEditDeliveredSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Waktu Bahan dan Operasional diterima (YYYY-MM-DD HH:mm)
                </label>
                <input
                  type="text"
                  value={editDeliveredForm.deliveredAt}
                  onChange={(e) =>
                    setEditDeliveredForm({ ...editDeliveredForm, deliveredAt: e.target.value })
                  }
                  placeholder="2026-11-08 06:10"
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jumlah yang pesan ({editDeliveredForm.unit})
                </label>
                <NumericInput
                  min={0}
                  value={editDeliveredForm.orderedQuantity}
                  onValueChange={(val) =>
                    setEditDeliveredForm({
                      ...editDeliveredForm,
                      orderedQuantity: val,
                    })
                  }
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jumlah yang diterima (QC PLOK) ({editDeliveredForm.unit})
                </label>
                <NumericInput
                  min={0}
                  value={editDeliveredForm.deliveredQuantity}
                  onValueChange={(val) =>
                    setEditDeliveredForm(prev => ({
                      ...prev,
                      deliveredQuantity: val,
                    }))
                  }
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jumlah Hasil QC / Rusak Persiapan ({editDeliveredForm.unit})
                </label>
                <NumericInput
                  min={0}
                  value={editDeliveredForm.damagedQuantity}
                  onValueChange={(val) =>
                    setEditDeliveredForm({
                      ...editDeliveredForm,
                      damagedQuantity: val,
                    })
                  }
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status QC / Penerimaan
                </label>
                <select
                  value={editDeliveredForm.status}
                  onChange={(e) =>
                    setEditDeliveredForm({
                      ...editDeliveredForm,
                      status: e.target.value as QCStatusPLOK,
                    })
                  }
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="Diterima">Diterima</option>
                  <option value="Diterima sebagian">Diterima sebagian</option>
                  <option value="Lolos Penuh">Lolos Penuh</option>
                  <option value="Lolos Sebagian">Lolos Sebagian</option>
                  <option value="Perlu pemeriksaan ulang">Perlu pemeriksaan ulang</option>
                  <option value="Ditolak">Ditolak</option>
                  <option value="Belum QC">Belum QC</option>
                </select>
              </div>
            </div>

            {(() => {
              const netEditDiff =
                Math.round(
                  ((editDeliveredForm.status === 'Ditolak'
                    ? 0
                    : editDeliveredForm.deliveredQuantity - editDeliveredForm.damagedQuantity) -
                    editDeliveredForm.orderedQuantity) *
                    1000
                ) / 1000;
              return (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">
                    Total Selisih ((Diterima − Rusak Persiapan) − Dipesan):
                  </span>
                  <span
                    className={`font-mono font-extrabold ${
                      netEditDiff < 0
                        ? 'text-rose-700 dark:text-rose-400'
                        : netEditDiff > 0
                        ? 'text-sky-700 dark:text-sky-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {netEditDiff > 0 ? `+${formatNumber(netEditDiff)}` : formatNumber(netEditDiff)}{' '}
                    {editDeliveredForm.unit}
                  </span>
                </div>
              );
            })()}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Penerimaan &amp; QC
              </label>
              <textarea
                rows={2}
                value={editDeliveredForm.notes}
                onChange={(e) =>
                  setEditDeliveredForm({ ...editDeliveredForm, notes: e.target.value })
                }
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditDeliveredModalOpen(false);
                  setSelectedPOItem(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
