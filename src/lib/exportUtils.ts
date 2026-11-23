import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
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
  const outName = `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, outName);
  dispatchPrintToast('success', 'Ekspor Excel Berhasil', `File ${outName} berhasil diunduh.`);
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
  const outName = `${fileName}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', outName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  dispatchPrintToast('success', 'Ekspor CSV Berhasil', `File ${outName} berhasil diunduh.`);
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
  signatures?: Array<{ role: string; name: string; idNum?: string; date?: string; heading?: string }>;
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
      const colCenterX =
        colCount === 1 ? rightX - 42 : 14 + idx * colWidth + colWidth / 2;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      const topHeading =
        sig.heading ??
        (idx === colCount - 1 ? `Krejengan, ${todayStr}` : 'Mengetahui / Memeriksa,');
      doc.text(topHeading, colCenterX, sigY, { align: 'center' });
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
  const outName = `${fileName}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(outName);
  dispatchPrintToast('success', 'Ekspor PDF Berhasil', `Dokumen ${outName} berhasil diunduh.`);
}

export interface TriggerPrintOptions {
  targetSelector?: string;
  fileName?: string;
  title?: string;
  orientation?: 'portrait' | 'landscape';
}

export function dispatchPrintToast(
  type: 'info' | 'success' | 'warning' | 'error',
  title: string,
  message: string
) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('sppg-toast', {
      detail: { type, title, message },
    })
  );
}

function findBestPrintableElement(explicitSelector?: string): HTMLElement | null {
  if (typeof document === 'undefined') return null;

  const candidates: Array<string | null> = [
    explicitSelector || null,
    '[data-print-modal="true"] .bast-print-sheet',
    '[data-print-modal="true"] [data-print-modal-body="true"]',
    '[data-print-modal="true"] .print-area',
    '[data-print-modal="true"]',
    '.bast-print-sheet',
    '.flyer-print-target',
    '.print-area',
    'main',
  ];

  for (const selector of candidates) {
    if (!selector) continue;
    const el = document.querySelector(selector);
    if (el instanceof HTMLElement && el.offsetHeight > 0) {
      return el;
    }
  }
  return document.body;
}

async function generatePrintablePDFFallback(
  targetEl: HTMLElement,
  fileNameBase: string,
  title: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
) {
  const safeSlug = fileNameBase
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'Dokumen_SPPG';

  const scaleWrapper = targetEl.closest('.flyer-print-scale-wrapper') as HTMLElement | null;
  const prevTransform = scaleWrapper ? scaleWrapper.style.transform : '';
  if (scaleWrapper) {
    scaleWrapper.style.transform = 'none';
  }

  try {
    const dataUrl = await toPng(targetEl, {
      quality: 0.96,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: true,
      filter: node => {
        if (!(node instanceof HTMLElement)) return true;
        if (
          node.classList.contains('no-print') ||
          node.classList.contains('print:hidden') ||
          node.classList.contains('toast-container') ||
          node.tagName === 'ASIDE' ||
          node.tagName === 'HEADER' ||
          node.tagName === 'FOOTER' ||
          (node.tagName === 'BUTTON' && !node.classList.contains('print-keep'))
        ) {
          return false;
        }
        return true;
      },
    });

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Gagal memuat gambar pratinjau cetak'));
      img.src = dataUrl;
    });

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;
    const renderedTotalHeight = (img.height * contentWidth) / Math.max(1, img.width);

    if (renderedTotalHeight <= contentHeight) {
      pdf.addImage(dataUrl, 'PNG', margin, margin, contentWidth, renderedTotalHeight);
    } else {
      const pxPerMm = img.width / contentWidth;
      const sliceHeightPx = Math.max(100, Math.floor(contentHeight * pxPerMm));
      let offsetY = 0;
      let pageIndex = 0;

      while (offsetY < img.height) {
        const currentSlicePx = Math.min(sliceHeightPx, img.height - offsetY);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = img.width;
        sliceCanvas.height = currentSlicePx;
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(
            img,
            0,
            offsetY,
            img.width,
            currentSlicePx,
            0,
            0,
            img.width,
            currentSlicePx
          );
          if (pageIndex > 0) pdf.addPage();
          const sliceHeightMm = currentSlicePx / pxPerMm;
          pdf.addImage(
            sliceCanvas.toDataURL('image/png'),
            'PNG',
            margin,
            margin,
            contentWidth,
            sliceHeightMm
          );
        }
        offsetY += currentSlicePx;
        pageIndex += 1;
      }
    }

    pdf.save(`${safeSlug}_${new Date().toISOString().slice(0, 10)}.pdf`);
    dispatchPrintToast(
      'info',
      'Dokumen Siap Cetak Diunduh (PDF)',
      `Browser/iframe membatasi dialog cetak langsung. "${title}" otomatis disimpan ke PDF siap cetak.`
    );
  } catch {
    // Fallback terakhir berbasis teks terstruktur bila ada elemen gambar eksternal terblokir CORS
    const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, 14, 18);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(
      (targetEl.innerText || 'Dokumen SPPG').replace(/\n{3,}/g, '\n\n'),
      pdf.internal.pageSize.getWidth() - 28
    );
    let y = 26;
    for (const line of lines) {
      if (y > pdf.internal.pageSize.getHeight() - 16) {
        pdf.addPage();
        y = 16;
      }
      pdf.text(line, 14, y);
      y += 4.5;
    }
    pdf.save(`${safeSlug}_${new Date().toISOString().slice(0, 10)}.pdf`);
    dispatchPrintToast(
      'info',
      'Dokumen Siap Cetak Diunduh (PDF)',
      `"${title}" berhasil disiapkan sebagai dokumen PDF siap cetak.`
    );
  } finally {
    if (scaleWrapper) {
      scaleWrapper.style.transform = prevTransform;
    }
  }
}

/**
 * Trigger browser print cleanly, with automatic multi-page PDF fallback when
 * native window.print() is blocked inside sandboxed iframe previews.
 */
export function triggerPrint(optionsOrEvent?: TriggerPrintOptions | unknown) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const isOptions =
    optionsOrEvent &&
    typeof optionsOrEvent === 'object' &&
    !('nativeEvent' in (optionsOrEvent as Record<string, unknown>)) &&
    !('preventDefault' in (optionsOrEvent as Record<string, unknown>));

  const opts: TriggerPrintOptions = isOptions
    ? (optionsOrEvent as TriggerPrintOptions)
    : {};

  const targetEl = findBestPrintableElement(opts.targetSelector);
  const rawHeading =
    opts.title ||
    targetEl?.querySelector('h1, h2, h3')?.textContent?.trim() ||
    document.title ||
    'Dokumen_Cetak_SPPG';

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  let beforePrintFired = false;
  const onBeforePrint = () => {
    beforePrintFired = true;
    document.documentElement.setAttribute('data-printing', 'true');
  };
  const onAfterPrint = () => {
    document.documentElement.removeAttribute('data-printing');
    window.removeEventListener('beforeprint', onBeforePrint);
    window.removeEventListener('afterprint', onAfterPrint);
  };

  window.addEventListener('beforeprint', onBeforePrint, { once: true });
  window.addEventListener('afterprint', onAfterPrint, { once: true });

  try {
    window.focus();
    window.print();
  } catch {
    beforePrintFired = false;
  }

  window.setTimeout(() => {
    window.removeEventListener('beforeprint', onBeforePrint);
    if (!beforePrintFired) {
      document.documentElement.removeAttribute('data-printing');
      window.removeEventListener('afterprint', onAfterPrint);
      if (targetEl) {
        void generatePrintablePDFFallback(
          targetEl,
          opts.fileName || `Cetak_${rawHeading}`,
          rawHeading,
          opts.orientation || 'portrait'
        );
      } else {
        dispatchPrintToast(
          'warning',
          'Dialog Cetak Dibatasi Browser',
          'Gunakan tombol Unduh PDF atau Ctrl+P untuk mencetak dokumen.'
        );
      }
    }
  }, 380);
}

/**
 * Download editable Word / Google Docs-compatible (.doc) file without popups/window.open
 */
export function exportTextDocumentToWord(options: {
  title: string;
  subtitle?: string;
  docNumber?: string;
  body: string;
  sppgConfig: SPPGConfig;
  fileName: string;
}) {
  const { title, subtitle, docNumber, body, sppgConfig, fileName } = options;
  const safeHtmlBody = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  const htmlDoc = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="id">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #111827; margin: 20mm; line-height: 1.5; }
  .kop { text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 10px; margin-bottom: 16px; }
  .kop h1 { margin: 0; font-size: 13pt; text-transform: uppercase; }
  .kop h2 { margin: 2px 0; font-size: 12pt; text-transform: uppercase; color: #1e3a8a; }
  .kop p { margin: 2px 0; font-size: 9pt; color: #475569; }
  .meta { text-align: center; margin-bottom: 16px; }
  .meta strong { font-size: 12pt; text-transform: uppercase; display: block; }
  .meta span { font-size: 10pt; color: #475569; }
  .content { white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 10.5pt; text-align: justify; }
</style>
</head>
<body>
  <div class="kop">
    <h1>${sppgConfig.foundationName}</h1>
    <h2>${sppgConfig.sppgName}</h2>
    <p>ID SPPG: ${sppgConfig.sppgId} | ${sppgConfig.programName}</p>
    <p>${sppgConfig.address} • Telp: ${sppgConfig.phone} • Email: ${sppgConfig.email}</p>
  </div>
  <div class="meta">
    <strong>${title}</strong>
    ${subtitle ? `<span>${subtitle}</span><br/>` : ''}
    ${docNumber ? `<span>Nomor: ${docNumber}</span>` : ''}
  </div>
  <div class="content">${safeHtmlBody}</div>
</body>
</html>`;

  const blob = new Blob(['\ufeff', htmlDoc], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const outName = `${fileName}_${new Date().toISOString().slice(0, 10)}.doc`;
  link.download = outName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  dispatchPrintToast('success', 'Ekspor Word Berhasil', `Dokumen ${outName} berhasil diunduh.`);
}
