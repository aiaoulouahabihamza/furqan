/**
 * منصة الفرقان - المحرك الموحد لمشغل الصوت والتلاوات القرآنية
 * يعمل باستمرار عبر كافة صفحات التطبيق (الصفحة الرئيسية، الصلاة، الأذكار، إلخ)
 * مع دعم التشغيل دون إنترنت 100% من IndexedDB، والمزامنة الذكية مع زر الرجوع
 */

(function () {
    'use strict';

    // 1. قاعدة البيانات المحلية أوفلاين للصوتيات
    const AudioDB = {
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

        async getAudio(reciterId, surahNumber) {
            try {
                const db = await this.getDB();
                return new Promise((resolve) => {
                    const tx = db.transaction(this.storeName, 'readonly');
                    const store = tx.objectStore(this.storeName);
                    const request = store.get(`${reciterId}_${surahNumber}`);
                    request.onsuccess = (e) => resolve(e.target.result || null);
                    request.onerror = () => resolve(null);
                });
            } catch (e) {
                return null;
            }
        }
    };

    // 2. فهرس السور القرآنية (114 سورة)
    const SURAHS = [
        { number: 1, name: 'سُورَةُ الفَاتِحَةِ', numberOfAyahs: 7 },
        { number: 2, name: 'سُورَةُ البَقَرَةِ', numberOfAyahs: 286 },
        { number: 3, name: 'سُورَةُ آلِ عِمْرَانَ', numberOfAyahs: 200 },
        { number: 4, name: 'سُورَةُ النِّسَاءِ', numberOfAyahs: 176 },
        { number: 5, name: 'سُورَةُ المَائِدَةِ', numberOfAyahs: 120 },
        { number: 6, name: 'سُورَةُ الأَنْعَامِ', numberOfAyahs: 165 },
        { number: 7, name: 'سُورَةُ الأَعْرَافِ', numberOfAyahs: 206 },
        { number: 8, name: 'سُورَةُ الأَنْفَالِ', numberOfAyahs: 75 },
        { number: 9, name: 'سُورَةُ التَّوْبَةِ', numberOfAyahs: 129 },
        { number: 10, name: 'سُورَةُ يُونُسَ', numberOfAyahs: 109 },
        { number: 11, name: 'سُورَةُ هُودٍ', numberOfAyahs: 123 },
        { number: 12, name: 'سُورَةُ يُوسُفَ', numberOfAyahs: 111 },
        { number: 13, name: 'سُورَةُ الرَّعْدِ', numberOfAyahs: 43 },
        { number: 14, name: 'سُورَةُ إِبْرَاهِيمَ', numberOfAyahs: 52 },
        { number: 15, name: 'سُورَةُ الحِجْرِ', numberOfAyahs: 99 },
        { number: 16, name: 'سُورَةُ النَّحْلِ', numberOfAyahs: 128 },
        { number: 17, name: 'سُورَةُ الإِسْرَاءِ', numberOfAyahs: 111 },
        { number: 18, name: 'سُورَةُ الكَهْفِ', numberOfAyahs: 110 },
        { number: 19, name: 'سُورَةُ مَرْيَمَ', numberOfAyahs: 98 },
        { number: 20, name: 'سُورَةُ طٰهٰ', numberOfAyahs: 135 },
        { number: 21, name: 'سُورَةُ الأَنْبِيَاءِ', numberOfAyahs: 112 },
        { number: 22, name: 'سُورَةُ الحَجِّ', numberOfAyahs: 78 },
        { number: 23, name: 'سُورَةُ المُؤْمِنُونَ', numberOfAyahs: 118 },
        { number: 24, name: 'سُورَةُ النُّورِ', numberOfAyahs: 64 },
        { number: 25, name: 'سُورَةُ الفُرْقَانِ', numberOfAyahs: 77 },
        { number: 26, name: 'سُورَةُ الشُّعَرَاءِ', numberOfAyahs: 227 },
        { number: 27, name: 'سُورَةُ النَّمْلِ', numberOfAyahs: 93 },
        { number: 28, name: 'سُورَةُ القَصَصِ', numberOfAyahs: 88 },
        { number: 29, name: 'سُورَةُ العَنْكَبُوتِ', numberOfAyahs: 69 },
        { number: 30, name: 'سُورَةُ الرُّومِ', numberOfAyahs: 60 },
        { number: 31, name: 'سُورَةُ لُقْمَانَ', numberOfAyahs: 34 },
        { number: 32, name: 'سُورَةُ السَّجْدَةِ', numberOfAyahs: 30 },
        { number: 33, name: 'سُورَةُ الأَحْزَابِ', numberOfAyahs: 73 },
        { number: 34, name: 'سُورَةُ سَبَإٍ', numberOfAyahs: 54 },
        { number: 35, name: 'سُورَةُ فَاطِرٍ', numberOfAyahs: 45 },
        { number: 36, name: 'سُورَةُ يسٓ', numberOfAyahs: 83 },
        { number: 37, name: 'سُورَةُ الصَّافَّاتِ', numberOfAyahs: 182 },
        { number: 38, name: 'سُورَةُ صٓ', numberOfAyahs: 88 },
        { number: 39, name: 'سُورَةُ الزُّمَرِ', numberOfAyahs: 75 },
        { number: 40, name: 'سُورَةُ غَافِرٍ', numberOfAyahs: 85 },
        { number: 41, name: 'سُورَةُ فُصِّلَتْ', numberOfAyahs: 54 },
        { number: 42, name: 'سُورَةُ الشُّورَىٰ', numberOfAyahs: 53 },
        { number: 43, name: 'سُورَةُ الزُّخْرُفِ', numberOfAyahs: 89 },
        { number: 44, name: 'سُورَةُ الدُّخَانِ', numberOfAyahs: 59 },
        { number: 45, name: 'سُورَةُ الجَاثِيَةِ', numberOfAyahs: 37 },
        { number: 46, name: 'سُورَةُ الأَحْقَافِ', numberOfAyahs: 35 },
        { number: 47, name: 'سُورَةُ مُحَمَّدٍ', numberOfAyahs: 38 },
        { number: 48, name: 'سُورَةُ الفَتْحِ', numberOfAyahs: 29 },
        { number: 49, name: 'سُورَةُ الحُجُرَاتِ', numberOfAyahs: 18 },
        { number: 50, name: 'سُورَةُ قٓ', numberOfAyahs: 45 },
        { number: 51, name: 'سُورَةُ الذَّارِيَاتِ', numberOfAyahs: 60 },
        { number: 52, name: 'سُورَةُ الطُّورِ', numberOfAyahs: 49 },
        { number: 53, name: 'سُورَةُ النَّجْمِ', numberOfAyahs: 62 },
        { number: 54, name: 'سُورَةُ القَمَرِ', numberOfAyahs: 55 },
        { number: 55, name: 'سُورَةُ الرَّحْمٰنِ', numberOfAyahs: 78 },
        { number: 56, name: 'سُورَةُ الوَاقِعَةِ', numberOfAyahs: 96 },
        { number: 57, name: 'سُورَةُ الحَدِيدِ', numberOfAyahs: 29 },
        { number: 58, name: 'سُورَةُ المُجَادَلَةِ', numberOfAyahs: 22 },
        { number: 59, name: 'سُورَةُ الحَشْرِ', numberOfAyahs: 24 },
        { number: 60, name: 'سُورَةُ المُمْتَحَنَةِ', numberOfAyahs: 13 },
        { number: 61, name: 'سُورَةُ الصَّفِّ', numberOfAyahs: 14 },
        { number: 62, name: 'سُورَةُ الجُمُعَةِ', numberOfAyahs: 11 },
        { number: 63, name: 'سُورَةُ المُنَافِقُونَ', numberOfAyahs: 11 },
        { number: 64, name: 'سُورَةُ التَّغَابُنِ', numberOfAyahs: 18 },
        { number: 65, name: 'سُورَةُ الطَّلاَقِ', numberOfAyahs: 12 },
        { number: 66, name: 'سُورَةُ التَّحْرِيمِ', numberOfAyahs: 12 },
        { number: 67, name: 'سُورَةُ المُلْكِ', numberOfAyahs: 30 },
        { number: 68, name: 'سُورَةُ القَلَمِ', numberOfAyahs: 52 },
        { number: 69, name: 'سُورَةُ الحَاقَّةِ', numberOfAyahs: 52 },
        { number: 70, name: 'سُورَةُ المَعَارِجِ', numberOfAyahs: 44 },
        { number: 71, name: 'سُورَةُ نُوحٍ', numberOfAyahs: 28 },
        { number: 72, name: 'سُورَةُ الجِنِّ', numberOfAyahs: 28 },
        { number: 73, name: 'سُورَةُ المُزَّمِّلِ', numberOfAyahs: 20 },
        { number: 74, name: 'سُورَةُ المُدَّثِّرِ', numberOfAyahs: 56 },
        { number: 75, name: 'سُورَةُ القِيَامَةِ', numberOfAyahs: 40 },
        { number: 76, name: 'سُورَةُ الإِنْسَانِ', numberOfAyahs: 31 },
        { number: 77, name: 'سُورَةُ المُرْسَلاَتِ', numberOfAyahs: 50 },
        { number: 78, name: 'سُورَةُ النَّبَإِ', numberOfAyahs: 40 },
        { number: 79, name: 'سُورَةُ النَّازِعَاتِ', numberOfAyahs: 46 },
        { number: 80, name: 'سُورَةُ عَبَسَ', numberOfAyahs: 42 },
        { number: 81, name: 'سُورَةُ التَّكْوِيرِ', numberOfAyahs: 29 },
        { number: 82, name: 'سُورَةُ الاِنْفِطَارِ', numberOfAyahs: 19 },
        { number: 83, name: 'سُورَةُ المُطَفِّفِينَ', numberOfAyahs: 36 },
        { number: 84, name: 'سُورَةُ الاِنْشِقَاقِ', numberOfAyahs: 25 },
        { number: 85, name: 'سُورَةُ البُرُوجِ', numberOfAyahs: 22 },
        { number: 86, name: 'سُورَةُ الطَّارِقِ', numberOfAyahs: 17 },
        { number: 87, name: 'سُورَةُ الأَعْلَىٰ', numberOfAyahs: 19 },
        { number: 88, name: 'سُورَةُ الغَاشِيَةِ', numberOfAyahs: 26 },
        { number: 89, name: 'سُورَةُ الفَجْرِ', numberOfAyahs: 30 },
        { number: 90, name: 'سُورَةُ البَلَدِ', numberOfAyahs: 20 },
        { number: 91, name: 'سُورَةُ الشَّمْسِ', numberOfAyahs: 15 },
        { number: 92, name: 'سُورَةُ اللَّيْلِ', numberOfAyahs: 21 },
        { number: 93, name: 'سُورَةُ الضُّحَىٰ', numberOfAyahs: 11 },
        { number: 94, name: 'سُورَةُ الشَّرْحِ', numberOfAyahs: 8 },
        { number: 95, name: 'سُورَةُ التِّينِ', numberOfAyahs: 8 },
        { number: 96, name: 'سُورَةُ العَلَقِ', numberOfAyahs: 19 },
        { number: 97, name: 'سُورَةُ القَدْرِ', numberOfAyahs: 5 },
        { number: 98, name: 'سُورَةُ البَيِّنَةِ', numberOfAyahs: 8 },
        { number: 99, name: 'سُورَةُ الزَّلْزَلَةِ', numberOfAyahs: 8 },
        { number: 100, name: 'سُورَةُ العَادِيَاتِ', numberOfAyahs: 11 },
        { number: 101, name: 'سُورَةُ القَارِعَةِ', numberOfAyahs: 11 },
        { number: 102, name: 'سُورَةُ التَّكَاثُرِ', numberOfAyahs: 8 },
        { number: 103, name: 'سُورَةُ العَصْرِ', numberOfAyahs: 3 },
        { number: 104, name: 'سُورَةُ الهُمَزَةِ', numberOfAyahs: 9 },
        { number: 105, name: 'سُورَةُ الفِيلِ', numberOfAyahs: 5 },
        { number: 106, name: 'سُورَةُ قُرَيْشٍ', numberOfAyahs: 4 },
        { number: 107, name: 'سُورَةُ المَاعُونِ', numberOfAyahs: 7 },
        { number: 108, name: 'سُورَةُ الكَوْثَرِ', numberOfAyahs: 3 },
        { number: 109, name: 'سُورَةُ الكَافِرُونَ', numberOfAyahs: 6 },
        { number: 110, name: 'سُورَةُ النَّصْرِ', numberOfAyahs: 3 },
        { number: 111, name: 'سُورَةُ المَسَدِ', numberOfAyahs: 5 },
        { number: 112, name: 'سُورَةُ الإِخْلاَصِ', numberOfAyahs: 4 },
        { number: 113, name: 'سُورَةُ الفَلَقِ', numberOfAyahs: 5 },
        { number: 114, name: 'سُورَةُ النَّاسِ', numberOfAyahs: 6 }
    ];

    // 3. قائمة القراء الشاملة (جميع الروايات أوفلاين وأونلاين)
    const RECITERS = [
        // --- رواية ورش عن نافع ---
        {
            identifier: 'ar.elayounelkouchi',
            name: 'الشيخ العيون الكوشي',
            style: 'رواية ورش عن نافع — المغرب',
            rewayah: 'warsh',
            getUrl: (num) => `https://server11.mp3quran.net/koshi/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.omarkabbaj',
            name: 'الشيخ عمر القزابري',
            style: 'رواية ورش عن نافع — المغرب',
            rewayah: 'warsh',
            getUrl: (num) => `https://server9.mp3quran.net/omar_warsh/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.abdulbasitwarsh',
            name: 'الشيخ عبد الباسط عبد الصمد',
            style: 'رواية ورش عن نافع — مرتل',
            rewayah: 'warsh',
            getUrl: (num) => `https://server7.mp3quran.net/basit/Rewayat-Warsh-A-n-Nafi/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.husarywarsh',
            name: 'الشيخ محمود خليل الحصري',
            style: 'رواية ورش عن نافع — مرتل',
            rewayah: 'warsh',
            getUrl: (num) => `https://server13.mp3quran.net/husr/Rewayat-Warsh-A-n-Nafi/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.yaseenjazairi',
            name: 'الشيخ ياسين الجزائري',
            style: 'رواية ورش عن نافع — الجزائر',
            rewayah: 'warsh',
            getUrl: (num) => `https://server11.mp3quran.net/qari/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.abdulazizsheim',
            name: 'الشيخ عبد العزيز سحيم',
            style: 'رواية ورش عن نافع — مرتل',
            rewayah: 'warsh',
            getUrl: (num) => `https://server16.mp3quran.net/a_sheim/Rewayat-Warsh-A-n-Nafi/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.earawi',
            name: 'الشيخ محمد الأيراوي',
            style: 'رواية ورش عن نافع — طريق الأزرق',
            rewayah: 'warsh',
            getUrl: (num) => `https://server6.mp3quran.net/earawi/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.ifrad',
            name: 'الشيخ رشيد إفراد',
            style: 'رواية ورش عن نافع — مرتل',
            rewayah: 'warsh',
            getUrl: (num) => `https://server12.mp3quran.net/ifrad/${String(num).padStart(3, '0')}.mp3`
        },

        // --- رواية قالون عن نافع ---
        {
            identifier: 'ar.husaryqaloon',
            name: 'الشيخ محمود خليل الحصري',
            style: 'رواية قالون عن نافع — مرتل',
            rewayah: 'qaloon',
            getUrl: (num) => `https://server13.mp3quran.net/husr/Rewayat-Qalon-A-n-Nafi/${String(num).padStart(3, '0')}.mp3`
        },

        // --- رواية الدوري عن أبي عمرو ---
        {
            identifier: 'ar.husaryduri',
            name: 'الشيخ محمود خليل الحصري',
            style: 'رواية الدوري عن أبي عمرو — مرتل',
            rewayah: 'duri',
            getUrl: (num) => `https://server13.mp3quran.net/husr/Rewayat-Aldori-A-n-Abi-Amr/${String(num).padStart(3, '0')}.mp3`
        },

        // --- رواية حفص عن عاصم ---
        {
            identifier: 'ar.alafasy',
            name: 'الشيخ مشاري راشد العفاسي',
            style: 'رواية حفص عن عاصم — مرتل',
            rewayah: 'hafs',
            getUrl: (num) => `https://server8.mp3quran.net/afs/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.abdulbasitmurattal',
            name: 'الشيخ عبد الباسط عبد الصمد',
            style: 'رواية حفص عن عاصم — مرتل',
            rewayah: 'hafs',
            getUrl: (num) => `https://server7.mp3quran.net/basit/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.abdulbasitmujawwad',
            name: 'الشيخ عبد الباسط عبد الصمد',
            style: 'رواية حفص عن عاصم — مجود',
            rewayah: 'hafs',
            getUrl: (num) => `https://server7.mp3quran.net/basit/Almusshaf-Al-Mojawwad/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.minshawi',
            name: 'الشيخ محمد صديق المنشاوي',
            style: 'رواية حفص عن عاصم — مرتل',
            rewayah: 'hafs',
            getUrl: (num) => `https://server10.mp3quran.net/minsh/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.minshawimujawwad',
            name: 'الشيخ محمد صديق المنشاوي',
            style: 'رواية حفص عن عاصم — مجود',
            rewayah: 'hafs',
            getUrl: (num) => `https://server10.mp3quran.net/minsh/Almusshaf-Al-Mojawwad/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.mahermuaiqly',
            name: 'الشيخ ماهر المعيقلي',
            style: 'إمام الحرم المكي الشريف',
            rewayah: 'hafs',
            getUrl: (num) => `https://server12.mp3quran.net/maher/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.husary',
            name: 'الشيخ محمود خليل الحصري',
            style: 'رواية حفص عن عاصم — مرتل',
            rewayah: 'hafs',
            getUrl: (num) => `https://server13.mp3quran.net/husr/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.yasseraddossari',
            name: 'الشيخ ياسر الدوسري',
            style: 'إمام الحرم المكي الشريف',
            rewayah: 'hafs',
            getUrl: (num) => `https://server11.mp3quran.net/yasser/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.ghamadi',
            name: 'الشيخ سعد الغامدي',
            style: 'رواية حفص عن عاصم — مرتل',
            rewayah: 'hafs',
            getUrl: (num) => `https://server7.mp3quran.net/s_gmd/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.ajamy',
            name: 'الشيخ أحمد بن علي العجمي',
            style: 'رواية حفص عن عاصم — مرتل',
            rewayah: 'hafs',
            getUrl: (num) => `https://server10.mp3quran.net/ajm/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.shaatree',
            name: 'الشيخ أبو بكر الشاطري',
            style: 'رواية حفص عن عاصم — مرتل',
            rewayah: 'hafs',
            getUrl: (num) => `https://server11.mp3quran.net/shatri/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.saoodshuraym',
            name: 'الشيخ سعود الشريم',
            style: 'إمام الحرم المكي الشريف السابق',
            rewayah: 'hafs',
            getUrl: (num) => `https://server7.mp3quran.net/shur/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.hudhaify',
            name: 'الشيخ علي بن عبد الرحمن الحذيفي',
            style: 'إمام المسجد النبوي الشريف',
            rewayah: 'hafs',
            getUrl: (num) => `https://server9.mp3quran.net/hthfi/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.muhammadayyub',
            name: 'الشيخ محمد أيوب',
            style: 'إمام المسجد النبوي الشريف السابق',
            rewayah: 'hafs',
            getUrl: (num) => `https://server8.mp3quran.net/ayyub/${String(num).padStart(3, '0')}.mp3`
        },
        {
            identifier: 'ar.hanirifai',
            name: 'الشيخ هاني الرفاعي',
            style: 'رواية حفص عن عاصم — مرتل',
            rewayah: 'hafs',
            getUrl: (num) => `https://server8.mp3quran.net/hani/${String(num).padStart(3, '0')}.mp3`
        }
    ];

    function resolveReciter(reciterOrId) {
        if (!reciterOrId) return RECITERS[0];
        if (typeof reciterOrId === 'string') {
            return RECITERS.find(r => r.identifier === reciterOrId) || RECITERS[0];
        }
        if (reciterOrId.identifier) {
            const found = RECITERS.find(r => r.identifier === reciterOrId.identifier);
            if (found) return found;
        }
        return (typeof reciterOrId.getUrl === 'function') ? reciterOrId : RECITERS[0];
    }

    function getReciterAudioUrl(reciter, surahNum) {
        const r = resolveReciter(reciter);
        if (typeof r.getUrl === 'function') {
            return r.getUrl(surahNum);
        }
        return `https://server11.mp3quran.net/koshi/${String(surahNum).padStart(3, '0')}.mp3`;
    }

    // 4. كائن التحكم الصوتي الشامل (Singleton Audio Engine)
    class Fur9anAudioEngine {
        constructor() {
            this.audio = window._furqanGlobalAudioInstance || new Audio();
            window._furqanGlobalAudioInstance = this.audio;

            this.currentReciter = RECITERS[0];
            this.currentSurah = 1;
            this.isPlaying = false;
            this.repeatMode = 0; // 0: None, 1: Repeat One, 2: Repeat All
            this.blobUrl = null;
            this._sessionId = 0;

            this.loadState();
            this.initAudioEvents();
            this.initDOM();
        }

        loadState() {
            try {
                const saved = localStorage.getItem('fur9an_player_state');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.reciterId) {
                        const r = RECITERS.find(x => x.identifier === parsed.reciterId);
                        if (r) this.currentReciter = r;
                    }
                    if (parsed.surahNumber) {
                        this.currentSurah = Math.min(114, Math.max(1, parsed.surahNumber));
                    }
                    if (typeof parsed.repeatMode === 'number') {
                        this.repeatMode = parsed.repeatMode;
                    }
                }
            } catch (e) {}
        }

        saveState() {
            try {
                localStorage.setItem('fur9an_player_state', JSON.stringify({
                    reciterId: this.currentReciter.identifier,
                    surahNumber: this.currentSurah,
                    repeatMode: this.repeatMode,
                    isPlaying: this.isPlaying,
                    surahName: this.getSurahName(this.currentSurah),
                    reciterName: this.currentReciter.name
                }));
            } catch (e) {}
        }

        getSurahName(num) {
            const s = SURAHS.find(x => x.number === num);
            return s ? s.name : `سورة ${num}`;
        }

        initAudioEvents() {
            this.audio.addEventListener('play', () => {
                this.isPlaying = true;
                this.saveState();
                this.updateUI();
            });

            this.audio.addEventListener('pause', () => {
                this.isPlaying = false;
                this.saveState();
                this.updateUI();
            });

            this.audio.addEventListener('timeupdate', () => {
                this.updateProgressUI();
            });

            this.audio.addEventListener('ended', () => {
                if (this.repeatMode === 1) {
                    this.audio.currentTime = 0;
                    this.audio.play().catch(() => {});
                } else if (this.repeatMode === 2) {
                    this.nextSurah();
                } else {
                    if (this.currentSurah < 114) {
                        this.nextSurah();
                    } else {
                        this.isPlaying = false;
                        this.updateUI();
                    }
                }
            });

            this.audio.addEventListener('error', (e) => {
                console.warn('⚠️ Audio error:', e);
                this.isPlaying = false;
                this.updateUI();
            });
        }

        async playSurah(surahNum, reciterObj = null) {
            if (reciterObj) this.currentReciter = resolveReciter(reciterObj);
            if (surahNum) this.currentSurah = Math.min(114, Math.max(1, surahNum));

            if (this.blobUrl) {
                try { URL.revokeObjectURL(this.blobUrl); } catch (e) {}
                this.blobUrl = null;
            }

            const sessionId = ++this._sessionId;
            const sources = [];

            // 1. فحص وجود الملف أوفلاين في IndexedDB
            try {
                const offlineRecord = await AudioDB.getAudio(this.currentReciter.identifier, this.currentSurah);
                if (offlineRecord && offlineRecord.blob && offlineRecord.blob.size > 1000) {
                    this.blobUrl = URL.createObjectURL(offlineRecord.blob);
                    sources.push({ url: this.blobUrl, isOffline: true });
                }
            } catch (e) {
                console.warn('Offline audio read error:', e);
            }

            // 2. مصادر الشبكة
            const directUrl = getReciterAudioUrl(this.currentReciter, this.currentSurah) || `https://server11.mp3quran.net/koshi/${String(this.currentSurah).padStart(3, '0')}.mp3`;
            sources.push({ url: directUrl, isOffline: false });
            sources.push({ url: `/api/proxy-audio?url=${encodeURIComponent(directUrl)}`, isOffline: false });

            // خادم بديل موثوق
            const fallbackCdn = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${this.currentSurah}.mp3`;
            sources.push({ url: fallbackCdn, isOffline: false });
            sources.push({ url: `/api/proxy-audio?url=${encodeURIComponent(fallbackCdn)}`, isOffline: false });

            this.executeSourceChain(sources, 0, sessionId);
        }

        executeSourceChain(sources, sourceIdx, sessionId) {
            if (sessionId !== this._sessionId) return;

            if (sourceIdx >= sources.length) {
                this.isPlaying = false;
                this.updateUI();
                return;
            }

            const source = sources[sourceIdx];
            try { this.audio.pause(); } catch (e) {}

            this.audio.src = source.url;

            let handled = false;
            const tryNext = () => {
                if (handled) return;
                handled = true;
                if (sessionId !== this._sessionId) return;
                this.executeSourceChain(sources, sourceIdx + 1, sessionId);
            };

            const playPromise = this.audio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    if (sessionId !== this._sessionId) {
                        try { this.audio.pause(); } catch (e) {}
                        return;
                    }
                    this.isPlaying = true;
                    this.saveState();
                    this.updateUI();
                }).catch((err) => {
                    if (err.name === 'AbortError' || (err.message && err.message.includes('interrupted'))) {
                        return;
                    }
                    tryNext();
                });
            }
        }

        togglePlay() {
            if (this.audio.src && this.isPlaying) {
                this.audio.pause();
            } else if (this.audio.src && !this.isPlaying && this.audio.currentTime > 0) {
                this.audio.play().catch(() => {});
            } else {
                this.playSurah(this.currentSurah, this.currentReciter);
            }
        }

        nextSurah() {
            let next = this.currentSurah + 1;
            if (next > 114) next = 1;
            this.playSurah(next, this.currentReciter);
        }

        prevSurah() {
            let prev = this.currentSurah - 1;
            if (prev < 1) prev = 114;
            this.playSurah(prev, this.currentReciter);
        }

        toggleRepeat() {
            this.repeatMode = (this.repeatMode + 1) % 3;
            this.saveState();
            this.updateRepeatUI();
        }

        seek(percent) {
            if (this.audio.duration) {
                this.audio.currentTime = (percent / 100) * this.audio.duration;
            }
        }

        formatTime(seconds) {
            if (!seconds || isNaN(seconds)) return '00:00';
            const m = Math.floor(seconds / 60);
            const s = Math.floor(seconds % 60);
            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }

        updateRepeatUI() {
            const icons = document.querySelectorAll('#homeAudioRepeatIcon, #persRepeatIcon');
            icons.forEach(icon => {
                if (this.repeatMode === 1) {
                    icon.className = 'fa-solid fa-repeat-1';
                    icon.parentElement.style.color = 'var(--color-primary)';
                } else if (this.repeatMode === 2) {
                    icon.className = 'fa-solid fa-repeat';
                    icon.parentElement.style.color = 'var(--color-primary)';
                } else {
                    icon.className = 'fa-solid fa-repeat';
                    icon.parentElement.style.color = '';
                }
            });
        }

        updateUI() {
            const surahName = this.getSurahName(this.currentSurah);
            const reciterName = this.currentReciter.name;

            // بطاقة الصفحة الرئيسية
            const homeTitle = document.getElementById('homeAudioSurahTitle');
            const homeReciter = document.getElementById('homeAudioReciterName');
            const homeIcon = document.getElementById('homeAudioPlayIcon');
            const homeBox = document.getElementById('homeAudioIconBox');

            if (homeTitle) homeTitle.textContent = surahName;
            if (homeReciter) homeReciter.textContent = `${reciterName} — (${this.currentReciter.style})`;
            if (homeIcon) {
                homeIcon.className = this.isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
            }
            if (homeBox) {
                if (this.isPlaying) homeBox.classList.add('playing');
                else homeBox.classList.remove('playing');
            }

            // الشريط العائم الدائم
            const persBar = document.getElementById('furqanPersistentBar');
            const persTitle = document.getElementById('persBarTitle');
            const persReciter = document.getElementById('persBarReciter');
            const persIcon = document.getElementById('persBarPlayIcon');

            if (persBar) {
                // إظهار الشريط فقط إذا كان الصوت مشغلاً ولم نكن في صفحة التلاوات الرئيسية
                const path = window.location.pathname;
                const isHome = path === '/' || path === '/index.html' || path.endsWith('/index.html') || path === '';
                const isRecitations = path.indexOf('/recitations') !== -1;

                if ((this.isPlaying || (this.audio.src && this.audio.currentTime > 0)) && !isHome && !isRecitations) {
                    persBar.classList.remove('hidden');
                } else {
                    persBar.classList.add('hidden');
                }
            }

            if (persTitle) persTitle.textContent = surahName;
            if (persReciter) persReciter.textContent = reciterName;
            if (persIcon) {
                persIcon.className = this.isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
            }

            if (window.Fur9anBridge && typeof window.Fur9anBridge.updateMediaNotification === 'function') {
                window.Fur9anBridge.updateMediaNotification(surahName, reciterName, this.isPlaying);
            }

            // تحديث MediaSession API لمنسق إشعارات النظام في أندرويد
            this.updateMediaSession(surahName, reciterName);

            // إدارة إبقاء الشاشة مضاءة أثناء استماع القراءة
            if (window.Fur9anBridge) {
                if (this.isPlaying) {
                    window.Fur9anBridge.requestWakeLock();
                } else {
                    window.Fur9anBridge.releaseWakeLock();
                }
            }

            this.updateRepeatUI();
        }

        updateMediaSession(surahName, reciterName) {
            if ('mediaSession' in navigator) {
                try {
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: surahName || this.getSurahName(this.currentSurah),
                        artist: reciterName || this.currentReciter.name,
                        album: 'القرآن الكريم — منصة الفرقان',
                        artwork: [
                            { src: '/data/images/logo.png', sizes: '96x96', type: 'image/png' },
                            { src: '/data/images/logo.png', sizes: '512x512', type: 'image/png' }
                        ]
                    });

                    navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';

                    navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
                    navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
                    navigator.mediaSession.setActionHandler('previoustrack', () => this.prevSurah());
                    navigator.mediaSession.setActionHandler('nexttrack', () => this.nextSurah());
                    navigator.mediaSession.setActionHandler('seekbackward', () => {
                        this.audio.currentTime = Math.max(0, this.audio.currentTime - 10);
                    });
                    navigator.mediaSession.setActionHandler('seekforward', () => {
                        this.audio.currentTime = Math.min(this.audio.duration || 0, this.audio.currentTime + 10);
                    });
                    try {
                        navigator.mediaSession.setActionHandler('stop', () => {
                            this.audio.pause();
                            this.audio.currentTime = 0;
                        });
                    } catch (e) {}
                } catch (e) {
                    console.warn('MediaSession handler error:', e);
                }
            }
        }

        updateProgressUI() {
            const current = this.audio.currentTime || 0;
            const duration = this.audio.duration || 0;
            const percent = duration > 0 ? (current / duration) * 100 : 0;

            const homeCurrent = document.getElementById('homeAudioCurrentTime');
            const homeDuration = document.getElementById('homeAudioDuration');
            const homeFill = document.getElementById('homeAudioProgressFill');

            if (homeCurrent) homeCurrent.textContent = this.formatTime(current);
            if (homeDuration) homeDuration.textContent = this.formatTime(duration);
            if (homeFill) homeFill.style.width = `${percent}%`;
        }

        initDOM() {
            document.addEventListener('DOMContentLoaded', () => {
                this.bindControls();
                this.updateUI();
            });
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                this.bindControls();
                this.updateUI();
            }
        }

        bindControls() {
            // عناصر الصفحة الرئيسية
            const playBtn = document.getElementById('homeAudioPlayBtn');
            if (playBtn && !playBtn._hasFurqanBound) {
                playBtn._hasFurqanBound = true;
                playBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.togglePlay();
                });
            }

            const nextBtn = document.getElementById('homeAudioNextBtn');
            if (nextBtn && !nextBtn._hasFurqanBound) {
                nextBtn._hasFurqanBound = true;
                nextBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.nextSurah();
                });
            }

            const prevBtn = document.getElementById('homeAudioPrevBtn');
            if (prevBtn && !prevBtn._hasFurqanBound) {
                prevBtn._hasFurqanBound = true;
                prevBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.prevSurah();
                });
            }

            const repeatBtn = document.getElementById('homeAudioRepeatBtn');
            if (repeatBtn && !repeatBtn._hasFurqanBound) {
                repeatBtn._hasFurqanBound = true;
                repeatBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.toggleRepeat();
                });
            }

            const progressBar = document.getElementById('homeAudioProgressBar');
            if (progressBar && !progressBar._hasFurqanBound) {
                progressBar._hasFurqanBound = true;
                progressBar.addEventListener('click', (e) => {
                    const rect = progressBar.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percent = (clickX / rect.width) * 100;
                    this.seek(percent);
                });
            }
        }
    }

    // تصدير الكائن على نطاق window العام
    window.Fur9anAudio = new Fur9anAudioEngine();
    window.SURAH_INDEX_OFFLINE = SURAHS;
    window.RECITERS_GLOBAL_LIST = RECITERS;

})();
