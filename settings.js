/**
 * منصة الفرقان - مدير الإعدادات العام، مواقيت الصلاة الأوفلاين، الأذان والمسبحة الإلكترونية
 */

(function () {
    'use strict';

    // قائمة المؤذنين والقراء المحددة المعتمدة حصرياً
    window.ADHAN_RECITERS = [
        {
            id: 'alafasi',
            name: 'الشيخ مشاري راشد العفاسي',
            file: '/audio/macharialafasi.mp3',
            sources: ['/audio/macharialafasi.mp3', '/audio/adhan_alafasi.mp3']
        },
        {
            id: 'aldosari',
            name: 'الشيخ ياسر الدوسري',
            file: '/audio/yassiradosari.mp3',
            sources: ['/audio/yassiradosari.mp3', '/audio/adhan_aldosari.mp3']
        },
        {
            id: 'alqatami',
            name: 'الشيخ ناصر القطامي',
            file: '/audio/nasiralqatami.mp3',
            sources: ['/audio/nasiralqatami.mp3', '/audio/adhan_alqatami.mp3']
        },
        {
            id: 'islam_sobhi',
            name: 'القارئ إسلام صبحي',
            file: '/audio/islamsobhi.mp3',
            sources: ['/audio/islamsobhi.mp3', '/audio/adhan_islam_sobhi.mp3']
        },
        {
            id: 'qzabri',
            name: 'الشيخ عمر القزابري',
            file: '/audio/3omaralqzabri.mp3',
            sources: ['/audio/3omaralqzabri.mp3', '/audio/adhan_qzabri.mp3']
        },
        {
            id: 'anafis',
            name: 'الشيخ أحمد النفيس',
            file: '/audio/ahmedanafis.mp3',
            sources: ['/audio/ahmedanafis.mp3', '/audio/adhan_anafis.mp3']
        },
        {
            id: 'yamani',
            name: 'الشيخ وديع اليمني',
            file: '/audio/wadiaalyamani.mp3',
            sources: ['/audio/wadiaalyamani.mp3', '/audio/adhan_yamani.mp3']
        },
        {
            id: 'tazi',
            name: 'القارئ أنس التازي',
            file: '/audio/anasatazi.mp3',
            sources: ['/audio/anasatazi.mp3', '/audio/adhan_tazi.mp3']
        }
    ];

    // قائمة المذاهب الفقهية
    window.MADHABS = [
        { id: 'maliki', name: 'المذهب المالكي', desc: 'المعتمد في المغرب وشمال إفريقيا (وقت العصر: ظل المثل)' },
        { id: 'shafii', name: 'المذهب الشافعي', desc: 'جمهور العلماء (وقت العصر: ظل المثل)' },
        { id: 'hanbali', name: 'المذهب الحنبلي', desc: 'جمهور العلماء (وقت العصر: ظل المثل)' },
        { id: 'hanafi', name: 'المذهب الحنفي', desc: 'وقت العصر: ظل المثلين (عصر متأخر)' }
    ];

    // طرق الحساب حسب الدولة
    window.CALC_METHODS = [
        { id: 'Morocco', name: 'المملكة المغربية (وزارة الأوقاف والشؤون الإسلامية)', desc: 'فجر 19°، عشاء 17°، ظهر +5د، مغرب +2د' },
        { id: 'Makkah', name: 'أم القرى - المملكة العربية السعودية', desc: 'فجر 18.5°، عشاء 90 دقيقة بعد المغرب' },
        { id: 'Egypt', name: 'الهيئة المصرية العامة للمساحة', desc: 'فجر 19.5°، عشاء 17.5°' },
        { id: 'Algeria', name: 'وزارة الشؤون الدينية والأوقاف - الجزائر', desc: 'فجر 18°، عشاء 17°' },
        { id: 'Tunisia', name: 'ديوان الإفتاء بالجمهورية التونسية', desc: 'فجر 18°، عشاء 18°' },
        { id: 'Gulf', name: 'دول الخليج العربي الموحد', desc: 'فجر 18.2°، عشاء 18.2°' },
        { id: 'Kuwait', name: 'دولة الكويت', desc: 'فجر 18°، عشاء 17.5°' },
        { id: 'Qatar', name: 'دولة قطر', desc: 'فجر 18°، عشاء 90 دقيقة' },
        { id: 'Jordan', name: 'وزارة الأوقاف والمقدسات الإسلامية - الأردن', desc: 'فجر 18°، عشاء 18°' },
        { id: 'Turkey', name: 'رئاسة الشؤون الدينية التركية (Diyanet)', desc: 'فجر 18°، عشاء 17°' },
        { id: 'MWL', name: 'رابطة العالم الإسلامي (عام)', desc: 'فجر 18°، عشاء 17°' },
        { id: 'ISNA', name: 'الجمعية الإسلامية لشمال أمريكا (ISNA)', desc: 'فجر 15°، عشاء 15°' },
        { id: 'France', name: 'اتحاد المنظمات الإسلامية بفرنسا', desc: 'فجر 12°، عشاء 12°' },
        { id: 'Karachi', name: 'جامعة العلوم الإسلامية بكراتشي', desc: 'فجر 18°، عشاء 18°' }
    ];

    // 1. القيم الافتراضية
    const DEFAULT_SETTINGS = {
        theme: 'emerald',
        preAdhanMinutes: 5,
        adhanReciter: 'alafasi',
        madhab: 'maliki',
        calcMethod: 'Morocco',
        daylightSaving: false,
        hijriAdjustment: 0, // تعديل التاريخ الهجري بالأيام (-2, -1, 0, +1, +2)
        hasConfiguredPrayer: false, // أول دخول
        notifications: {
            Fajr: true,
            Sunrise: false,
            Dhuhr: true,
            Asr: true,
            Maghrib: true,
            Isha: true
        },
        azkarNotifs: {
            morning: true,
            evening: true,
            sleep: true,
            wakeup: true
        }
    };

    // جلب الإعدادات من localStorage
    window.getAppSettings = function () {
        try {
            const saved = localStorage.getItem('fur9an_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                return Object.assign({}, DEFAULT_SETTINGS, parsed);
            }
        } catch (e) {}
        return Object.assign({}, DEFAULT_SETTINGS);
    };

    window.saveAppSettings = function (settings) {
        localStorage.setItem('fur9an_settings', JSON.stringify(settings));
        applyAppTheme(settings.theme);
        scheduleAzkarNotifications();
        if (window.Fur9anBridge && typeof window.Fur9anBridge.syncSettingsToAndroid === 'function') {
            window.Fur9anBridge.syncSettingsToAndroid(settings);
        }
    };

    // تطبيق الثيم المختار
    window.applyAppTheme = function (themeName) {
        const settings = getAppSettings();
        const theme = themeName || settings.theme;
        if (theme === 'default' || theme === 'emerald') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        localStorage.setItem('theme', theme);
        if (themeName && settings.theme !== themeName) {
            settings.theme = themeName;
            localStorage.setItem('fur9an_settings', JSON.stringify(settings));
        }
    };

    // تفعيل الثيم فور التحميل
    applyAppTheme();

    // ============================================
    // 2. محرك التاريخ الهجري المحلي 100% أوفلاين
    // ============================================
    const HIJRI_MONTHS = [
        'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر',
        'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
        'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
    ];

    const ARABIC_DAYS = [
        'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
    ];

    window.getOfflineHijriDate = function (targetDate, manualAdjustment = null) {
        const actualDate = targetDate ? new Date(targetDate) : new Date();
        const settings = getAppSettings();
        
        let adj = 0;
        if (manualAdjustment !== null && typeof manualAdjustment === 'number') {
            adj = manualAdjustment;
        } else if (settings.hijriAdjustment !== undefined) {
            adj = parseInt(settings.hijriAdjustment, 10) || 0;
        }

        // اسم اليوم في الأسبوع ثابت دائماً لليوم الفعلي ولا يتغير بتعديل الهلال
        const dayOfWeekName = ARABIC_DAYS[actualDate.getDay()];

        // تاريخ حساب الشهر واليوم الهجري (المعدل بعدد أيام الرؤية)
        const workingDate = new Date(actualDate.getTime() + adj * 86400000);
        let hDay = 1, hMonth = 1, hYear = 1448, monthName = 'محرم';
        let formattedStr = '';

        try {
            // نستخدم تقويم أم القرى بشكل قياسي وموحد مع ضبط المنطقة الزمنية للرياض لضمان الدقة وتفادي أي فروقات فروق التوقيت
            const calType = 'ar-SA-u-ca-islamic-umalqura';
            const formatter = new Intl.DateTimeFormat(calType, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Asia/Riyadh'
            });
            const parts = formatter.formatToParts(workingDate);
            let pDay = '', pMonth = '', pYear = '';
            parts.forEach(p => {
                if (p.type === 'day') pDay = p.value;
                if (p.type === 'month') pMonth = p.value;
                if (p.type === 'year') pYear = p.value;
            });
            if (pDay && pMonth && pYear) {
                hDay = parseInt(pDay.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)), 10) || workingDate.getDate();
                monthName = pMonth;
                hYear = parseInt(pYear.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)), 10) || 1448;
                formattedStr = `${dayOfWeekName}، ${hDay} ${monthName} ${hYear} هـ`;
            }
        } catch (e) {
            console.error('Error formatting Hijri date with Intl:', e);
        }

        if (!formattedStr) {
            // خوارزمية الحساب الفلكي التقريبي لتقويم أم القرى / الحساب الجدولي
            let y = workingDate.getFullYear();
            let m = workingDate.getMonth() + 1;
            let d = workingDate.getDate();

            if (m < 3) {
                y -= 1;
                m += 12;
            }

            const a = Math.floor(y / 100);
            const b = 2 - a + Math.floor(a / 4);
            const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;

            const z = jd - 1948439.5;
            const cyc = Math.floor(z / 10631);
            const rem = z - 10631 * cyc;
            const j = Math.floor((rem - 0.1335) / 354.36667);
            hYear = 30 * cyc + j + 1;
            const hDayInYear = rem - Math.floor(j * 354.36667 + 0.1335);
            hMonth = Math.min(12, Math.floor((hDayInYear + 0.5) / 29.5) + 1);
            hDay = Math.max(1, Math.min(30, Math.floor(hDayInYear - Math.floor((hMonth - 1) * 29.5) + 1)));

            monthName = HIJRI_MONTHS[hMonth - 1] || 'محرم';
            formattedStr = `${dayOfWeekName}، ${hDay} ${monthName} ${hYear} هـ`;
        }

        return {
            dayName: dayOfWeekName,
            day: hDay,
            month: hMonth,
            monthName: monthName,
            year: hYear,
            formatted: formattedStr,
            shortFormatted: `${hDay} ${monthName} ${hYear} هـ`,
            toString: function () {
                return this.formatted;
            }
        };
    };

    // ============================================
    // 2.1. منظومة تنقية وتحديد أسماء المواقع الهرمية بدون لواحق إدارية أو GPS
    // ============================================
    window.cleanLocationName = function (rawName) {
        if (!rawName) return '';
        let name = rawName.toString().trim();
        // إزالة أي إشارة لكلمة GPS نهائياً بأي صيغة
        name = name.replace(/\s*\(?\s*gps\s*\)?/gi, '');
        // إزالة الكلمات والبادئات الإدارية مثل: جماعة، بلدية، قيادة، دائرة، عمالة، إقليم، محافظة، ولاية، قرية
        name = name.replace(/^(جماعة\s+قروية\s+|جماعة\s+حضرية\s+|جماعة\s+|بلدية\s+|قيادة\s+|دائرة\s+|عمالة\s+|إقليم\s+|محافظة\s+|ولاية\s+|قرية\s+|commune\s+de\s+|commune\s+|municipality\s+of\s+|ville\s+de\s+)/i, '');
        name = name.replace(/\s+/g, ' ').trim();
        return name;
    };

    window.extractHierarchicalLocationName = function (address) {
        if (!address) return '';
        // 1. القرية / الحي الصغير (village / hamlet / neighbourhood)
        const village = address.village || address.hamlet || address.neighbourhood || address.suburb || address.quarter || address.residential || address.isolated_dwelling;
        if (village) return window.cleanLocationName(village);

        // 2. البلدية / الجماعة (municipality / district)
        const municipality = address.municipality || address.district || address.city_district || address.subdistrict || address.commune;
        if (municipality) return window.cleanLocationName(municipality);

        // 3. المدينة / المركز (town / city)
        const city = address.town || address.city;
        if (city) return window.cleanLocationName(city);

        // 4. المحافظة / الإقليم (county / state)
        const state = address.county || address.province || address.state || address.region || address.state_district;
        if (state) return window.cleanLocationName(state);

        return window.cleanLocationName(address.country || '');
    };

    window.reverseGeocodeLocation = async function (lat, lng) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1&accept-language=ar`;
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (res.ok) {
                const data = await res.json();
                if (data && data.address) {
                    const cleanName = window.extractHierarchicalLocationName(data.address);
                    if (cleanName) return cleanName;
                }
            }
        } catch (e) {
            console.warn('Reverse geocoding error:', e);
        }
        return '';
    };

    // ============================================
    // 3. خوارزمية حساب مواقيت الصلاة المحلية أوفلاين 100%
    // ============================================
    function calculateUnifiedPrayerTimes() {
        try {
            const savedLocation = localStorage.getItem('fur9an_user_location') || localStorage.getItem('prayerCity');
            let lat = 33.5731, lng = -7.5898, cityName = 'الدار البيضاء', country = 'MA';

            if (savedLocation) {
                try {
                    const parsed = JSON.parse(savedLocation);
                    country = parsed.country || country;
                    if (parsed.latitude && parsed.longitude) {
                        lat = parsed.latitude;
                        lng = parsed.longitude;
                        cityName = window.cleanLocationName(parsed.name || parsed.city || cityName);
                    } else if (parsed.lat && parsed.lng) {
                        lat = parsed.lat;
                        lng = parsed.lng;
                        cityName = window.cleanLocationName(parsed.city || parsed.name || cityName);
                    } else if (parsed.name) {
                        cityName = window.cleanLocationName(parsed.name);
                    }
                } catch (e) {}
            }

            const settings = getAppSettings();
            const method = settings.calcMethod || 'Morocco';
            const madhab = settings.madhab || 'maliki';
            const dst = !!settings.daylightSaving;

            if (typeof window.calculateOfflinePrayerTimes === 'function') {
                const timings = window.calculateOfflinePrayerTimes(lat, lng, {
                    method: method,
                    calculationMethod: method,
                    madhab: madhab,
                    dst: dst,
                    date: new Date()
                });

                const result = {
                    cityName: cityName,
                    timings: timings,
                    method: method,
                    madhab: madhab,
                    lat: lat,
                    lng: lng
                };

                localStorage.setItem('cachedPrayerTimes', JSON.stringify(result.timings));
                if (window.Fur9anBridge && typeof window.Fur9anBridge.syncPrayerTimesToAndroid === 'function') {
                    window.Fur9anBridge.syncPrayerTimesToAndroid(result);
                }
                return result;
            }

            if (typeof PrayTime !== 'undefined') {
                const pt = new PrayTime(method);
                const asrJuristic = (madhab === 'hanafi') ? 'Hanafi' : 'Standard';
                pt.adjust({ asr: asrJuristic });
                pt.location([lat, lng]);
                const rawTimes = pt.times(new Date());

                const formatTimeWithDst = (tStr, isD) => {
                    if (!tStr || !isD) return tStr;
                    const p = tStr.split(':');
                    if (p.length < 2) return tStr;
                    let h = (parseInt(p[0], 10) + 1) % 24;
                    return `${h < 10 ? '0' + h : h}:${p[1]}`;
                };

                const timings = {
                    Fajr: formatTimeWithDst(rawTimes.fajr, dst),
                    Sunrise: formatTimeWithDst(rawTimes.sunrise, dst),
                    Dhuhr: formatTimeWithDst(rawTimes.dhuhr, dst),
                    Asr: formatTimeWithDst(rawTimes.asr, dst),
                    Maghrib: formatTimeWithDst(rawTimes.maghrib, dst),
                    Isha: formatTimeWithDst(rawTimes.isha, dst)
                };

                const result = {
                    cityName: cityName,
                    timings: timings,
                    method: method,
                    madhab: madhab
                };
                localStorage.setItem('cachedPrayerTimes', JSON.stringify(result.timings));
                return result;
            }

            const cachedTimings = localStorage.getItem('cachedPrayerTimes');
            if (cachedTimings) {
                return {
                    cityName: cityName,
                    timings: JSON.parse(cachedTimings)
                };
            }
        } catch (e) {
            console.error('خطأ في حساب مواقيت الصلاة المحلية:', e);
        }

        return null;
    }
    window.calculateUnifiedPrayerTimes = calculateUnifiedPrayerTimes;

    // ============================================
    // 4. مشغل تجربة الأذان الصوتي والأذان الفعلي
    // ============================================
    let activeAdhanAudio = null;
    let previewAudio = null;
    let activePlayingReciterId = null;

    /**
     * تشغيل الأذان مع التبديل التلقائي بين مسارات الصوت المتعددة لضمان التشغيل 100%
     */
    window.playAdhanWithFallbacks = function (reciterId, options = {}) {
        const reciter = (window.ADHAN_RECITERS || []).find(r => r.id === reciterId) || window.ADHAN_RECITERS[0];
        const sources = (reciter.sources && reciter.sources.length) ? reciter.sources : [reciter.file, '/audio/adhan_makkah.mp3'];
        
        let currentIndex = 0;
        const audio = new Audio();

        function tryPlayCurrentSource() {
            if (currentIndex >= sources.length) {
                if (typeof options.onError === 'function') options.onError('All audio sources failed');
                return;
            }

            const currentSrc = sources[currentIndex];
            audio.src = currentSrc;

            let attemptedNext = false;
            function proceedToNext(reason) {
                if (attemptedNext) return;
                attemptedNext = true;
                console.warn(`[AdhanPlayer] فشل المصدر ${currentSrc} بسبب ${reason} للمؤذن ${reciter.name}، تجربة المصدر التالي...`);
                currentIndex++;
                tryPlayCurrentSource();
            }

            audio.onerror = () => {
                proceedToNext('error event');
            };

            audio.play().then(() => {
                audio.onerror = null;
                if (typeof options.onStart === 'function') options.onStart(currentSrc, reciter);
            }).catch(err => {
                audio.onerror = null;
                proceedToNext('play catch: ' + (err ? err.message : 'unknown error'));
            });
        }

        audio.addEventListener('ended', () => {
            if (typeof options.onEnded === 'function') options.onEnded(reciter);
        });

        tryPlayCurrentSource();
        return audio;
    };

    window.toggleAdhanPreview = function (reciterId, buttonElement) {
        const reciter = (window.ADHAN_RECITERS || []).find(r => r.id === reciterId);
        if (!reciter) return;

        // إيقاف أي أذان معاينة حالي
        if (previewAudio) {
            previewAudio.pause();
            previewAudio.currentTime = 0;
            previewAudio = null;
            document.querySelectorAll('.adhan-play-btn, .reciter-preview-play-btn').forEach(btn => {
                const ic = btn.querySelector('i');
                if (ic) ic.className = 'fa-solid fa-play';
                btn.classList.remove('playing');
            });
            if (activePlayingReciterId === reciterId) {
                activePlayingReciterId = null;
                return;
            }
        }

        activePlayingReciterId = reciterId;
        if (buttonElement) {
            const ic = buttonElement.querySelector('i');
            if (ic) ic.className = 'fa-solid fa-pause';
            buttonElement.classList.add('playing');
        }

        previewAudio = window.playAdhanWithFallbacks(reciterId, {
            onStart: (src) => {
                if (buttonElement) {
                    const ic = buttonElement.querySelector('i');
                    if (ic) ic.className = 'fa-solid fa-pause';
                    buttonElement.classList.add('playing');
                }
            },
            onEnded: () => {
                if (buttonElement) {
                    const ic = buttonElement.querySelector('i');
                    if (ic) ic.className = 'fa-solid fa-play';
                    buttonElement.classList.remove('playing');
                }
                activePlayingReciterId = null;
                previewAudio = null;
            },
            onError: () => {
                if (buttonElement) {
                    const ic = buttonElement.querySelector('i');
                    if (ic) ic.className = 'fa-solid fa-play';
                    buttonElement.classList.remove('playing');
                }
                activePlayingReciterId = null;
                previewAudio = null;
            }
        });
    };

    window.stopAdhanPlayback = function () {
        if (activeAdhanAudio) {
            activeAdhanAudio.pause();
            activeAdhanAudio.currentTime = 0;
            activeAdhanAudio = null;
        }
        if (previewAudio) {
            previewAudio.pause();
            previewAudio.currentTime = 0;
            previewAudio = null;
        }
        const alertModal = document.getElementById('adhanAlertModal');
        if (alertModal) {
            alertModal.classList.remove('active');
            alertModal.style.display = 'none';
        }
    };

    // لوحة وتنبيه حان الآن موعد الصلاة
    window.showPrayerTimePopup = function (prayerKey, prayerNameAr, cityName) {
        const settings = getAppSettings();
        const reciterId = settings.adhanReciter || 'alafasi';
        const reciterObj = (window.ADHAN_RECITERS || []).find(r => r.id === reciterId) || window.ADHAN_RECITERS[0];

        // تشغيل الأذان محلياً عبر نظام التبديل الذكي
        if (activeAdhanAudio) {
            activeAdhanAudio.pause();
            activeAdhanAudio = null;
        }
        activeAdhanAudio = window.playAdhanWithFallbacks(reciterId);

        // 3. عرض المودال داخل الصفحة
        let modal = document.getElementById('adhanAlertModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'adhanAlertModal';
            modal.className = 'adhan-alert-modal';
            modal.innerHTML = `
                <div class="adhan-alert-card">
                    <div class="adhan-alert-icon"><i class="fa-solid fa-mosque"></i></div>
                    <div class="adhan-alert-title">حان الآن موعد صلاة <span id="adhanAlertPrayerName"></span></div>
                    <div class="adhan-alert-desc" id="adhanAlertCity"></div>
                    <div class="adhan-alert-reciter" id="adhanAlertReciter"></div>
                    <div class="adhan-alert-actions">
                        <button class="adhan-alert-btn stop" onclick="window.stopAdhanPlayback()"><i class="fa-solid fa-volume-xmark"></i> إيقاف الأذان</button>
                        <a href="/adkar/index.html" class="adhan-alert-btn adkar" onclick="window.stopAdhanPlayback()"><i class="fa-solid fa-hands-praying"></i> أذكار بعد الصلاة</a>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        const nameEl = document.getElementById('adhanAlertPrayerName');
        const cityEl = document.getElementById('adhanAlertCity');
        const reciterEl = document.getElementById('adhanAlertReciter');

        if (nameEl) nameEl.textContent = prayerNameAr;
        if (cityEl) cityEl.textContent = `حسب التوقيت المحلي لمدينة ${cityName || ''}`;
        if (reciterEl) reciterEl.textContent = `بصوت المؤذن: ${reciterObj.name}`;

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    };

    // ============================================
    // 5. فحص مواقيت الصلاة وتشغيل الأذان
    // ============================================
    let preNotifiedFlags = {};
    let adhanNotifiedFlags = {};

    function checkAdhanTimers() {
        const unifiedData = calculateUnifiedPrayerTimes();
        if (!unifiedData || !unifiedData.timings) return;

        const settings = getAppSettings();
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();

        const prayerNamesAr = {
            Fajr: 'الفجر',
            Sunrise: 'الشروق',
            Dhuhr: 'الظهر',
            Asr: 'العصر',
            Maghrib: 'المغرب',
            Isha: 'العشاء'
        };

        Object.keys(unifiedData.timings).forEach(pKey => {
            if (!settings.notifications || !settings.notifications[pKey]) return;

            const timeStr = unifiedData.timings[pKey];
            if (!timeStr || timeStr === '--:--' || timeStr === '-----') return;

            const parts = timeStr.split(':');
            const prayerMins = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
            const preOffset = settings.preAdhanMinutes ? parseInt(settings.preAdhanMinutes, 10) : 5;
            const diff = prayerMins - currentMins;

            // التنبيه المسبق
            if ((diff === preOffset || (diff <= preOffset && diff > preOffset - 2)) && diff > 0) {
                const flagKey = pKey + '_' + preOffset + '_' + now.toDateString();
                if (!preNotifiedFlags[flagKey]) {
                    preNotifiedFlags[flagKey] = true;
                    const msgTitle = `اقتربت صلاة ${prayerNamesAr[pKey]}`;
                    const msgBody = `بقي ${preOffset} دقائق على صلاة ${prayerNamesAr[pKey]} (${unifiedData.cityName})`;
                    if (window.Fur9anBridge && window.Fur9anBridge.sendNotification) {
                        window.Fur9anBridge.sendNotification(msgTitle, msgBody, 101, pKey);
                    }
                }
            }

            // وقت الأذان الفعلي
            if (diff === 0 && !adhanNotifiedFlags[pKey + '_' + now.toDateString()]) {
                adhanNotifiedFlags[pKey + '_' + now.toDateString()] = true;
                const pName = prayerNamesAr[pKey] || pKey;
                const cityStr = unifiedData.cityName || 'موقعك الحالي';
                const msgTitle = `الله أكبر — حان الآن موعد صلاة ${pName}`;
                const msgBody = `حان الآن موعد صلاة ${pName} حسب توقيت مدينة ${cityStr}`;

                if (window.Fur9anBridge && window.Fur9anBridge.sendNotification) {
                    window.Fur9anBridge.sendNotification(msgTitle, msgBody, 200, pKey);
                }

                // عرض لوحة الأذان وتشغيل الصوت
                window.showPrayerTimePopup(pKey, pName, cityStr);
            }
        });
    }

    setInterval(checkAdhanTimers, 20000);
    setTimeout(checkAdhanTimers, 1500);

    // ============================================
    // 6. جدولة إشعارات الأذكار اليومية
    // ============================================
    function scheduleAzkarNotifications() {
        const settings = getAppSettings();
        if (!settings.azkarNotifs) return;
        if (window.Fur9anBridge && window.Fur9anBridge.isCordova) {
            console.log('جدولة إشعارات الأذكار قائمة...');
        }
    }

    // ============================================
    // 7. تحويل الأزرار القديمة إلى زر الإعدادات الموحد وحقن التاريخ الهجري تلقائياً
    // ============================================
    function initializeGlobalHijriHeaders() {
        if (typeof window.getOfflineHijriDate !== 'function') return;

        const hijriObj = window.getOfflineHijriDate(new Date());
        const hijriStr = (hijriObj && hijriObj.formatted) ? hijriObj.formatted : 'اليوم الهجري المبارك';

        // 1. تحديث التاريخ الهجري الرئيسي في الصفحة الرئيسية إذا كان موجوداً
        const topbarText = document.getElementById('topbarHijriText');
        if (topbarText) {
            topbarText.textContent = hijriStr;
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        const themeToggleBtns = document.querySelectorAll('#themeToggle, .theme-toggle, .settings-btn');
        themeToggleBtns.forEach(btn => {
            btn.title = "إعدادات المنصة";
            btn.innerHTML = '<i class="fa-solid fa-gear"></i>';
            btn.onclick = function (e) {
                e.preventDefault();
                window.location.href = '/settings/index.html';
            };
        });

        // تشغيل نظام حقن التاريخ الهجري تلقائياً في ترويسة جميع صفحات التطبيق بدقة عالية عبر المكتبة
        initializeGlobalHijriHeaders();

        // ============================================
        // 8. نظام محاكاة زر الرجوع في الأندرويد للأجهزة المحمولة (عبر الهاش لثبات كامل)
        // ============================================
        
        // عند نقر أي عنصر يفتح مودال، نقوم بتسجيل الهاش في تاريخ المتصفح
        document.body.addEventListener('click', function(e) {
            // انتظار تفعيل كلاس نشاط المودال
            setTimeout(() => {
                const activeModal = document.querySelector('.modal-overlay.active, .tafsir-modal.active, .modal.active, #tasbeehResetModal.active, #settingsModal.active, #storyModal.active, #fullPlayerModal.active, #profileModal.active, #cityModal.active, #prayerOnboardingModal.active');
                if (activeModal) {
                    if (window.location.hash !== '#modal') {
                        window.location.hash = 'modal';
                    }
                }
            }, 120);
        });

        // عند نقر زر الإغلاق اليدوي، نرجع التاريخ خطوة واحدة لمسح الهاش
        document.body.addEventListener('click', function(e) {
            if (e.target.closest('.modal-close, .tafsir-modal-close, #closeTafsirBtn, #closeBookmarksBtn, #closeFullPlayerBtn, #profileClose, #cityModalClose, #prayerOnboardingClose, #closeStoryModal, .close-btn, .modal-overlay, .tafsir-modal-backdrop')) {
                // نضمن الإغلاق والرجوع خطوة لمسح الهاش
                if (window.location.hash === '#modal') {
                    history.back();
                }
            }
        });

        // الاستماع لتغيير الهاش (الناتج عن ضغط زر الرجوع الفعلي في هاتف الأندرويد)
        window.addEventListener('hashchange', function() {
            if (window.location.hash !== '#modal') {
                // نغلق أي مودال مفتوح
                const activeModal = document.querySelector('.modal-overlay.active, .tafsir-modal.active, .modal.active, #tasbeehResetModal.active, #settingsModal.active, #storyModal.active, #fullPlayerModal.active, #profileModal.active, #cityModal.active, #prayerOnboardingModal.active');
                if (activeModal) {
                    activeModal.classList.remove('active');
                    if (activeModal.id === 'tafsirModal') {
                        activeModal.style.display = 'none';
                    }
                    
                    // محاكاة زر الإغلاق لمحاكاة جميع أكواد التنظيف
                    const closeBtn = activeModal.querySelector('.modal-close, .tafsir-modal-close, #closeTafsirBtn, #closeBookmarksBtn, #closeFullPlayerBtn, #profileClose, #cityModalClose, #prayerOnboardingClose, #closeStoryModal, .close-btn');
                    if (closeBtn) {
                        closeBtn.click();
                    }
                }
            }
        });
    });

})();
