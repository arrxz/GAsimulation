# Lab Algoritma Genetika

Simulasi interaktif Algoritma Genetika (GA) untuk praktikum Kecerdasan Buatan, sesi 9.

## Halaman
- **Pencocokan Kata**: program GA dari modul (gen = huruf, fitness = jumlah huruf salah), dianimasikan langkah demi langkah: evaluasi fitness, elitism, seleksi, crossover, dan mutasi.
- **Penjadwalan Kuliah**: GA menyusun jadwal 6 kelas (45 sesi) di 5 ruang dan 20 slot waktu dengan kendala keras (bentrok dosen/kelas/ruang, lab, kapasitas, ketersediaan dosen) dan kendala lunak (jam sore, hari padat). GA dibandingkan dengan pencarian lokal yang mudah terjebak di *local optimum*. Tersedia sakelar crossover per kelas dan mutasi terarah untuk membandingkan GA murni dengan GA yang dirancang sesuai masalah.
- **Gaya Jalan Robot Kepiting**: GA mencari offset, amplitudo, dan fase tiap servo agar robot kepiting berjalan menyamping dengan stabil. Hasilnya bisa diekspor menjadi sketsa Arduino (PCA9685).
- **Robot Self-Balancing (MPU6050)**: GA menyetel Kp, Ki, Kd, dan α filter komplementer untuk robot beroda dua. Simulasi memuat noise akselerometer, bias giroskop, zona mati dan jeda motor, serta dorongan dari luar. Ada mode coba PID sendiri dan ekspor sketsa Arduino (MPU6050 + L298N).

## Menjalankan
Tidak perlu build. Buka `index.html` di browser, atau aktifkan GitHub Pages pada repo ini.

## Catatan
Model robot kepiting dan robot self-balancing berupa simulasi kinematik 2D sederhana yang disederhanakan. Parameter hasil evolusi adalah titik awal; posisi netral dan arah tiap servo perlu dikalibrasi pada robot nyata.
