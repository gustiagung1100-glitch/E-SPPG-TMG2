import React from 'react';
import { useApp } from '../../lib/store';
import { Modal } from '../common/Modal';
import { RoleType } from '../../types';
import {
  ShieldAlert,
  UserCheck,
  Award,
  Apple,
  Coins,
  MapPin,
  Warehouse,
  ChefHat,
  Scissors,
  CookingPot,
  Scale,
  Truck,
  Sparkles,
} from 'lucide-react';

interface RoleSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ isOpen, onClose }) => {
  const { currentUser, switchRole, rolePermissions } = useApp();

  const rolesList: {
    role: RoleType;
    description: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      role: 'Admin Utama',
      description: 'Akses penuh ke seluruh modul, konfigurasi organisasi, hak akses & audit log.',
      icon: <ShieldAlert className="w-5 h-5 text-indigo-600" />,
      color: 'border-l-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20',
    },
    {
      role: 'Kepala SPPG',
      description: 'Otoritas persetujuan PO, menu gizi, validasi distribusi & laporan resmi ke BGN.',
      icon: <Award className="w-5 h-5 text-blue-600" />,
      color: 'border-l-blue-600 bg-blue-50/40 dark:bg-blue-950/20',
    },
    {
      role: 'Pengawas Gizi',
      description: 'Penyusunan siklus menu, kalkulasi AKG (kalori, protein), alergi siswa & QC nutrisi.',
      icon: <Apple className="w-5 h-5 text-emerald-600" />,
      color: 'border-l-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20',
    },
    {
      role: 'Pengawas Keuangan',
      description: 'RAB, verifikasi anggaran PO, monitoring food cost per porsi & arus kas masuk/keluar.',
      icon: <Coins className="w-5 h-5 text-amber-600" />,
      color: 'border-l-amber-600 bg-amber-50/40 dark:bg-amber-950/20',
    },
    {
      role: 'Asisten Lapangan',
      description: 'Koordinasi lembaga/sekolah, pendataan siswa & tanda terima serah terima ompreng.',
      icon: <MapPin className="w-5 h-5 text-teal-600" />,
      color: 'border-l-teal-600 bg-teal-50/40 dark:bg-teal-950/20',
    },
    {
      role: 'Admin Gudang',
      description: 'Pencatatan stok bahan kering/segar, peringatan stok minimum & penerimaan barang.',
      icon: <Warehouse className="w-5 h-5 text-orange-600" />,
      color: 'border-l-orange-600 bg-orange-50/40 dark:bg-orange-950/20',
    },
    {
      role: 'Cheff',
      description: 'Kepala dapur, jadwal batch masak, resep, monitoring suhu masak & uji organoleptik rasa.',
      icon: <ChefHat className="w-5 h-5 text-red-600" />,
      color: 'border-l-red-600 bg-red-50/40 dark:bg-red-950/20',
    },
    {
      role: 'Relawan Div. Persiapan',
      description: 'Pencucian, pengupasan, pemotongan bahan & mise-en-place bumbu masakan.',
      icon: <Scissors className="w-5 h-5 text-sky-600" />,
      color: 'border-l-sky-600 bg-sky-50/40 dark:bg-sky-950/20',
    },
    {
      role: 'Relawan Div. Pengolahan',
      description: 'Pemasakan lauk hewani, lauk nabati, sop sayur & pencatatan suhu matang.',
      icon: <CookingPot className="w-5 h-5 text-amber-600" />,
      color: 'border-l-amber-600 bg-amber-50/40 dark:bg-amber-950/20',
    },
    {
      role: 'Relawan Div. Pemorsian',
      description: 'Penimbangan porsi kecil (PAUD/SD 1-3) & porsi besar, penyegelan ompreng steril.',
      icon: <Scale className="w-5 h-5 text-purple-600" />,
      color: 'border-l-purple-600 bg-purple-50/40 dark:bg-purple-950/20',
    },
    {
      role: 'Relawan Div. Distribusi',
      description: 'Pengemudi armada, pencatatan waktu jalan, pemantauan suhu boks & BAST sekolah.',
      icon: <Truck className="w-5 h-5 text-blue-600" />,
      color: 'border-l-blue-600 bg-blue-50/40 dark:bg-blue-950/20',
    },
    {
      role: 'Relawan Div. Cuci Ompreng',
      description: 'Pembersihan ompreng kembali, sterilisasi air panas & inventarisasi boks makan.',
      icon: <Sparkles className="w-5 h-5 text-cyan-600" />,
      color: 'border-l-cyan-600 bg-cyan-50/40 dark:bg-cyan-950/20',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Simulasi Peran Pengguna (12 Roles RBAC)"
      subtitle="Pilih salah satu peran operasional untuk menguji hak akses modul dan alur kerja sistem."
      maxWidth="3xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
        {rolesList.map(r => {
          const isSelected = currentUser.role === r.role;
          const perms = rolePermissions[r.role] || {};

          return (
            <div
              key={r.role}
              onClick={() => {
                switchRole(r.role);
                onClose();
              }}
              className={`p-3.5 rounded-xl border border-l-4 cursor-pointer transition-all ${
                r.color
              } ${
                isSelected
                  ? 'ring-2 ring-blue-900 dark:ring-sky-500 shadow-md'
                  : 'hover:shadow-xs border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-xs">
                    {r.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {r.role}
                    </h4>
                    {isSelected && (
                      <span className="inline-block mt-0.5 text-[10px] font-bold text-blue-900 dark:text-sky-400">
                        ● Peran Aktif
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                {r.description}
              </p>

              {/* Permissions indicator */}
              <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap gap-1 text-[10px]">
                {perms.view && (
                  <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xs">
                    View
                  </span>
                )}
                {perms.create && (
                  <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-xs">
                    Create
                  </span>
                )}
                {perms.edit && (
                  <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded-xs">
                    Edit
                  </span>
                )}
                {perms.delete && (
                  <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 rounded-xs">
                    Delete
                  </span>
                )}
                {perms.approve && (
                  <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 rounded-xs">
                    Approve
                  </span>
                )}
                {perms.print && (
                  <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-xs">
                    Print
                  </span>
                )}
                {perms.export && (
                  <span className="px-1.5 py-0.5 bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 rounded-xs">
                    Export
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};
