/**
 * الفرقان - قسم التلاوات القرآنية
 * دعم كامل لرواية ورش، قالون، الدوري، وحفص
 * مع إمكانية التنزيل والاستماع أوفلاين 100% بدون إنترنت
 */

document.addEventListener('DOMContentLoaded', async () => {

    // ============================================
    // 1. قاعدة البيانات المحلية أوفلاين IndexedDB
    // ============================================
    const QuranAudioDB = {
        dbName: 'MishkatQuranAudioDB',
        dbVersion: 1,
        storeName: 'audioSurahs',

        async getDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.dbVersion);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        db.createObjectStore(this.storeName, { keyPath: 'key' });
                    }
                };
                request.onsuccess = (e) => resolve(e.target.result);
                request.onerror = (e) => reject(e.target.error);
            });
        },

        async saveAudio(reciterId, surahNumber, blob, meta = {}) {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(this.storeName, 'readwrite');
                const store = tx.objectStore(this.storeName);
                const item = {
                    key: `${reciterId}_${surahNumber}`,
                    reciterId,
                    surahNumber,
                    blob,
                    meta,
                    savedAt: Date.now()
                };
                const request = store.put(item);
                request.onsuccess = () => resolve(true);
                request.onerror = (e) => reject(e.target.error);
            });
        },

        async getAudio(reciterId, surahNumber) {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(this.storeName, 'readonly');
                const store = tx.objectStore(this.storeName);
                const request = store.get(`${reciterId}_${surahNumber}`);
                request.onsuccess = (e) => resolve(e.target.result || null);
                request.onerror = (e) => reject(e.target.error);
            });
        },

        async deleteAudio(reciterId, surahNumber) {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(this.storeName, 'readwrite');
                const store = tx.objectStore(this.storeName);
                const request = store.delete(`${reciterId}_${surahNumber}`);
                request.onsuccess = () => resolve(true);
                request.onerror = (e) => reject(e.target.error);
            });
        },

        async getAllKeys() {
            try {
                const db = await this.getDB();
                return new Promise((resolve) => {
                    const tx = db.transaction(this.storeName, 'readonly');
                    const store = tx.objectStore(this.storeName);
                    const request = store.getAllKeys();
                    request.onsuccess = (e) => resolve(e.target.result || []);
                    request.onerror = () => resolve([]);
                });
            } catch (e) {
                return [];
            }
        }
    };

    let downloadedKeysSet = new Set(await QuranAudioDB.getAllKeys());

    // ============================================
    // 2. المظهر يُدار مركزياً عبر settings.js
    // ============================================

    // ============================================
    // 3. الفهرس المحلي للسور (114 سورة 100% أوفلاين)
    // ============================================
    const SURAH_INDEX_OFFLINE = [
        { number: 1, name: 'سُورَةُ الفَاتِحَةِ', englishName: 'Al-Faatiha', revelationType: 'Meccan', numberOfAyahs: 7 },
        { number: 2, name: 'سُورَةُ البَقَرَةِ', englishName: 'Al-Baqara', revelationType: 'Medinan', numberOfAyahs: 286 },
        { number: 3, name: 'سُورَةُ آلِ عِمْرَانَ', englishName: 'Aal-i-Imraan', revelationType: 'Medinan', numberOfAyahs: 200 },
        { number: 4, name: 'سُورَةُ النِّسَاءِ', englishName: 'An-Nisaa', revelationType: 'Medinan', numberOfAyahs: 176 },
        { number: 5, name: 'سُورَةُ المَائِدَةِ', englishName: 'Al-Maaida', revelationType: 'Medinan', numberOfAyahs: 120 },
        { number: 6, name: 'سُورَةُ الأَنْعَامِ', englishName: 'Al-An\'aam', revelationType: 'Meccan', numberOfAyahs: 165 },
        { number: 7, name: 'سُورَةُ الأَعْرَافِ', englishName: 'Al-A\'raaf', revelationType: 'Meccan', numberOfAyahs: 206 },
        { number: 8, name: 'سُورَةُ الأَنْفَالِ', englishName: 'Al-Anfaal', revelationType: 'Medinan', numberOfAyahs: 75 },
        { number: 9, name: 'سُورَةُ التَّوْبَةِ', englishName: 'At-Tawba', revelationType: 'Medinan', numberOfAyahs: 129 },
        { number: 10, name: 'سُورَةُ يُونُسَ', englishName: 'Yunus', revelationType: 'Meccan', numberOfAyahs: 109 },
        { number: 11, name: 'سُورَةُ هُودٍ', englishName: 'Hud', revelationType: 'Meccan', numberOfAyahs: 123 },
        { number: 12, name: 'سُورَةُ يُوسُفَ', englishName: 'Yusuf', revelationType: 'Meccan', numberOfAyahs: 111 },
        { number: 13, name: 'سُورَةُ الرَّعْدِ', englishName: 'Ar-Ra\'d', revelationType: 'Medinan', numberOfAyahs: 43 },
        { number: 14, name: 'سُورَةُ إِبْرَاهِيمَ', englishName: 'Ibrahim', revelationType: 'Meccan', numberOfAyahs: 52 },
        { number: 15, name: 'سُورَةُ الحِجْرِ', englishName: 'Al-Hijr', revelationType: 'Meccan', numberOfAyahs: 99 },
        { number: 16, name: 'سُورَةُ النَّحْلِ', englishName: 'An-Nahl', revelationType: 'Meccan', numberOfAyahs: 128 },
        { number: 17, name: 'سُورَةُ الإِسْرَاءِ', englishName: 'Al-Israa', revelationType: 'Meccan', numberOfAyahs: 111 },
        { number: 18, name: 'سُورَةُ الكَهْفِ', englishName: 'Al-Kahf', revelationType: 'Meccan', numberOfAyahs: 110 },
        { number: 19, name: 'سُورَةُ مَرْيَمَ', englishName: 'Maryam', revelationType: 'Meccan', numberOfAyahs: 98 },
        { number: 20, name: 'سُورَةُ طٰهٰ', englishName: 'Taa-Haa', revelationType: 'Meccan', numberOfAyahs: 135 },
        { number: 21, name: 'سُورَةُ الأَنْبِيَاءِ', englishName: 'Al-Anbiyaa', revelationType: 'Meccan', numberOfAyahs: 112 },
        { number: 22, name: 'سُورَةُ الحَجِّ', englishName: 'Al-Hajj', revelationType: 'Medinan', numberOfAyahs: 78 },
        { number: 23, name: 'سُورَةُ المُؤْمِنُونَ', englishName: 'Al-Muminoon', revelationType: 'Meccan', numberOfAyahs: 118 },
        { number: 24, name: 'سُورَةُ النُّورِ', englishName: 'An-Noor', revelationType: 'Medinan', numberOfAyahs: 64 },
        { number: 25, name: 'سُورَةُ الفُرْقَانِ', englishName: 'Al-Furqaan', revelationType: 'Meccan', numberOfAyahs: 77 },
        { number: 26, name: 'سُورَةُ الشُّعَرَاءِ', englishName: 'Ash-Shu\'araa', revelationType: 'Meccan', numberOfAyahs: 227 },
        { number: 27, name: 'سُورَةُ النَّمْلِ', englishName: 'An-Naml', revelationType: 'Meccan', numberOfAyahs: 93 },
        { number: 28, name: 'سُورَةُ القَصَصِ', englishName: 'Al-Qasas', revelationType: 'Meccan', numberOfAyahs: 88 },
        { number: 29, name: 'سُورَةُ العَنْكَبُوتِ', englishName: 'Al-Ankaboot', revelationType: 'Meccan', numberOfAyahs: 69 },
        { number: 30, name: 'سُورَةُ الرُّومِ', englishName: 'Ar-Room', revelationType: 'Meccan', numberOfAyahs: 60 },
        { number: 31, name: 'سُورَةُ لُقْمَانَ', englishName: 'Luqman', revelationType: 'Meccan', numberOfAyahs: 34 },
        { number: 32, name: 'سُورَةُ السَّجْدَةِ', englishName: 'As-Sajda', revelationType: 'Meccan', numberOfAyahs: 30 },
        { number: 33, name: 'سُورَةُ الأَحْزَابِ', englishName: 'Al-Ahzaab', revelationType: 'Medinan', numberOfAyahs: 73 },
        { number: 34, name: 'سُورَةُ سَبَإٍ', englishName: 'Saba', revelationType: 'Meccan', numberOfAyahs: 54 },
        { number: 35, name: 'سُورَةُ فَاطِرٍ', englishName: 'Faatir', revelationType: 'Meccan', numberOfAyahs: 45 },
        { number: 36, name: 'سُورَةُ يسٓ', englishName: 'Yaseen', revelationType: 'Meccan', numberOfAyahs: 83 },
        { number: 37, name: 'سُورَةُ الصَّافَّاتِ', englishName: 'As-Saaffaat', revelationType: 'Meccan', numberOfAyahs: 182 },
        { number: 38, name: 'سُورَةُ صٓ', englishName: 'Saad', revelationType: 'Meccan', numberOfAyahs: 88 },
        { number: 39, name: 'سُورَةُ الزُّمَرِ', englishName: 'Az-Zumar', revelationType: 'Meccan', numberOfAyahs: 75 },
        { number: 40, name: 'سُورَةُ غَافِرٍ', englishName: 'Ghafir', revelationType: 'Meccan', numberOfAyahs: 85 },
        { number: 41, name: 'سُورَةُ فُصِّلَتْ', englishName: 'Fussilat', revelationType: 'Meccan', numberOfAyahs: 54 },
        { number: 42, name: 'سُورَةُ الشُّورَىٰ', englishName: 'Ash-Shura', revelationType: 'Meccan', numberOfAyahs: 53 },
        { number: 43, name: 'سُورَةُ الزُّخْرُفِ', englishName: 'Az-Zukhruf', revelationType: 'Meccan', numberOfAyahs: 89 },
        { number: 44, name: 'سُورَةُ الدُّخَانِ', englishName: 'Ad-Dukhaan', revelationType: 'Meccan', numberOfAyahs: 59 },
        { number: 45, name: 'سُورَةُ الجَاثِيَةِ', englishName: 'Al-Jaathiya', revelationType: 'Meccan', numberOfAyahs: 37 },
        { number: 46, name: 'سُورَةُ الأَحْقَافِ', englishName: 'Al-Ahqaf', revelationType: 'Meccan', numberOfAyahs: 35 },
        { number: 47, name: 'سُورَةُ مُحَمَّدٍ', englishName: 'Muhammad', revelationType: 'Medinan', numberOfAyahs: 38 },
        { number: 48, name: 'سُورَةُ الفَتْحِ', englishName: 'Al-Fath', revelationType: 'Medinan', numberOfAyahs: 29 },
        { number: 49, name: 'سُورَةُ الحُجُرَاتِ', englishName: 'Al-Hujuraat', revelationType: 'Medinan', numberOfAyahs: 18 },
        { number: 50, name: 'سُورَةُ قٓ', englishName: 'Qaaf', revelationType: 'Meccan', numberOfAyahs: 45 },
        { number: 51, name: 'سُورَةُ الذَّارِيَاتِ', englishName: 'Adh-Dhaariyat', revelationType: 'Meccan', numberOfAyahs: 60 },
        { number: 52, name: 'سُورَةُ الطُّورِ', englishName: 'At-Tur', revelationType: 'Meccan', numberOfAyahs: 49 },
        { number: 53, name: 'سُورَةُ النَّجْمِ', englishName: 'An-Najm', revelationType: 'Meccan', numberOfAyahs: 62 },
        { number: 54, name: 'سُورَةُ القَمَرِ', englishName: 'Al-Qamar', revelationType: 'Meccan', numberOfAyahs: 55 },
        { number: 55, name: 'سُورَةُ الرَّحْمٰنِ', englishName: 'Ar-Rahmaan', revelationType: 'Medinan', numberOfAyahs: 78 },
        { number: 56, name: 'سُورَةُ الوَاقِعَةِ', englishName: 'Al-Waaqia', revelationType: 'Meccan', numberOfAyahs: 96 },
        { number: 57, name: 'سُورَةُ الحَدِيدِ', englishName: 'Al-Hadid', revelationType: 'Medinan', numberOfAyahs: 29 },
        { number: 58, name: 'سُورَةُ المُجَادَلَةِ', englishName: 'Al-Mujaadila', revelationType: 'Medinan', numberOfAyahs: 22 },
        { number: 59, name: 'سُورَةُ الحَشْرِ', englishName: 'Al-Hashr', revelationType: 'Medinan', numberOfAyahs: 24 },
        { number: 60, name: 'سُورَةُ المُمْتَحَنَةِ', englishName: 'Al-Mumtahana', revelationType: 'Medinan', numberOfAyahs: 13 },
        { number: 61, name: 'سُورَةُ الصَّفِّ', englishName: 'As-Saff', revelationType: 'Medinan', numberOfAyahs: 14 },
        { number: 62, name: 'سُورَةُ الجُمُعَةِ', englishName: 'Al-Jumu\'a', revelationType: 'Medinan', numberOfAyahs: 11 },
        { number: 63, name: 'سُورَةُ المُنَافِقُونَ', englishName: 'Al-Munaafiqoon', revelationType: 'Medinan', numberOfAyahs: 11 },
        { number: 64, name: 'سُورَةُ التَّغَابُنِ', englishName: 'At-Taghaabun', revelationType: 'Medinan', numberOfAyahs: 18 },
        { number: 65, name: 'سُورَةُ الطَّلاَقِ', englishName: 'At-Talaaq', revelationType: 'Medinan', numberOfAyahs: 12 },
        { number: 66, name: 'سُورَةُ التَّحْرِيمِ', englishName: 'At-Tahrim', revelationType: 'Medinan', numberOfAyahs: 12 },
        { number: 67, name: 'سُورَةُ المُلْكِ', englishName: 'Al-Mulk', revelationType: 'Meccan', numberOfAyahs: 30 },
        { number: 68, name: 'سُورَةُ القَلَمِ', englishName: 'Al-Qalam', revelationType: 'Meccan', numberOfAyahs: 52 },
        { number: 69, name: 'سُورَةُ الحَاقَّةِ', englishName: 'Al-Haaqqa', revelationType: 'Meccan', numberOfAyahs: 52 },
        { number: 70, name: 'سُورَةُ المَعَارِجِ', englishName: 'Al-Ma\'aarij', revelationType: 'Meccan', numberOfAyahs: 44 },
        { number: 71, name: 'سُورَةُ نُوحٍ', englishName: 'Nooh', revelationType: 'Meccan', numberOfAyahs: 28 },
        { number: 72, name: 'سُورَةُ الجِنِّ', englishName: 'Al-Jinn', revelationType: 'Meccan', numberOfAyahs: 28 },
        { number: 73, name: 'سُورَةُ المُزَّمِّلِ', englishName: 'Al-Muzzammil', revelationType: 'Meccan', numberOfAyahs: 20 },
        { number: 74, name: 'سُورَةُ المُدَّثِّرِ', englishName: 'Al-Muddaththir', revelationType: 'Meccan', numberOfAyahs: 56 },
        { number: 75, name: 'سُورَةُ القِيَامَةِ', englishName: 'Al-Qiyaama', revelationType: 'Meccan', numberOfAyahs: 40 },
        { number: 76, name: 'سُورَةُ الإِنْسَانِ', englishName: 'Al-Insaan', revelationType: 'Medinan', numberOfAyahs: 31 },
        { number: 77, name: 'سُورَةُ المُرْسَلاَتِ', englishName: 'Al-Mursalaat', revelationType: 'Meccan', numberOfAyahs: 50 },
        { number: 78, name: 'سُورَةُ النَّبَإِ', englishName: 'An-Naba', revelationType: 'Meccan', numberOfAyahs: 40 },
        { number: 79, name: 'سُورَةُ النَّازِعَاتِ', englishName: 'An-Naazi\'aat', revelationType: 'Meccan', numberOfAyahs: 46 },
        { number: 80, name: 'سُورَةُ عَبَسَ', englishName: 'Abasa', revelationType: 'Meccan', numberOfAyahs: 42 },
        { number: 81, name: 'سُورَةُ التَّكْوِيرِ', englishName: 'At-Takwir', revelationType: 'Meccan', numberOfAyahs: 29 },
        { number: 82, name: 'سُورَةُ الاِنْفِطَارِ', englishName: 'Al-Infitaar', revelationType: 'Meccan', numberOfAyahs: 19 },
        { number: 83, name: 'سُورَةُ المُطَفِّفِينَ', englishName: 'Al-Mutaffifin', revelationType: 'Meccan', numberOfAyahs: 36 },
        { number: 84, name: 'سُورَةُ الاِنْشِقَاقِ', englishName: 'Al-Inshiqaaq', revelationType: 'Meccan', numberOfAyahs: 25 },
        { number: 85, name: 'سُورَةُ البُرُوجِ', englishName: 'Al-Burooj', revelationType: 'Meccan', numberOfAyahs: 22 },
        { number: 86, name: 'سُورَةُ الطَّارِقِ', englishName: 'At-Taariq', revelationType: 'Meccan', numberOfAyahs: 17 },
        { number: 87, name: 'سُورَةُ الأَعْلَىٰ', englishName: 'Al-A\'laa', revelationType: 'Meccan', numberOfAyahs: 19 },
        { number: 88, name: 'سُورَةُ الغَاشِيَةِ', englishName: 'Al-Ghaashiya', revelationType: 'Meccan', numberOfAyahs: 26 },
        { number: 89, name: 'سُورَةُ الفَجْرِ', englishName: 'Al-Fajr', revelationType: 'Meccan', numberOfAyahs: 30 },
        { number: 90, name: 'سُورَةُ البَلَدِ', englishName: 'Al-Balad', revelationType: 'Meccan', numberOfAyahs: 20 },
        { number: 91, name: 'سُورَةُ الشَّمْسِ', englishName: 'Ash-Shams', revelationType: 'Meccan', numberOfAyahs: 15 },
        { number: 92, name: 'سُورَةُ اللَّيْلِ', englishName: 'Al-Lail', revelationType: 'Meccan', numberOfAyahs: 21 },
        { number: 93, name: 'سُورَةُ الضُّحَىٰ', englishName: 'Ad-Dhuhaa', revelationType: 'Meccan', numberOfAyahs: 11 },
        { number: 94, name: 'سُورَةُ الشَّرْحِ', englishName: 'Ash-Sharh', revelationType: 'Meccan', numberOfAyahs: 8 },
        { number: 95, name: 'سُورَةُ التِّينِ', englishName: 'At-Tin', revelationType: 'Meccan', numberOfAyahs: 8 },
        { number: 96, name: 'سُورَةُ العَلَقِ', englishName: 'Al-Alaq', revelationType: 'Meccan', numberOfAyahs: 19 },
        { number: 97, name: 'سُورَةُ القَدْرِ', englishName: 'Al-Qadr', revelationType: 'Meccan', numberOfAyahs: 5 },
        { number: 98, name: 'سُورَةُ البَيِّنَةِ', englishName: 'Al-Bayyina', revelationType: 'Medinan', numberOfAyahs: 8 },
        { number: 99, name: 'سُورَةُ الزَّلْزَلَةِ', englishName: 'Az-Zalzala', revelationType: 'Medinan', numberOfAyahs: 8 },
        { number: 100, name: 'سُورَةُ العَادِيَاتِ', englishName: 'Al-Aadiyaat', revelationType: 'Meccan', numberOfAyahs: 11 },
        { number: 101, name: 'سُورَةُ القَارِعَةِ', englishName: 'Al-Qaari\'a', revelationType: 'Meccan', numberOfAyahs: 11 },
        { number: 102, name: 'سُورَةُ التَّكَاثُرِ', englishName: 'At-Takaathur', revelationType: 'Meccan', numberOfAyahs: 8 },
        { number: 103, name: 'سُورَةُ العَصْرِ', englishName: 'Al-Asr', revelationType: 'Meccan', numberOfAyahs: 3 },
        { number: 104, name: 'سُورَةُ الهُمَزَةِ', englishName: 'Al-Humaza', revelationType: 'Meccan', numberOfAyahs: 9 },
        { number: 105, name: 'سُورَةُ الفِيلِ', englishName: 'Al-Fil', revelationType: 'Meccan', numberOfAyahs: 5 },
        { number: 106, name: 'سُورَةُ قُرَيْشٍ', englishName: 'Quraish', revelationType: 'Meccan', numberOfAyahs: 4 },
        { number: 107, name: 'سُورَةُ المَاعُونِ', englishName: 'Al-Maa\'un', revelationType: 'Meccan', numberOfAyahs: 7 },
        { number: 108, name: 'سُورَةُ الكَوْثَرِ', englishName: 'Al-Kawthar', revelationType: 'Meccan', numberOfAyahs: 3 },
        { number: 109, name: 'سُورَةُ الكَافِرُونَ', englishName: 'Al-Kaafiroon', revelationType: 'Meccan', numberOfAyahs: 6 },
        { number: 110, name: 'سُورَةُ النَّصْرِ', englishName: 'An-Nasr', revelationType: 'Medinan', numberOfAyahs: 3 },
        { number: 111, name: 'سُورَةُ المَسَدِ', englishName: 'Al-Masad', revelationType: 'Meccan', numberOfAyahs: 5 },
        { number: 112, name: 'سُورَةُ الإِخْلاَصِ', englishName: 'Al-Ikhlaas', revelationType: 'Meccan', numberOfAyahs: 4 },
        { number: 113, name: 'سُورَةُ الفَلَقِ', englishName: 'Al-Falaq', revelationType: 'Meccan', numberOfAyahs: 5 },
        { number: 114, name: 'سُورَةُ النَّاسِ', englishName: 'An-Naas', revelationType: 'Meccan', numberOfAyahs: 6 }
    ];

    // ============================================
    // 4. قائمة القراء الشاملة (جميع الروايات أوفلاين)
    // ============================================
    const RECITERS_LIST = [
        // --- رواية ورش عن نافع ---
        {
            identifier: 'ar.elayounelkouchi',
            name: 'الشيخ العيون الكوشي',
            style: 'رواية ورش عن نافع — المغرب',
            rewayah: 'warsh',
            count: '114 سورة',
            getUrl: (num) => `https://server11.mp3quran.net/koshi/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.omarkabbaj',
            name: 'الشيخ عمر القزابري',
            style: 'رواية ورش عن نافع — المغرب',
            rewayah: 'warsh',
            count: '114 سورة',
            getUrl: (num) => `https://server9.mp3quran.net/omar_warsh/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.abdulbasitwarsh',
            name: 'الشيخ عبد الباسط عبد الصمد',
            style: 'رواية ورش عن نافع — مرتل',
            rewayah: 'warsh',
            count: '114 سورة',
            getUrl: (num) => `https://server7.mp3quran.net/basit/Rewayat-Warsh-A-n-Nafi/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.husarywarsh',
            name: 'الشيخ محمود خليل الحصري',
            style: 'رواية ورش عن نافع — مرتل',
            rewayah: 'warsh',
            count: '114 سورة',
            getUrl: (num) => `https://server13.mp3quran.net/husr/Rewayat-Warsh-A-n-Nafi/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.yaseenjazairi',
            name: 'الشيخ ياسين الجزائري',
            style: 'رواية ورش عن نافع — الجزائر',
            rewayah: 'warsh',
            count: '114 سورة',
            getUrl: (num) => `https://server11.mp3quran.net/qari/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.abdulazizsheim',
            name: 'الشيخ عبد العزيز سحيم',
            style: 'رواية ورش عن نافع — مرتل',
            rewayah: 'warsh',
            count: '114 سورة',
            getUrl: (num) => `https://server16.mp3quran.net/a_sheim/Rewayat-Warsh-A-n-Nafi/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.earawi',
            name: 'الشيخ محمد الأيراوي',
            style: 'رواية ورش عن نافع — طريق الأزرق',
            rewayah: 'warsh',
            count: '114 سورة',
            getUrl: (num) => `https://server6.mp3quran.net/earawi/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.ifrad',
            name: 'الشيخ رشيد إفراد',
            style: 'رواية ورش عن نافع — مرتل',
            rewayah: 'warsh',
            count: '114 سورة',
            getUrl: (num) => `https://server12.mp3quran.net/ifrad/${String(num).padStart(3, '0')}.mp3`
        },

        // --- رواية قالون عن نافع ---
        {
            identifier: 'ar.husaryqaloon',
            name: 'الشيخ محمود خليل الحصري',
            style: 'رواية قالون عن نافع — مرتل',
            rewayah: 'qaloon',
            count: '114 سورة',
            getUrl: (num) => `https://server13.mp3quran.net/husr/Rewayat-Qalon-A-n-Nafi/${String(num).padStart(3, '0')}.mp3`
        },

        // --- رواية الدوري عن أبي عمرو ---
        {
            identifier: 'ar.husaryduri',
            name: 'الشيخ محمود خليل الحصري',
            style: 'رواية الدوري عن أبي عمرو — مرتل',
            rewayah: 'duri',
            count: '114 سورة',
            getUrl: (num) => `https://server13.mp3quran.net/husr/Rewayat-Aldori-A-n-Abi-Amr/${String(num).padStart(3, '0')}.mp3`
        },

        // --- رواية حفص عن عاصم ---
        {
            identifier: 'ar.alafasy',
            name: 'الشيخ مشاري راشد العفاسي',
            style: 'رواية حفص عن عاصم — مرتل',
            rewayah: 'hafs',
            count: '114 سورة',
            getUrl: (num) => `https://server8.mp3quran.net/afs/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.abdulbasitmurattal',
            name: 'الشيخ عبد الباسط عبد الصمد',
            style: 'رواية حفص عن عاصم — مرتل',
            rewayah: 'hafs',
            count: '114 سورة',
            getUrl: (num) => `https://server7.mp3quran.net/basit/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.abdulbasitmujawwad',
            name: 'الشيخ عبد الباسط عبد الصمد',
            style: 'رواية حفص عن عاصم — مجود',
            rewayah: 'hafs',
            count: '114 سورة',
            getUrl: (num) => `https://server7.mp3quran.net/basit/Almusshaf-Al-Mojawwad/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.minshawi',
            name: 'الشيخ محمد صديق المنشاوي',
            style: 'رواية حفص عن عاصم — مرتل',
            rewayah: 'hafs',
            count: '114 سورة',
            getUrl: (num) => `https://server10.mp3quran.net/minsh/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.minshawimujawwad',
            name: 'الشيخ محمد صديق المنشاوي',
            style: 'رواية حفص عن عاصم — مجود',
            rewayah: 'hafs',
            count: '114 سورة',
            getUrl: (num) => `https://server10.mp3quran.net/minsh/Almusshaf-Al-Mojawwad/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.mahermuaiqly',
            name: 'الشيخ ماهر المعيقلي',
            style: 'إمام الحرم المكي الشريف',
            rewayah: 'hafs',
            count: '114 سورة',
            getUrl: (num) => `https://server12.mp3quran.net/maher/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.husary',
            name: 'الشيخ محمود خليل الحصري',
            style: 'رواية حفص عن عاصم — مرتل',
            rewayah: 'hafs',
            count: '114 سورة',
            getUrl: (num) => `https://server13.mp3quran.net/husr/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.yasseraddossari',
            name: 'الشيخ ياسر الدوسري',
            style: 'إمام الحرم المكي الشريف',
            rewayah: 'hafs',
            count: '114 سورة',
            getUrl: (num) => `https://server11.mp3quran.net/yasser/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.ghamadi',
            name: 'الشيخ سعد الغامدي',
            style: 'رواية حفص عن عاصم — مرتل',
            rewayah: 'hafs',
            count: '114 سورة',
            getUrl: (num) => `https://server7.mp3quran.net/s_gmd/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.ajamy',
            name: 'الشيخ أحمد بن علي العجمي',
            style: 'رواية حفص عن عاصم — مرتل',
            rewayah: 'hafs',
            count: '114 سورة',
            getUrl: (num) => `https://server10.mp3quran.net/ajm/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.shaatree',
            name: 'الشيخ أبو بكر الشاطري',
            style: 'رواية حفص عن عاصم — مرتل',
            rewayah: 'hafs',
            count: '114 سورة',
            getUrl: (num) => `https://server11.mp3quran.net/shatri/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.saoodshuraym',
            name: 'الشيخ سعود الشريم',
            style: 'إمام الحرم المكي الشريف السابق',
            rewayah: 'hafs',
            count: '114 سورة',
            getUrl: (num) => `https://server7.mp3quran.net/shur/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.hudhaify',
            name: 'الشيخ علي بن عبد الرحمن الحذيفي',
            style: 'إمام المسجد النبوي الشريف',
            rewayah: 'hafs',
            count: '114 سورة',
            getUrl: (num) => `https://server9.mp3quran.net/hthfi/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.muhammadayyub',
            name: 'الشيخ محمد أيوب',
            style: 'إمام المسجد النبوي الشريف السابق',
            rewayah: 'hafs',
            count: '114 سورة',
            getUrl: (num) => `https://server8.mp3quran.net/ayyub/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.hanirifai',
            name: 'الشيخ هاني الرفاعي',
            style: 'رواية حفص عن عاصم — مرتل',
            rewayah: 'hafs',
            count: '114 سورة',
            getUrl: (num) => `https://server8.mp3quran.net/hani/${String(num).padStart(3, '0')}.mp3`
        }
    ];

    function resolveReciter(reciterOrId) {
        if (!reciterOrId) return RECITERS_LIST[0];
        if (typeof reciterOrId === 'string') {
            return RECITERS_LIST.find(r => r.identifier === reciterOrId) || RECITERS_LIST[0];
        }
        if (reciterOrId.identifier) {
            const found = RECITERS_LIST.find(r => r.identifier === reciterOrId.identifier);
            if (found) return found;
        }
        return (typeof reciterOrId.getUrl === 'function') ? reciterOrId : RECITERS_LIST[0];
    }

    function getAudioUrlForSurah(reciter, surahNumber) {
        const r = resolveReciter(reciter);
        if (typeof r.getUrl === 'function') {
            return r.getUrl(surahNumber);
        }
        return `https://server11.mp3quran.net/koshi/${String(surahNumber).padStart(3, '0')}.mp3`;
    }

    let selectedReciter = (function() {
        try {
            const saved = localStorage.getItem('selectedReciter');
            if (saved) {
                const parsed = JSON.parse(saved);
                return resolveReciter(parsed);
            }
        } catch (e) {}
        return RECITERS_LIST[0];
    })();
    let favoritesSurahs = JSON.parse(localStorage.getItem('favAudioSurahs')) || [];

    // ============================================
    // 5. عناصر الواجهة الرئيسية
    // ============================================
    const recitersView = document.getElementById('recitersView');
    const surahsView = document.getElementById('surahsView');
    const reciterSearchInput = document.getElementById('reciterSearchInput');
    const reciterSearchClear = document.getElementById('reciterSearchClear');
    const rewayahChips = document.querySelectorAll('.rewayah-chip');
    const recitersCardsGrid = document.getElementById('recitersCardsGrid');

    const backToRecitersBtn = document.getElementById('backToRecitersBtn');
    const selectedReciterName = document.getElementById('selectedReciterName');
    const selectedReciterStyle = document.getElementById('selectedReciterStyle');

    const surahSearchInput = document.getElementById('surahSearchInput');
    const surahSearchClear = document.getElementById('surahSearchClear');
    const filterChips = document.querySelectorAll('.chip');
    const statsText = document.getElementById('statsText');
    const loadingState = document.getElementById('loadingState');
    const surahsGrid = document.getElementById('surahsGrid');
    const noResults = document.getElementById('noResults');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    // المشغل المصغر
    const globalAudioPlayer = document.getElementById('globalAudioPlayer');
    const miniProgressBar = document.getElementById('miniProgressBar');
    const miniProgressFill = document.getElementById('miniProgressFill');
    const playerDiscIcon = document.getElementById('playerDiscIcon');
    const playerSurahTitle = document.getElementById('playerSurahTitle');
    const playerReciterSub = document.getElementById('playerReciterSub');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playPauseIcon = document.getElementById('playPauseIcon');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const expandPlayerBtn = document.getElementById('expandPlayerBtn');
    const playerExpandTrigger = document.getElementById('playerExpandTrigger');

    // المشغل المتوسع
    const fullPlayerModal = document.getElementById('fullPlayerModal');
    const closeFullPlayerBtn = document.getElementById('closeFullPlayerBtn');
    const fullSurahTitle = document.getElementById('fullSurahTitle');
    const fullReciterName = document.getElementById('fullReciterName');
    const offlinePlayingBadge = document.getElementById('offlinePlayingBadge');
    const seekSlider = document.getElementById('seekSlider');
    const currentTimeText = document.getElementById('currentTimeText');
    const durationTimeText = document.getElementById('durationTimeText');

    const fullPlayPauseBtn = document.getElementById('fullPlayPauseBtn');
    const fullPlayPauseIcon = document.getElementById('fullPlayPauseIcon');
    const repeatModeBtn = document.getElementById('repeatModeBtn');
    const skipBackBtn = document.getElementById('skipBackBtn');
    const skipForwardBtn = document.getElementById('skipForwardBtn');
    const speedToggleBtn = document.getElementById('speedToggleBtn');
    const speedLabel = document.getElementById('speedLabel');
    const muteBtn = document.getElementById('muteBtn');
    const muteIcon = document.getElementById('muteIcon');
    const volumeSlider = document.getElementById('volumeSlider');

    const toggleAyahTextBtn = document.getElementById('toggleAyahTextBtn');
    const ayahTextContainer = document.getElementById('ayahTextContainer');
    const ayahCountBadge = document.getElementById('ayahCountBadge');
    const ayahTextScroll = document.getElementById('ayahTextScroll');

    // متغيرات بيانات التشغيل
    let allSurahs = SURAH_INDEX_OFFLINE;
    let currentSurahIndex = 0; // 0..113
    let isPlaying = false;
    let isAudioBuffering = false;
    let isRepeatOne = false;
    let playbackSpeeds = [1.0, 1.25, 1.5, 2.0, 0.75];
    let currentSpeedIndex = 0;
    let activeRewayah = 'all';
    let activeFilter = 'all';
    let currentAyahsData = null;
    let currentPlayingSurahNumber = null;
    let hasTriedAudioFallback = false;

    // ============================================
    // 6. عرض بطاقات القراء (أوفلاين ومع الفلترة)
    // ============================================
    function renderRecitersCards() {
        const query = (reciterSearchInput?.value || '').trim().toLowerCase();
        if (reciterSearchClear) reciterSearchClear.style.display = query.length > 0 ? 'block' : 'none';

        recitersCardsGrid.innerHTML = '';

        const filtered = RECITERS_LIST.filter(reciter => {
            const matchesQuery = 
                reciter.name.toLowerCase().includes(query) || 
                reciter.style.toLowerCase().includes(query);

            if (!matchesQuery) return false;

            if (activeRewayah === 'all') return true;
            if (activeRewayah === 'downloaded') {
                return Array.from(downloadedKeysSet).some(key => key.startsWith(`${reciter.identifier}_`));
            }
            return reciter.rewayah === activeRewayah;
        });

        if (filtered.length === 0) {
            recitersCardsGrid.innerHTML = `
                <div style="text-align:center; padding:30px; grid-column:1/-1; color:var(--color-text-light);">
                    <i class="fa-solid fa-user-slash" style="font-size:32px; color:var(--color-primary); margin-bottom:10px;"></i>
                    <p>لم نجد أي قارئ يطابق الفلتر أو البحث الحالية.</p>
                </div>
            `;
            return;
        }

        filtered.forEach(reciter => {
            const isSelected = (reciter.identifier === selectedReciter.identifier);
            
            // حساب عدد السور المحملة لهذا القارئ
            const downloadedCount = Array.from(downloadedKeysSet).filter(key => key.startsWith(`${reciter.identifier}_`)).length;

            const card = document.createElement('div');
            card.className = `reciter-card ${isSelected ? 'active-reciter' : ''}`;

            card.innerHTML = `
                <div class="reciter-card-main">
                    <div class="reciter-avatar-box">
                        <i class="fa-solid fa-microphone-lines"></i>
                    </div>
                    <div class="reciter-card-details">
                        <h3 class="reciter-card-name">${escapeHtml(reciter.name)}</h3>
                        <span class="reciter-card-style">${escapeHtml(reciter.style)}</span>
                        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:2px;">
                            <span class="reciter-card-badge"><i class="fa-solid fa-book-quran"></i> ${reciter.count}</span>
                            ${downloadedCount > 0 ? `<span class="surah-offline-tag"><i class="fa-solid fa-hard-drive"></i> ${downloadedCount} محملة</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="reciter-card-action">
                    <button class="open-surahs-btn">
                        <span>عرض السور</span>
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                </div>
            `;

            card.addEventListener('click', () => {
                selectReciterAndOpenSurahs(reciter);
            });

            recitersCardsGrid.appendChild(card);
        });
    }

    function selectReciterAndOpenSurahs(reciter) {
        selectedReciter = reciter;
        localStorage.setItem('selectedReciter', JSON.stringify(selectedReciter));

        selectedReciterName.textContent = selectedReciter.name;
        selectedReciterStyle.textContent = selectedReciter.style;
        playerReciterSub.textContent = selectedReciter.name;
        fullReciterName.textContent = selectedReciter.name;

        // الانتقال بقائمة السور مع إضافة حالة لزر الرجوع في الأندرويد
        history.pushState({ view: 'surahs', reciterId: reciter.identifier }, '');
        recitersView.style.display = 'none';
        surahsView.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });

        renderSurahs();
    }

    // زر العودة لقائمة القراء
    if (backToRecitersBtn) {
        backToRecitersBtn.addEventListener('click', () => {
            if (history.state && history.state.view === 'surahs') {
                history.back();
            } else {
                surahsView.style.display = 'none';
                recitersView.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    // دعم زر الرجوع في الأندرويد/المتصفح
    window.addEventListener('popstate', (e) => {
        if (surahsView.style.display === 'block' && (!e.state || e.state.view !== 'surahs')) {
            surahsView.style.display = 'none';
            recitersView.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    if (reciterSearchInput) {
        reciterSearchInput.addEventListener('input', renderRecitersCards);
    }
    if (reciterSearchClear) {
        reciterSearchClear.addEventListener('click', () => {
            reciterSearchInput.value = '';
            renderRecitersCards();
        });
    }

    rewayahChips.forEach(chip => {
        chip.addEventListener('click', () => {
            rewayahChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeRewayah = chip.getAttribute('data-rewayah');
            renderRecitersCards();
        });
    });

    // ============================================
    // 7. عرض السور وإدارتها مع التنزيل الأوفلاين
    // ============================================
    function renderSurahs() {
        if (loadingState) loadingState.style.display = 'none';

        const query = (surahSearchInput?.value || '').trim().toLowerCase();
        if (surahSearchClear) surahSearchClear.style.display = query.length > 0 ? 'block' : 'none';

        let filtered = allSurahs.filter(surah => {
            const name = (surah.name || '').toLowerCase();
            const englishName = (surah.englishName || '').toLowerCase();
            const number = String(surah.number);

            const matchesQuery = name.includes(query) || englishName.includes(query) || number === query;
            if (!matchesQuery) return false;

            const isDownloaded = downloadedKeysSet.has(`${selectedReciter.identifier}_${surah.number}`);

            if (activeFilter === 'makkiah') return surah.revelationType === 'Meccan';
            if (activeFilter === 'madaniyah') return surah.revelationType === 'Medinan';
            if (activeFilter === 'favorites') return favoritesSurahs.includes(`${selectedReciter.identifier}_${surah.number}`);
            if (activeFilter === 'downloaded') return isDownloaded;

            return true;
        });

        if (filtered.length === 0) {
            surahsGrid.style.display = 'none';
            noResults.style.display = 'block';
            statsText.textContent = 'لم نجد أي نتائج للفلتر الحالية';
            return;
        }

        noResults.style.display = 'none';
        surahsGrid.style.display = 'flex';
        surahsGrid.innerHTML = '';

        statsText.textContent = `عرض ${filtered.length} سورة للشيخ ${selectedReciter.name}`;

            filtered.forEach(surah => {
                const isCurrentPlaying = (currentSurahIndex === surah.number - 1);
                const isFav = favoritesSurahs.includes(`${selectedReciter.identifier}_${surah.number}`);
                const isDownloaded = downloadedKeysSet.has(`${selectedReciter.identifier}_${surah.number}`);
                const revTypeText = surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية';

                let playIconClass = 'fa-play';
                if (isCurrentPlaying) {
                    if (isAudioBuffering) {
                        playIconClass = 'fa-spinner spin';
                    } else if (isPlaying) {
                        playIconClass = 'fa-pause';
                    }
                }

                const card = document.createElement('div');
                card.className = `surah-card ${isCurrentPlaying ? 'active-playing' : ''}`;

                card.innerHTML = `
                    <div class="surah-card-right">
                        <div class="surah-num-badge">${surah.number}</div>
                        <div class="surah-info">
                            <h3 class="surah-name">${escapeHtml(surah.name)}</h3>
                            <div class="surah-meta">
                                <span><i class="fa-solid fa-kaaba"></i> ${revTypeText}</span>
                                <span>•</span>
                                <span>${surah.numberOfAyahs} آية</span>
                                ${isDownloaded ? '<span class="surah-offline-tag"><i class="fa-solid fa-hard-drive"></i> أوفلاين</span>' : ''}
                            </div>
                        </div>
                    </div>
                    <div class="surah-actions">
                        <button class="download-surah-btn ${isDownloaded ? 'downloaded' : ''}" data-number="${surah.number}" title="${isDownloaded ? 'محملة أوفلاين - اضغط للحذف' : 'تحميل للاستماع بدون نت'}">
                            <i class="fa-solid ${isDownloaded ? 'fa-circle-check' : 'fa-download'}"></i>
                        </button>
                        <button class="fav-surah-btn ${isFav ? 'active' : ''}" data-number="${surah.number}" title="المفضلة">
                            <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                        </button>
                        <button class="play-surah-btn" data-number="${surah.number}" title="استماع">
                            <i class="fa-solid ${playIconClass}"></i>
                        </button>
                    </div>
                `;

            // زر التنزيل/الحذف أوفلاين
            const downloadBtn = card.querySelector('.download-surah-btn');
            downloadBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (isDownloaded) {
                    if (confirm(`هل ترغب في حذف سورة ${surah.name} بصوت ${selectedReciter.name} من التخزين أوفلاين؟`)) {
                        await QuranAudioDB.deleteAudio(selectedReciter.identifier, surah.number);
                        downloadedKeysSet.delete(`${selectedReciter.identifier}_${surah.number}`);
                        showToast(`تم حذف سورة ${surah.name} من الذاكرة المحلية`);
                        renderSurahs();
                        renderRecitersCards();
                    }
                } else {
                    downloadSurahAudio(surah.number, downloadBtn);
                }
            });

            // زر الاستماع
            card.querySelector('.play-surah-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (isCurrentPlaying && isPlaying) {
                    pauseAudio();
                } else {
                    playSurahByIndex(surah.number - 1);
                }
            });

            // المفضلة
            card.querySelector('.fav-surah-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavoriteSurah(surah.number);
            });

            card.addEventListener('click', () => {
                playSurahByIndex(surah.number - 1);
            });

            surahsGrid.appendChild(card);
        });
    }

    async function downloadSurahAudio(surahNumber, btnEl) {
        const surah = allSurahs[surahNumber - 1] || { number: surahNumber, name: `سورة رقم ${surahNumber}` };
        const audioUrl = getAudioUrlForSurah(selectedReciter, surahNumber);

        if (btnEl) {
            btnEl.classList.add('downloading');
            btnEl.innerHTML = '<span class="download-progress-text">0%</span>';
            btnEl.title = 'جاري التحميل...';
        }

        showToast(`جاري تنزيل سورة ${surah.name} بصوت ${selectedReciter.name}...`);

        try {
            let response;
            try {
                // المحاولة المباشرة أولاً
                response = await fetch(audioUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
            } catch (directErr) {
                console.warn('Direct audio fetch failed or blocked by CORS, trying server proxy:', directErr);
                // محاولة التنزيل عبر خادم الوكيل لتجاوز حظر CORS وقيود الشبكة
                const proxyUrl = `/api/proxy-audio?url=${encodeURIComponent(audioUrl)}`;
                response = await fetch(proxyUrl);
                if (!response.ok) throw new Error(`Proxy HTTP ${response.status}`);
            }

            const contentLengthHeader = response.headers.get('content-length');
            const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

            let blob;
            if (response.body && totalBytes > 0) {
                const reader = response.body.getReader();
                const chunks = [];
                let receivedBytes = 0;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                    receivedBytes += value.length;
                    const percent = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
                    if (btnEl) {
                        btnEl.innerHTML = `<span class="download-progress-text">${percent}%</span>`;
                    }
                }
                blob = new Blob(chunks, { type: 'audio/mpeg' });
            } else {
                // محاكاة تدريجية في حال غياب رأس الحجم
                let fakeProgress = 15;
                const interval = setInterval(() => {
                    if (fakeProgress < 90) {
                        fakeProgress += Math.floor(Math.random() * 15) + 5;
                        if (btnEl) btnEl.innerHTML = `<span class="download-progress-text">${fakeProgress}%</span>`;
                    }
                }, 200);
                blob = await response.blob();
                clearInterval(interval);
            }

            if (btnEl) {
                btnEl.innerHTML = `<span class="download-progress-text">100%</span>`;
            }

            await QuranAudioDB.saveAudio(selectedReciter.identifier, surahNumber, blob, {
                reciterName: selectedReciter.name,
                surahName: surah.name,
                rewayah: selectedReciter.rewayah
            });

            downloadedKeysSet.add(`${selectedReciter.identifier}_${surahNumber}`);

            showToast(`تم تحميل سورة ${surah.name} بنجاح للعمل بدون نت! ✨`);
            renderSurahs();
            renderRecitersCards();
        } catch (err) {
            console.error('فشل تحميل السورة أوفلاين:', err);
            showToast('تعذر تنزيل السورة. يرجى التحقق من اتصال الإنترنت أو المحاولة لاحقاً.');
            if (btnEl) {
                btnEl.classList.remove('downloading');
                btnEl.innerHTML = '<i class="fa-solid fa-arrow-down-to-bracket"></i>';
                btnEl.title = 'تحميل للاستماع بدون نت';
            }
        }
    }

    function toggleFavoriteSurah(surahNum) {
        const favKey = `${selectedReciter.identifier}_${surahNum}`;
        if (favoritesSurahs.includes(favKey)) {
            favoritesSurahs = favoritesSurahs.filter(k => k !== favKey);
            showToast('تمت إزالة السورة من المفضلة');
        } else {
            favoritesSurahs.push(favKey);
            showToast('تمت إضافة السورة إلى المفضلة');
        }
        localStorage.setItem('favAudioSurahs', JSON.stringify(favoritesSurahs));
        renderSurahs();
    }

    // ============================================
    // 8. تشغيل الصوت والتحكم الرئيسي (أوفلاين وأونلاين)
    // ============================================
    let currentAudioSessionId = 0;

    async function playSurahByIndex(index) {
        if (index < 0 || (allSurahs.length > 0 && index >= allSurahs.length)) return;

        const sessionId = ++currentAudioSessionId;
        currentSurahIndex = index;
        const surah = allSurahs[currentSurahIndex] || { number: index + 1, name: `سورة رقم ${index + 1}` };
        currentPlayingSurahNumber = surah.number;
        hasTriedAudioFallback = false;

        const sources = [];

        // 1. فحص هل السورة محملة في الذاكرة المحلية أوفلاين
        try {
            const cachedItem = await QuranAudioDB.getAudio(selectedReciter.identifier, surah.number);
            if (cachedItem && cachedItem.blob && cachedItem.blob.size > 1000) {
                const blobUrl = URL.createObjectURL(cachedItem.blob);
                sources.push({ url: blobUrl, isOffline: true });
            }
        } catch (e) {
            console.warn('تنبيه قراءة الذاكرة الأوفلاين:', e);
        }

        // 2. مصادر الشبكة
        const primaryUrl = getAudioUrlForSurah(selectedReciter, surah.number) || `https://server11.mp3quran.net/koshi/${String(surah.number).padStart(3, '0')}.mp3`;
        sources.push({ url: primaryUrl, isOffline: false });
        sources.push({ url: `/api/proxy-audio?url=${encodeURIComponent(primaryUrl)}`, isOffline: false });
        
        // خوادم بديلة عالية الموثوقية
        const fallbackCdn = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${surah.number}.mp3`;
        sources.push({ url: fallbackCdn, isOffline: false });
        sources.push({ url: `/api/proxy-audio?url=${encodeURIComponent(fallbackCdn)}`, isOffline: false });

        setupMediaSession(surah);
        fetchAyahsTextForPlayer(surah.number);

        executeAudioSourceChain(sources, 0, sessionId, surah);
    }

    function executeAudioSourceChain(sources, sourceIdx, sessionId, surah) {
        if (sessionId !== currentAudioSessionId) return;

        if (sourceIdx >= sources.length) {
            isAudioBuffering = false;
            isPlaying = false;
            updatePlayerUI();
            if (!navigator.onLine) {
                showToast('أنت أوفلاين وهذه السورة غير محملة، يرجى الاتصال بالإنترنت.');
            } else {
                showToast('تعذر تحميل المصدر الصوتي حالياً، يرجى المحاولة لاحقاً.');
            }
            return;
        }

        const source = sources[sourceIdx];
        if (offlinePlayingBadge) {
            offlinePlayingBadge.style.display = source.isOffline ? 'inline-flex' : 'none';
        }

        if (source.isOffline && sourceIdx === 0) {
            showToast(`تشغيل سورة ${surah.name} من الذاكرة (بدون نت)`);
        }

        isPlaying = true;
        isAudioBuffering = !source.isOffline;
        updatePlayerUI();

        try {
            globalAudioPlayer.pause();
        } catch (e) {}

        globalAudioPlayer.src = source.url;

        let hasHandledAttempt = false;
        function tryNextSource() {
            if (hasHandledAttempt) return;
            hasHandledAttempt = true;
            if (sessionId !== currentAudioSessionId) return;
            executeAudioSourceChain(sources, sourceIdx + 1, sessionId, surah);
        }

        const playPromise = globalAudioPlayer.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                if (sessionId !== currentAudioSessionId) {
                    try { globalAudioPlayer.pause(); } catch (e) {}
                    return;
                }
                isAudioBuffering = false;
                isPlaying = true;
                updatePlayerUI();
            }).catch(err => {
                if (err.name === 'AbortError' || (err.message && err.message.includes('interrupted'))) {
                    return;
                }
                tryNextSource();
            });
        }
    }

    function pauseAudio() {
        try {
            globalAudioPlayer.pause();
        } catch (e) {}
        isAudioBuffering = false;
        isPlaying = false;
        updatePlayerUI();
    }

    function resumeAudio() {
        if (!globalAudioPlayer.src) {
            playSurahByIndex(0);
            return;
        }
        isAudioBuffering = true;
        updatePlayerUI();
        const playPromise = globalAudioPlayer.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isAudioBuffering = false;
                isPlaying = true;
                updatePlayerUI();
            }).catch(err => {
                if (err.name === 'AbortError' || (err.message && err.message.includes('interrupted'))) return;
                isAudioBuffering = false;
                isPlaying = false;
                updatePlayerUI();
            });
        }
    }

    function togglePlayPause() {
        if (isPlaying) {
            pauseAudio();
        } else {
            resumeAudio();
        }
    }

    function updatePlayerUI() {
        const surah = allSurahs[currentSurahIndex] || { name: 'سورة الفاتحة' };

        if (playerSurahTitle) playerSurahTitle.textContent = surah.name;
        if (fullSurahTitle) fullSurahTitle.textContent = surah.name;
        if (playerReciterSub) playerReciterSub.textContent = selectedReciter.name;
        if (fullReciterName) fullReciterName.textContent = selectedReciter.name;

        let iconClass = 'fa-play';
        if (isAudioBuffering) {
            iconClass = 'fa-spinner spin';
            if (playerDiscIcon) playerDiscIcon.classList.add('playing');
        } else if (isPlaying) {
            iconClass = 'fa-pause';
            if (playerDiscIcon) playerDiscIcon.classList.add('playing');
        } else {
            iconClass = 'fa-play';
            if (playerDiscIcon) playerDiscIcon.classList.remove('playing');
        }

        if (playPauseIcon) playPauseIcon.className = `fa-solid ${iconClass}`;
        if (fullPlayPauseIcon) fullPlayPauseIcon.className = `fa-solid ${iconClass}`;

        if (window.Fur9anBridge && typeof window.Fur9anBridge.updateMediaNotification === 'function') {
            window.Fur9anBridge.updateMediaNotification(surah.name, selectedReciter.name, isPlaying && !isAudioBuffering);
        }

        renderSurahs();
    }

    // ============================================
    // 9. جلب النص القرآني المتزامن للسورة
    // ============================================
    async function fetchAyahsTextForPlayer(surahNumber) {
        if (!ayahTextContainer) return;

        const cacheKey = `quran_ayahs_text_${surahNumber}`;
        const cachedText = localStorage.getItem(cacheKey);

        if (cachedText) {
            try {
                const ayahs = JSON.parse(cachedText);
                renderAyahsTextHTML(surahNumber, ayahs);
                return;
            } catch (e) {
                localStorage.removeItem(cacheKey);
            }
        }

        if (ayahTextScroll) {
            ayahTextScroll.innerHTML = '<p class="loading-ayahs-note"><i class="fa-solid fa-spinner spin"></i> جاري تحميل النص القرآني...</p>';
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            const data = await res.json();

            if (data.code === 200 && data.data && data.data.ayahs) {
                currentAyahsData = data.data.ayahs;
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(currentAyahsData));
                } catch (e) {}
                renderAyahsTextHTML(surahNumber, currentAyahsData);
            }
        } catch (e) {
            if (!currentAyahsData || currentAyahsData.length === 0) {
                if (ayahTextScroll) {
                    ayahTextScroll.innerHTML = '<p class="loading-ayahs-note">النص المكتوب متاح عند الاتصال بالإنترنت.</p>';
                }
            }
        }
    }

    function renderAyahsTextHTML(surahNumber, ayahsData) {
        currentAyahsData = ayahsData;
        if (ayahCountBadge) ayahCountBadge.textContent = `${currentAyahsData.length} آية`;

        let html = '';
        if (surahNumber !== 1 && surahNumber !== 9) {
            html += '<div style="text-align:center; font-size:22px; margin-bottom:12px; color:var(--color-primary);">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>';
        }

        currentAyahsData.forEach((ayah, i) => {
            let text = ayah.text;
            if (surahNumber !== 1 && i === 0 && text.startsWith('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ')) {
                text = text.replace('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', '').trim();
            }

            html += `<span class="ayah-unit" id="ayahUnit_${i}">${escapeHtml(text)} <span class="ayah-badge-num">${ayah.numberInSurah}</span></span> `;
        });

        if (ayahTextScroll) ayahTextScroll.innerHTML = html;
    }

    function updateSynchronizedAyahHighlighting() {
        if (!currentAyahsData || !currentAyahsData.length || !globalAudioPlayer.duration) return;

        // Add a slight forward offset (e.g. 0.5s or 1% progress) so it never lags behind the reciter
        const currentTime = Math.min(globalAudioPlayer.currentTime + 0.3, globalAudioPlayer.duration);
        const duration = globalAudioPlayer.duration;
        const progress = Math.min(Math.max(currentTime / duration, 0), 1);

        // Calculate character lengths for proportional timing per ayah
        const lengths = currentAyahsData.map(a => (a.text ? a.text.length : 15));
        const totalLen = lengths.reduce((acc, l) => acc + l, 0);
        const targetLen = progress * totalLen;

        let cumulative = 0;
        let activeAyahIndex = 0;
        for (let i = 0; i < lengths.length; i++) {
            cumulative += lengths[i];
            if (targetLen <= cumulative) {
                activeAyahIndex = i;
                break;
            }
            activeAyahIndex = i;
        }

        activeAyahIndex = Math.min(Math.max(activeAyahIndex, 0), currentAyahsData.length - 1);

        document.querySelectorAll('.ayah-unit').forEach((el, idx) => {
            if (idx === activeAyahIndex) {
                if (!el.classList.contains('active-verse')) {
                    el.classList.add('active-verse');
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else {
                el.classList.remove('active-verse');
            }
        });
    }

    // ============================================
    // 10. تحديث شريط التمرير والوقت وأحداث المشغل
    // ============================================
    globalAudioPlayer.addEventListener('waiting', () => {
        isAudioBuffering = true;
        updatePlayerUI();
    });

    globalAudioPlayer.addEventListener('playing', () => {
        isAudioBuffering = false;
        isPlaying = true;
        updatePlayerUI();
    });

    globalAudioPlayer.addEventListener('pause', () => {
        isAudioBuffering = false;
        isPlaying = false;
        updatePlayerUI();
    });

    globalAudioPlayer.addEventListener('error', (e) => {
        // يتم التعامل مع الانتقال بين المصادر البديلة بسلاسة داخل executeAudioSourceChain
        isAudioBuffering = false;
        isPlaying = false;
        updatePlayerUI();
    });

    globalAudioPlayer.addEventListener('timeupdate', () => {
        const current = globalAudioPlayer.currentTime || 0;
        const duration = globalAudioPlayer.duration || 0;

        if (duration > 0) {
            const percent = (current / duration) * 100;
            if (miniProgressFill) miniProgressFill.style.width = `${percent}%`;
            if (seekSlider) seekSlider.value = percent;

            if (currentTimeText) currentTimeText.textContent = formatTime(current);
            if (durationTimeText) durationTimeText.textContent = formatTime(duration);

            updateSynchronizedAyahHighlighting();

            if ('mediaSession' in navigator && typeof navigator.mediaSession.setPositionState === 'function') {
                try {
                    navigator.mediaSession.setPositionState({
                        duration: duration,
                        playbackRate: globalAudioPlayer.playbackRate,
                        position: current
                    });
                } catch (e) {}
            }
        }
    });

    globalAudioPlayer.addEventListener('ended', () => {
        if (isRepeatOne) {
            playSurahByIndex(currentSurahIndex);
        } else {
            if (currentSurahIndex < allSurahs.length - 1) {
                playSurahByIndex(currentSurahIndex + 1);
            } else {
                pauseAudio();
            }
        }
    });

    if (seekSlider) {
        seekSlider.addEventListener('input', () => {
            if (globalAudioPlayer.duration) {
                const newTime = (seekSlider.value / 100) * globalAudioPlayer.duration;
                globalAudioPlayer.currentTime = newTime;
            }
        });
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // ============================================
    // 11. أزرار التحكم
    // ============================================
    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
    if (fullPlayPauseBtn) fullPlayPauseBtn.addEventListener('click', togglePlayPause);

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentSurahIndex > 0) playSurahByIndex(currentSurahIndex - 1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentSurahIndex < allSurahs.length - 1) playSurahByIndex(currentSurahIndex + 1);
        });
    }

    if (skipBackBtn) {
        skipBackBtn.addEventListener('click', () => {
            globalAudioPlayer.currentTime = Math.max(0, globalAudioPlayer.currentTime - 10);
        });
    }

    if (skipForwardBtn) {
        skipForwardBtn.addEventListener('click', () => {
            globalAudioPlayer.currentTime = Math.min(globalAudioPlayer.duration || 0, globalAudioPlayer.currentTime + 10);
        });
    }

    if (repeatModeBtn) {
        repeatModeBtn.addEventListener('click', () => {
            isRepeatOne = !isRepeatOne;
            repeatModeBtn.classList.toggle('active', isRepeatOne);
            showToast(isRepeatOne ? 'تم تفعيل تكرار السورة' : 'تم إلغاء تكرار السورة');
        });
    }

    if (speedToggleBtn) {
        speedToggleBtn.addEventListener('click', () => {
            currentSpeedIndex = (currentSpeedIndex + 1) % playbackSpeeds.length;
            const newSpeed = playbackSpeeds[currentSpeedIndex];
            globalAudioPlayer.playbackRate = newSpeed;
            if (speedLabel) speedLabel.textContent = `${newSpeed}x`;
            showToast(`سرعة التشغيل: ${newSpeed}x`);
        });
    }

    if (volumeSlider) {
        volumeSlider.addEventListener('input', () => {
            globalAudioPlayer.volume = volumeSlider.value;
            if (muteIcon) {
                muteIcon.className = volumeSlider.value == 0 ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
            }
        });
    }

    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            globalAudioPlayer.muted = !globalAudioPlayer.muted;
            if (muteIcon) {
                muteIcon.className = globalAudioPlayer.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
            }
        });
    }

    // ============================================
    // 12. فتح وإغلاق المشغل المتوسع
    // ============================================
    function openFullPlayer() {
        if (fullPlayerModal) fullPlayerModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeFullPlayer() {
        if (fullPlayerModal) fullPlayerModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (expandPlayerBtn) expandPlayerBtn.addEventListener('click', openFullPlayer);
    if (playerExpandTrigger) playerExpandTrigger.addEventListener('click', openFullPlayer);
    if (closeFullPlayerBtn) closeFullPlayerBtn.addEventListener('click', closeFullPlayer);

    // ============================================
    // 13. الفلترة والبحث
    // ============================================
    if (surahSearchInput) surahSearchInput.addEventListener('input', renderSurahs);
    if (surahSearchClear) {
        surahSearchClear.addEventListener('click', () => {
            surahSearchInput.value = '';
            renderSurahs();
        });
    }
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            surahSearchInput.value = '';
            activeFilter = 'all';
            filterChips.forEach(c => c.classList.remove('active'));
            filterChips[0].classList.add('active');
            renderSurahs();
        });
    }

    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.getAttribute('data-filter');
            renderSurahs();
        });
    });

    // ============================================
    // 14. MediaSession
    // ============================================
    function setupMediaSession(surah) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: `سورة ${surah.name}`,
                artist: `${selectedReciter.name}`,
                album: 'الفرقان - التلاوات القرآنية',
                artwork: [
                    { src: '/data/images/logo.png', sizes: '192x192', type: 'image/png' }
                ]
            });

            navigator.mediaSession.setActionHandler('play', resumeAudio);
            navigator.mediaSession.setActionHandler('pause', pauseAudio);
            navigator.mediaSession.setActionHandler('previoustrack', () => {
                if (currentSurahIndex > 0) playSurahByIndex(currentSurahIndex - 1);
            });
            navigator.mediaSession.setActionHandler('nexttrack', () => {
                if (currentSurahIndex < allSurahs.length - 1) playSurahByIndex(currentSurahIndex + 1);
            });
            navigator.mediaSession.setActionHandler('seekbackward', (details) => {
                globalAudioPlayer.currentTime = Math.max(0, globalAudioPlayer.currentTime - (details.seekOffset || 10));
            });
            navigator.mediaSession.setActionHandler('seekforward', (details) => {
                globalAudioPlayer.currentTime = Math.min(globalAudioPlayer.duration || 0, globalAudioPlayer.currentTime + (details.seekOffset || 10));
            });
            try {
                navigator.mediaSession.setActionHandler('seekto', (details) => {
                    if (details.seekTime !== undefined && globalAudioPlayer.duration) {
                        globalAudioPlayer.currentTime = details.seekTime;
                    }
                });
            } catch (e) {}
        }
    }

    // ============================================
    // 15. التوست
    // ============================================
    function showToast(msg) {
        let container = document.getElementById('toastContainer');
        if (!container) return;
        container.innerHTML = '';
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--color-herbal)"></i> <span>${msg}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.25s ease forwards';
            setTimeout(() => toast.remove(), 250);
        }, 2200);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // البدء بعرض بطاقات القراء
    renderRecitersCards();

    // تصدير واجهة التحكم بالصوت من أجل جسر الأندرويد ليعمل بشكل متكامل
    window.Fur9anAudio = {
        get isPlaying() {
            const player = document.getElementById('globalAudioPlayer');
            return player ? !player.paused : false;
        },
        togglePlay: function() {
            togglePlayPause();
        },
        nextSurah: function() {
            if (currentSurahIndex !== undefined && typeof currentSurahIndex === 'number' && allSurahs && currentSurahIndex < allSurahs.length - 1) {
                playSurahByIndex(currentSurahIndex + 1);
            }
        },
        prevSurah: function() {
            if (currentSurahIndex !== undefined && typeof currentSurahIndex === 'number' && currentSurahIndex > 0) {
                playSurahByIndex(currentSurahIndex - 1);
            }
        }
    };
});
