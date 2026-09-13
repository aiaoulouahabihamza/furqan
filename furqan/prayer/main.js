// ===== prayer/main.js - إدارة مواقيت الصلاة والحساب الفلكي الدقيق أوفلاين =====

document.addEventListener('DOMContentLoaded', () => {
    // 1. قائمة المدن المتاحة مع الإحداثيات والدولة والمنطقة الزمنية (لضمان دقة الحساب)
    const cities = [
        { name: 'مكة المكرمة', country: 'SA', latitude: 21.4225, longitude: 39.8262, timezone: 3 },
        { name: 'المدينة المنورة', country: 'SA', latitude: 24.4672, longitude: 39.6108, timezone: 3 },
        { name: 'الرياض', country: 'SA', latitude: 24.7136, longitude: 46.6753, timezone: 3 },
        { name: 'جدة', country: 'SA', latitude: 21.5433, longitude: 39.1728, timezone: 3 },
        { name: 'الدمام', country: 'SA', latitude: 26.4207, longitude: 50.0888, timezone: 3 },
        { name: 'الدار البيضاء', country: 'MA', latitude: 33.5731, longitude: -7.5898, timezone: 1 },
        { name: 'الرباط', country: 'MA', latitude: 34.0209, longitude: -6.8416, timezone: 1 },
        { name: 'مراكش', country: 'MA', latitude: 31.6295, longitude: -7.9811, timezone: 1 },
        { name: 'طنجة', country: 'MA', latitude: 35.7595, longitude: -5.8340, timezone: 1 },
        { name: 'فاس', country: 'MA', latitude: 34.0331, longitude: -5.0003, timezone: 1 },
        { name: 'أغادير', country: 'MA', latitude: 30.4278, longitude: -9.5981, timezone: 1 },
        { name: 'وجدة', country: 'MA', latitude: 34.6814, longitude: -1.9086, timezone: 1 },
        { name: 'القاهرة', country: 'EG', latitude: 30.0444, longitude: 31.2357, timezone: 3 },
        { name: 'الإسكندرية', country: 'EG', latitude: 31.2001, longitude: 29.9187, timezone: 3 },
        { name: 'تونس', country: 'TN', latitude: 36.8065, longitude: 10.1815, timezone: 1 },
        { name: 'الجزائر', country: 'DZ', latitude: 36.7538, longitude: 3.0588, timezone: 1 },
        { name: 'وهران', country: 'DZ', latitude: 35.6971, longitude: -0.6308, timezone: 1 },
        { name: 'قسنطينة', country: 'DZ', latitude: 36.3650, longitude: 6.6147, timezone: 1 },
        { name: 'طرابلس', country: 'LY', latitude: 32.8872, longitude: 13.1913, timezone: 2 },
        { name: 'الخرطوم', country: 'SD', latitude: 15.5007, longitude: 32.5599, timezone: 2 },
        { name: 'دمشق', country: 'SY', latitude: 33.5138, longitude: 36.2765, timezone: 3 },
        { name: 'بيروت', country: 'LB', latitude: 33.8938, longitude: 35.5018, timezone: 3 },
        { name: 'عمان', country: 'JO', latitude: 31.9454, longitude: 35.9284, timezone: 3 },
        { name: 'بغداد', country: 'IQ', latitude: 33.3152, longitude: 44.3661, timezone: 3 },
        { name: 'الكويت', country: 'KW', latitude: 29.3759, longitude: 47.9774, timezone: 3 },
        { name: 'الدوحة', country: 'QA', latitude: 25.2854, longitude: 51.5310, timezone: 3 },
        { name: 'مسقط', country: 'OM', latitude: 23.5880, longitude: 58.3829, timezone: 4 },
        { name: 'صنعاء', country: 'YE', latitude: 15.3694, longitude: 44.1910, timezone: 3 },
        { name: 'أبو ظبي', country: 'AE', latitude: 24.4539, longitude: 54.3773, timezone: 4 },
        { name: 'دبي', country: 'AE', latitude: 25.2048, longitude: 55.2708, timezone: 4 },
        { name: 'المنامة', country: 'BH', latitude: 26.2285, longitude: 50.5860, timezone: 3 }
    ];

    const defaultCalcMethodByCountry = {
        'MA': 'Morocco',
        'SA': 'Makkah',
        'EG': 'Egypt',
        'DZ': 'Algeria',
        'TN': 'Tunisia',
        'KW': 'Kuwait',
        'AE': 'Dubai',
        'QA': 'Qatar',
        'JO': 'Jordan',
        'PK': 'Karachi',
        'FR': 'France',
        'SG': 'Singapore'
    };

    // خوارزمية البحث عن أقرب مدينة مسجلة بالإحداثيات الجغرافية (100% أوفلاين) لعرض اسم الموقع بدقة
    function findClosestCity(lat, lng) {
        let closest = cities[0];
        let minDist = Infinity;
        cities.forEach(c => {
            // مسافة فيثاغورس بسيطة وكافية تماماً لتحديد أقرب مدينة في القائمة
            const dist = Math.pow(c.latitude - lat, 2) + Math.pow(c.longitude - lng, 2);
            if (dist < minDist) {
                minDist = dist;
                closest = c;
            }
        });
        return closest;
    }

    let currentCity = cities[0];
    try {
        const stored = localStorage.getItem('prayerCity');
        if (stored && stored !== 'undefined' && stored !== 'null') {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.name) {
                parsed.name = (typeof window.cleanLocationName === 'function')
                    ? window.cleanLocationName(parsed.name)
                    : parsed.name.replace(/\s*\(?\s*gps\s*\)?/gi, '').trim();
                currentCity = parsed;
            }
        }
    } catch (e) {
        console.error('Error loading prayerCity from localStorage:', e);
    }
    
    let countdownInterval = null;
    let currentPrayerTimes = null;

    // عناصر الواجهة الأساسية
    const cityDisplay = document.getElementById('cityDisplay');
    const calcMethodText = document.getElementById('calcMethodText');
    const currentDateHijri = document.getElementById('currentDateHijri');
    
    // نضمن دائماً تحديث اسم المدينة فور تحميل الصفحة وبدء التنفيذ
    if (cityDisplay && currentCity && currentCity.name) {
        cityDisplay.textContent = currentCity.name;
    }

    const nextPrayerNameEl = document.getElementById('nextPrayerName');
    const nextPrayerCountdownEl = document.getElementById('nextPrayerCountdown');
    const nextPrayerTimeEl = document.getElementById('nextPrayerTime');

    // 2. تحديث التاريخ الهجري الدقيق أوفلاين بالتكامل مع المحرك العام للتطبيق لتوحيد الحسابات
    function updateHijriDateDisplay() {
        if (typeof window.getOfflineHijriDate === 'function') {
            const hijriStr = window.getOfflineHijriDate();
            if (currentDateHijri) {
                const parts = hijriStr.split('،');
                const displayStr = parts[1] ? parts[1].trim() : hijriStr;
                currentDateHijri.textContent = displayStr;
            }
            return;
        }

        // حساب احتياطي متقدم في حال عدم توفر المحرك العام
        try {
            let hijriOffset = 0;
            if (typeof getAppSettings === 'function') {
                hijriOffset = parseInt(getAppSettings().hijriAdjustment || '0', 10);
            } else {
                hijriOffset = parseInt(localStorage.getItem('hijriAdjustment') || '0', 10);
            }

            const now = new Date();
            now.setDate(now.getDate() + hijriOffset);

            const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Asia/Riyadh'
            });
            const formatted = formatter.format(now);
            if (currentDateHijri) {
                currentDateHijri.textContent = formatted;
            }
        } catch (e) {
            if (currentDateHijri) {
                currentDateHijri.textContent = `٤ ربيع الأول ١٤٤٨ هـ`;
            }
        }
    }

    // 3. حساب أوقات الصلاة الفلكية الدقيقة باستخدام PrayTime
    function calculateAndDisplayPrayerTimes() {
        try {
            if (!currentCity || !currentCity.name) currentCity = cities[0];
            if (cityDisplay) cityDisplay.textContent = currentCity.name;

            let calcMethod = defaultCalcMethodByCountry[currentCity.country] || 'MWL';
            let madhab = 'maliki';
            let isDst = false;

            if (typeof getAppSettings === 'function') {
                const settings = getAppSettings();
                if (settings.calcMethod && settings.calcMethod !== 'auto') {
                    calcMethod = settings.calcMethod;
                }
                if (settings.madhab) madhab = settings.madhab;
                isDst = !!settings.daylightSaving;
            }

            const lat = currentCity.latitude || 21.4225;
            const lng = currentCity.longitude || 39.8262;

            if (typeof PrayTime !== 'undefined') {
                const pt = new PrayTime(calcMethod);
                const adjustParams = {
                    asr: (madhab === 'hanafi') ? 'Hanafi' : 'Standard',
                    dst: isDst
                };
                if (typeof currentCity.timezone === 'number') {
                    adjustParams.utcOffset = currentCity.timezone;
                }
                pt.adjust(adjustParams);
                pt.location([lat, lng]);

                const times = pt.getTimes(new Date());
                currentPrayerTimes = times;

                // عرض الأوقات في العناصر بسلامة تامة
                const prayerKeys = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
                prayerKeys.forEach(pKey => {
                    const el = document.getElementById(`${pKey}Time`);
                    if (el && times && times[pKey]) {
                        el.textContent = times[pKey];
                    }
                });

                // عرض طريقة الحساب
                if (calcMethodText) {
                    const methodObj = pt.methods[calcMethod];
                    const methodNameAr = methodObj ? methodObj.name : calcMethod;
                    calcMethodText.textContent = `طريقة الحساب: ${methodNameAr}`;
                }

                // خزن الأوقات محلياً
                localStorage.setItem('cachedPrayerTimes', JSON.stringify(times));
                localStorage.setItem('prayerCity', JSON.stringify(currentCity));

                // بدء العد التنازلي للصلاة القادمة بسلامة تامة
                startCountdown(times);
            }
        } catch (err) {
            console.error('Fatal error during prayer times calculation:', err);
        }
    }

    // 4. العد التنازلي الحقيقي للصلاة القادمة بسلامة تامة من الانهيار
    function startCountdown(times) {
        if (!times) return;
        if (countdownInterval) clearInterval(countdownInterval);

        const prayerOrder = [
            { key: 'Fajr', name: 'الفجر' },
            { key: 'Dhuhr', name: 'الظهر' },
            { key: 'Asr', name: 'العصر' },
            { key: 'Maghrib', name: 'المغرب' },
            { key: 'Isha', name: 'العشاء' }
        ];

        function updateTimer() {
            try {
                const now = new Date();
                const currentSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

                let nextPrayer = null;
                let nextPrayerTimeSecs = 0;

                for (let i = 0; i < prayerOrder.length; i++) {
                    const pKey = prayerOrder[i].key;
                    const timeStr = times[pKey];
                    if (!timeStr || !timeStr.includes(':')) continue;

                    const [h, m] = timeStr.split(':').map(Number);
                    const pSecs = h * 3600 + m * 60;

                    if (pSecs > currentSecs) {
                        nextPrayer = prayerOrder[i];
                        nextPrayerTimeSecs = pSecs;
                        break;
                    }
                }

                // إذا انتهت جميع صلوات اليوم، فالصلاة القادمة هي فجر الغد
                if (!nextPrayer) {
                    nextPrayer = prayerOrder[0];
                    const fajrStr = times.Fajr || '05:00';
                    const [h, m] = fajrStr.split(':').map(Number);
                    nextPrayerTimeSecs = 86400 + h * 3600 + m * 60;
                }

                let diffSecs = nextPrayerTimeSecs - currentSecs;
                if (diffSecs < 0) diffSecs += 86400;

                const hrs = Math.floor(diffSecs / 3600);
                const mins = Math.floor((diffSecs % 3600) / 60);
                const secs = diffSecs % 60;

                if (nextPrayerNameEl) nextPrayerNameEl.textContent = nextPrayer.name;
                if (nextPrayerTimeEl) nextPrayerTimeEl.textContent = `الساعة ${times[nextPrayer.key] || '--:--'}`;
                if (nextPrayerCountdownEl) {
                    nextPrayerCountdownEl.textContent = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                }

                // تمييز الكارت النشط والقادم
                document.querySelectorAll('.prayer-item').forEach(item => {
                    item.classList.remove('active', 'next');
                    const pName = item.getAttribute('data-prayer');
                    if (pName === nextPrayer.key) {
                        item.classList.add('next');
                    }
                });
            } catch (err) {
                console.error('Error inside updateTimer loop:', err);
            }
        }

        updateTimer();
        countdownInterval = setInterval(updateTimer, 1000);
    }

    // 5. إدارة مودال اختيار المدينة
    const changeCityBtn = document.getElementById('changeCityBtn');
    const cityModal = document.getElementById('cityModal');
    const cityModalClose = document.getElementById('cityModalClose');
    const cityModalInput = document.getElementById('cityModalInput');
    const citySuggestions = document.getElementById('citySuggestions');
    const detectGpsQuickBtn = document.getElementById('detectGpsQuickBtn');
    const detectLocationModalBtn = document.getElementById('detectLocationModalBtn');

    function openCityModal() {
        if (cityModal) cityModal.classList.add('active');
        renderCitySuggestions('');
    }

    function closeCityModal() {
        if (cityModal) cityModal.classList.remove('active');
    }

    function renderCitySuggestions(query) {
        if (!citySuggestions) return;
        citySuggestions.innerHTML = '';

        const filtered = cities.filter(c => c.name.includes(query) || c.country.includes(query));
        filtered.forEach(c => {
            const div = document.createElement('div');
            div.className = 'city-item';
            div.textContent = c.name;
            div.addEventListener('click', () => {
                currentCity = c;
                calculateAndDisplayPrayerTimes();
                closeCityModal();
            });
            citySuggestions.appendChild(div);
        });
    }

    if (changeCityBtn) changeCityBtn.addEventListener('click', openCityModal);
    if (cityModalClose) cityModalClose.addEventListener('click', closeCityModal);
    if (cityModalInput) {
        cityModalInput.addEventListener('input', (e) => {
            renderCitySuggestions(e.target.value.trim());
        });
    }

    // نظام تحديد الدولة تلقائياً من الإحداثيات الجغرافية (100% أوفلاين) لضبط طريقة الحساب بدقة
    function getCountryFromCoordinates(lat, lng) {
        if (lng >= -17 && lng < -1) return 'MA'; // المغرب
        if (lng >= -1 && lng < 12) return 'DZ';  // الجزائر / تونس
        if (lng >= 25 && lng < 35) return 'EG';  // مصر
        if (lng >= 35 && lng < 60) return 'SA';  // السعودية ودول الخليج العربي
        return 'SA'; // الافتراضي
    }

    // شريط تحديث الحالة التفاعلي الموحد (يدعم الكارت الرئيسي والمودال المنبثق)
    function showLocationStatus(msg, type = 'info') {
        const modalStatus = document.getElementById('modalLocationStatus');
        const cardStatus = document.getElementById('locationStatus');

        if (modalStatus) {
            modalStatus.style.display = 'block';
            if (type === 'success') {
                modalStatus.style.background = 'rgba(25, 135, 84, 0.15)';
                modalStatus.style.color = '#198754';
                modalStatus.style.border = '1px solid #198754';
            } else if (type === 'error') {
                modalStatus.style.background = 'rgba(220, 53, 69, 0.15)';
                modalStatus.style.color = '#dc3545';
                modalStatus.style.border = '1px solid #dc3545';
            } else {
                modalStatus.style.background = 'var(--color-bg-secondary)';
                modalStatus.style.color = 'var(--color-text)';
                modalStatus.style.border = '1px solid var(--color-border)';
            }
            modalStatus.textContent = msg;
        }

        if (cardStatus) {
            cardStatus.style.display = 'flex';
            const dot = cardStatus.querySelector('.status-dot');
            const text = cardStatus.querySelector('.status-text');
            if (text) text.textContent = msg;
            
            if (dot) {
                dot.className = 'status-dot';
                if (type === 'success') dot.classList.add('success');
                else if (type === 'error') {
                    dot.style.background = '#dc3545';
                } else {
                    dot.style.background = 'var(--color-primary)';
                }
            }

            if (type === 'success' || type === 'error') {
                setTimeout(() => {
                    cardStatus.style.display = 'none';
                }, 4500);
            }
        }
    }



    // تحديد الموقع التلقائي بدقة (مع المعالجة الهرمية والتنقية التامة)
    async function handleGpsDetection() {
        showLocationStatus('جاري تحديد موقعك الجغرافي بدقة...', 'info');

        if (window.Fur9anBridge && typeof window.Fur9anBridge.isAndroidWrapper === 'function' && window.Fur9anBridge.isAndroidWrapper()) {
            window.Fur9anBridge.requestNativeLocation();
            return;
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    const resolvedCountry = getCountryFromCoordinates(lat, lng);
                    const closestCity = findClosestCity(lat, lng);

                    let resolvedName = '';
                    if (typeof window.reverseGeocodeLocation === 'function') {
                        resolvedName = await window.reverseGeocodeLocation(lat, lng);
                    }
                    if (!resolvedName) {
                        resolvedName = (typeof window.cleanLocationName === 'function')
                            ? window.cleanLocationName(closestCity.name)
                            : closestCity.name.replace(/\s*\(?\s*gps\s*\)?/gi, '').trim();
                    }

                    currentCity = {
                        name: resolvedName,
                        country: resolvedCountry,
                        latitude: lat,
                        longitude: lng,
                        timezone: closestCity.timezone
                    };

                    calculateAndDisplayPrayerTimes();
                    showLocationStatus(`تم تحديد موقعك بدقة: ${resolvedName}`, 'success');
                    closeCityModal();
                },
                (err) => {
                    console.warn('Location detection error:', err);
                    let errMsg = 'تعذر تحديد الموقع الجغرافي تلقائياً؛ يرجى اختيار مدينتك يدوياً.';
                    
                    const isInIframe = window.self !== window.top;
                    if (err.code === 1) { // Permission Denied
                        if (isInIframe) {
                            errMsg = 'تم حجب الإذن بواسطة إطار المعاينة. يرجى فتح التطبيق في نافذة مستقلة لتفعيل طلب الإذن بنجاح.';
                        } else {
                            errMsg = 'تم رفض إذن تحديد الموقع. يرجى تفعيل إذن الموقع من إعدادات المتصفح وإعادة المحاولة.';
                        }
                    } else if (err.code === 2) { // Position Unavailable
                        errMsg = 'خدمة الموقع غير متوفرة حالياً. يرجى التأكد من تشغيل الموقع في جهازك أو اختيار المدينة يدوياً.';
                    } else if (err.code === 3) { // Timeout
                        errMsg = 'انتهت مهلة جلب الموقع. يرجى إعادة المحاولة أو اختيار مدينتك يدوياً.';
                    }
                    
                    showLocationStatus(errMsg, 'error');
                },
                { timeout: 10000, enableHighAccuracy: true }
            );
        } else {
            showLocationStatus('المتصفح لا يدعم تحديد الموقع التلقائي؛ يرجى اختيار المدينة يدوياً.', 'error');
        }
    }

    if (detectGpsQuickBtn) detectGpsQuickBtn.addEventListener('click', handleGpsDetection);
    if (detectLocationModalBtn) detectLocationModalBtn.addEventListener('click', handleGpsDetection);

    // 6. إدارة مودال الإعدادات والمذهب (Onboarding)
    const openPrayerSetupBtn = document.getElementById('openPrayerSetupBtn');
    const prayerOnboardingModal = document.getElementById('prayerOnboardingModal');
    const prayerOnboardingClose = document.getElementById('prayerOnboardingClose');
    const saveOnboardingBtn = document.getElementById('saveOnboardingBtn');

    if (openPrayerSetupBtn) {
        openPrayerSetupBtn.addEventListener('click', () => {
            if (prayerOnboardingModal) prayerOnboardingModal.style.display = 'flex';
            if (prayerOnboardingModal) prayerOnboardingModal.classList.add('active');
        });
    }

    if (prayerOnboardingClose) {
        prayerOnboardingClose.addEventListener('click', () => {
            if (prayerOnboardingModal) prayerOnboardingModal.style.display = 'none';
            if (prayerOnboardingModal) prayerOnboardingModal.classList.remove('active');
        });
    }

    if (saveOnboardingBtn) {
        saveOnboardingBtn.addEventListener('click', () => {
            const calcMethodSelect = document.getElementById('onboardingCalcMethodSelect');
            const hijriSelect = document.getElementById('onboardingHijriAdjustmentSelect');
            const selectedMadhabEl = document.querySelector('.madhab-card-option.selected');

            const newCalcMethod = calcMethodSelect ? calcMethodSelect.value : 'Morocco';
            const newHijri = hijriSelect ? hijriSelect.value : '0';
            const newMadhab = selectedMadhabEl ? selectedMadhabEl.dataset.madhab : 'maliki';

            let settings = {};
            if (typeof getAppSettings === 'function') settings = getAppSettings();

            settings.calcMethod = newCalcMethod;
            settings.hijriAdjustment = newHijri;
            settings.madhab = newMadhab;

            if (typeof saveAppSettings === 'function') saveAppSettings(settings);

            updateHijriDateDisplay();
            calculateAndDisplayPrayerTimes();

            if (prayerOnboardingModal) {
                prayerOnboardingModal.style.display = 'none';
                prayerOnboardingModal.classList.remove('active');
            }
        });
    }

    // كروت المذهب الفكهي
    document.querySelectorAll('.madhab-card-option').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.madhab-card-option').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        });
    });

    // 7. أذكار بعد الصلاة من ملف azkar.json
    let prayerAzkarList = [];
    let currentAzkarIdx = 0;
    let currentRemainingCount = 1;

    const azkarSlider = document.getElementById('azkarSlider');
    const azkarProgressFill = document.getElementById('azkarProgressFill');
    const prevAzkarBtn = document.getElementById('prevAzkarBtn');
    const nextAzkarBtn = document.getElementById('nextAzkarBtn');

    async function loadPrayerAzkarFromJson() {
        try {
            const response = await fetch('/data/json/azkar.json');
            if (response.ok) {
                const result = await response.json();
                const allItems = result.data || result;
                
                const filtered = allItems.filter(item => 
                    item.category === 'الأذكار بعد السلام من الصلاة'
                );

                if (filtered.length > 0) {
                    prayerAzkarList = filtered.map(item => ({
                        zekr: item.zekr || '',
                        count: parseInt(item.count, 10) || 1,
                        description: item.description || '',
                        reference: item.reference || ''
                    }));
                }
            }
        } catch (e) {
            console.warn('استخدام الأذكار المدمجة كبديل:', e);
        }

        if (!prayerAzkarList || prayerAzkarList.length === 0) {
            prayerAzkarList = [
                { zekr: 'أَسْتَغْفِرُ اللَّهَ (ثَلاَثاً)... اللَّهُمَّ أَنْتَ السَّلاَمُ وَمِنْكَ السَّلاَمُ، تَبَارَكْتَ يَا ذَا الجَلاَلِ وَالإِكْرَامِ.', count: 3, description: '', reference: 'صحيح مسلم' },
                { zekr: 'لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ المُلْكُ وَلَهُ الحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.', count: 1, description: '', reference: 'متفق عليه' },
                { zekr: 'سُبْحَانَ اللَّهِ', count: 33, description: '', reference: 'صحيح مسلم' },
                { zekr: 'الحَمْدُ لِلَّهِ', count: 33, description: '', reference: 'صحيح مسلم' },
                { zekr: 'اللَّهُ أَكْبَرُ', count: 33, description: '', reference: 'صحيح مسلم' },
                { zekr: 'لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ المُلْكُ وَلَهُ الحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ (تمام المائة)', count: 1, description: '', reference: 'صحيح مسلم' }
            ];
        }

        currentAzkarIdx = 0;
        currentRemainingCount = prayerAzkarList[0].count;
        renderCurrentAzkar();
    }

    function renderCurrentAzkar() {
        if (!azkarSlider || prayerAzkarList.length === 0) return;

        const currentItem = prayerAzkarList[currentAzkarIdx];
        if (!currentItem) return;

        const totalCount = currentItem.count || 1;

        azkarSlider.innerHTML = `
            <div class="azkar-card-content" style="display: flex; flex-direction: column; gap: 8px; align-items: center; text-align: center; cursor: pointer; padding: 12px 14px; width: 100%;">
                <div class="azkar-meta-top" style="display: flex; justify-content: space-between; width: 100%; font-size: 12px; color: var(--color-primary); font-weight: 700;">
                    <span class="azkar-index-badge"><i class="fa-solid fa-kaaba" style="margin-left: 4px;"></i> الذكر ${currentAzkarIdx + 1} من ${prayerAzkarList.length}</span>
                    <span class="azkar-ref-badge">${currentItem.reference || 'أذكار الصلاة'}</span>
                </div>
                
                <p class="azkar-text-main" style="font-size: 16.5px; line-height: 1.8; color: var(--color-text); font-weight: 700; margin: 6px 0; word-break: break-word;">${currentItem.zekr}</p>
                
                ${currentItem.description ? `<p class="azkar-desc-text" style="font-size: 12px; color: var(--color-text-lighter); margin: 0;">${currentItem.description}</p>` : ''}
                
                <div class="azkar-counter-action" style="margin-top: 6px; display: inline-flex; align-items: center; gap: 8px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 20px; padding: 6px 16px;">
                    <i class="fa-solid fa-fingerprint" style="color: var(--color-primary); font-size: 16px;"></i>
                    <span style="font-size: 13px; font-weight: 700; color: var(--color-text-light);">
                        المتبقي: <strong style="font-size: 16px; color: var(--color-primary);">${currentRemainingCount}</strong> / ${totalCount}
                    </span>
                </div>
            </div>
        `;

        if (azkarProgressFill) {
            const pct = ((currentAzkarIdx + 1) / prayerAzkarList.length) * 100;
            azkarProgressFill.style.width = `${pct}%`;
        }
    }

    function handleAzkarTap() {
        if (prayerAzkarList.length === 0) return;
        
        currentRemainingCount--;
        if (navigator.vibrate) navigator.vibrate(30);

        if (currentRemainingCount <= 0) {
            currentAzkarIdx = (currentAzkarIdx + 1) % prayerAzkarList.length;
            currentRemainingCount = prayerAzkarList[currentAzkarIdx].count || 1;
        }
        renderCurrentAzkar();
    }

    if (azkarSlider) {
        azkarSlider.addEventListener('click', handleAzkarTap);
    }

    if (prevAzkarBtn) {
        prevAzkarBtn.addEventListener('click', () => {
            currentAzkarIdx = (currentAzkarIdx - 1 + prayerAzkarList.length) % prayerAzkarList.length;
            currentRemainingCount = prayerAzkarList[currentAzkarIdx].count || 1;
            renderCurrentAzkar();
        });
    }

    if (nextAzkarBtn) {
        nextAzkarBtn.addEventListener('click', () => {
            currentAzkarIdx = (currentAzkarIdx + 1) % prayerAzkarList.length;
            currentRemainingCount = prayerAzkarList[currentAzkarIdx].count || 1;
            renderCurrentAzkar();
        });
    }

    // التهيئة الابتدائية
    calculateAndDisplayPrayerTimes();
    loadPrayerAzkarFromJson();
});
