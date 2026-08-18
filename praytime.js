// praytime.js - High-Precision Astronomical Prayer Times Calculator
// Self-contained, offline-first calculation engine

class PrayTime {
    constructor(method = 'MWL') {
        this.methods = {
            Morocco: { name: 'المغرب (وزارة الأوقاف)', fajr: 19, isha: 17, dhuhrOffset: 5, maghribOffset: 5 },
            MWL: { name: 'رابطة العالم الإسلامي', fajr: 18, isha: 17, dhuhrOffset: 1, maghribOffset: 1 },
            ISNA: { name: 'أمريكا الشمالية (ISNA)', fajr: 15, isha: 15, dhuhrOffset: 1, maghribOffset: 1 },
            Egypt: { name: 'الهيئة المصرية العامة للمساحة', fajr: 19.5, isha: 17.5, dhuhrOffset: 1, maghribOffset: 1 },
            Makkah: { name: 'أم القرى - مكة المكرمة', fajr: 18.5, isha: '90 min', dhuhrOffset: 1, maghribOffset: 1 },
            UmmAlQura: { name: 'أم القرى - مكة المكرمة', fajr: 18.5, isha: '90 min', dhuhrOffset: 1, maghribOffset: 1 },
            Karachi: { name: 'جامعة العلوم الإسلامية بكراتشي', fajr: 18, isha: 18, dhuhrOffset: 1, maghribOffset: 1 },
            Algeria: { name: 'وزارة الشؤون الدينية - الجزائر', fajr: 18, isha: 17, dhuhrOffset: 2, maghribOffset: 2 },
            Tunisia: { name: 'وزارة الشؤون الدينية - تونس', fajr: 18, isha: 18, dhuhrOffset: 2, maghribOffset: 2 },
            Kuwait: { name: 'وزارة الأوقاف - الكويت', fajr: 18, isha: 17.5, dhuhrOffset: 1, maghribOffset: 1 },
            Dubai: { name: 'دائرة الشؤون الإسلامية - دبي', fajr: 18.2, isha: 18.2, dhuhrOffset: 1, maghribOffset: 1 },
            Qatar: { name: 'وزارة الأوقاف - قطر', fajr: 18, isha: '90 min', dhuhrOffset: 1, maghribOffset: 1 },
            Jordan: { name: 'وزارة الأوقاف - الأردن', fajr: 18, isha: 18, dhuhrOffset: 1, maghribOffset: 1 },
            Singapore: { name: 'مجلس الإدارة الإسلامية - سنغافورة', fajr: 20, isha: 18, dhuhrOffset: 1, maghribOffset: 1 },
            France: { name: 'اتحاد المنظمات الإسلامية - فرنسا', fajr: 12, isha: 12, dhuhrOffset: 1, maghribOffset: 1 },
            Tehran: { name: 'معهد الجيوفيزياء - تهران', fajr: 17.7, maghrib: 4.5, midnight: 'Jafari', dhuhrOffset: 1 },
            Jafari: { name: 'المذهب الجعفري', fajr: 16, maghrib: 4, midnight: 'Jafari', dhuhrOffset: 1 }
        };

        this.settings = {
            method: 'MWL',
            asr: 'Standard', // Standard (Shafii/Maliki/Hanbali) or Hanafi
            highLats: 'NightMiddle',
            location: [21.4225, 39.8262], // default Makkah
            tune: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
            dst: false,
            utcOffset: null // auto if null
        };

        this.setMethod(method);
    }

    setMethod(methodName) {
        if (this.methods[methodName]) {
            this.settings.method = methodName;
            this.methodParams = this.methods[methodName];
        } else {
            this.settings.method = 'MWL';
            this.methodParams = this.methods['MWL'];
        }
        return this;
    }

    adjust(params) {
        if (params.asr) this.settings.asr = params.asr;
        if (params.highLats) this.settings.highLats = params.highLats;
        if (typeof params.dst !== 'undefined') this.settings.dst = !!params.dst;
        if (typeof params.utcOffset !== 'undefined') this.settings.utcOffset = params.utcOffset;
        if (params.tune) Object.assign(this.settings.tune, params.tune);
        return this;
    }

    location(coords) {
        if (Array.isArray(coords) && coords.length >= 2) {
            this.settings.location = [coords[0], coords[1]];
        }
        return this;
    }

    getTimes(date = new Date(), location = null, method = null) {
        if (location) this.location(location);
        if (method) this.setMethod(method);

        const lat = this.settings.location[0];
        const lng = this.settings.location[1];

        // 1. حساب التوقيت المحلي من الكائن Date
        let tz = -(date.getTimezoneOffset() / 60);
        if (this.settings.utcOffset !== null && !isNaN(this.settings.utcOffset)) {
            tz = this.settings.utcOffset;
        }
        if (this.settings.dst) {
            tz += 1;
        }

        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();

        // 2. الحساب الفلكي الدقيق اليومي
        let a = Math.floor((14 - month) / 12);
        let y = year + 4800 - a;
        let m = month + 12 * a - 3;
        let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
        let d = jd - 2451545.0;

        let g = this.mod(357.529 + 0.98560028 * d, 360);
        let q = this.mod(280.459 + 0.98564736 * d, 360);
        let L = this.mod(q + 1.915 * this.sin(g) + 0.020 * this.sin(2 * g), 360);

        let e = 23.439 - 0.00000036 * d;
        let ra = this.rtd(Math.atan2(this.cos(e) * this.sin(L), this.cos(L)));
        ra = this.mod(ra, 360) / 15;

        let eqtime = q / 15 - ra;
        let decl = this.rtd(Math.asin(this.sin(e) * this.sin(L)));

        // 3. منتصف النهار (الظهر) بالتوقيت المحلي
        const dhuhrOffsetMins = this.methodParams.dhuhrOffset || 1;
        let dhuhrHours = 12 + tz - (lng / 15) - eqtime + (dhuhrOffsetMins / 60);

        // 4. دالة زاوية الساعة H
        const getHourAngle = (angle) => {
            let cosHA = (this.sin(angle) - this.sin(lat) * this.sin(decl)) / (this.cos(lat) * this.cos(decl));
            if (cosHA > 1) return 0; // الشمس لا تغرب/تشرق (خطوط العرض العالية)
            if (cosHA < -1) return 12; // الشمس لا تصعد
            return this.rtd(Math.acos(cosHA)) / 15;
        };

        // زاوية الفجر والشروق والغروب
        const fajrAngle = typeof this.methodParams.fajr === 'number' ? -this.methodParams.fajr : -18;
        const sunriseAngle = -0.8333;

        let fajrHA = getHourAngle(fajrAngle);
        let sunriseHA = getHourAngle(sunriseAngle);

        // حساب العصر بناءً على المذهب
        const shadowFactor = (this.settings.asr === 'Hanafi') ? 2 : 1;
        let asrAlt = this.rtd(Math.atan(1 / (shadowFactor + this.tan(Math.abs(lat - decl)))));
        let asrHA = getHourAngle(asrAlt);

        // حساب المغرب والعشاء
        let maghribOffsetMins = this.methodParams.maghribOffset || 1;
        let maghribHours = dhuhrHours + sunriseHA + (maghribOffsetMins / 60);

        let ishaHours = 0;
        if (this.methodParams.isha === '90 min') {
            ishaHours = maghribHours + 1.5;
        } else if (typeof this.methodParams.isha === 'number') {
            let ishaHA = getHourAngle(-this.methodParams.isha);
            ishaHours = dhuhrHours + ishaHA;
        } else {
            ishaHours = maghribHours + 1.5;
        }

        let fajrHours = dhuhrHours - fajrHA;
        let sunriseHours = dhuhrHours - sunriseHA;
        let asrHours = dhuhrHours + asrHA;

        // تعديل خطوط العرض العالية إذا لزم الأمر
        if (Math.abs(lat) > 45) {
            let night = 24 + sunriseHours - (dhuhrHours + sunriseHA);
            let maxFajr = sunriseHours - (night / 2);
            if (fajrHours < maxFajr) fajrHours = maxFajr;
            let minIsha = (dhuhrHours + sunriseHA) + (night / 2);
            if (ishaHours > minIsha) ishaHours = minIsha;
        }

        // تطبيق الضبط الدقيق (Tune Minutes)
        const tune = this.settings.tune;
        fajrHours += (tune.fajr || 0) / 60;
        sunriseHours += (tune.sunrise || 0) / 60;
        dhuhrHours += (tune.dhuhr || 0) / 60;
        asrHours += (tune.asr || 0) / 60;
        maghribHours += (tune.maghrib || 0) / 60;
        ishaHours += (tune.isha || 0) / 60;

        const formatHHMM = (hrs) => {
            let totalMins = Math.round(hrs * 60);
            totalMins = ((totalMins % 1440) + 1440) % 1440;
            let h = Math.floor(totalMins / 60);
            let m = totalMins % 60;
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        };

        return {
            fajr: formatHHMM(fajrHours),
            sunrise: formatHHMM(sunriseHours),
            dhuhr: formatHHMM(dhuhrHours),
            asr: formatHHMM(asrHours),
            sunset: formatHHMM(dhuhrHours + sunriseHA),
            maghrib: formatHHMM(maghribHours),
            isha: formatHHMM(ishaHours),
            Fajr: formatHHMM(fajrHours),
            Sunrise: formatHHMM(sunriseHours),
            Dhuhr: formatHHMM(dhuhrHours),
            Asr: formatHHMM(asrHours),
            Maghrib: formatHHMM(maghribHours),
            Isha: formatHHMM(ishaHours)
        };
    }

    times(date = new Date()) {
        return this.getTimes(date);
    }

    // دوال الحساب الرياضي المثلثي للدرجات
    dtr(d) { return d * Math.PI / 180; }
    rtd(r) { return r * 180 / Math.PI; }
    sin(d) { return Math.sin(this.dtr(d)); }
    cos(d) { return Math.cos(this.dtr(d)); }
    tan(d) { return Math.tan(this.dtr(d)); }
    mod(a, b) { return ((a % b) + b) % b; }
}

// التصدير للكائن العام في المتصفح والبيئة
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PrayTime };
}
if (typeof window !== 'undefined') {
    window.PrayTime = PrayTime;
}
