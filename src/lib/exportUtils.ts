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

export const parseLocalDate = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const dmyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateStr.trim());
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const formatIndonesianDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
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

export interface TableCellImage {
  label: string;
  url: string;
}

export interface TableImageCell {
  rowIndex: number;
  colIndex: number;
  images: TableCellImage[];
}

async function loadImageUrlAsJpegDataUrl(url: string): Promise<string | null> {
  if (!url || typeof url !== 'string') return null;
  return new Promise(resolve => {
    let settled = false;
    const finish = (val: string | null) => {
      if (!settled) {
        settled = true;
        resolve(val);
      }
    };
    const timer = window.setTimeout(() => finish(null), 4000);
    const img = new Image();
    if (!url.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        const targetSize = 140;
        const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
        canvas.width = ratio >= 1 ? targetSize : Math.max(40, Math.round(targetSize * ratio));
        canvas.height = ratio >= 1 ? Math.max(40, Math.round(targetSize / ratio)) : targetSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          finish(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          finish(url.startsWith('data:image/') ? url : null);
        }
      } catch {
        finish(url.startsWith('data:image/') ? url : null);
      }
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish(url.startsWith('data:image/') ? url : null);
    };
    img.src = url;
  });
}

/**
 * Generate PDF with official SPPG Kop Surat and BGN verification
 */
export async function exportTableToPDF(options: {
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
  imageCells?: TableImageCell[];
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
    imageCells = [],
  } = options;

  // Preload cell images if provided
  const resolvedImageMap = new Map<string, Array<{ label: string; dataUrl: string }>>();
  if (imageCells.length > 0) {
    const uniqueUrls = Array.from(
      new Set(imageCells.flatMap(cell => cell.images.map(img => img.url)).filter(Boolean))
    );
    const urlToDataMap = new Map<string, string | null>();
    await Promise.all(
      uniqueUrls.map(async u => {
        urlToDataMap.set(u, await loadImageUrlAsJpegDataUrl(u));
      })
    );
    imageCells.forEach(cell => {
      const loaded = cell.images
        .map(img => {
          const dataUrl = urlToDataMap.get(img.url);
          return dataUrl ? { label: img.label, dataUrl } : null;
        })
        .filter((x): x is { label: string; dataUrl: string } => Boolean(x));
      if (loaded.length > 0) {
        resolvedImageMap.set(`${cell.rowIndex}:${cell.colIndex}`, loaded);
      }
    });
  }

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
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      cellPadding: 2,
    },
    didParseCell: data => {
      if (data.section === 'body') {
        const imgs = resolvedImageMap.get(`${data.row.index}:${data.column.index}`);
        if (imgs && imgs.length > 0) {
          data.cell.text = [''];
          data.cell.styles.minCellHeight = Math.max(data.cell.styles.minCellHeight || 0, 16);
          data.cell.styles.minCellWidth = Math.max(
            data.cell.styles.minCellWidth || 0,
            Math.min(imgs.length, 5) * 10.5 + 4
          );
        }
      }
    },
    didDrawCell: data => {
      if (data.section === 'body') {
        const imgs = resolvedImageMap.get(`${data.row.index}:${data.column.index}`);
        if (imgs && imgs.length > 0) {
          const maxShow = Math.min(imgs.length, 5);
          const thumbSize = 9;
          const gap = 1.4;
          let drawX = data.cell.x + 2;
          const drawY = data.cell.y + 1.8;
          for (let i = 0; i < maxShow; i++) {
            const item = imgs[i];
            if (drawX + thumbSize > data.cell.x + data.cell.width - 1.5) break;
            try {
              const fmt = item.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
              doc.addImage(item.dataUrl, fmt, drawX, drawY, thumbSize, thumbSize);
              doc.setDrawColor(203, 213, 225);
              doc.setLineWidth(0.2);
              doc.rect(drawX, drawY, thumbSize, thumbSize, 'S');
              doc.setFontSize(5);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(71, 85, 105);
              doc.text(item.label.slice(0, 6), drawX + thumbSize / 2, drawY + thumbSize + 2.5, {
                align: 'center',
              });
            } catch {
              // Ignore invalid image frame
            }
            drawX += thumbSize + gap;
          }
        }
      }
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
