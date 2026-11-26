# Lab Algoritma Genetika

Simulasi interaktif Algoritma Genetika (GA) untuk praktikum Kecerdasan Buatan, sesi 9.

## Halaman
- **Pencocokan Kata**: program GA dari modul (gen = huruf, fitness = jumlah huruf salah), dianimasikan langkah demi langkah: evaluasi fitness, elitism, seleksi, crossover, dan mutasi.
- **Puncak Palsu**: GA dibandingkan dengan hill climbing pada lanskap dengan banyak *local optimum* (Rastrigin, Schwefel, pegunungan acak).
- **Gaya Jalan Robot Kepiting**: GA mencari offset, amplitudo, dan fase tiap servo agar robot kepiting berjalan menyamping dengan stabil. Hasilnya bisa diekspor menjadi sketsa Arduino (PCA9685).

## Menjalankan
Tidak perlu build. Buka `index.html` di browser, atau aktifkan GitHub Pages pada repo ini.

## Catatan
Model robot kepiting berupa simulasi kinematik 2D sederhana (tanpa massa, inersia, dan batas torsi servo). Parameter hasil evolusi adalah titik awal; posisi netral dan arah tiap servo perlu dikalibrasi pada robot nyata.
