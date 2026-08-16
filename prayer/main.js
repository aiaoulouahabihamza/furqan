/**
 * الفرقان - صفحة أوقات الصلاة
 */

// الثيم يُدار مركزياً عبر settings.js

// ===== التاريخ =====
function getOfflineHijriDate(date = new Date()) {
    if (typeof window.getOfflineHijriDate === 'function' && window.getOfflineHijriDate !== getOfflineHijriDate) {
        const res = window.getOfflineHijriDate(date);
        return (res && res.formatted) ? res.formatted : (res ? String(res) : '');
    }
    const d = new Date(date);
    const arabicDays = [
        "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"
    ];
    const weekday = arabicDays[d.getDay()];

    try {
        const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        let formatted = formatter.format(d);
        formatted = formatted.replace(/[٠-٩]/g, dNum => '٠١٢٣٤٥٦٧٨٩'.indexOf(dNum));
        formatted = formatted.replace(/،/g, '').replace(/\s*هـ\s*/g, '').replace(/\s+/g, ' ').trim();
        if (formatted) return `${weekday}، ${formatted} هـ`;
    } catch (e) {}

    let day = d.getDate();
    let month = d.getMonth() + 1;
    let year = d.getFullYear();

    if (month < 3) {
        year -= 1;
        month += 12;
    }

    let a = Math.floor(year / 100);
    let b = 2 - a + Math.floor(a / 4);
    let jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;

    let mydays = jd - 1948440 + 10632;
    let n = Math.floor((mydays - 1) / 10631);
    mydays = mydays - 10631 * n + 354;
    let j = (Math.floor((10985 - mydays) / 5316)) * (Math.floor((50 * mydays) / 17719)) + (Math.floor(mydays / 5670)) * (Math.floor((43 * mydays) / 15238));
    mydays = mydays - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
    let monthH = Math.floor((24 * mydays) / 709);
    let dayH = mydays - Math.floor((709 * monthH) / 24);
    let yearH = 30 * n + j - 30;

    const hijriMonths = [
        "محرم", "صفر", "ربيع الأول", "ربيع الآخر",
        "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
        "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
    ];

    const hMonth = hijriMonths[monthH - 1] || hijriMonths[0];

    return `${weekday}، ${dayH} ${hMonth} ${yearH} هـ`;
}

function updateDate() {
    const dateNow = new Date();
    const hijriEl = document.getElementById('currentDateHijri');
    const gregEl = document.getElementById('currentDateGregorian');
    const oldEl = document.getElementById('currentDate');

    let hijriStr = '';
    if (typeof window.getOfflineHijriDate === 'function') {
        const hObj = window.getOfflineHijriDate(dateNow);
        hijriStr = (hObj && hObj.formatted) ? hObj.formatted : (hObj ? String(hObj) : '');
    } else {
        hijriStr = getOfflineHijriDate(dateNow);
    }

    const gregStr = dateNow.toLocaleDateString('ar-EG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    if (hijriEl) hijriEl.textContent = hijriStr;
    if (gregEl) gregEl.textContent = gregStr;
    if (oldEl) oldEl.textContent = hijriStr;
}
updateDate();

// ===== قائمة المدن =====
const cities = [
    { name: 'مكة المكرمة', country: 'SA' },
    { name: 'المدينة المنورة', country: 'SA' },
    { name: 'الرياض', country: 'SA' },
    { name: 'جدة', country: 'SA' },
    { name: 'الدمام', country: 'SA' },
    { name: 'القاهرة', country: 'EG' },
    { name: 'الإسكندرية', country: 'EG' },
    { name: 'الدار البيضاء', country: 'MA' },
    { name: 'الرباط', country: 'MA' },
    { name: 'مراكش', country: 'MA' },
    { name: 'طنجة', country: 'MA' },
    { name: 'فاس', country: 'MA' },
    { name: 'تونس', country: 'TN' },
    { name: 'الجزائر', country: 'DZ' },
    { name: 'وهران', country: 'DZ' },
    { name: 'طرابلس', country: 'LY' },
    { name: 'الخرطوم', country: 'SD' },
    { name: 'دمشق', country: 'SY' },
    { name: 'بيروت', country: 'LB' },
    { name: 'عمان', country: 'JO' },
    { name: 'بغداد', country: 'IQ' },
    { name: 'الكويت', country: 'KW' },
    { name: 'الدوحة', country: 'QA' },
    { name: 'مسقط', country: 'OM' },
    { name: 'صنعاء', country: 'YE' },
    { name: 'أبو ظبي', country: 'AE' },
    { name: 'دبي', country: 'AE' },
    { name: 'المنامة', country: 'BH' },
];

let currentCity = JSON.parse(localStorage.getItem('prayerCity')) || cities[0];
let countdownInterval = null;
let refreshInterval = null;

document.getElementById('cityDisplay').textContent = currentCity.name;

// خريطة إحداثيات المدن للحساب الرياضي أوفلاين
const cityCoords = {
    'مكة المكرمة': { lat: 21.4225, lng: 39.8262 },
    'المدينة المنورة': { lat: 24.4672, lng: 39.6108 },
    'الرياض': { lat: 24.7136, lng: 46.6753 },
    'جدة': { lat: 21.5433, lng: 39.1728 },
    'الدمام': { lat: 26.4207, lng: 50.0888 },
    'القاهرة': { lat: 30.0444, lng: 31.2357 },
    'الإسكندرية': { lat: 31.2001, lng: 29.9187 },
    'الدار البيضاء': { lat: 33.5731, lng: -7.5898 },
    'الرباط': { lat: 34.0209, lng: -6.8416 },
    'مراكش': { lat: 31.6295, lng: -7.9811 },
    'طنجة': { lat: 35.7595, lng: -5.8340 },
    'فاس': { lat: 34.0331, lng: -5.0003 },
    'تونس': { lat: 36.8065, lng: 10.1815 },
    'الجزائر': { lat: 36.7538, lng: 3.0588 },
    'وهران': { lat: 35.6971, lng: -0.6308 },
    'طرابلس': { lat: 32.8872, lng: 13.1913 },
    'الخرطوم': { lat: 15.5007, lng: 32.5599 },
    'دمشق': { lat: 33.5138, lng: 36.2765 },
    'بيروت': { lat: 33.8938, lng: 35.5018 },
    'عمان': { lat: 31.9454, lng: 35.9284 },
    'بغداد': { lat: 33.3152, lng: 44.3661 },
    'الكويت': { lat: 29.3759, lng: 47.9774 },
    'الدوحة': { lat: 25.2854, lng: 51.5310 },
    'مسقط': { lat: 23.5880, lng: 58.3829 },
    'صنعاء': { lat: 15.3694, lng: 44.1910 },
    'أبو ظبي': { lat: 24.4539, lng: 54.3773 },
    'دبي': { lat: 25.2048, lng: 55.2708 },
    'المنامة': { lat: 26.2285, lng: 50.5860 }
};

function computeOfflinePrayerTimings(city, targetDate = new Date()) {
    let lat = city.latitude;
    let lng = city.longitude;
    if (!lat || !lng) {
        const found = cityCoords[city.name];
        if (found) {
            lat = found.lat;
            lng = found.lng;
        } else {
            lat = 21.4225;
            lng = 39.8262;
        }
    }
    
    const tz = -targetDate.getTimezoneOffset() / 60;
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();

    let a = Math.floor((14 - month) / 12);
    let y = year + 4800 - a;
    let m = month + 12 * a - 3;
    let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    let d = jd - 2451545.0;

    let g = (357.529 + 0.98560028 * d) % 360;
    let q = (280.459 + 0.98564736 * d) % 360;
    let L = (q + 1.915 * Math.sin(g * Math.PI / 180) + 0.020 * Math.sin(2 * g * Math.PI / 180)) % 360;

    let e = 23.439 - 0.00000036 * d;
    let ra = Math.atan2(Math.cos(e * Math.PI / 180) * Math.sin(L * Math.PI / 180), Math.cos(L * Math.PI / 180)) * 180 / Math.PI;
    ra = (ra + 360) % 360;

    let eqtime = (q - ra) / 15;
    let decl = Math.asin(Math.sin(e * Math.PI / 180) * Math.sin(L * Math.PI / 180)) * 180 / Math.PI;

    let dhuhr = 12 + tz - (lng / 15) - eqtime;

    const getHA = (angle) => {
        let cosHA = (Math.sin(angle * Math.PI / 180) - Math.sin(lat * Math.PI / 180) * Math.sin(decl * Math.PI / 180)) / 
                    (Math.cos(lat * Math.PI / 180) * Math.cos(decl * Math.PI / 180));
        if (cosHA > 1) return 2.1;
        if (cosHA < -1) return 2.1;
        return Math.acos(cosHA) * 180 / Math.PI / 15;
    };

    let fajrHA = getHA(-18.5);
    let sunriseHA = getHA(-0.833);
    let ishaHA = getHA(-17.5);

    let asrAngle = -Math.atan(1 + Math.tan(Math.abs(lat - decl) * Math.PI / 180)) * 180 / Math.PI;
    let asrHA = getHA(asrAngle);

    const fmt = (hrs) => {
        let h = Math.floor(hrs);
        let min = Math.floor((hrs - h) * 60);
        if (min < 0) min = 0;
        if (h < 0) h += 24;
        if (h >= 24) h %= 24;
        return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    };

    return {
        Fajr: fmt(dhuhr - fajrHA),
        Sunrise: fmt(dhuhr - sunriseHA),
        Dhuhr: fmt(dhuhr),
        Asr: fmt(dhuhr + asrHA),
        Maghrib: fmt(dhuhr + sunriseHA),
        Isha: fmt(dhuhr + ishaHA)
    };
}

// ===== حساب المواقيت أوفلاين بالكامل 100% باستخدام PrayTime.js المحلي والمذهب الفقهي =====
async function fetchPrayerTimes(city, date = null) {
    const targetDate = date || new Date();
    
    // جلب المذهب الفقهي وطريقة الحساب والتوقيت الصيفي من الإعدادات
    let calcMethod = 'Morocco';
    let madhab = 'maliki';
    let isDst = false;
    
    if (typeof getAppSettings === 'function') {
        const settings = getAppSettings();
        calcMethod = settings.calcMethod || 'Morocco';
        madhab = settings.madhab || 'maliki';
        isDst = !!settings.daylightSaving;
    }
    
    if (calcMethod === 'auto' || calcMethod === 'default') {
        if (typeof getDefaultCalcMethodForCountry === 'function') {
            calcMethod = getDefaultCalcMethodForCountry(city.country);
        } else {
            calcMethod = 'Morocco';
        }
    }

    // تمرير طريقة الحساب للواجهة إن وجدت
    const methodSelect = document.getElementById('calcMethodSelect');
    if (methodSelect && methodSelect.value !== calcMethod) {
        methodSelect.value = calcMethod;
    }
    
    try {
        let lat = city.latitude || 33.5731;
        let lng = city.longitude || -7.5898;
        
        // 1. استخدام دالة الحساب الأوفلاين الشاملة من praytime.js
        if (typeof window.calculateOfflinePrayerTimes === 'function') {
            const timings = window.calculateOfflinePrayerTimes(lat, lng, {
                method: calcMethod,
                calculationMethod: calcMethod,
                madhab: madhab,
                dst: isDst,
                date: targetDate
            });
            
            if (timings && timings.Fajr) {
                const todayFormatted = getFormattedTodayDate();
                const cacheKey = `cachedPrayerTimings_${city.name}_${todayFormatted}`;
                localStorage.setItem(cacheKey, JSON.stringify(timings));
                localStorage.setItem('cachedPrayerTimes', JSON.stringify(timings));
                
                displayPrayerTimes(timings);
                showStatus('success', `تم حساب المواقيت محلياً (أوفلاين) - ${city.name}`);
                
                // مزامنة مع أندرويد عبر الجسر
                if (window.Fur9anBridge && typeof window.Fur9anBridge.syncPrayerTimesToAndroid === 'function') {
                    window.Fur9anBridge.syncPrayerTimesToAndroid({
                        cityName: city.name,
                        timings: timings,
                        method: calcMethod,
                        madhab: madhab,
                        lat: lat,
                        lng: lng
                    });
                }
                return;
            }
        }

        // 2. محرك بديل محلي PrayTime
        if (typeof PrayTime !== 'undefined') {
            const pt = new PrayTime(calcMethod);
            const asrJuristic = (madhab === 'hanafi') ? 'Hanafi' : 'Standard';
            pt.adjust({ asr: asrJuristic });
            pt.location([lat, lng]);
            const rawTimes = pt.times(targetDate);
            
            if (rawTimes && rawTimes.fajr) {
                const formatTimeWithDst = (tStr, isD) => {
                    if (!tStr || !isD) return tStr;
                    const p = tStr.split(':');
                    if (p.length < 2) return tStr;
                    let h = (parseInt(p[0], 10) + 1) % 24;
                    return `${h < 10 ? '0' + h : h}:${p[1]}`;
                };

                let timings = {
                    Fajr: formatTimeWithDst(rawTimes.fajr, isDst),
                    Sunrise: formatTimeWithDst(rawTimes.sunrise, isDst),
                    Dhuhr: formatTimeWithDst(rawTimes.dhuhr, isDst),
                    Asr: formatTimeWithDst(rawTimes.asr, isDst),
                    Maghrib: formatTimeWithDst(rawTimes.maghrib, isDst),
                    Isha: formatTimeWithDst(rawTimes.isha, isDst)
                };
                
                localStorage.setItem('cachedPrayerTimes', JSON.stringify(timings));
                displayPrayerTimes(timings);
                showStatus('success', `تم الحساب محلياً - ${city.name}`);
                return;
            }
        }
    } catch (e) {
        console.error('خطأ أثناء حساب المواقيت:', e);
    }
    
    // في حال فشل المكتبة، استخدام الحساب الموحد
    if (typeof window.calculateUnifiedPrayerTimes === 'function') {
        const unified = window.calculateUnifiedPrayerTimes();
        if (unified && unified.timings) {
            displayPrayerTimes(unified.timings);
            showStatus('success', `تم التحديث (محلي) - ${unified.cityName}`);
        }
    }
}

// ===== عرض المواقيت =====
const prayerNames = {
    Fajr: 'الفجر',
    Dhuhr: 'الظهر',
    Asr: 'العصر',
    Maghrib: 'المغرب',
    Isha: 'العشاء'
};

const prayerKeys = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// ===== أصوات المؤذنين الخمسة/الأربعة =====
const reciterAudioMap = {
    makkah: {
        name: 'أذان الحرم المكي الشريف',
        desc: 'صوت الشيخ علي ملا - الحرم المكي',
        url: '/audio/adhan_makkah.mp3',
        fallbackUrl: 'https://raw.githubusercontent.com/IslamAlorabI/SalatTimes-MP3Adhan/main/Adhan/adhan_makkah.mp3'
    },
    qatami: {
        name: 'الشيخ ناصر القطامي',
        desc: 'أذان مؤثر ومميز بصوت الشيخ ناصر القطامي',
        url: '/audio/adhan_qatami.mp3',
        fallbackUrl: 'https://raw.githubusercontent.com/IslamAlorabI/SalatTimes-MP3Adhan/main/Adhan/naser_qotami2.mp3'
    },
    afasy: {
        name: 'الشيخ مشاري العفاسي',
        desc: 'أذان بصوت القارئ الشيخ مشاري بن راشد العفاسي',
        url: '/audio/adhan_afasy.mp3',
        fallbackUrl: 'https://raw.githubusercontent.com/IslamAlorabI/SalatTimes-MP3Adhan/main/Adhan/alafasi_new.mp3'
    }
};

function getSelectedReciterKey() {
    return localStorage.getItem('selectedAdhanReciter') || 'makkah';
}

function scheduleNativePrayerNotifications(timings) {
    if (!timings) return;
    if (!(window.cordova && window.cordova.plugins && window.cordova.plugins.notification && window.cordova.plugins.notification.local)) {
        return;
    }
    const localNotif = window.cordova.plugins.notification.local;

    localNotif.hasPermission((granted) => {
        if (!granted) {
            localNotif.requestPermission(() => {});
        }
    });

    const activeReciter = reciterAudioMap[getSelectedReciterKey()] || reciterAudioMap.makkah;

    localNotif.cancelAll(() => {
        const notifList = [];
        const now = new Date();

        prayerKeys.forEach((key, index) => {
            if (timings[key]) {
                const parts = timings[key].split(':');
                const pDate = new Date();
                pDate.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);

                if (pDate <= now) {
                    pDate.setDate(pDate.getDate() + 1);
                }

                // 1. أذان الصلاة الفعلي
                notifList.push({
                    id: 100 + index + 1,
                    title: `أذان صلاة ${prayerNames[key]}`,
                    text: `حان الآن موعد أذان صلاة ${prayerNames[key]} في ${currentCity.name}. (${activeReciter.name})`,
                    trigger: { at: pDate },
                    foreground: true,
                    vibrate: true,
                    sound: true,
                    priority: 2,
                    smallIcon: 'res://icon',
                    icon: 'res://icon',
                    data: { prayer: key, reciterUrl: activeReciter.url }
                });

                // 2. تنبيه قبل الصلاة بـ 5 دقائق
                const preDate = new Date(pDate.getTime() - 5 * 60 * 1000);
                if (preDate > now) {
                    notifList.push({
                        id: 200 + index + 1,
                        title: `اقتربت صلاة ${prayerNames[key]}`,
                        text: `متبقي 5 دقائق فقط على أذان صلاة ${prayerNames[key]} في ${currentCity.name}. استعد للوضوء والصلاة.`,
                        trigger: { at: preDate },
                        foreground: true,
                        vibrate: true,
                        sound: true,
                        priority: 1,
                        smallIcon: 'res://icon',
                        icon: 'res://icon'
                    });
                }
            }
        });

        if (notifList.length > 0) {
            localNotif.schedule(notifList);
            console.log('📱 [أندرويد] تم جدولة إشعارات الأذان بالنظام الأصلي بنجاح:', notifList.length);
        }
    });
}

function updateLocationCardDetails(city, timings) {
    const cityEl = document.getElementById('cityDisplay');
    if (cityEl) cityEl.textContent = city.name || 'موقعي الحالي';

    let methodKey = 'Morocco';
    if (typeof getAppSettings === 'function') {
        const settings = getAppSettings();
        methodKey = settings.calcMethod || 'Morocco';
    }

    const calcMethodNames = {
        Morocco: 'المملكة المغربية (وزارة الأوقاف)',
        Makkah: 'أم القرى - المملكة العربية السعودية',
        Egypt: 'الهيئة المصرية العامة للمساحة',
        Algeria: 'وزارة الشؤون الدينية - الجزائر',
        Tunisia: 'ديوان الإفتاء - تونس',
        Gulf: 'دول الخليج العربي الموحد',
        Kuwait: 'دولة الكويت',
        Qatar: 'دولة قطر',
        Jordan: 'المملكة الأردنية الهاشمية',
        Turkey: 'ديانت - تركيا',
        MWL: 'رابطة العالم الإسلامي',
        ISNA: 'الجمعية الإسلامية لشمال أمريكا',
        France: 'اتحاد المنظمات الإسلامية بفرنسا',
        Karachi: 'جامعة العلوم الإسلامية بكراتشي'
    };

    const methodTextEl = document.getElementById('calcMethodText');
    if (methodTextEl) {
        methodTextEl.textContent = `طريقة الحساب: ${calcMethodNames[methodKey] || methodKey}`;
    }
}

function displayPrayerTimes(timings) {
    if (typeof checkPrayerNotifications === 'function') {
        checkPrayerNotifications(timings);
    }
    scheduleNativePrayerNotifications(timings);
    updateLocationCardDetails(currentCity, timings);

    prayerKeys.forEach(key => {
        const timeElement = document.getElementById(`${key}Time`);
        if (timeElement && timings[key]) {
            timeElement.textContent = timings[key];
        }
    });
    
    const now = new Date();
    const prayerTimes = {};
    prayerKeys.forEach(key => {
        if (timings[key]) {
            const timeParts = timings[key].split(':');
            const date = new Date();
            date.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0);
            prayerTimes[key] = date;
        }
    });
    
    let nextPrayer = null;
    let nextPrayerKey = null;
    
    for (const key of prayerKeys) {
        if (prayerTimes[key] && prayerTimes[key] > now) {
            nextPrayer = prayerTimes[key];
            nextPrayerKey = key;
            break;
        }
    }
    
    if (!nextPrayer) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (timings.Fajr) {
            const timeParts = timings.Fajr.split(':');
            tomorrow.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0);
            nextPrayer = tomorrow;
            nextPrayerKey = 'Fajr';
        }
    }
    
    if (nextPrayer && nextPrayerKey) {
        document.getElementById('nextPrayerName').textContent = prayerNames[nextPrayerKey] || nextPrayerKey;
        document.getElementById('nextPrayerTime').textContent = timings[nextPrayerKey] || '--:--';
        updateCountdown(nextPrayer);
        
        document.querySelectorAll('.prayer-item').forEach(el => {
            el.classList.remove('active');
            const prayerKey = el.dataset.prayer;
            if (prayerKey === nextPrayerKey) {
                el.classList.add('active');
            }
        });
    }
    
    prayerKeys.forEach(key => {
        const remainingElement = document.getElementById(`${key}Remaining`);
        if (remainingElement && prayerTimes[key]) {
            const remaining = getTimeRemaining(prayerTimes[key]);
            if (remaining && remaining.total > 0) {
                const hours = remaining.hours > 0 ? `${remaining.hours}س ` : '';
                const minutes = remaining.minutes > 0 ? `${remaining.minutes}د ` : '';
                const seconds = remaining.seconds > 0 ? `${remaining.seconds}ث` : '';
                remainingElement.textContent = hours + minutes + seconds || '0ث';
            } else {
                const isPast = prayerTimes[key] < new Date();
                remainingElement.textContent = isPast ? 'تم' : '--';
            }
        }
    });
}

function getTimeRemaining(targetTime) {
    const now = new Date();
    const diff = targetTime - now;
    if (diff <= 0) return null;
    return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        total: diff
    };
}

function updateCountdown(targetTime) {
    if (countdownInterval) clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
        const remaining = getTimeRemaining(targetTime);
        const element = document.getElementById('nextPrayerCountdown');
        
        if (remaining && remaining.total > 0) {
            const h = remaining.hours.toString().padStart(2, '0');
            const m = remaining.minutes.toString().padStart(2, '0');
            const s = remaining.seconds.toString().padStart(2, '0');
            element.textContent = `${h}:${m}:${s}`;
        } else {
            element.textContent = '00:00:00';
            clearInterval(countdownInterval);
            refreshPrayerTimes();
        }
    }, 1000);
}

// ===== تحديث المواقيت =====
async function refreshPrayerTimes() {
    await fetchPrayerTimes(currentCity);
}

// ===== حالة الموقع =====
function showStatus(type, message) {
    const statusElement = document.getElementById('locationStatus');
    if (!statusElement) return;
    const dot = statusElement.querySelector('.status-dot');
    const text = statusElement.querySelector('.status-text');
    if (!dot || !text) return;
    
    dot.className = 'status-dot';
    if (type === 'loading') dot.classList.add('loading');
    else if (type === 'success') dot.classList.add('success');
    else if (type === 'error') dot.classList.add('error');
    
    text.textContent = message;
}

// ===== تحديد الموقع =====
async function handleLocationSuccess(cityName, countryCode, lat = null, lng = null) {
    let foundCity = cities.find(c => c.name === cityName);
    if (!foundCity) {
        foundCity = { name: cityName, country: countryCode };
        cities.push(foundCity);
    }
    
    if (lat !== null && lng !== null) {
        foundCity.latitude = lat;
        foundCity.longitude = lng;
    }
    
    currentCity = foundCity;
    localStorage.setItem('prayerCity', JSON.stringify(currentCity));
    document.getElementById('cityDisplay').textContent = cityName;
    
    showStatus('success', `تم تحديد الموقع: ${cityName}`);
    await refreshPrayerTimes();
}

function setModalButtonLoading(isLoading) {
    const btn = document.getElementById('detectLocationModalBtn');
    if (!btn) return;
    if (isLoading) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري تحديد الموقع الجغرافي...';
    } else {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-crosshairs"></i> تحديد الموقع تلقائيا';
    }
}

function showModalStatus(type, message) {
    const el = document.getElementById('modalLocationStatus');
    if (!el) return;
    if (type === 'hide') {
        el.style.display = 'none';
        return;
    }
    el.style.display = 'block';
    el.innerHTML = message;
    
    if (type === 'loading') {
        el.style.background = 'rgba(243, 156, 18, 0.1)';
        el.style.color = '#F39C12';
        el.style.border = '1px solid rgba(243, 156, 18, 0.2)';
    } else if (type === 'success') {
        el.style.background = 'rgba(46, 204, 113, 0.1)';
        el.style.color = '#2ECC71';
        el.style.border = '1px solid rgba(46, 204, 113, 0.2)';
    } else if (type === 'error') {
        el.style.background = 'rgba(231, 76, 60, 0.1)';
        el.style.color = '#E74C3C';
        el.style.border = '1px solid rgba(231, 76, 60, 0.2)';
    }
}

// تم إيقاف تحديد الموقع الاحتياطي عبر الـ IP (الشبكة) بناءً على طلب المستخدم الصارم
async function detectLocationByIP(isFromModal = false) {
    if (isFromModal) {
        showModalStatus('error', '<i class="fa-solid fa-triangle-exclamation"></i> عذراً، تحديد الموقع عبر الشبكة (IP) مرفوض. يرجى تفعيل الـ GPS (تحديد الموقع الدقيق) فقط.');
        setModalButtonLoading(false);
    } else {
        showStatus('error', 'تحديد الموقع عبر الشبكة مرفوض، يرجى تفعيل الـ GPS.');
    }
    
    // استخدام مكة المكرمة كخيار افتراضي في حال عدم وجود الـ GPS
    const fallbackCity = cities[0];
    await handleLocationSuccess(fallbackCity.name, fallbackCity.country, fallbackCity.latitude, fallbackCity.longitude);
    return false;
}

function detectLocation(isFromModal = false) {
    if (isFromModal) {
        setModalButtonLoading(true);
        showModalStatus('loading', '<i class="fa-solid fa-spinner fa-spin"></i> يرجى إعطاء إذن الموقع الجغرافي عالي الدقة (GPS)...');
    } else {
        showStatus('loading', 'جاري تحديد الموقع الجغرافي عالي الدقة عبر الـ GPS...');
    }
    
    if (!navigator.geolocation) {
        console.warn('المتصفح لا يدعم GPS المباشر، جاري التحديد الذكي عبر الشبكة...');
        showNativeLocationErrorAlert('خدمة الـ GPS غير مدعومة في هذا الجهاز، تم استخدام التحديد عبر الشبكة.');
        detectLocationByIP(isFromModal);
        return;
    }

    const optionsFresh = {
        enableHighAccuracy: true, // تفعيل الدقة العالية المباشرة
        timeout: 10000,           // مهلة 10 ثوانٍ لالتقاط إشارة GPS
        maximumAge: 0             // موقع جديد تماماً بدقة متناهية
    };

    const successCallback = async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        if (isFromModal) {
            showModalStatus('loading', '<i class="fa-solid fa-circle-notch fa-spin"></i> تم التقاط إحداثيات GPS بنجاح، جاري استخراج اسم المدينة...');
        } else {
            showStatus('loading', 'تم تحديد إحداثيات GPS بنجاح، جاري تحديد المدينة...');
        }
        
        let cityName = '';
        let countryCode = 'MA';
        
        // 1. المحاولة الأولى لجلب اسم المدينة عبر BigDataCloud
        try {
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ar`);
            const data = await response.json();
            cityName = data.city || data.locality || data.principalSubdivision;
            countryCode = data.countryCode || 'MA';
        } catch (error) {
            console.warn('فشل جلب اسم المدينة من BigDataCloud، سنحاول عبر البديل:', error);
        }
        
        // 2. المحاولة الثانية لجلب اسم المدينة عبر OpenStreetMap (Nominatim)
        if (!cityName || cityName.trim() === '') {
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=ar`, {
                    headers: { 'User-Agent': 'MishkatPrayerApp/1.0' }
                });
                const data = await response.json();
                if (data && data.address) {
                    cityName = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.state;
                    countryCode = data.address.country_code ? data.address.country_code.toUpperCase() : 'MA';
                }
            } catch (error) {
                console.error('فشل جلب اسم المدينة من البديل Nominatim:', error);
            }
        }
        
        if (!cityName) {
            cityName = 'موقعي الحالي';
        }
        
        await handleLocationSuccess(cityName, countryCode, lat, lng);
        
        if (isFromModal) {
            showModalStatus('success', `<i class="fa-solid fa-circle-check"></i> تم تحديد الموقع بالـ GPS بنجاح: <strong>${cityName}</strong>`);
            setModalButtonLoading(false);
            setTimeout(() => {
                closeCityModal();
                showModalStatus('hide', '');
            }, 1500);
        }
    };

    const handleFinalError = (error) => {
        console.warn('خطأ في الـ GPS الجغرافي:', error);
        
        let errorMsg = 'تعذر الوصول لإحداثيات GPS. يرجى التأكد من تفعيل خدمة الموقع (GPS) في إعدادات الهاتف.';
        if (error && error.code === 1) {
            errorMsg = 'تم رفض إذن الوصول للموقع الجغرافي. يرجى تفعيل إذن الموقع من إعدادات تطبيق أندرويد.';
        } else if (error && error.code === 2) {
            errorMsg = 'موقع GPS غير متوفر حالياً. يرجى التأكد من تفعيل الموقع ثم المحاولة مجدداً.';
        } else if (error && error.code === 3) {
            errorMsg = 'انتهت مهلة استرجاع الموقع الجغرافي عبر الـ GPS.';
        }

        showNativeLocationErrorAlert(errorMsg);
        
        // الانتقال للبحث الاحتياطي المباشر عبر الشبكة لعدم تعطل تجربة المستخدم
        detectLocationByIP(isFromModal);
    };

    try {
        navigator.geolocation.getCurrentPosition(
            successCallback,
            handleFinalError,
            optionsFresh
        );
    } catch (outerErr) {
        handleFinalError(outerErr);
    }
}

function showNativeLocationErrorAlert(message) {
    if (window.navigator && window.navigator.notification && window.navigator.notification.alert) {
        // تنبيه الأندرويد الأصلي عبر كوردوفا (Native Android Dialog)
        window.navigator.notification.alert(
            message,
            null,
            'تحديد الموقع الجغرافي',
            'موافق'
        );
    } else {
        // تنبيه التطبيق الأنيق داخل الواجهة
        showNotificationToast('تنبيه الموقع الجغرافي', message, 'fa-solid fa-triangle-exclamation');
    }
}

// ===== تغيير المدينة =====
const cityModal = document.getElementById('cityModal');
const cityModalClose = document.getElementById('cityModalClose');
const cityModalInput = document.getElementById('cityModalInput');
const citySuggestions = document.getElementById('citySuggestions');

function openCityModal() {
    cityModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    cityModalInput.value = '';
    cityModalInput.focus();
    showCitySuggestions('');
}

function closeCityModal() {
    cityModal.classList.remove('active');
    document.body.style.overflow = '';
}

document.getElementById('changeCityBtn').addEventListener('click', openCityModal);
cityModalClose.addEventListener('click', closeCityModal);
cityModal.addEventListener('click', (e) => {
    if (e.target === cityModal) closeCityModal();
});

cityModalInput.addEventListener('input', function() {
    showCitySuggestions(this.value.trim());
});

let searchTimeout = null;

function showCitySuggestions(query) {
    // 1. عرض النتائج المحلية فوراً لسرعة فائقة واستجابة ممتازة
    const filteredLocal = cities.filter(city => city.name.includes(query) || query === '');
    
    let localHtml = filteredLocal.map(city => `
        <button class="city-suggestion" data-city="${city.name}" data-country="${city.country}" data-lat="${city.latitude || ''}" data-lng="${city.longitude || ''}">
            <i class="fa-solid fa-map-pin" style="margin-left: 8px; color: var(--color-primary); opacity: 0.7;"></i>
            ${city.name} (${city.country === 'MA' ? 'المغرب' : city.country})
        </button>
    `).join('');

    if (query === '') {
        citySuggestions.innerHTML = localHtml;
        setupSuggestionClickListeners();
        return;
    }

    // إذا كان هناك نص بحث، نعرض النتائج المحلية ونضيف مؤشر جاري البحث عبر الإنترنت
    citySuggestions.innerHTML = `
        ${localHtml}
        <div id="onlineSearchStatus" style="width:100%; text-align:center; color:var(--color-text-lighter); padding:12px; font-size:13px; border-top:1px dashed rgba(0,0,0,0.1);">
            <i class="fa-solid fa-circle-notch fa-spin"></i> جاري البحث الموسع في جميع مدن وقرى العالم...
        </div>
    `;
    setupSuggestionClickListeners();

    // إلغاء أي طلب بحث معلق (Debounce) لعدم إغراق الخادم بالطلبات
    if (searchTimeout) clearTimeout(searchTimeout);

    searchTimeout = setTimeout(async () => {
        try {
            // البحث عبر Nominatim لمدن وقرى العالم وبدعم كامل للعربية
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&accept-language=ar&limit=8`, {
                headers: { 'User-Agent': 'MishkatPrayerApp/1.0' }
            });
            const data = await response.json();
            
            const statusEl = document.getElementById('onlineSearchStatus');
            if (!statusEl) return; // تم إغلاق المودال أو تغير البحث

            if (data && data.length > 0) {
                // تصفية النتائج لتجنب التكرار وعرض اسم نظيف ومختصر
                const onlineHtml = data.map(item => {
                    const fullName = item.display_name;
                    // استخراج الاسم القصير (المدينة والمقاطعة والدولة)
                    const parts = fullName.split(',');
                    const cleanName = parts.slice(0, 3).join(',').trim();
                    const countryCode = item.address && item.address.country_code ? item.address.country_code.toUpperCase() : 'Global';
                    
                    return `
                        <button class="city-suggestion online-result" data-city="${parts[0].trim()}" data-full-name="${cleanName}" data-country="${countryCode}" data-lat="${item.lat}" data-lng="${item.lon}">
                            <i class="fa-solid fa-globe" style="margin-left: 8px; color: #3498db;"></i>
                            <strong>${parts[0].trim()}</strong> <span style="font-size:11px; opacity:0.8; display:block; text-align:right; margin-top:2px;">${cleanName}</span>
                        </button>
                    `;
                }).join('');

                statusEl.outerHTML = `
                    <div style="width:100%; text-align:right; color:var(--color-primary); padding:6px 12px 2px; font-size:11px; font-weight:bold; border-top:1px dashed rgba(0,0,0,0.05); letter-spacing:0.5px;">
                        نتائج البحث عبر الإنترنت:
                    </div>
                    ${onlineHtml}
                `;
            } else {
                if (filteredLocal.length === 0) {
                    statusEl.outerHTML = `
                        <div style="width:100%; text-align:center; color:var(--color-text-lighter); padding:12px;">
                            <i class="fa-solid fa-circle-exclamation"></i> لم نجد أي مدينة بهذا الاسم. جرب كتابة اسم المدينة بشكل آخر.
                        </div>
                    `;
                } else {
                    statusEl.remove();
                }
            }
            setupSuggestionClickListeners();
        } catch (error) {
            console.error('خطأ في البحث عن المدينة عبر الإنترنت:', error);
            const statusEl = document.getElementById('onlineSearchStatus');
            if (statusEl) {
                if (filteredLocal.length === 0) {
                    statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> حدث خطأ في الاتصال بالإنترنت لبحث المدن.';
                } else {
                    statusEl.remove();
                }
            }
        }
    }, 600); // 600ms debounce
}

function setupSuggestionClickListeners() {
    document.querySelectorAll('.city-suggestion').forEach(btn => {
        // تجنب تكرار المستمعات عن طريق استبدال العنصر بنسخة جديدة منه
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
    });

    document.querySelectorAll('.city-suggestion').forEach(btn => {
        btn.addEventListener('click', function() {
            const name = this.dataset.city;
            const country = this.dataset.country;
            const fullName = this.dataset.fullName || name;
            const lat = this.dataset.lat;
            const lng = this.dataset.lng;

            if (lat && lng) {
                // مدينة مخصصة بالإحداثيات من الخريطة
                currentCity = {
                    name: fullName,
                    country: country,
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lng)
                };
            } else {
                // مدينة من القائمة المحلية الثابتة
                currentCity = cities.find(c => c.name === name && c.country === country) || { name, country };
            }

            localStorage.setItem('prayerCity', JSON.stringify(currentCity));
            document.getElementById('cityDisplay').textContent = name;
            closeCityModal();
            showStatus('success', `تم التغيير إلى: ${name}`);
            refreshPrayerTimes();
        });
    });
}

document.getElementById('detectLocationModalBtn').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    detectLocation(true);
});

// إعداد حدث تغيير طريقة الحساب الفلكي
const calcMethodSelect = document.getElementById('calcMethodSelect');
if (calcMethodSelect) {
    calcMethodSelect.addEventListener('change', () => {
        const method = calcMethodSelect.value;
        localStorage.setItem('prayerCalcMethod', method);
        // إعادة تحميل أوقات الصلاة بالمدينة الحالية
        fetchPrayerTimes(currentCity, new Date());
    });
}

// ===== إخفاء الهيدر =====
let lastScroll = 0;
const header = document.getElementById('mainHeader');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll > 80 && currentScroll > lastScroll) {
        header.style.transform = 'translateY(-100%)';
    } else {
        header.style.transform = 'translateY(0)';
    }
    lastScroll = currentScroll;
});

// ===== مشغل الأذان =====
let adhanAudio = null;
let isAdhanPlaying = false;

function initAdhanPlayer() {
    const playBtn = document.getElementById('playAdhanBtn');
    const reciterSelect = document.getElementById('reciterSelect');
    const titleEl = document.getElementById('selectedReciterTitle');

    if (!playBtn) return;

    // تهيئة القيمة المخزنة
    const savedReciter = getSelectedReciterKey();
    if (reciterSelect) {
        reciterSelect.value = savedReciter;
        const currentData = reciterAudioMap[savedReciter] || reciterAudioMap.makkah;
        if (titleEl) titleEl.textContent = currentData.name;
    }

    if (reciterSelect) {
        reciterSelect.addEventListener('change', () => {
            const chosenKey = reciterSelect.value;
            localStorage.setItem('selectedAdhanReciter', chosenKey);
            const chosenData = reciterAudioMap[chosenKey] || reciterAudioMap.makkah;
            
            if (titleEl) titleEl.textContent = chosenData.name;

            // إذا كان الأذان يعمل حالياً، نوقفه
            if (adhanAudio && isAdhanPlaying) {
                adhanAudio.pause();
                isAdhanPlaying = false;
                playBtn.classList.remove('playing');
                playBtn.innerHTML = '<i class="fa-solid fa-play"></i> <span>تجربة الأذان</span>';
            }
            adhanAudio = null;

            // إعادة جدولة إشعارات الأذان بالصوت الجديد
            const cacheKey = `cachedPrayerTimings_${currentCity.name}_${getFormattedTodayDate()}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    scheduleNativePrayerNotifications(JSON.parse(cached));
                } catch(e) {}
            }
        });
    }

    playBtn.addEventListener('click', () => {
        const activeKey = getSelectedReciterKey();
        const activeData = (window.ADHAN_RECITERS || []).find(r => r.id === activeKey) || reciterAudioMap[activeKey] || reciterAudioMap.makkah;

        if (isAdhanPlaying && adhanAudio) {
            adhanAudio.pause();
            isAdhanPlaying = false;
            playBtn.classList.remove('playing');
            playBtn.innerHTML = '<i class="fa-solid fa-play"></i> <span>تجربة الأذان</span>';
            adhanAudio = null;
            return;
        }

        if (typeof window.playAdhanWithFallbacks === 'function') {
            adhanAudio = window.playAdhanWithFallbacks(activeKey, {
                onStart: () => {
                    isAdhanPlaying = true;
                    playBtn.classList.add('playing');
                    playBtn.innerHTML = '<i class="fa-solid fa-stop"></i> <span>إيقاف الأذان</span>';
                },
                onEnded: () => {
                    isAdhanPlaying = false;
                    playBtn.classList.remove('playing');
                    playBtn.innerHTML = '<i class="fa-solid fa-play"></i> <span>تجربة الأذان</span>';
                    adhanAudio = null;
                },
                onError: () => {
                    isAdhanPlaying = false;
                    playBtn.classList.remove('playing');
                    playBtn.innerHTML = '<i class="fa-solid fa-play"></i> <span>تجربة الأذان</span>';
                    adhanAudio = null;
                    showNotificationToast('تنبيه الأذان', 'تعذر تشغيل الصوت، يرجى النقر على الصفحة للسماح بتشغيل الصوت.', 'fa-solid fa-volume-xmark');
                }
            });
        } else {
            adhanAudio = new Audio(activeData.file || activeData.url);
            adhanAudio.addEventListener('ended', () => {
                isAdhanPlaying = false;
                playBtn.classList.remove('playing');
                playBtn.innerHTML = '<i class="fa-solid fa-play"></i> <span>تجربة الأذان</span>';
                adhanAudio = null;
            });
            adhanAudio.play().then(() => {
                isAdhanPlaying = true;
                playBtn.classList.add('playing');
                playBtn.innerHTML = '<i class="fa-solid fa-stop"></i> <span>إيقاف الأذان</span>';
            }).catch(() => {
                isAdhanPlaying = false;
                playBtn.classList.remove('playing');
                playBtn.innerHTML = '<i class="fa-solid fa-play"></i> <span>تجربة الأذان</span>';
            });
        }
    });
}

// ===== أذكار بعد الصلاة =====
let postPrayerAzkar = [
    { text: "أَسْتَغْفِرُ اللهَ (ثَلَاثًا)<br>اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ ذَا الْجَلَالِ وَالْإِكْرَامِ.", count: 3, current: 0, source: "رواه مسلم" },
    { text: "لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ، لَا إِلَهَ إِلَّا اللهُ، وَلَا نَعْبُدُ إِلَّا إِيَّاهُ، لَهُ النِّعْمَةُ وَلَهُ الْفَضْلُ وَلَهُ الثَّنَاءُ الْحَسَنُ.", count: 1, current: 0, source: "رواه مسلم" },
    { text: "سُبْحَانَ اللهِ", count: 33, current: 0, source: "رواه البخاري ومسلم" },
    { text: "الْحَمْدُ للهِ", count: 33, current: 0, source: "رواه البخاري ومسلم" },
    { text: "اللهُ أَكْبَرُ", count: 33, current: 0, source: "رواه البخاري ومسلم" },
    { text: "لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ (لِتَمَامِ الْمِائَةِ)", count: 1, current: 0, source: "رواه مسلم" },
    { text: "أَعُوذُ بِاللهِ مِنَ الشَّيْطَانِ الرَّجِيمِ<br>﴿اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...﴾", count: 1, current: 0, source: "سورة البقرة - آية الكرسي" }
];

async function loadPostPrayerAzkarFromJSON() {
    try {
        const response = await fetch('/data/json/azkar.json');
        const json = await response.json();
        if (json && json.data) {
            const filtered = json.data.filter(item => 
                item.category && (item.category.includes('بعد الصلاة') || item.category.includes('الصلاة'))
            );
            if (filtered.length > 0) {
                postPrayerAzkar = filtered.map(item => ({
                    text: item.zekr,
                    count: parseInt(item.count, 10) || 1,
                    current: 0,
                    source: item.reference || item.description || 'من الأذكار النبوية'
                }));
                activeAzkarIndex = 0;
                renderAzkar();
            }
        }
    } catch (e) {
        console.warn('تعذر تحميل الأذكار من الملف المركزي، استخدام الأذكار المخزنة محلياً:', e);
    }
}

let activeAzkarIndex = 0;

function renderAzkar() {
    const slider = document.getElementById('azkarSlider');
    if (!slider) return;
    slider.innerHTML = '';
    
    postPrayerAzkar.forEach((zkr, idx) => {
        const slide = document.createElement('div');
        slide.className = `azkar-slide ${idx === activeAzkarIndex ? 'active' : ''}`;
        slide.id = `azkarSlide_${idx}`;
        
        const textDiv = document.createElement('div');
        textDiv.className = 'azkar-text-arabic';
        textDiv.innerHTML = zkr.text;
        
        const sourceSpan = document.createElement('span');
        sourceSpan.className = 'azkar-source';
        sourceSpan.textContent = zkr.source;
        
        const counterWrapper = document.createElement('div');
        counterWrapper.className = 'azkar-counter-wrapper';
        
        const countBtn = document.createElement('button');
        countBtn.className = `btn-azkar-count ${zkr.current >= zkr.count ? 'done' : ''}`;
        countBtn.id = `btnZkrCount_${idx}`;
        
        if (zkr.current >= zkr.count) {
            countBtn.innerHTML = '<i class="fa-solid fa-check"></i> تم الانتهاء';
        } else {
            countBtn.innerHTML = `<i class="fa-solid fa-fingerprint"></i> <span class="count-num">${zkr.current}/${zkr.count}</span>`;
        }
        
        countBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (zkr.current < zkr.count) {
                zkr.current++;
                if (navigator.vibrate) {
                    navigator.vibrate(30);
                }
                
                if (zkr.current >= zkr.count) {
                    countBtn.classList.add('done');
                    countBtn.innerHTML = '<i class="fa-solid fa-check"></i> تم الانتهاء';
                    setTimeout(() => {
                        if (activeAzkarIndex < postPrayerAzkar.length - 1) {
                            navigateAzkar(1);
                        }
                    }, 600);
                } else {
                    countBtn.querySelector('.count-num').textContent = `${zkr.current}/${zkr.count}`;
                }
                updateAzkarProgress();
            }
        });
        
        counterWrapper.appendChild(countBtn);
        
        slide.appendChild(textDiv);
        slide.appendChild(sourceSpan);
        slide.appendChild(counterWrapper);
        
        slider.appendChild(slide);
    });
    
    updateAzkarProgress();
}

function navigateAzkar(direction) {
    const slides = document.querySelectorAll('.azkar-slide');
    if (slides.length === 0) return;
    
    slides[activeAzkarIndex].classList.remove('active');
    
    activeAzkarIndex += direction;
    if (activeAzkarIndex >= postPrayerAzkar.length) {
        activeAzkarIndex = 0;
    } else if (activeAzkarIndex < 0) {
        activeAzkarIndex = postPrayerAzkar.length - 1;
    }
    
    slides[activeAzkarIndex].classList.add('active');
    updateAzkarProgress();
}

function updateAzkarProgress() {
    const progressFill = document.getElementById('azkarProgressFill');
    if (!progressFill) return;
    const percentage = ((activeAzkarIndex + 1) / postPrayerAzkar.length) * 100;
    progressFill.style.width = `${percentage}%`;
}

function initAzkarSlider() {
    renderAzkar();
    
    const prevBtn = document.getElementById('prevAzkarBtn');
    const nextBtn = document.getElementById('nextAzkarBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            navigateAzkar(-1);
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            navigateAzkar(1);
        });
    }
}

// ===== الإشعارات والتنبيهات (5 دقائق قبل الأذان) =====
let notifiedPrayers = {};

function playNotificationChime() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
        console.warn('Chime play error:', e);
    }
}

function showNotificationToast(title, body, iconClass = 'fa-solid fa-bell') {
    const oldNotif = document.getElementById('prayerNotifToast');
    if (oldNotif) oldNotif.remove();

    const toast = document.createElement('div');
    toast.className = 'prayer-notification-toast';
    toast.id = 'prayerNotifToast';

    toast.innerHTML = `
        <div class="notif-content-wrapper">
            <div class="notif-icon-wrapper">
                <i class="${iconClass}"></i>
            </div>
            <div class="notif-text">
                <span class="notif-title">${title}</span>
                <span class="notif-body">${body}</span>
            </div>
        </div>
        <button class="btn-close-notif" id="closeNotifToastBtn">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    document.body.appendChild(toast);

    // إرسال إشعار نظام حقيقي على الأندرويد عبر كوردوفا (Real Native System Notification)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.notification && window.cordova.plugins.notification.local) {
        try {
            window.cordova.plugins.notification.local.schedule({
                id: Math.floor(Math.random() * 100000),
                title: title,
                text: body,
                foreground: true,
                badge: 1,
                vibrate: true,
                sound: true,
                smallIcon: 'res://icon',
                icon: 'res://icon'
            });
            console.log('🔔 تم إرسال إشعار نظام أندرويد حقيقي: ' + title);
        } catch(err) {
            console.error('❌ فشل إرسال إشعار النظام الحقيقي:', err);
        }
    }

    playNotificationChime();

    const closeBtn = document.getElementById('closeNotifToastBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toast.style.animation = 'slideDownIn 0.3s reverse forwards';
            setTimeout(() => toast.remove(), 300);
        });
    }

    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideDownIn 0.3s reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 15000);
}

function checkPrayerNotifications(timings) {
    if (!timings) return;
    
    const now = new Date();
    const todayStr = now.toDateString();
    
    prayerKeys.forEach(key => {
        if (timings[key]) {
            const timeParts = timings[key].split(':');
            const prayerTime = new Date();
            prayerTime.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
            
            const diffMs = prayerTime - now;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const notifyKey = `${todayStr}_${key}`;
            
            if (diffMins === 5 && !notifiedPrayers[notifyKey]) {
                notifiedPrayers[notifyKey] = true;
                const arabicName = prayerNames[key] || key;
                showNotificationToast(
                    `اقترب موعد صلاة ${arabicName}`, 
                    `متبقي 5 دقائق فقط على صلاة ${arabicName}. استعد للوضوء والصلاة.`,
                    'fa-solid fa-clock'
                );
            }
        }
    });
}

function getFormattedTodayDate() {
    const targetDate = new Date();
    const day = targetDate.getDate().toString().padStart(2, '0');
    const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
    const year = targetDate.getFullYear();
    return `${day}-${month}-${year}`;
}

// ===== معالج نافذة الإعداد الأولى لصفحة الصلاة (المذهب، طريقة الحساب، المؤذن) =====
let previewAudioInstance = null;

function checkPrayerOnboarding() {
    const settings = typeof getAppSettings === 'function' ? getAppSettings() : {};
    const hasCompleted = localStorage.getItem('prayer_setup_completed') || settings.hasConfiguredPrayer;
    const modal = document.getElementById('prayerOnboardingModal');
    if (!modal) return;

    if (!hasCompleted) {
        modal.style.display = 'flex';
        initOnboardingModal(settings);
    }
}

function initOnboardingModal(settings) {
    let currentSelectedMadhab = (settings.madhab || 'maliki').toLowerCase();
    let currentSelectedReciter = settings.adhanReciter || 'alafasi';
    let currentSelectedMethod = settings.calcMethod || 'Morocco';
    let currentSelectedHijriAdj = parseInt(settings.hijriAdjustment, 10) || 0;

    // 1. المذهب الفقهي
    const madhabGrid = document.getElementById('onboardingMadhabGrid');
    if (madhabGrid) {
        const cards = madhabGrid.querySelectorAll('.madhab-card-option');
        cards.forEach(card => {
            const m = (card.getAttribute('data-madhab') || '').toLowerCase();
            if (m === currentSelectedMadhab) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
            card.addEventListener('click', () => {
                cards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                currentSelectedMadhab = m;
            });
        });
    }

    // 2. طريقة الحساب حسب البلد
    const methodSelect = document.getElementById('onboardingCalcMethodSelect');
    if (methodSelect) {
        methodSelect.value = currentSelectedMethod;
        methodSelect.addEventListener('change', (e) => {
            currentSelectedMethod = e.target.value;
        });
    }

    // 3. ضبط التاريخ الهجري
    const hijriSelect = document.getElementById('onboardingHijriAdjustmentSelect');
    if (hijriSelect) {
        hijriSelect.value = currentSelectedHijriAdj.toString();
        hijriSelect.addEventListener('change', (e) => {
            currentSelectedHijriAdj = parseInt(e.target.value, 10) || 0;
        });
    }

    // 4. قائمة المؤذنين مع إمكانية تجربة الصوت الفورية
    const recitersContainer = document.getElementById('onboardingRecitersList');
    if (recitersContainer) {
        const reciters = window.ADHAN_RECITERS || [
            { id: 'alafasi', name: 'الشيخ مشاري راشد العفاسي', file: '/audio/adhan_alafasi.mp3', fallback: '/audio/adhan_afasy.mp3' },
            { id: 'aldosari', name: 'الشيخ ياسر الدوسري', file: '/audio/adhan_aldosari.mp3', fallback: '/audio/adhan_yasser.mp3' },
            { id: 'alqatami', name: 'الشيخ ناصر القطامي', file: '/audio/adhan_alqatami.mp3', fallback: '/audio/adhan_qatami.mp3' },
            { id: 'abdelbasset', name: 'الشيخ عبد الباسط عبد الصمد', file: '/audio/adhan_abdelbasset.mp3', fallback: '/audio/adhan_afasy.mp3' },
            { id: 'makkah', name: 'أذان الحرم المكي الشريف (علي ملا)', file: '/audio/adhan_makkah.mp3', fallback: '/audio/adhan_makkah.mp3' },
            { id: 'madinah', name: 'أذان المسجد النبوي الشريف (عصام بخاري)', file: '/audio/adhan_madinah.mp3', fallback: '/audio/adhan_makkah.mp3' },
            { id: 'maghribi', name: 'الأذان المغربي (جامع القرويين والأندلس)', file: '/audio/adhan_maghribi.mp3', fallback: '/audio/adhan_makkah.mp3' },
            { id: 'egypt', name: 'الأذان المصري (الجامع الأزهر)', file: '/audio/adhan_egypt.mp3', fallback: '/audio/adhan_makkah.mp3' },
            { id: 'mansoor', name: 'الشيخ منصور السالمي', file: '/audio/adhan_mansoor.mp3', fallback: '/audio/adhan_afasy.mp3' },
            { id: 'islam_sobhi', name: 'القارئ إسلام صبحي', file: '/audio/adhan_islam_sobhi.mp3', fallback: '/audio/adhan_afasy.mp3' },
            { id: 'ghamdi', name: 'الشيخ سعد الغامدي', file: '/audio/adhan_ghamdi.mp3', fallback: '/audio/adhan_yasser.mp3' }
        ];

        recitersContainer.innerHTML = '';
        reciters.forEach(rec => {
            const isSelected = rec.id === currentSelectedReciter;
            const item = document.createElement('div');
            item.className = `reciter-preview-row ${isSelected ? 'selected' : ''}`;
            item.setAttribute('data-id', rec.id);
            item.innerHTML = `
                <div class="reciter-info-col">
                    <div class="reciter-radio-btn"></div>
                    <span class="reciter-title-text">${rec.name}</span>
                </div>
                <button type="button" class="reciter-preview-play-btn" data-file="${rec.file}" data-fallback="${rec.fallback || ''}" title="تجربة الصوت">
                    <i class="fa-solid fa-play"></i>
                </button>
            `;

            // تحديد المؤذن
            item.addEventListener('click', (e) => {
                if (e.target.closest('.reciter-preview-play-btn')) return;
                recitersContainer.querySelectorAll('.reciter-preview-row').forEach(el => {
                    el.classList.remove('selected');
                });
                item.classList.add('selected');
                currentSelectedReciter = rec.id;
            });

            // زر تشغيل الصوت كتجربة بأيقونة Play/Pause
            const playBtn = item.querySelector('.reciter-preview-play-btn');
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const icon = playBtn.querySelector('i');
                const isPlaying = playBtn.classList.contains('playing');

                // إيقاف أي صوت سابق
                if (previewAudioInstance) {
                    previewAudioInstance.pause();
                    previewAudioInstance.currentTime = 0;
                    previewAudioInstance = null;
                }
                document.querySelectorAll('.reciter-preview-play-btn').forEach(btn => {
                    btn.classList.remove('playing');
                    const ic = btn.querySelector('i');
                    if (ic) ic.className = 'fa-solid fa-play';
                });

                if (isPlaying) {
                    return; // تم الإيقاف بالفعل
                }

                playBtn.classList.add('playing');
                icon.className = 'fa-solid fa-pause';

                if (typeof window.playAdhanWithFallbacks === 'function') {
                    previewAudioInstance = window.playAdhanWithFallbacks(rec.id, {
                        onStart: () => {
                            playBtn.classList.add('playing');
                            icon.className = 'fa-solid fa-pause';
                        },
                        onEnded: () => {
                            playBtn.classList.remove('playing');
                            icon.className = 'fa-solid fa-play';
                            previewAudioInstance = null;
                        },
                        onError: () => {
                            playBtn.classList.remove('playing');
                            icon.className = 'fa-solid fa-play';
                            previewAudioInstance = null;
                        }
                    });
                } else {
                    previewAudioInstance = new Audio(rec.file);
                    previewAudioInstance.play().catch(() => {
                        playBtn.classList.remove('playing');
                        icon.className = 'fa-solid fa-play';
                    });
                    previewAudioInstance.onended = () => {
                        playBtn.classList.remove('playing');
                        icon.className = 'fa-solid fa-play';
                    };
                }
            });

            recitersContainer.appendChild(item);
        });
    }

    // زر الإغلاق والحفظ
    const closeBtn = document.getElementById('prayerOnboardingClose');
    const saveBtn = document.getElementById('saveOnboardingBtn');

    function handleSave() {
        if (previewAudioInstance) {
            previewAudioInstance.pause();
        }
        const updated = typeof getAppSettings === 'function' ? getAppSettings() : {};
        updated.madhab = currentSelectedMadhab;
        updated.adhanReciter = currentSelectedReciter;
        updated.calcMethod = currentSelectedMethod;
        updated.hijriAdjustment = currentSelectedHijriAdj;
        updated.hasConfiguredPrayer = true;

        if (typeof saveAppSettings === 'function') {
            saveAppSettings(updated);
        } else {
            localStorage.setItem('fur9an_settings', JSON.stringify(updated));
        }

        localStorage.setItem('fur9an_prayer_onboarding_done', 'true');
        localStorage.setItem('prayer_setup_completed', 'true');
        localStorage.setItem('selectedAdhanReciter', currentSelectedReciter);

        const modal = document.getElementById('prayerOnboardingModal');
        if (modal) modal.style.display = 'none';

        // إعادة حساب المواقيت وتحديث الواجهة والتاريخ فوراً
        updateDate();
        refreshPrayerTimes();
        if (typeof showAppToast === 'function') {
            showAppToast('تم حفظ إعدادات الصلاة والمذهب بنجاح!', 'success');
        }
    }

    if (closeBtn) closeBtn.onclick = () => {
        if (previewAudioInstance) previewAudioInstance.pause();
        const modal = document.getElementById('prayerOnboardingModal');
        if (modal) modal.style.display = 'none';
        localStorage.setItem('fur9an_prayer_onboarding_done', 'true');
        localStorage.setItem('prayer_setup_completed', 'true');
    };

    if (saveBtn) saveBtn.onclick = handleSave;
}

// ===== إجراءات أزرار الهيدر والموقع =====
function initPrayerHeaderActions() {
    const openPrayerSetupBtn = document.getElementById('openPrayerSetupBtn');
    if (openPrayerSetupBtn) {
        openPrayerSetupBtn.addEventListener('click', () => {
            checkPrayerOnboarding(true);
        });
    }

    const detectGpsQuickBtn = document.getElementById('detectGpsQuickBtn');
    if (detectGpsQuickBtn) {
        detectGpsQuickBtn.addEventListener('click', () => {
            detectLocation(false);
        });
    }
}

// ===== التهيئة =====
async function init() {
    initPrayerHeaderActions();
    await refreshPrayerTimes();
    
    initAdhanPlayer();
    initAzkarSlider();
    loadPostPrayerAzkarFromJSON();
    checkPrayerOnboarding();

    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        refreshPrayerTimes();
        updateDate();
    }, 300000);

    // التحقق من موعد الصلاة كل دقيقة لإرسال تنبيه الـ 5 دقائق
    setInterval(() => {
        const cacheKey = `cachedPrayerTimings_${currentCity.name}_${getFormattedTodayDate()}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const timings = JSON.parse(cached);
                checkPrayerNotifications(timings);
            } catch(e) {}
        }
    }, 60000);
    
    setTimeout(() => {
        if (!localStorage.getItem('prayerCity')) {
            detectLocation();
        }
    }, 3000);
}

init();

console.log('🌙 الفرقان - صفحة أوقات الصلاة');
console.log(`المدينة: ${currentCity.name}`);

// التعامل مع زر الرجوع الفعلي للأندرويد (Cordova backbutton)
document.addEventListener('deviceready', () => {
    // طلب صلاحيات الإشعارات لنظام أندرويد 13 فما فوق
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.notification && window.cordova.plugins.notification.local) {
        window.cordova.plugins.notification.local.hasPermission((granted) => {
            if (!granted) {
                window.cordova.plugins.notification.local.requestPermission((hasPermission) => {
                    console.log('📱 صلاحية الإشعارات الأصلية في صفحة الصلاة:', hasPermission);
                });
            }
        });
    }

    document.addEventListener('backbutton', (e) => {
        const cityModal = document.getElementById('cityModal');
        if (cityModal && cityModal.classList.contains('active')) {
            closeCityModal();
            return;
        }
        
        // العودة للرئيسية
        window.location.href = '/index.html';
    }, false);
}, false);