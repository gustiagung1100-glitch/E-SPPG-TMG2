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
 * Generate PDF with official SPPG Kop Surat
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
}) {
  const { title, subtitle, headers, rows, fileName, sppgConfig, notes, signerName, signerRole } = options;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Official Kop Surat
  doc.setFillColor(15, 23, 42); // Navy
  doc.rect(14, 10, 182, 1.5, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(sppgConfig.foundationName.toUpperCase(), 105, 18, { align: 'center' });

  doc.setFontSize(12);
  doc.text(sppgConfig.sppgName.toUpperCase(), 105, 24, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`ID SPPG: ${sppgConfig.sppgId} | Program: ${sppgConfig.programName}`, 105, 29, { align: 'center' });
  doc.text(sppgConfig.address, 105, 34, { align: 'center' });
  doc.text(`Telp: ${sppgConfig.phone} | Email: ${sppgConfig.email}`, 105, 39, { align: 'center' });

  // Double horizontal rule
  doc.setDrawColor(30, 58, 138); // Dark blue line
  doc.setLineWidth(0.8);
  doc.line(14, 43, 196, 43);
  doc.setLineWidth(0.3);
  doc.line(14, 44.5, 196, 44.5);

  // Document Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(title.toUpperCase(), 105, 52, { align: 'center' });

  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 105, 57, { align: 'center' });
  }

  // Data Table using autoTable
  autoTable(doc, {
    startY: subtitle ? 62 : 58,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
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
    doc.text(`Catatan: ${notes}`, 14, finalY + 8);
  }

  // Signature Block
  const sigY = Math.min(finalY + 18, 250);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`Krejengan, ${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}`, 140, sigY);
  doc.text(signerRole || 'Kepala SPPG Temenggungan 2', 140, sigY + 5);

  doc.setFont('helvetica', 'bold');
  doc.text(signerName || sppgConfig.headOfSppg, 140, sigY + 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`NIP / ID: SPPG-TMG2-${sppgConfig.sppgId}`, 140, sigY + 29);

  // Save the PDF
  doc.save(`${fileName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Trigger browser print
 */
export function triggerPrint() {
  window.print();
}
