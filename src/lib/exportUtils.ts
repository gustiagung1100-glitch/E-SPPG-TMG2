import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { SPPGConfig } from '../types';

export const formatRupiah = (val: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val || 0);
};

export const formatNumber = (val: number): string => {
  return new Intl.NumberFormat('id-ID').format(val || 0);
};

export const formatIndonesianDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
};

/**
 * Export data array to Excel (.xlsx)
 */
export function exportToExcel(data: Record<string, any>[], fileName: string, sheetName = 'Data SPPG') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Export data array to CSV
 */
export function exportToCSV(data: Record<string, any>[], fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate PDF with official SPPG Kop Surat and BGN verification
 */
export function exportTableToPDF(options: {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  fileName: string;
  sppgConfig: SPPGConfig;
  notes?: string;
  signerName?: string;
  signerRole?: string;
  orientation?: 'portrait' | 'landscape';
  metaFields?: Array<{ label: string; value: string }>;
  signatures?: Array<{ role: string; name: string; idNum?: string; date?: string }>;
}) {
  const {
    title,
    subtitle,
    headers,
    rows,
    fileName,
    sppgConfig,
    notes,
    signerName,
    signerRole,
    orientation = 'portrait',
    metaFields,
    signatures,
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = orientation === 'landscape' ? 297 : 210;
  const centerX = pageWidth / 2;
  const rightX = pageWidth - 14;

  // Official Kop Surat Top Accent
  doc.setFillColor(15, 23, 42);
  doc.rect(14, 10, pageWidth - 28, 1.5, 'F');

  // Left Emblem: SPPG Yayasan Hafshawaty Shield
  doc.setFillColor(15, 43, 92);
  doc.roundedRect(14, 15, 17, 22, 2.5, 2.5, 'F');
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.6);
  doc.roundedRect(15, 16, 15, 20, 2, 2, 'S');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('SPPG', 22.5, 24, { align: 'center' });
  doc.setFontSize(6);
  doc.text('TMG2', 22.5, 29, { align: 'center' });
  doc.setFontSize(4.5);
  doc.setTextColor(251, 191, 36);
  doc.text('HAFSHAWATY', 22.5, 33, { align: 'center' });

  // Center Text Header
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(sppgConfig.foundationName.toUpperCase(), centerX, 18, { align: 'center' });

  doc.setFontSize(11);
  doc.text(sppgConfig.sppgName.toUpperCase(), centerX, 24, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`ID SPPG: ${sppgConfig.sppgId} | Program: ${sppgConfig.programName}`, centerX, 29, { align: 'center' });
  doc.text(sppgConfig.address, centerX, 34, { align: 'center' });
  doc.text(`Telp: ${sppgConfig.phone} | Email: ${sppgConfig.email}`, centerX, 39, { align: 'center' });

  // Right Emblem: Official BGN Seal Badge
  const bgnX = rightX - 17;
  doc.setFillColor(180, 83, 9);
  doc.roundedRect(bgnX, 15, 17, 22, 2.5, 2.5, 'F');
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(0.6);
  doc.roundedRect(bgnX + 1, 16, 15, 20, 2, 2, 'S');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('BGN', bgnX + 8.5, 24, { align: 'center' });
  doc.setFontSize(6);
  doc.text('RI', bgnX + 8.5, 29, { align: 'center' });
  doc.setFontSize(4.5);
  doc.setTextColor(251, 191, 36);
  doc.text('VERIFIKASI', bgnX + 8.5, 33, { align: 'center' });

  // Double horizontal rule
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.8);
  doc.line(14, 43, rightX, 43);
  doc.setLineWidth(0.3);
  doc.line(14, 44.5, rightX, 44.5);

  // Document Title
  let currentY = 52;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(title.toUpperCase(), centerX, currentY, { align: 'center' });

  if (subtitle) {
    currentY += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, centerX, currentY, { align: 'center' });
  }

  // Optional Meta Fields (Periode, Tanggal, Sumber Data, Register)
  if (metaFields && metaFields.length > 0) {
    currentY += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const metaStr = metaFields.map(m => `${m.label}: ${m.value}`).join('  |  ');
    doc.text(metaStr, centerX, currentY, { align: 'center' });
  }

  // Data Table using autoTable
  autoTable(doc, {
    startY: currentY + 5,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: orientation === 'landscape' ? 8 : 8.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: orientation === 'landscape' ? 7.5 : 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      cellPadding: 2,
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 150;

  if (notes) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text(`Catatan Pengesahan: ${notes}`, 14, finalY + 8);
  }

  // Signature Block: Multi-column support (3-kolom standar SPPG BGN)
  const todayStr = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const sigY = Math.min(finalY + 16, orientation === 'landscape' ? 165 : 245);

  if (signatures && signatures.length > 0) {
    const colCount = signatures.length;
    const availableWidth = pageWidth - 28;
    const colWidth = availableWidth / colCount;

    signatures.forEach((sig, idx) => {
      const colCenterX = 14 + idx * colWidth + colWidth / 2;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      if (idx === colCount - 1) {
        doc.text(`Krejengan, ${todayStr}`, colCenterX, sigY, { align: 'center' });
      } else {
        doc.text(`Mengetahui / Memeriksa,`, colCenterX, sigY, { align: 'center' });
      }
      doc.text(sig.role, colCenterX, sigY + 5, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.text(sig.name, colCenterX, sigY + 24, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(sig.idNum ? `NIP/ID: ${sig.idNum}` : `ID SPPG: ${sppgConfig.sppgId}`, colCenterX, sigY + 28, { align: 'center' });
    });
  } else {
    // Default single column right
    const sigX = rightX - 55;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`Krejengan, ${todayStr}`, sigX, sigY);
    doc.text(signerRole || 'Kepala SPPG Temenggungan 2', sigX, sigY + 5);

    doc.setFont('helvetica', 'bold');
    doc.text(signerName || sppgConfig.headOfSppg, sigX, sigY + 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`NIP / ID: SPPG-TMG2-${sppgConfig.sppgId}`, sigX, sigY + 28);
  }

  // Save the PDF
  doc.save(`${fileName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Trigger browser print
 */
export function triggerPrint() {
  window.print();
}
