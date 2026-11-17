# Lisan – Belajar Bahasa Arab Amiyah & Fusha

Aplikasi web untuk belajar **bicara** bahasa Arab dengan orang lokal Saudi (Makkah, Madinah, Jeddah).
Setiap frasa disajikan dalam dua ragam:

- **Amiyah (Saudi/Hijazi)**: bahasa yang benar-benar diucapkan orang lokal di pasar, taksi, dan hotel
- **Fusha**: bahasa Arab baku

## Fitur
- 📚 200+ frasa dalam 14 topik (salam, belanja, taksi, hotel, bandara, haji & umrah, askar, darurat, dll.)
- 🗣️ Dialog nyata (menawar, naik taksi, tanya jalan, restoran) dengan versi Fusha-nya
- 🧩 14 pola kunci untuk mengubah Fusha menjadi Amiyah
- 🔤 Huruf hijaiyah beserta catatan pelafalan khas Saudi
- 🃏 Kartu hafalan (sistem kotak Leitner)
- 🎯 Kuis: Arti→Arab, Arab→Arti, dan **Fusha→Amiyah**
- 🎙️ Latihan bicara dengan penilaian pelafalan otomatis (Chrome/Safari)
- 🔊 Suara Arab (ar-SA) bawaan browser; progres tersimpan di browser

## Menjalankan secara lokal
Cukup buka `index.html`, atau jalankan `python3 -m http.server` lalu buka http://localhost:8000.

## Menambah materi
Edit `data.js`. Setiap frasa ditulis sebagai
`p("arti", "fusha arab", "fusha latin", "amiyah arab", "amiyah latin", "catatan")`.
