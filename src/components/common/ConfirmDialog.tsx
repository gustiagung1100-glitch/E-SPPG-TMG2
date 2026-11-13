import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  isDestructive = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="flex items-start gap-4">
        <div
          className={`p-3 rounded-xl shrink-0 ${
            isDestructive
              ? 'bg-[#DC2626]/10 text-[#DC2626] dark:bg-rose-950/60 dark:text-rose-400'
              : 'bg-[#D97706]/10 text-[#D97706] dark:bg-amber-950/60 dark:text-amber-400'
          }`}
        >
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-[#64748B] dark:text-slate-300 leading-relaxed">
            {message}
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#E2E8F0] dark:border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-[#1F2937] dark:text-slate-200 hover:bg-[#F4F7FA] dark:hover:bg-slate-800 rounded-lg transition"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-xs transition ${
            isDestructive
              ? 'bg-[#DC2626] hover:bg-red-700'
              : 'bg-[#142B4A] hover:bg-[#102D63] dark:bg-[#0F766E] dark:hover:bg-teal-600'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
};
