// Helper murni (tanpa state/JSX) untuk WorksheetFormModal.
// Dipindahkan apa adanya dari WorksheetFormModal.tsx — logika tidak diubah.

// Normalisasi jam lokal (client) — salinan kecil dari server agar tidak
// mengimpor file server-action ke komponen client.
export function normalizeClientTime(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return `${String(parseInt(m[1], 10)).padStart(2, "0")}:${m[2]}`;
}

export function normalizeClientDate(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  return String(raw).slice(0, 10);
}

export const parseBulletList = (text?: string): string[] => {
  if (!text || !text.trim()) return [""];
  const lines = text
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : [""];
};

export function formatAnandaLine(rawLine: string): string {
  let clean = rawLine.replace(/^[-•*]\s*/, "").trim();
  if (!clean || clean === "-") return "-";
  if (/ananda/i.test(clean)) {
    return clean;
  }
  if (/siswa/i.test(clean)) {
    return clean.replace(/siswa/gi, "Ananda");
  }
  return `Ananda ${clean}`;
}

/**
 * Kompresi foto secara otomatis di browser sebelum diunggah.
 * Mengubah foto kamera HP yang berukuran besar (8-15 MB) menjadi ~200-400 KB
 * sehingga proses upload instan dan tidak kena limit payload Vercel/Next.js.
 */
export async function compressImage(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.8,
): Promise<File> {
  if (!file.type || !file.type.startsWith("image/")) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, "") + ".jpg",
            { type: "image/jpeg" },
          );
          resolve(compressedFile);
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export function formatPlainLine(rawLine: string): string {
  let clean = rawLine.replace(/^[-•*]\s*/, "").trim();
  if (!clean || clean === "-") return "-";
  return clean;
}
