import React from 'react';
import {
  DynamicFormField,
  DynamicFormId,
  DynamicFormSchema,
  RoleType,
} from '../types';
import { Column } from '../components/common/DataTable';
import { formatIndonesianDate } from './exportUtils';

const BASE_UPDATED_AT = '2026-11-13T00:00:00.000Z';

export function isDynamicFormAdmin(role?: RoleType | string): boolean {
  return role === 'Admin Utama' || role === 'Kepala SPPG';
}

export const defaultDynamicFormSchemas: Record<DynamicFormId, DynamicFormSchema> = {
  institution_form: {
    formId: 'institution_form',
    title: 'Form Data Lembaga Penerima Gizi',
    description: 'Struktur isian pendaftaran dan pembaruan sekolah / lembaga sasaran MBG.',
    moduleKey: 'institutions',
    version: 1,
    updatedAt: BASE_UPDATED_AT,
    fields: [
      {
        id: 'inst_name',
        key: 'name',
        label: 'Nama Lembaga Sekolah / Madrasah',
        type: 'text',
        placeholder: 'Contoh: SDN Temenggungan 1',
        helperText: 'Tuliskan nama resmi lembaga pendidikan sesuai SK operasional.',
        required: true,
        isSystem: true,
        width: 'full',
      },
      {
        id: 'inst_level',
        key: 'level',
        label: 'Jenjang Pendidikan',
        type: 'select',
        options: ['PAUD', 'SD', 'MI', 'SMP', 'MTs', 'SMA', 'SMK', 'Pesantren'],
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inst_npsn',
        key: 'npsn',
        label: 'NPSN / Kode Lembaga',
        type: 'text',
        placeholder: 'Contoh: 20546781',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inst_type',
        key: 'institutionType',
        label: 'Jenis Lembaga',
        type: 'select',
        options: [
          'Sekolah Dasar (SD)',
          'Madrasah Ibtidaiyah (MI)',
          'SMP',
          'MTs',
          'SMA',
          'SMK',
          'PAUD/TK',
          'Pondok Pesantren',
        ],
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inst_route',
        key: 'deliveryRoute',
        label: 'Rute Pengantaran',
        type: 'select',
        options: [
          'Rute A - Temenggungan',
          'Rute B - Hafshawaty Sentral',
          'Rute C - Krejengan Raya',
        ],
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inst_address',
        key: 'address',
        label: 'Alamat Lengkap Lembaga',
        type: 'textarea',
        placeholder: 'Contoh: Dusun Krajan RT 01/RW 01, Desa Temenggungan, Kec. Krejengan',
        required: true,
        isSystem: true,
        width: 'full',
      },
      {
        id: 'inst_small',
        key: 'smallPortions',
        label: 'Kuota Porsi Kecil (PAUD / SD 1-3)',
        type: 'number',
        placeholder: '0',
        helperText: 'Jumlah siswa kategori porsi kecil.',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inst_large',
        key: 'largePortions',
        label: 'Kuota Porsi Besar (SD 4-6 / SMP / Santri)',
        type: 'number',
        placeholder: '0',
        helperText: 'Jumlah siswa kategori porsi besar.',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inst_pic_name',
        key: 'picName',
        label: 'Nama Guru PIC MBG Sekolah',
        type: 'text',
        placeholder: 'Contoh: Hariyanto, S.Pd.',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inst_pic_phone',
        key: 'picPhone',
        label: 'No. HP / WhatsApp PIC',
        type: 'text',
        placeholder: 'Contoh: 0812-9988-7711',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inst_bank_name',
        key: 'bankName',
        label: 'Nama Bank Rekening',
        type: 'text',
        placeholder: 'Bank Jatim / BRI / BSI',
        required: false,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inst_acc_num',
        key: 'accountNumber',
        label: 'Nomor Rekening',
        type: 'text',
        placeholder: '0132-9981-22',
        required: false,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inst_acc_name',
        key: 'bankAccountName',
        label: 'Atas Nama Rekening',
        type: 'text',
        placeholder: 'BOS SDN Temenggungan 1',
        required: false,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inst_allergy',
        key: 'allergiesNote',
        label: 'Catatan Alergi / Pantangan Khusus Siswa',
        type: 'textarea',
        placeholder: 'Contoh: 2 anak alergi udang, 1 anak tidak makan pedas',
        required: false,
        isSystem: true,
        width: 'full',
      },
    ],
  },

  beneficiary_attendance_form: {
    formId: 'beneficiary_attendance_form',
    title: 'Form Data Presensi Penerima Gizi Harian',
    description: 'Input kehadiran siswa penerima manfaat harian untuk penghitungan porsi aktual dan BAST.',
    moduleKey: 'institutions',
    version: 1,
    updatedAt: BASE_UPDATED_AT,
    fields: [
      {
        id: 'att_date',
        key: 'date',
        label: 'Tanggal Distribusi & Kehadiran',
        type: 'date',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'att_inst',
        key: 'institutionId',
        label: 'Lembaga Sasaran Penerima Manfaat',
        type: 'select',
        options: [],
        helperText: 'Otomatis menarik daftar lembaga dari Master Penerima Manfaat.',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'att_absent_small',
        key: 'absentSmall',
        label: 'Jumlah Tidak Hadir (Porsi Kecil)',
        type: 'number',
        placeholder: '0',
        helperText: 'Jumlah siswa PAUD/SD 1-3 yang izin/sakit hari ini.',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'att_absent_large',
        key: 'absentLarge',
        label: 'Jumlah Tidak Hadir (Porsi Besar)',
        type: 'number',
        placeholder: '0',
        helperText: 'Jumlah siswa SD 4-6/SMP/Santri yang izin/sakit hari ini.',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'att_notes',
        key: 'notes',
        label: 'Catatan Presensi & Distribusi',
        type: 'text',
        placeholder: 'Contoh: 3 anak sakit flu, ompreng dibagikan habis.',
        required: false,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'att_recorder',
        key: 'recordedBy',
        label: 'Petugas / PIC Pencatat Kehadiran',
        type: 'text',
        placeholder: 'Nama lengkap petugas / guru PIC',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'att_bast',
        key: 'bastConfirmed',
        label: 'Konfirmasi Berita Acara Serah Terima (BAST) & Kehadiran Fisik Siswa Telah Diverifikasi',
        type: 'checkbox',
        defaultValue: true,
        required: false,
        isSystem: true,
        width: 'full',
      },
    ],
  },

  menu_form: {
    formId: 'menu_form',
    title: 'Form Perencanaan Menu Makanan MBG',
    description: 'Struktur isian penyusunan menu harian lengkap (karbohidrat, hewani, nabati, sayur, buah, pelengkap).',
    moduleKey: 'menu',
    version: 1,
    updatedAt: BASE_UPDATED_AT,
    fields: [
      {
        id: 'menu_date',
        key: 'date',
        label: 'Tanggal Operasional',
        type: 'date',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'menu_code',
        key: 'menuCode',
        label: 'Kode Menu',
        type: 'text',
        placeholder: 'MBG-TMG2-H25',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'menu_staple',
        key: 'stapleFood',
        label: 'Makanan Pokok',
        type: 'text',
        placeholder: 'Contoh: Nasi Liwet Wangi Daun Salam',
        required: true,
        isSystem: true,
        width: 'full',
      },
      {
        id: 'menu_animal',
        key: 'animalProtein',
        label: 'Lauk Hewani',
        type: 'text',
        placeholder: 'Contoh: Ikan Gurame Bakar Bumbu Madu',
        required: true,
        isSystem: true,
        width: 'full',
      },
      {
        id: 'menu_plant',
        key: 'plantProtein',
        label: 'Lauk Nabati',
        type: 'text',
        placeholder: 'Contoh: Tempe Orek Manis',
        required: false,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'menu_veg',
        key: 'vegetable',
        label: 'Sayuran',
        type: 'text',
        placeholder: 'Contoh: Sayur Capcay Bakso',
        required: false,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'menu_fruit',
        key: 'fruit',
        label: 'Buah Segar',
        type: 'text',
        placeholder: 'Contoh: Melon Segar',
        required: false,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'menu_milk',
        key: 'milkOrExtra',
        label: 'Pelengkap / Susu',
        type: 'text',
        placeholder: 'Susu UHT Plain 125ml',
        required: false,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'menu_notes',
        key: 'notes',
        label: 'Catatan Ahli Gizi / Alergi Menu',
        type: 'textarea',
        placeholder: 'Catatan khusus pengolahan atau substitusi alergen...',
        required: false,
        isSystem: true,
        width: 'full',
      },
    ],
  },

  distribution_dispatch_form: {
    formId: 'distribution_dispatch_form',
    title: 'Form Keberangkatan Armada Distribusi',
    description: 'Form pencatatan pengiriman kloter armada pengantaran makanan MBG ke sekolah.',
    moduleKey: 'distribution',
    version: 1,
    updatedAt: BASE_UPDATED_AT,
    fields: [
      {
        id: 'dist_inst',
        key: 'institutionId',
        label: 'Pilih Lembaga Tujuan',
        type: 'select',
        options: [],
        helperText: 'Daftar lembaga sasaran aktif.',
        required: true,
        isSystem: true,
        width: 'full',
      },
      {
        id: 'dist_vehicle',
        key: 'vehicleNumber',
        label: 'No. Kendaraan / Armada',
        type: 'text',
        placeholder: 'Contoh: N 8921 RA (Armada 1)',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'dist_driver',
        key: 'driverName',
        label: 'Nama Pengemudi',
        type: 'text',
        placeholder: 'Contoh: Agus Santoso',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'dist_dep_time',
        key: 'departureTime',
        label: 'Jam Keberangkatan',
        type: 'text',
        placeholder: '08:30 WIB',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'dist_dep_temp',
        key: 'foodTempAtDispatch',
        label: 'Suhu Berangkat (°C)',
        type: 'number',
        placeholder: '68.0',
        helperText: 'Suhu minimal standar BGN saat diberangkatkan adalah > 65°C.',
        required: true,
        isSystem: true,
        width: 'half',
      },
    ],
  },

  distribution_report_form: {
    formId: 'distribution_report_form',
    title: 'Form Laporan Serah Terima Distribusi (BAST)',
    description: 'Form pembaruan status tiba, suhu kedatangan, dan penerima BAST di lembaga sasaran.',
    moduleKey: 'distribution',
    version: 1,
    updatedAt: BASE_UPDATED_AT,
    fields: [
      {
        id: 'rep_status',
        key: 'status',
        label: 'Status Pengiriman',
        type: 'select',
        options: ['Dalam Perjalanan', 'Tiba di Lokasi', 'Selesai Serah Terima'],
        required: true,
        isSystem: true,
        width: 'full',
      },
      {
        id: 'rep_arr_time',
        key: 'arrivalTime',
        label: 'Jam Tiba Lokasi',
        type: 'text',
        placeholder: '09:45 WIB',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'rep_arr_temp',
        key: 'foodTempAtArrival',
        label: 'Suhu Tiba Makanan (°C)',
        type: 'number',
        placeholder: '64.5',
        helperText: 'Wajib menjaga suhu makanan hangat > 60°C saat diterima siswa.',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'rep_recv_by',
        key: 'receivedBy',
        label: 'Nama Lengkap Penerima / PIC Sekolah',
        type: 'text',
        placeholder: 'Nama guru PIC penerima',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'rep_recv_title',
        key: 'receiverTitle',
        label: 'Jabatan Penerima',
        type: 'text',
        placeholder: 'Kepala Sekolah / PIC MBG',
        required: false,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'rep_photo',
        key: 'photoEvidenceUrl',
        label: 'Upload Foto Bukti Serah Terima',
        type: 'photo',
        helperText: 'Foto dokumentasi penyerahan ompreng bersama PIC sekolah.',
        required: false,
        isSystem: true,
        width: 'full',
      },
      {
        id: 'rep_notes',
        key: 'notes',
        label: 'Catatan Serah Terima (BAST)',
        type: 'textarea',
        placeholder: 'Diterima utuh tanpa cacat, porsi dihitung bersama tim guru.',
        required: false,
        isSystem: true,
        width: 'full',
      },
    ],
  },

  finance_tx_form: {
    formId: 'finance_tx_form',
    title: 'Form Catat Transaksi Kas & Keuangan',
    description: 'Form pencatatan Buku Kas Umum (BKU) Pemasukan dan Pengeluaran operasional SPPG.',
    moduleKey: 'finance',
    version: 1,
    updatedAt: BASE_UPDATED_AT,
    fields: [
      {
        id: 'fin_date',
        key: 'date',
        label: 'Tanggal Transaksi',
        type: 'date',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'fin_proof_num',
        key: 'proofNumber',
        label: 'No. Bukti Kas (BKM / BKK)',
        type: 'text',
        placeholder: 'BKK/SPPG-TMG2/2026/XI/...',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'fin_cat',
        key: 'category',
        label: 'Kategori Anggaran MBG',
        type: 'select',
        options: [
          'Dana Termin BGN',
          'Dana Talangan Yayasan',
          'Bahan Baku',
          'Operasional Dapur',
          'Upah Relawan',
          'Logistik & Armada',
          'Perlengkapan',
          'Utilitas Listrik/Gas/Air',
          'Higiene & Sanitasi',
        ],
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'fin_amount',
        key: 'amount',
        label: 'Nominal Rupiah (Rp)',
        type: 'number',
        placeholder: '1500000',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'fin_desc',
        key: 'description',
        label: 'Uraian Transaksi',
        type: 'text',
        placeholder: 'Contoh: Pembelian bahan makanan operasional dapur',
        required: true,
        isSystem: true,
        width: 'full',
      },
      {
        id: 'fin_source',
        key: 'sourceOrRecipient',
        label: 'Sumber Dana / Pihak Penerima',
        type: 'text',
        placeholder: 'Contoh: Koperasi Pasar Krejengan / BGN',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'fin_pay_method',
        key: 'paymentMethod',
        label: 'Metode Pembayaran',
        type: 'select',
        options: ['Transfer Bank', 'Tunai'],
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'fin_bank',
        key: 'bankAccount',
        label: 'Akun Rekening / Kas',
        type: 'select',
        options: [
          'Bank BRI SPPG Yayasan Hafshawaty (0034-01-00291-53-1)',
          'Bank Jatim Cab. Kraksaan (0132-99-8812)',
          'Kas Tunai Dapur (Petty Cash)',
          'Kas Operasional Lapangan',
        ],
        required: true,
        isSystem: true,
        width: 'full',
      },
      {
        id: 'fin_photo',
        key: 'proofFileUrl',
        label: 'Upload Bukti Kuitansi / Struk Pembayaran',
        type: 'photo',
        helperText: 'Unggah foto struk/nota/bukti transfer resmi.',
        required: false,
        isSystem: true,
        width: 'full',
      },
      {
        id: 'fin_notes',
        key: 'notes',
        label: 'Catatan Tambahan',
        type: 'textarea',
        placeholder: 'Keterangan pendukung transaksi...',
        required: false,
        isSystem: true,
        width: 'full',
      },
    ],
  },

  volunteer_absence_form: {
    formId: 'volunteer_absence_form',
    title: 'Form Izin & Ketidakhadiran Relawan',
    description: 'Pengajuan izin ketidakhadiran relawan beserta penetapan relawan pengganti per divisi.',
    moduleKey: 'volunteers',
    version: 1,
    updatedAt: BASE_UPDATED_AT,
    fields: [
      {
        id: 'abs_date',
        key: 'date',
        label: 'Tanggal Ketidakhadiran',
        type: 'date',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'abs_vol',
        key: 'volunteerName',
        label: 'Nama Relawan Tidak Hadir',
        type: 'select',
        options: [],
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'abs_div',
        key: 'division',
        label: 'Divisi Asal',
        type: 'select',
        options: ['Persiapan', 'Pengolahan', 'Pemorsian', 'Distribusi', 'Cuci Ompreng', 'Kebersihan'],
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'abs_reason',
        key: 'reason',
        label: 'Alasan Ketidakhadiran',
        type: 'select',
        options: [
          'Sakit',
          'Izin Keperluan Keluarga',
          'Tugas Belajar / Kuliah',
          'Kendala Transportasi / Cuaca',
          'Kedukaan',
          'Lainnya',
        ],
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'abs_rep',
        key: 'replacementVolunteerName',
        label: 'Nama Relawan Pengganti',
        type: 'text',
        placeholder: 'Nama relawan cadangan pengganti shift',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'abs_rep_div',
        key: 'replacementDivision',
        label: 'Divisi Pengganti',
        type: 'select',
        options: ['Persiapan', 'Pengolahan', 'Pemorsian', 'Distribusi', 'Cuci Ompreng', 'Kebersihan'],
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'abs_details',
        key: 'reasonDetails',
        label: 'Rincian / Keterangan Tambahan',
        type: 'textarea',
        placeholder: 'Jelaskan detail izin atau jadwal shift pengganti...',
        required: false,
        isSystem: true,
        width: 'full',
      },
    ],
  },

  volunteer_attendance_form: {
    formId: 'volunteer_attendance_form',
    title: 'Form Presensi & Skrining Higiene Relawan',
    description: 'Catatan presensi harian, pemeriksaan kesehatan, dan kelengkapan APD relawan dapur.',
    moduleKey: 'volunteers',
    version: 1,
    updatedAt: BASE_UPDATED_AT,
    fields: [
      {
        id: 'va_date',
        key: 'date',
        label: 'Tanggal Bertugas',
        type: 'date',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'va_name',
        key: 'volunteerName',
        label: 'Nama Relawan',
        type: 'text',
        placeholder: 'Nama lengkap relawan',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'va_div',
        key: 'division',
        label: 'Divisi Kerja',
        type: 'select',
        options: ['Persiapan', 'Pengolahan', 'Pemorsian', 'Distribusi', 'Cuci Ompreng', 'Kebersihan'],
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'va_shift',
        key: 'shift',
        label: 'Shift Bertugas',
        type: 'select',
        options: ['Pagi (03:30 - 08:30)', 'Siang (08:00 - 13:00)'],
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'va_status',
        key: 'status',
        label: 'Status Kehadiran',
        type: 'select',
        options: ['Hadir', 'Izin', 'Sakit', 'Alpa'],
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'va_health',
        key: 'healthCheckPassed',
        label: 'Lolos Skrining Kesehatan (Bebas Demam/Batuk/Luka Terbuka)',
        type: 'checkbox',
        defaultValue: true,
        required: false,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'va_apd',
        key: 'hygieneGearComplete',
        label: 'APD Lengkap (Celemek, Hairnet, Masker & Sarung Tangan)',
        type: 'checkbox',
        defaultValue: true,
        required: false,
        isSystem: true,
        width: 'full',
      },
      {
        id: 'va_notes',
        key: 'notes',
        label: 'Catatan Higiene',
        type: 'textarea',
        placeholder: 'Kondisi fisik dan kesiapan kerja...',
        required: false,
        isSystem: true,
        width: 'full',
      },
    ],
  },

  inventory_item_form: {
    formId: 'inventory_item_form',
    title: 'Form Data Barang & Stok Gudang',
    description: 'Form tambah/edit item bahan pangan gudang, lokasi penyimpanan, dan ambang stok minimum.',
    moduleKey: 'inventory',
    version: 1,
    updatedAt: BASE_UPDATED_AT,
    fields: [
      {
        id: 'inv_code',
        key: 'code',
        label: 'Kode Barang',
        type: 'text',
        placeholder: 'BHK-011',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inv_name',
        key: 'name',
        label: 'Nama Bahan / Barang',
        type: 'text',
        placeholder: 'Contoh: Beras Premium Pandan Wangi',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inv_cat',
        key: 'category',
        label: 'Kategori Bahan',
        type: 'select',
        options: ['Bahan Segar', 'Bahan Kering', 'Bumbu & Rempah', 'Kemasan & Higiene', 'Pelengkap'],
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inv_loc',
        key: 'storageLocation',
        label: 'Lokasi Penyimpanan',
        type: 'select',
        options: ['Gudang Kering A', 'Gudang Kering B', 'Cold Storage 1', 'Chiller Dapur', 'Rak Bumbu'],
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inv_stock',
        key: 'currentStock',
        label: 'Stok Saat Ini',
        type: 'number',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inv_min',
        key: 'minimumStock',
        label: 'Batas Stok Minimum',
        type: 'number',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inv_unit',
        key: 'unit',
        label: 'Satuan',
        type: 'text',
        placeholder: 'kg / liter / pcs',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inv_price',
        key: 'pricePerUnit',
        label: 'Harga Satuan (Rp)',
        type: 'number',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inv_exp',
        key: 'expiryDate',
        label: 'Tanggal Kedaluwarsa',
        type: 'date',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'inv_qual',
        key: 'qualityStatus',
        label: 'Status Mutu Bahan',
        type: 'select',
        options: ['Baik', 'Perlu Pemantauan', 'Kadaluarsa'],
        required: true,
        isSystem: true,
        width: 'half',
      },
    ],
  },

  inventory_mutation_form: {
    formId: 'inventory_mutation_form',
    title: 'Form Mutasi Barang Masuk / Keluar Gudang',
    description: 'Form pencatatan barang masuk dari supplier atau pemakaian bahan keluar ke dapur.',
    moduleKey: 'inventory',
    version: 1,
    updatedAt: BASE_UPDATED_AT,
    fields: [
      {
        id: 'mut_type',
        key: 'type',
        label: 'Jenis Mutasi',
        type: 'select',
        options: ['Barang Masuk', 'Barang Keluar', 'Retur Keluar', 'Retur Masuk'],
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'mut_item',
        key: 'itemId',
        label: 'Pilih Item Barang',
        type: 'select',
        options: [],
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'mut_ordered',
        key: 'orderedQuantity',
        label: 'Jumlah Barang Dipesan',
        type: 'number',
        required: false,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'mut_qty',
        key: 'quantity',
        label: 'Jumlah Diterima / Keluar',
        type: 'number',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'mut_ref',
        key: 'referenceNumber',
        label: 'Nomor Referensi / PO / Surat Jalan',
        type: 'text',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'mut_photo',
        key: 'photoUrl',
        label: 'Upload Foto Barang Diterima',
        type: 'photo',
        required: false,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'mut_notes',
        key: 'notes',
        label: 'Keterangan Mutasi',
        type: 'textarea',
        placeholder: 'Catatan penerimaan atau pemakaian bahan...',
        required: false,
        isSystem: true,
        width: 'full',
      },
    ],
  },

  procurement_rab_form: {
    formId: 'procurement_rab_form',
    title: 'Form Input Rencana Anggaran Biaya (RAB)',
    description: 'Form pengajuan item kebutuhan belanja bahan pangan dan operasional SPPG.',
    moduleKey: 'procurement',
    version: 1,
    updatedAt: BASE_UPDATED_AT,
    fields: [
      {
        id: 'rab_cat',
        key: 'category',
        label: 'Kategori RAB',
        type: 'select',
        options: ['RAB Bahan Pangan', 'RAB Operasional'],
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'rab_code',
        key: 'budgetCode',
        label: 'Kode Anggaran',
        type: 'text',
        placeholder: 'RAB-BP-2026-009',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'rab_name',
        key: 'itemName',
        label: 'Nama Item Kebutuhan',
        type: 'text',
        placeholder: 'Contoh: Beras Premium 500 kg',
        required: true,
        isSystem: true,
        width: 'full',
      },
      {
        id: 'rab_vol',
        key: 'volume',
        label: 'Volume / Jumlah',
        type: 'number',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'rab_unit',
        key: 'unit',
        label: 'Satuan',
        type: 'text',
        placeholder: 'kg / liter / tabung',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'rab_price',
        key: 'unitPrice',
        label: 'Harga Satuan (Rp)',
        type: 'number',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'rab_date',
        key: 'planDate',
        label: 'Tanggal Rencana',
        type: 'date',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'rab_notes',
        key: 'notes',
        label: 'Catatan Pengadaan',
        type: 'textarea',
        placeholder: 'Spesifikasi atau alasan kebutuhan anggaran...',
        required: false,
        isSystem: true,
        width: 'full',
      },
    ],
  },

  production_waste_form: {
    formId: 'production_waste_form',
    title: 'Form Audit Food Waste & Cuci Ompreng',
    description: 'Form pengukuran sisa makanan pasca-distribusi dan dokumentasi foto per kategori.',
    moduleKey: 'production',
    version: 1,
    updatedAt: BASE_UPDATED_AT,
    fields: [
      {
        id: 'fw_date',
        key: 'date',
        label: 'Tanggal Pemeriksaan',
        type: 'date',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'fw_time',
        key: 'time',
        label: 'Waktu Pemeriksaan',
        type: 'text',
        placeholder: '14:15 WIB',
        required: true,
        isSystem: true,
        width: 'half',
      },
      {
        id: 'fw_officer',
        key: 'officerName',
        label: 'Petugas Sanitasi / Cuci Ompreng',
        type: 'text',
        required: true,
        isSystem: true,
        width: 'full',
      },
      {
        id: 'fw_notes',
        key: 'notes',
        label: 'Catatan Evaluasi / Penyebab Sisa Makanan',
        type: 'textarea',
        placeholder: 'Ringkasan evaluasi sisa makanan dan tindak lanjut Zero Waste...',
        required: false,
        isSystem: true,
        width: 'full',
      },
    ],
  },
};

export function mergeDynamicFormSchemas(
  saved?: Partial<Record<DynamicFormId, DynamicFormSchema>> | null
): Record<DynamicFormId, DynamicFormSchema> {
  const result = { ...defaultDynamicFormSchemas };
  if (!saved || typeof saved !== 'object') return result;

  (Object.keys(defaultDynamicFormSchemas) as DynamicFormId[]).forEach(formId => {
    const savedSchema = saved[formId];
    if (savedSchema && Array.isArray(savedSchema.fields) && savedSchema.fields.length > 0) {
      result[formId] = {
        ...defaultDynamicFormSchemas[formId],
        ...savedSchema,
        fields: savedSchema.fields,
      };
    }
  });
  return result;
}

export function getCustomTableFields(schema?: DynamicFormSchema): DynamicFormField[] {
  if (!schema) return [];
  return schema.fields.filter(f => !f.isSystem && f.showInTable !== false);
}

export function formatDynamicFieldValue(field: DynamicFormField, rawValue: any): string {
  if (rawValue === undefined || rawValue === null || rawValue === '') return '-';
  if (field.type === 'checkbox') {
    return rawValue ? 'Ya' : 'Tidak';
  }
  if (field.type === 'photo') {
    return typeof rawValue === 'string' && rawValue.trim() !== '' ? 'Foto Terlampir' : '-';
  }
  if (field.type === 'date' && typeof rawValue === 'string') {
    return formatIndonesianDate(rawValue);
  }
  return String(rawValue);
}

export function buildDynamicTableColumns<T extends { customFields?: Record<string, any> }>(
  schema?: DynamicFormSchema,
  onPreviewPhoto?: (url: string, label: string) => void
): Column<T>[] {
  const customFields = getCustomTableFields(schema);
  return customFields.map(field => ({
    key: `cf_${field.key}`,
    header: field.label,
    render: (row: T) => {
      const val = row.customFields?.[field.key];
      if (val === undefined || val === null || val === '') {
        return React.createElement(
          'span',
          { className: 'text-[11px] text-slate-400 italic' },
          '-'
        );
      }
      if (field.type === 'checkbox') {
        return React.createElement(
          'span',
          {
            className: `px-2 py-0.5 rounded-full text-[10px] font-bold ${
              val
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`,
          },
          val ? 'Ya' : 'Tidak'
        );
      }
      if (field.type === 'photo' && typeof val === 'string') {
        if (onPreviewPhoto) {
          return React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => onPreviewPhoto(val, field.label),
              className:
                'inline-flex items-center gap-1.5 p-0.5 rounded-md border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition',
            },
            React.createElement('img', {
              src: val,
              alt: field.label,
              className: 'w-8 h-8 object-cover rounded-xs',
            })
          );
        }
        return React.createElement('img', {
          src: val,
          alt: field.label,
          className: 'w-8 h-8 object-cover rounded-md border border-slate-200',
        });
      }
      if (field.type === 'date' && typeof val === 'string') {
        return React.createElement(
          'span',
          { className: 'text-xs font-mono' },
          formatIndonesianDate(val)
        );
      }
      return React.createElement(
        'span',
        { className: 'text-xs text-slate-800 dark:text-slate-200' },
        String(val)
      );
    },
  }));
}

export function appendDynamicExportColumns<T extends { customFields?: Record<string, any> }>(
  schema: DynamicFormSchema | undefined,
  baseHeaders: string[],
  baseRows: (string | number)[][],
  items: T[]
): { headers: string[]; rows: (string | number)[][] } {
  const customFields = getCustomTableFields(schema);
  if (customFields.length === 0) {
    return { headers: baseHeaders, rows: baseRows };
  }
  const headers = [...baseHeaders, ...customFields.map(f => f.label)];
  const rows = baseRows.map((row, idx) => {
    const item = items[idx];
    const extraCells = customFields.map(f => formatDynamicFieldValue(f, item?.customFields?.[f.key]));
    return [...row, ...extraCells];
  });
  return { headers, rows };
}

export function appendDynamicExcelFields<T extends { customFields?: Record<string, any> }>(
  schema: DynamicFormSchema | undefined,
  baseRecord: Record<string, any>,
  item: T
): Record<string, any> {
  const customFields = getCustomTableFields(schema);
  if (customFields.length === 0) return baseRecord;
  const extended: Record<string, any> = { ...baseRecord };
  customFields.forEach(f => {
    extended[f.label] = formatDynamicFieldValue(f, item?.customFields?.[f.key]);
  });
  return extended;
}

export function getInitialCustomFieldValues(
  schema?: DynamicFormSchema,
  existing?: Record<string, any>
): Record<string, any> {
  const result: Record<string, any> = { ...(existing || {}) };
  if (!schema) return result;
  schema.fields
    .filter(f => !f.isSystem)
    .forEach(f => {
      if (result[f.key] === undefined) {
        if (f.defaultValue !== undefined) {
          result[f.key] = f.defaultValue;
        } else if (f.type === 'checkbox') {
          result[f.key] = false;
        } else if (f.type === 'select' || f.type === 'radio') {
          result[f.key] = f.options?.[0] || '';
        } else {
          result[f.key] = '';
        }
      }
    });
  return result;
}
