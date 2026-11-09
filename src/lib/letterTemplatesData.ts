import { DocumentTemplate, OutgoingDocument, IncomingLetter } from '../types';

/**
 * MASTER TEMPLATES & DEFAULT PERSURATAN RESMI SPPG TMG2
 * SPPG Probolinggo Krejengan Temenggungan 2 - Yayasan Hafshawaty
 * Nomor Identitas SPPG: GFBQSYXD - Program Makan Bergizi Gratis (MBG)
 *
 * ATURAN KETAT:
 * Template asli di bawah ini TIDAK BOLEH DIUBAH oleh pengguna saat membuat surat.
 * Sistem harus selalu membuat salinan (cloned copy) untuk setiap surat yang diproses.
 */

export const officialDocumentTemplates: DocumentTemplate[] = [
  {
    id: 'tmpl-spd',
    type: 'Surat Perjalanan Dinas',
    codePrefix: 'SPD',
    title: 'Surat Perjalanan Dinas (SPD)',
    description: 'Surat perintah dan pembiayaan dinas luar kota/wilayah untuk koordinasi MBG dengan BGN atau instansi pembina.',
    defaultSubject: 'Surat Perjalanan Dinas Koordinasi Pelaksanaan Program MBG',
    fields: [
      { key: 'NAMA_PETUGAS', label: 'Nama Pejabat / Pegawai yang Ditugaskan', placeholder: 'Dr. H. Ahmad Zaini, S.Pd., M.M.', defaultValue: 'Dr. H. Ahmad Zaini, S.Pd., M.M.' },
      { key: 'JABATAN_PETUGAS', label: 'Jabatan', placeholder: 'Kepala SPPG Temenggungan 2', defaultValue: 'Kepala SPPG Temenggungan 2' },
      { key: 'TINGKAT_BIAYA', label: 'Tingkat Biaya Perjalanan Dinas', placeholder: 'Tingkat B / Operasional SPPG', defaultValue: 'Tingkat B (Anggaran MBG)' },
      { key: 'MAKSUD_PERJALANAN', label: 'Maksud Perjalanan Dinas', placeholder: 'Menghadiri Rapat Koordinasi Evaluasi MBG Wilayah Jawa Timur', defaultValue: 'Rapat Koordinasi Evaluasi Penyaluran MBG Bersama Badan Gizi Nasional' },
      { key: 'KOTA_ASAL', label: 'Tempat Berangkat', placeholder: 'Krejengan, Probolinggo', defaultValue: 'Krejengan, Kabupaten Probolinggo' },
      { key: 'KOTA_TUJUAN', label: 'Tempat Tujuan', placeholder: 'Surabaya / Jakarta', defaultValue: 'Kantor Perwakilan BGN Jawa Timur, Surabaya' },
      { key: 'TANGGAL_BERANGKAT', label: 'Tanggal Berangkat', placeholder: '10 November 2026', defaultValue: '10 November 2026', type: 'date' },
      { key: 'TANGGAL_KEMBALI', label: 'Tanggal Harus Kembali', placeholder: '11 November 2026', defaultValue: '11 November 2026', type: 'date' },
      { key: 'KENDARAAN', label: 'Alat Angkut / Transportasi', placeholder: 'Kendaraan Dinas Operasional SPPG / Kereta Api', defaultValue: 'Kendaraan Dinas Operasional SPPG' },
      { key: 'PEMBEBANAN_ANGGARAN', label: 'Pembebanan Anggaran', placeholder: 'DPA MBG BGN Termin I November 2026', defaultValue: 'Mata Anggaran Operasional SPPG TMG2 Tahun 2026' },
    ],
    templateBody: `SURAT PERJALANAN DINAS (SPD)
Nomor: {{NOMOR_SURAT}}

1. Pejabat Berwenang yang Memberi Perintah : Kepala SPPG Temenggungan 2
2. Nama Pegawai yang Diperintahkan         : {{NAMA_PETUGAS}}
3. Jabatan dan Golongan                    : {{JABATAN_PETUGAS}}
4. Tingkat Biaya Perjalanan Dinas          : {{TINGKAT_BIAYA}}
5. Maksud Perjalanan Dinas                 : {{MAKSUD_PERJALANAN}}
6. Alat Angkutan yang Digunakan            : {{KENDARAAN}}
7. a. Tempat Berangkat                     : {{KOTA_ASAL}}
   b. Tempat Tujuan                        : {{KOTA_TUJUAN}}
8. a. Lamanya Perjalanan Dinas             : 2 (Dua) Hari
   b. Tanggal Berangkat                    : {{TANGGAL_BERANGKAT}}
   c. Tanggal Harus Kembali                : {{TANGGAL_KEMBALI}}
9. Pembebanan Anggaran                     :
   a. Instansi / Satuan Pelayanan          : {{NAMA_SPPG}} (ID: {{ID_SPPG}})
   b. Mata Anggaran                        : {{PEMBEBANAN_ANGGARAN}}
10. Keterangan Lain-lain                   : Harap melapor setibanya di tempat tujuan dan menyerahkan laporan hasil perjalanan dinas setelah selesai.

Dikeluarkan di : Temenggungan, Probolinggo
Pada tanggal   : {{TANGGAL_SURAT}}

Pejabat Pemberi Perintah,
{{NAMA_SPPG}}
{{YAYASAN}}

{{PENANDATANGAN}}
{{JABATAN_PENANDATANGAN}}`,
  },
  {
    id: 'tmpl-st',
    type: 'Surat Tugas',
    codePrefix: 'ST',
    title: 'Surat Tugas (ST)',
    description: 'Surat penugasan personil relawan atau staf SPPG untuk pelaksanaan tugas teknis operasional dapur, pelatihan, atau pengawalan distribusi.',
    defaultSubject: 'Surat Tugas Pelaksanaan Distribusi & Pengawasan Gizi MBG',
    fields: [
      { key: 'NAMA_PETUGAS', label: 'Nama yang Ditugaskan', placeholder: 'Agus Santoso & Rahmat Hidayat', defaultValue: 'Agus Santoso & Rahmat Hidayat' },
      { key: 'DIVISI_JABATAN', label: 'Divisi / Jabatan', placeholder: 'Tim Divisi Distribusi & Logistik', defaultValue: 'Divisi Distribusi & Logistik Armada 1' },
      { key: 'URAIAN_TUGAS', label: 'Rincian Penugasan', placeholder: 'Melaksanakan pengiriman porsi MBG...', defaultValue: 'Melaksanakan pengantaran makanan hangat porsi kecil & porsi besar, pengawasan serah terima boks termal, dan penjemputan ompreng steril pada 4 sekolah rute Temenggungan - Krejengan.' },
      { key: 'LOKASI_TUGAS', label: 'Lokasi Penugasan', placeholder: 'Kecamatan Krejengan', defaultValue: 'Wilayah Pelayanan Kecamatan Krejengan' },
      { key: 'WAKTU_PELAKSANAAN', label: 'Waktu / Periode Tugas', placeholder: '08 - 14 November 2026', defaultValue: '08 s/d 14 November 2026 (Pukul 07:00 - 14:00 WIB)' },
    ],
    templateBody: `SURAT TUGAS
Nomor: {{NOMOR_SURAT}}

Dasar:
1. Program Makan Bergizi Gratis (MBG) Badan Gizi Nasional (BGN) Republik Indonesia.
2. Surat Keputusan Kepala SPPG Probolinggo Krejengan Temenggungan 2 tentang Operasional Pelayanan Gizi Harian.

MEMERINTAHKAN:

Kepada:
Nama       : {{NAMA_PETUGAS}}
Divisi     : {{DIVISI_JABATAN}}
Instansi   : {{NAMA_SPPG}} (Yayasan Hafshawaty)

Untuk:
1. {{URAIAN_TUGAS}}
2. Lokasi Penugasan: {{LOKASI_TUGAS}}.
3. Waktu Pelaksanaan: {{WAKTU_PELAKSANAAN}}.
4. Melaksanakan tugas dengan penuh tanggung jawab, mematuhi Standar Operasional Prosedur (SOP) Sanitasi Higiene Makanan, dan melaporkan hasilnya kepada Kepala SPPG.

Surat tugas ini diberikan untuk dilaksanakan sebagaimana mestinya.

Temenggungan, {{TANGGAL_SURAT}}
Kepala SPPG Temenggungan 2,

{{PENANDATANGAN}}
{{JABATAN_PENANDATANGAN}}`,
  },
  {
    id: 'tmpl-bast',
    type: 'Berita Acara Serah Terima',
    codePrefix: 'BAST',
    title: 'Berita Acara Serah Terima (BAST)',
    description: 'Berita Acara Serah Terima makanan siap santap MBG antara petugas distribusi SPPG dan PIC pihak sekolah.',
    defaultSubject: 'Berita Acara Serah Terima Makanan Bergizi Gratis (MBG)',
    fields: [
      { key: 'NAMA_LEMBAGA', label: 'Nama Lembaga Penerima', placeholder: 'SDN Temenggungan 1 Krejengan', defaultValue: 'SDN Temenggungan 1 Krejengan' },
      { key: 'NAMA_PIC', label: 'Nama PIC / Kepala Sekolah', placeholder: 'Drs. Slamet Hariyanto', defaultValue: 'Drs. Slamet Hariyanto' },
      { key: 'JABATAN_PIC', label: 'Jabatan PIC', placeholder: 'Kepala Sekolah', defaultValue: 'Kepala Sekolah' },
      { key: 'PORSI_KECIL', label: 'Jumlah Porsi Kecil (PAUD/SD 1-3)', placeholder: '180', defaultValue: '180', type: 'number' },
      { key: 'PORSI_BESAR', label: 'Jumlah Porsi Besar (SD 4-6)', placeholder: '220', defaultValue: '220', type: 'number' },
      { key: 'TOTAL_PORSI', label: 'Total Porsi Diserahkan', placeholder: '400', defaultValue: '400', type: 'number' },
      { key: 'MENU_HARI_INI', label: 'Menu Makanan Hari Ini', placeholder: 'Nasi Pulen, Ayam Madu, Tempe Bacem, Sop Sayur, Pisang', defaultValue: 'Nasi Pulen, Ayam Fillet Saus Madu, Tempe Bacem, Sop Sayur Kaldu, Pisang Cavendish' },
      { key: 'SUHU_MAKANAN', label: 'Suhu Makanan Saat Tiba (°C)', placeholder: '64.5', defaultValue: '64.5' },
      { key: 'KONDISI_FISIK', label: 'Kondisi Kemasan / Ompreng', placeholder: 'Segel utuh, ompreng bersih food grade', defaultValue: 'Boks termal bersegel rapi, ompreng stainless steril tanpa cacat' },
    ],
    templateBody: `BERITA ACARA SERAH TERIMA (BAST) MAKANAN BERGIZI GRATIS
Nomor: {{NOMOR_SURAT}}

Pada hari ini, {{TANGGAL_SURAT}}, bertempat di {{NAMA_LEMBAGA}}, telah dilaksanakan serah terima Makanan Bergizi Gratis (MBG) antara:

I. PIHAK PERTAMA (Yang Menyerahkan):
   Nama      : {{NAMA_PETUGAS_DISTRIBUSI}}
   Jabatan   : Petugas Distribusi & Logistik {{NAMA_SPPG}}
   Alamat    : {{ALAMAT_SPPG}}

II. PIHAK KEDUA (Yang Menerima):
   Nama      : {{NAMA_PIC}}
   Jabatan   : {{JABATAN_PIC}} {{NAMA_LEMBAGA}}
   Alamat    : {{ALAMAT_LEMBAGA}}

PIHAK PERTAMA menyerahkan kepada PIHAK KEDUA, dan PIHAK KEDUA menyatakan telah menerima dengan baik dan cukup:
1. Jenis Bantuan      : Makanan Siap Santap Program MBG Badan Gizi Nasional
2. Menu Hari Ini      : {{MENU_HARI_INI}}
3. Rincian Porsi      :
   - Porsi Kecil (Kelas Bawah) : {{PORSI_KECIL}} Pack
   - Porsi Besar (Kelas Atas)  : {{PORSI_BESAR}} Pack
   - TOTAL PORSI               : {{TOTAL_PORSI}} Pack
4. Kondisi Fisik      : {{KONDISI_FISIK}}
5. Suhu Makanan       : {{SUHU_MAKANAN}}°C (Hangat & Lolos Uji Organoleptik Sensorik)

Demikian Berita Acara Serah Terima ini dibuat dalam rangkap 2 (dua) untuk dipergunakan sebagaimana mestinya.

PIHAK PERTAMA,                              PIHAK KEDUA,
Petugas Distribusi SPPG,                    Kepala Sekolah / PIC Lembaga,


( {{NAMA_PETUGAS_DISTRIBUSI}} )             ( {{NAMA_PIC}} )`,
  },
  {
    id: 'tmpl-bap-ppm',
    type: 'Berita Acara Perubahan Penerima Manfaat',
    codePrefix: 'BAP-PPM',
    title: 'Berita Acara Perubahan Penerima Manfaat (BAP-PPM)',
    description: 'Berita Acara resmi perubahan kuota sasaran siswa/penerima manfaat pada lembaga sekolah binaan MBG.',
    defaultSubject: 'Berita Acara Penyesuaian Kuota Penerima Manfaat MBG',
    fields: [
      { key: 'NAMA_LEMBAGA', label: 'Nama Lembaga', placeholder: 'MIS Hafshawaty Zainul Hasan', defaultValue: 'MIS Hafshawaty Zainul Hasan' },
      { key: 'KUOTA_LAMA_KECIL', label: 'Porsi Kecil Sebelumnya', placeholder: '200', defaultValue: '200', type: 'number' },
      { key: 'KUOTA_LAMA_BESAR', label: 'Porsi Besar Sebelumnya', placeholder: '280', defaultValue: '280', type: 'number' },
      { key: 'KUOTA_BARU_KECIL', label: 'Porsi Kecil Penyesuaian', placeholder: '220', defaultValue: '220', type: 'number' },
      { key: 'KUOTA_BARU_BESAR', label: 'Porsi Besar Penyesuaian', placeholder: '290', defaultValue: '290', type: 'number' },
      { key: 'ALASAN_PERUBAHAN', label: 'Alasan Perubahan Kuota', placeholder: 'Penambahan siswa baru pindahan dan verifikasi data EMIS', defaultValue: 'Verifikasi faktual siswa baru semester ganjil dan data absensi aktif pondok pesantren' },
      { key: 'TANGGAL_BERLAKU', label: 'Mulai Berlaku Tanggal', placeholder: '01 November 2026', defaultValue: '01 November 2026', type: 'date' },
    ],
    templateBody: `BERITA ACARA PERUBAHAN PENERIMA MANFAAT (BAP-PPM)
Nomor: {{NOMOR_SURAT}}

Berdasarkan hasil verifikasi data administrasi kesiswaan dan permohonan resmi dari pihak sekolah/lembaga:

Nama Lembaga : {{NAMA_LEMBAGA}}
Alamat       : Kecamatan Krejengan, Kabupaten Probolinggo

Telah disepakati penyesuaian kuota penerima manfaat Program Makan Bergizi Gratis (MBG) sebagai berikut:

1. Kuota Terdaftar Sebelumnya:
   - Porsi Kecil : {{KUOTA_LAMA_KECIL}} Siswa
   - Porsi Besar : {{KUOTA_LAMA_BESAR}} Siswa
   - Total Lama  : {{TOTAL_KUOTA_LAMA}} Siswa

2. Kuota Penyesuaian Baru:
   - Porsi Kecil : {{KUOTA_BARU_KECIL}} Siswa
   - Porsi Besar : {{KUOTA_BARU_BESAR}} Siswa
   - Total Baru  : {{TOTAL_KUOTA_BARU}} Siswa

3. Selisih Perubahan : Penambahan {{SELISIH_KUOTA}} Siswa
4. Alasan Perubahan  : {{ALASAN_PERUBAHAN}}
5. Mulai Berlaku     : {{TANGGAL_BERLAKU}}

Perubahan kuota ini telah diverifikasi oleh tim Sistem Informasi SPPG TMG2 dan disimpan dalam jejak audit resmi.

Ditetapkan di : Temenggungan
Tanggal       : {{TANGGAL_SURAT}}

Menyetujui,
Kepala SPPG Temenggungan 2,                 Kepala Sekolah / Madrasah,


{{PENANDATANGAN}}                           ( {{NAMA_PIC}} )`,
  },
  {
    id: 'tmpl-bap-kb',
    type: 'Berita Acara Kekurangan Bahan',
    codePrefix: 'BAP-KB',
    title: 'Berita Acara Kekurangan Bahan (BAP-KB)',
    description: 'Berita Acara ketidaksesuaian atau kekurangan timbangan/jumlah bahan pangan saat penerimaan dari supplier.',
    defaultSubject: 'Berita Acara Kekurangan & Selisih Timbangan Bahan Pangan',
    fields: [
      { key: 'NAMA_SUPPLIER', label: 'Nama Supplier / Vendor', placeholder: 'PT Unggas Barokah Probolinggo', defaultValue: 'PT Unggas Barokah Probolinggo' },
      { key: 'NOMOR_PO', label: 'Nomor Purchase Order (PO)', placeholder: 'PO/SPPG-TMG2/2026/XI/0088', defaultValue: 'PO/SPPG-TMG2/2026/XI/0088' },
      { key: 'NAMA_BAHAN', label: 'Nama Bahan Pangan', placeholder: 'Daging Ayam Fillet Segar', defaultValue: 'Daging Ayam Broiler Fillet Segar' },
      { key: 'JUMLAH_PESANAN', label: 'Jumlah Dipesan (Sesuai PO)', placeholder: '300 kg', defaultValue: '300 kg' },
      { key: 'JUMLAH_DITERIMA', label: 'Jumlah Riil Diterima Gudang', placeholder: '280 kg', defaultValue: '280 kg' },
      { key: 'SELISIH_KURANG', label: 'Jumlah Kekurangan', placeholder: '20 kg', defaultValue: '20 kg' },
      { key: 'KETERANGAN_TINDAK_LANJUT', label: 'Kesepakatan Tindak Lanjut', placeholder: 'Supplier akan mengirimkan sisa 20 kg sore ini pukul 16:00', defaultValue: 'Supplier bersedia mengirimkan sisa kekurangan 20 kg paling lambat pukul 16:00 WIB hari ini sebelum jadwal masak dimulai tanpa biaya tambahan.' },
    ],
    templateBody: `BERITA ACARA KEKURANGAN BAHAN PANGAN (BAP-KB)
Nomor: {{NOMOR_SURAT}}

Pada hari ini, {{TANGGAL_SURAT}}, bertempat di Gudang Satuan Pelayanan Pemenuhan Gizi (SPPG) Probolinggo Krejengan Temenggungan 2, telah dilakukan pemeriksaan fisik (Quality Control) terhadap barang kiriman supplier:

Nama Supplier : {{NAMA_SUPPLIER}}
Nomor PO      : {{NOMOR_PO}}
Tanggal Kirim : {{TANGGAL_SURAT}}

Dari hasil penimbangan dan verifikasi fisik, ditemukan adanya kekurangan bahan pangan:
1. Komoditas Bahan  : {{NAMA_BAHAN}}
2. Jumlah Sesuai PO : {{JUMLAH_PESANAN}}
3. Kuantitas Riil   : {{JUMLAH_DITERIMA}}
4. Selisih Kurang   : {{SELISIH_KURANG}}

Tindak Lanjut & Kesepakatan:
{{KETERANGAN_TINDAK_LANJUT}}

Catatan: Stok gudang SPPG hanya ditambahkan sejumlah kuantitas yang benar-benar diterima ({{JUMLAH_DITERIMA}}).

Pemeriksa Gudang SPPG,                      Perwakilan Supplier,


( Admin Gudang SPPG TMG2 )                  ( Driver / Petugas Pengantar )`,
  },
  {
    id: 'tmpl-bap-lain',
    type: 'Berita Acara Lainnya',
    codePrefix: 'BA-LAIN',
    title: 'Berita Acara Lainnya (Umum / Insidental)',
    description: 'Berita Acara umum untuk insiden operasional, pemusnahan sisa bahan rusak, atau rekonsiliasi non-standar.',
    defaultSubject: 'Berita Acara Kejadian / Rekonsiliasi Operasional MBG',
    fields: [
      { key: 'JUDUL_ACARA', label: 'Judul Kejadian / Acara', placeholder: 'Rekonsiliasi Ompreng Tertinggal / Pemusnahan Kompos Sayur', defaultValue: 'Pencatatan Rekonsiliasi Ompreng Tertinggal di Sekolah' },
      { key: 'DESKRIPSI_RINCI', label: 'Kronologi / Uraian Rinci', placeholder: 'Tulis kronologi kejadian...', defaultValue: 'Telah dilakukan pemeriksaan inventaris ompreng kloter siang pada 3 sekolah. Terdapat 12 unit ompreng tertinggal di ruang kelas dan telah diamankan untuk dijemput kloter berikutnya.', type: 'textarea' },
      { key: 'PIHAK_TERLIBAT', label: 'Pihak-pihak yang Terlibat', placeholder: 'Tim Distribusi SPPG & Guru Piket SDN Temenggungan 2', defaultValue: 'Koordinator Distribusi SPPG & Guru Piket' },
    ],
    templateBody: `BERITA ACARA
Nomor: {{NOMOR_SURAT}}
Tentang: {{JUDUL_ACARA}}

Pada hari ini, {{TANGGAL_SURAT}}, kami yang bertanda tangan di bawah ini menerangkan dengan sebenarnya bahwa:

1. Pihak Terlibat : {{PIHAK_TERLIBAT}}
2. Uraian Kejadian:
{{DESKRIPSI_RINCI}}

Demikian Berita Acara ini dibuat dengan penuh kejujuran dan tanggung jawab untuk dijadikan bahan evaluasi serta pertanggungjawaban operasional {{NAMA_SPPG}}.

Temenggungan, {{TANGGAL_SURAT}}

Mengetahui,
Kepala SPPG Temenggungan 2,                 Pihak Pembuat Laporan,


{{PENANDATANGAN}}                           ( Staf Pelapor )`,
  },
  {
    id: 'tmpl-su',
    type: 'Surat Undangan',
    codePrefix: '005/UND',
    title: 'Surat Undangan Resmi',
    description: 'Surat undangan resmi untuk rapat koordinasi kepala sekolah, evaluasi gizi bersama Puskesmas, atau pengarahan relawan.',
    defaultSubject: 'Undangan Rapat Evaluasi Bulanan & Koordinasi Menu MBG',
    fields: [
      { key: 'NAMA_ACARA', label: 'Nama Acara / Agenda Rapat', placeholder: 'Rapat Koordinasi Evaluasi Siklus Menu MBG', defaultValue: 'Rapat Evaluasi Bulanan & Koordinasi Menu MBG Periode November 2026' },
      { key: 'HARI_TANGGAL_ACARA', label: 'Hari / Tanggal Acara', placeholder: 'Senin, 15 November 2026', defaultValue: 'Senin, 15 November 2026' },
      { key: 'WAKTU_ACARA', label: 'Waktu Acara', placeholder: '09:00 WIB s/d Selesai', defaultValue: '09:00 - 11:30 WIB' },
      { key: 'TEMPAT_ACARA', label: 'Tempat Acara', placeholder: 'Aula Pertemuan Yayasan Hafshawaty', defaultValue: 'Aula Gedung Yayasan Hafshawaty, Temenggungan' },
      { key: 'AGENDA_PEMBAHASAN', label: 'Agenda Pembahasan Utama', placeholder: 'Evaluasi Food Waste dan Uji Organoleptik...', defaultValue: '1. Evaluasi penerimaan cita rasa menu anak PAUD/SD\n2. Tindak lanjut program Zero Food Waste BGN\n3. Rekonsiliasi jadwal distribusi semester ganjil' },
    ],
    templateBody: `SURAT UNDANGAN
Nomor: {{NOMOR_SURAT}}
Sifat: Penting
Lamp : -
Hal  : Undangan {{NAMA_ACARA}}

Kepada Yth.
{{PIHAK_TERKAIT}}
Di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh,

Dengan hormat, sehubungan dengan pelaksanaan Program Makan Bergizi Gratis (MBG) oleh Badan Gizi Nasional (BGN) pada {{NAMA_SPPG}} - {{YAYASAN}}, kami mengharap kehadiran Bapak/Ibu pada:

Hari / Tanggal : {{HARI_TANGGAL_ACARA}}
Waktu          : {{WAKTU_ACARA}}
Tempat         : {{TEMPAT_ACARA}}
Acara          : {{NAMA_ACARA}}

Agenda Pembahasan:
{{AGENDA_PEMBAHASAN}}

Mengingat pentingnya agenda tersebut, kami memohon kehadiran tepat pada waktunya. Demikian undangan ini kami sampaikan, atas perhatian dan kerja samanya kami ucapkan terima kasih.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.

Temenggungan, {{TANGGAL_SURAT}}
Kepala SPPG Temenggungan 2,

{{PENANDATANGAN}}
{{JABATAN_PENANDATANGAN}}`,
  },
  {
    id: 'tmpl-sket',
    type: 'Surat Keterangan',
    codePrefix: '470/SKET',
    title: 'Surat Keterangan Resmi',
    description: 'Surat keterangan aktif sebagai relawan, sertifikasi kepatuhan gizi, atau keterangan operasional SPPG.',
    defaultSubject: 'Surat Keterangan Aktif Relawan Satuan Pelayanan Pemenuhan Gizi',
    fields: [
      { key: 'NAMA_TERANG', label: 'Nama Lengkap yang Diterangkan', placeholder: 'Dewi Lestari', defaultValue: 'Dewi Lestari' },
      { key: 'NIK_KTP', label: 'NIK / Nomor Identitas', placeholder: '3513xxxxxxxxxxxx', defaultValue: '3513125809920003' },
      { key: 'JABATAN_RELAWAN', label: 'Jabatan / Divisi Kerja', placeholder: 'Koordinator Divisi Persiapan Bahan Pangan', defaultValue: 'Koordinator Divisi Persiapan Bahan Pangan' },
      { key: 'PERIODE_AKTIF', label: 'Masa Kerja / Periode Aktif', placeholder: 'Sejak 01 September 2026 s/d Sekarang', defaultValue: '01 September 2026 s/d Sekarang' },
      { key: 'KETERANGAN_PRESTASI', label: 'Isi Keterangan', placeholder: 'Yang bersangkutan berkelakuan baik...', defaultValue: 'Bahwa yang bersangkutan benar-benar aktif bertugas sebagai relawan operasional dapur SPPG dengan dedikasi tinggi, berkinerja sangat baik, dan telah lulus pelatihan Keamanan Pangan & Sanitasi Higiene Standar BGN.' },
    ],
    templateBody: `SURAT KETERANGAN
Nomor: {{NOMOR_SURAT}}

Yang bertanda tangan di bawah ini:
Nama     : {{PENANDATANGAN}}
Jabatan  : {{JABATAN_PENANDATANGAN}}
Instansi : {{NAMA_SPPG}} (ID: {{ID_SPPG}})
Alamat   : {{ALAMAT_SPPG}}

Dengan ini menerangkan bahwa:
Nama     : {{NAMA_TERANG}}
NIK      : {{NIK_KTP}}
Divisi   : {{JABATAN_RELAWAN}}
Masa     : {{PERIODE_AKTIF}}

Adalah benar-benar personil resmi yang bertugas pada Satuan Pelayanan Pemenuhan Gizi (SPPG) Probolinggo Krejengan Temenggungan 2 dalam rangka Program Makan Bergizi Gratis (MBG) Badan Gizi Nasional.

{{KETERANGAN_PRESTASI}}

Surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.

Temenggungan, {{TANGGAL_SURAT}}
Kepala SPPG Temenggungan 2,

{{PENANDATANGAN}}
{{JABATAN_PENANDATANGAN}}`,
  },
];

// Default Outgoing Documents (Arsip Surat Keluar Salinan Hasil Mail Merge)
export const defaultOutgoingDocuments: OutgoingDocument[] = [
  {
    id: 'out-01',
    letterCode: 'SPD',
    letterNumber: '090/SPD-MBG/TMG2/2026/XI/001',
    type: 'Surat Perjalanan Dinas',
    date: '2026-11-09',
    subject: 'Surat Perjalanan Dinas Koordinasi Pelaksanaan Program MBG BGN Surabaya',
    recipientName: 'Kantor Perwakilan BGN Jawa Timur',
    recipientInstitution: 'Badan Gizi Nasional Kantor Wilayah Jawa Timur',
    recipientAddress: 'Jl. Ahmad Yani No. 152, Surabaya',
    templateId: 'tmpl-spd',
    mergedBody: `SURAT PERJALANAN DINAS (SPD)
Nomor: 090/SPD-MBG/TMG2/2026/XI/001

1. Pejabat Berwenang yang Memberi Perintah : Kepala SPPG Temenggungan 2
2. Nama Pegawai yang Diperintahkan         : Dr. H. Ahmad Zaini, S.Pd., M.M.
3. Jabatan dan Golongan                    : Kepala SPPG Temenggungan 2
4. Tingkat Biaya Perjalanan Dinas          : Tingkat B (Anggaran MBG)
5. Maksud Perjalanan Dinas                 : Rapat Koordinasi Evaluasi Penyaluran MBG Bersama Badan Gizi Nasional
6. Alat Angkutan yang Digunakan            : Kendaraan Dinas Operasional SPPG
7. a. Tempat Berangkat                     : Krejengan, Kabupaten Probolinggo
   b. Tempat Tujuan                        : Kantor Perwakilan BGN Jawa Timur, Surabaya
8. a. Lamanya Perjalanan Dinas             : 2 (Dua) Hari
   b. Tanggal Berangkat                    : 10 November 2026
   c. Tanggal Harus Kembali                : 11 November 2026
9. Pembebanan Anggaran                     :
   a. Instansi / Satuan Pelayanan          : SPPG Probolinggo Krejengan Temenggungan 2 (ID: GFBQSYXD)
   b. Mata Anggaran                        : Mata Anggaran Operasional SPPG TMG2 Tahun 2026
10. Keterangan Lain-lain                   : Harap melapor setibanya di tempat tujuan dan menyerahkan laporan hasil perjalanan dinas setelah selesai.

Dikeluarkan di : Temenggungan, Probolinggo
Pada tanggal   : Senin, 09 November 2026

Pejabat Pemberi Perintah,
SPPG Probolinggo Krejengan Temenggungan 2
Yayasan Hafshawaty

Dr. H. Ahmad Zaini, S.Pd., M.M.
Kepala SPPG Temenggungan 2`,
    fieldsData: {
      NAMA_PETUGAS: 'Dr. H. Ahmad Zaini, S.Pd., M.M.',
      JABATAN_PETUGAS: 'Kepala SPPG Temenggungan 2',
      TINGKAT_BIAYA: 'Tingkat B (Anggaran MBG)',
      MAKSUD_PERJALANAN: 'Rapat Koordinasi Evaluasi Penyaluran MBG Bersama Badan Gizi Nasional',
      KOTA_ASAL: 'Krejengan, Kabupaten Probolinggo',
      KOTA_TUJUAN: 'Kantor Perwakilan BGN Jawa Timur, Surabaya',
      TANGGAL_BERANGKAT: '2026-11-10',
      TANGGAL_KEMBALI: '2026-11-11',
      KENDARAAN: 'Kendaraan Dinas Operasional SPPG',
      PEMBEBANAN_ANGGARAN: 'Mata Anggaran Operasional SPPG TMG2 Tahun 2026',
    },
    signedBy: 'Dr. H. Ahmad Zaini, S.Pd., M.M.',
    signedRole: 'Kepala SPPG Temenggungan 2',
    status: 'Disahkan',
    createdAt: '2026-11-09 08:30:00',
  },
  {
    id: 'out-02',
    letterCode: 'BAST',
    letterNumber: 'BAST/MBG-TMG2/2026/11/0401',
    type: 'Berita Acara Serah Terima',
    date: '2026-11-08',
    subject: 'Berita Acara Serah Terima Makanan Bergizi Gratis (MBG) SDN Temenggungan 1',
    recipientName: 'Drs. Slamet Hariyanto',
    recipientInstitution: 'SDN Temenggungan 1 Krejengan',
    recipientAddress: 'Desa Temenggungan, Kec. Krejengan',
    templateId: 'tmpl-bast',
    mergedBody: `BERITA ACARA SERAH TERIMA (BAST) MAKANAN BERGIZI GRATIS
Nomor: BAST/MBG-TMG2/2026/11/0401

Pada hari ini, Minggu, 08 November 2026, bertempat di SDN Temenggungan 1 Krejengan, telah dilaksanakan serah terima Makanan Bergizi Gratis (MBG) antara:

I. PIHAK PERTAMA (Yang Menyerahkan):
   Nama      : Agus Santoso
   Jabatan   : Petugas Distribusi & Logistik SPPG Probolinggo Krejengan Temenggungan 2
   Alamat    : Dusun Krajan RT 03/RW 04 Desa Temenggungan Kecamatan Krejengan Kabupaten Probolinggo

II. PIHAK KEDUA (Yang Menerima):
   Nama      : Drs. Slamet Hariyanto
   Jabatan   : Kepala Sekolah SDN Temenggungan 1 Krejengan
   Alamat    : Desa Temenggungan, Kec. Krejengan

PIHAK PERTAMA menyerahkan kepada PIHAK KEDUA, dan PIHAK KEDUA menyatakan telah menerima dengan baik dan cukup:
1. Jenis Bantuan      : Makanan Siap Santap Program MBG Badan Gizi Nasional
2. Menu Hari Ini      : Nasi Pulen, Ayam Fillet Saus Madu, Tempe Bacem, Sop Sayur Kaldu, Pisang Cavendish
3. Rincian Porsi      :
   - Porsi Kecil (Kelas Bawah) : 180 Pack
   - Porsi Besar (Kelas Atas)  : 220 Pack
   - TOTAL PORSI               : 400 Pack
4. Kondisi Fisik      : Boks termal bersegel rapi, ompreng stainless steril tanpa cacat
5. Suhu Makanan       : 64.5°C (Hangat & Lolos Uji Organoleptik Sensorik)

Demikian Berita Acara Serah Terima ini dibuat dalam rangkap 2 (dua) untuk dipergunakan sebagaimana mestinya.`,
    fieldsData: {
      NAMA_LEMBAGA: 'SDN Temenggungan 1 Krejengan',
      NAMA_PIC: 'Drs. Slamet Hariyanto',
      JABATAN_PIC: 'Kepala Sekolah',
      PORSI_KECIL: '180',
      PORSI_BESAR: '220',
      TOTAL_PORSI: '400',
      MENU_HARI_INI: 'Nasi Pulen, Ayam Fillet Saus Madu, Tempe Bacem, Sop Sayur Kaldu, Pisang Cavendish',
      SUHU_MAKANAN: '64.5',
      KONDISI_FISIK: 'Boks termal bersegel rapi, ompreng stainless steril tanpa cacat',
    },
    signedBy: 'Agus Santoso',
    signedRole: 'Petugas Distribusi SPPG',
    status: 'Terkirim',
    createdAt: '2026-11-08 08:35:00',
  },
  {
    id: 'out-03',
    letterCode: '005/UND',
    letterNumber: '005/UND-MBG/TMG2/2026/XI/012',
    type: 'Surat Undangan',
    date: '2026-11-07',
    subject: 'Undangan Rapat Evaluasi Bulanan & Koordinasi Menu MBG Periode November 2026',
    recipientName: 'Seluruh Kepala Sekolah & PIC Lembaga Sasaran MBG',
    recipientInstitution: 'Lembaga Pendidikan se-Kecamatan Krejengan',
    recipientAddress: 'Kecamatan Krejengan, Kabupaten Probolinggo',
    templateId: 'tmpl-su',
    mergedBody: `SURAT UNDANGAN
Nomor: 005/UND-MBG/TMG2/2026/XI/012
Sifat: Penting
Hal  : Undangan Rapat Evaluasi Bulanan & Koordinasi Menu MBG Periode November 2026

Kepada Yth.
Seluruh Kepala Sekolah & PIC Lembaga Sasaran MBG
Di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh,

Dengan hormat, sehubungan dengan pelaksanaan Program Makan Bergizi Gratis (MBG) oleh Badan Gizi Nasional (BGN) pada SPPG Probolinggo Krejengan Temenggungan 2 - Yayasan Hafshawaty, kami mengharap kehadiran Bapak/Ibu pada:

Hari / Tanggal : Senin, 15 November 2026
Waktu          : 09:00 - 11:30 WIB
Tempat         : Aula Gedung Yayasan Hafshawaty, Temenggungan
Acara          : Rapat Evaluasi Bulanan & Koordinasi Menu MBG Periode November 2026

Agenda Pembahasan:
1. Evaluasi penerimaan cita rasa menu anak PAUD/SD
2. Tindak lanjut program Zero Food Waste BGN
3. Rekonsiliasi jadwal distribusi semester ganjil

Mengingat pentingnya agenda tersebut, kami memohon kehadiran tepat pada waktunya. Demikian undangan ini kami sampaikan, atas perhatian dan kerja samanya kami ucapkan terima kasih.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.

Temenggungan, Sabtu, 07 November 2026
Kepala SPPG Temenggungan 2,

Dr. H. Ahmad Zaini, S.Pd., M.M.
Kepala SPPG Temenggungan 2`,
    fieldsData: {
      NAMA_ACARA: 'Rapat Evaluasi Bulanan & Koordinasi Menu MBG Periode November 2026',
      HARI_TANGGAL_ACARA: 'Senin, 15 November 2026',
      WAKTU_ACARA: '09:00 - 11:30 WIB',
      TEMPAT_ACARA: 'Aula Gedung Yayasan Hafshawaty, Temenggungan',
      AGENDA_PEMBAHASAN: '1. Evaluasi penerimaan cita rasa menu anak PAUD/SD\n2. Tindak lanjut program Zero Food Waste BGN\n3. Rekonsiliasi jadwal distribusi semester ganjil',
    },
    signedBy: 'Dr. H. Ahmad Zaini, S.Pd., M.M.',
    signedRole: 'Kepala SPPG Temenggungan 2',
    status: 'Terkirim',
    createdAt: '2026-11-07 10:00:00',
  },
];

// Default Incoming Letters (Register Surat Masuk & Disposisi)
export const defaultIncomingLetters: IncomingLetter[] = [
  {
    id: 'inc-01',
    letterNumber: '005/BGN-WIL.JTM/MBG/X/2026',
    letterDate: '2026-10-28',
    receivedDate: '2026-10-30',
    sender: 'Badan Gizi Nasional Kantor Wilayah Jawa Timur',
    subject: 'Instruksi Standar Kebersihan, Keamanan Pangan & Verifikasi Titik Kritis (CCP) Suhu MBG',
    category: 'Badan Gizi Nasional (BGN)',
    dispositionTo: 'Kepala SPPG, Pengawas Gizi, Chef Wahyu',
    dispositionInstruction: 'Pelajari dan laksanakan SOP verifikasi suhu makanan matang minimal 75°C serta suhu pendingin chiller & freezer tanpa toleransi.',
    dispositionNotes: 'Wajib dipedomani seluruh personil 5 divisi dapur tanpa kecuali.',
    dispositionDate: '2026-10-31',
    followUpStatus: 'Selesai Tindak Lanjut',
    scannedDocumentUrl: 'https://images.unsplash.com/photo-1554415707-9e4466b404c0?auto=format&fit=crop&w=500&q=80',
    recordedBy: 'Staf Tata Usaha SPPG',
  },
  {
    id: 'inc-02',
    letterNumber: '042/DINKES-KAB.PROB/GIZI/XI/2026',
    letterDate: '2026-11-04',
    receivedDate: '2026-11-05',
    sender: 'Dinas Kesehatan Kabupaten Probolinggo (Puskesmas Krejengan)',
    subject: 'Jadwal Uji Petik Higiene Sanitasi Dapur, Kualitas Air Bersih & Swab Alat Makan MBG',
    category: 'Dinas / Pemda',
    dispositionTo: 'Pengawas Gizi (Siti Aminah, S.Gz.) & Divisi Cuci Ompreng',
    dispositionInstruction: 'Siapkan sampel air sumur bor, ompreng steril hasil oven UV, dan dokumen pemeriksaan kesehatan berkala relawan.',
    dispositionNotes: 'Jadwal inspeksi Dinkes ditetapkan Kamis, 12 November 2026 pukul 09:00 WIB.',
    dispositionDate: '2026-11-05',
    followUpStatus: 'Dalam Proses Tindak Lanjut',
    scannedDocumentUrl: 'https://images.unsplash.com/photo-1554415707-9e4466b404c0?auto=format&fit=crop&w=500&q=80',
    recordedBy: 'Staf Tata Usaha SPPG',
  },
  {
    id: 'inc-03',
    letterNumber: '421.2/088/SDN-TMG2/XI/2026',
    letterDate: '2026-11-06',
    receivedDate: '2026-11-07',
    sender: 'SDN Temenggungan 2 Krejengan',
    subject: 'Permohonan Penyesuaian Waktu Kedatangan Makanan Menjelang Ujian Tengah Semester',
    category: 'Sekolah / Lembaga',
    dispositionTo: 'Asisten Lapangan & Tim Distribusi Armada 1',
    dispositionInstruction: 'Sesuaikan jadwal keberangkatan armada kloter 1 menjadi pukul 08:00 WIB tepat waktu agar istirahat siswa terjadwal lancar.',
    dispositionNotes: 'Sudah dikoordinasikan dengan driver Agus Santoso.',
    dispositionDate: '2026-11-07',
    followUpStatus: 'Selesai Tindak Lanjut',
    scannedDocumentUrl: 'https://images.unsplash.com/photo-1554415707-9e4466b404c0?auto=format&fit=crop&w=500&q=80',
    recordedBy: 'Staf Tata Usaha SPPG',
  },
  {
    id: 'inc-04',
    letterNumber: '012/UB-PROB/SP-AYAM/XI/2026',
    letterDate: '2026-11-07',
    receivedDate: '2026-11-08',
    sender: 'PT Unggas Barokah Probolinggo',
    subject: 'Pemberitahuan Sertifikasi Halal RPHU & Hasil Uji Bebas Residu Antibiotik Daging Broiler',
    category: 'Supplier / Vendor',
    dispositionTo: 'Pengawas Gizi & Admin Gudang',
    dispositionInstruction: 'Arsipkan ke dokumen pendukung audit jaminan mutu pangan halal BGN.',
    dispositionNotes: 'Dokumen sertifikasi telah diperiksa valid hingga tahun 2028.',
    dispositionDate: '2026-11-08',
    followUpStatus: 'Diarsipkan',
    scannedDocumentUrl: 'https://images.unsplash.com/photo-1554415707-9e4466b404c0?auto=format&fit=crop&w=500&q=80',
    recordedBy: 'Staf Tata Usaha SPPG',
  },
];
