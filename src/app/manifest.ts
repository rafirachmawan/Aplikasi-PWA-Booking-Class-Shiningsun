import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Jadwal Shiningsun',
    short_name: 'Jadwal Shiningsun',
    description: 'Aplikasi Penjadwalan dan Booking Kelas ShiningSun',
    // Hemat 1 hop redirect saat PWA diluncurkan: langsung ke /dashboard
    // (tujuan akhir identik — yang belum login tetap diarahkan proxy ke /login).
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0A0F1C',
    theme_color: '#0A0F1C',
    icons: [
      {
        src: '/logo.png',
        sizes: 'any',
        type: 'image/png',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      }
    ],
  };
}
