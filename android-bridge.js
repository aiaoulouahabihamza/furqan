/**
 * android-bridge.js
 * الجسر البرمجي الموحد لربط منصة الفرقان الرقمية بتطبيق الأندرويد الأصلي
 * مخصص للبناء والتجميع عبر Termux للأندرويد
 */

(function() {
    'use strict';

    // 1. تعريف واجهة الجسر للويب مع توفير محاكاة (Fallback) للويب العادي
    const Fur9anBridge = {
        isAndroidWrapper: function() {
            return typeof window.AndroidFur9anApp !== 'undefined';
        },

        // مزامنة الإعدادات مع تطبيق الأندرويد الأصلي
        syncSettingsToAndroid: function(settings) {
            if (this.isAndroidWrapper()) {
                try {
                    window.AndroidFur9anApp.saveSettings(JSON.stringify(settings));
                    console.log('📱 تم مزامنة الإعدادات مع الأندرويد');
                } catch (e) {
                    console.error('📱 خطأ في مزامنة الإعدادات:', e);
                }
            } else {
                console.log('💻 محاكاة الويب: تم حفظ الإعدادات محلياً فقط', settings);
            }
        },

        // مزامنة مواقيت الصلاة لتطبيق الأندرويد الأصلي لجدولة منبه الأذان
        syncPrayerTimesToAndroid: function(prayerTimesData) {
            if (this.isAndroidWrapper()) {
                try {
                    window.AndroidFur9anApp.savePrayerTimes(JSON.stringify(prayerTimesData));
                    console.log('📱 تم مزامنة مواقيت الصلاة مع الأندرويد لجدولة الأذان');
                } catch (e) {
                    console.error('📱 خطأ في مزامنة مواقيت الصلاة:', e);
                }
            } else {
                console.log('💻 محاكاة الويب: مواقيت الصلاة المحسوبة:', prayerTimesData);
            }
        },

        // تحديث إشعار مشغل التلاوات في شريط الإشعارات بالأندرويد
        updateMediaNotification: function(surahName, reciterName, isPlaying) {
            if (this.isAndroidWrapper()) {
                try {
                    window.AndroidFur9anApp.updateMediaNotification(surahName, reciterName, isPlaying);
                    console.log(`📱 تم تحديث إشعار مشغل التلاوة: سورة ${surahName} - القارئ ${reciterName} (${isPlaying ? 'شغال' : 'واقف'})`);
                } catch (e) {
                    console.error('📱 خطأ في تحديث إشعار التلاوة:', e);
                }
            } else {
                console.log(`💻 محاكاة الويب: إشعار التلاوة الحالي: ${surahName} - ${reciterName} - تشغيل: ${isPlaying}`);
            }
        },

        // طلب جلب الموقع بدقة عبر الـ GPS وإظهار حوار التفعيل الأصلي للأندرويد
        requestNativeLocation: function() {
            if (this.isAndroidWrapper()) {
                try {
                    window.AndroidFur9anApp.requestGPSLocation();
                    console.log('📱 تم إرسال طلب جلب الموقع عبر GPS للأندرويد');
                } catch (e) {
                    console.error('📱 خطأ في طلب الموقع من الأندرويد:', e);
                }
            } else {
                console.log('💻 محاكاة الويب: جاري جلب الموقع من متصفح الويب...');
                // تشغيل الجلب الاحتياطي عبر المتصفح
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            window.onLocationReceived(pos.coords.latitude, pos.coords.longitude);
                        },
                        (err) => {
                            console.error('💻 محاكاة الويب: فشل تحديد موقع المتصفح:', err);
                        }
                    );
                }
            }
        },

        // إطلاق إشعار أو اهتزاز أصلي عبر التطبيق
        vibrate: function(ms) {
            if (this.isAndroidWrapper()) {
                try {
                    window.AndroidFur9anApp.vibrate(ms);
                } catch (e) {}
            } else if (navigator.vibrate) {
                navigator.vibrate(ms);
            }
        },

        vibratePattern: function(patternJson) {
            if (this.isAndroidWrapper()) {
                try {
                    window.AndroidFur9anApp.vibratePattern(patternJson);
                } catch (e) {}
            } else if (navigator.vibrate) {
                try {
                    navigator.vibrate(JSON.parse(patternJson));
                } catch (e) {}
            }
        },

        // نظام إرسال الإشعارات والمنبهات لجدولتها في الأندرويد
        sendNotification: function(title, body, id, prayerKey) {
            if (this.isAndroidWrapper()) {
                try {
                    window.AndroidFur9anApp.triggerNotification(title, body, id || 100, prayerKey || '');
                } catch (e) {}
            } else {
                console.log(`💻 إشعار ويب محاكى: [${title}] ${body}`);
            }
        },

        // إيقاف صوت الأذان من الأندرويد بشكل كامل
        stopAndroidAdhan: function() {
            if (this.isAndroidWrapper()) {
                try {
                    window.AndroidFur9anApp.stopAdhan();
                } catch (e) {}
            }
        }
    };

    // تصدير الجسر على المستوى العالمي
    window.Fur9anBridge = Fur9anBridge;

    // --- دوال الاستقبال العامة (التي يستدعيها كود الأندرويد WebView ليرسل لنا تحديثات) ---

    // 1. يستدعيها الأندرويد بعد جلب الموقع بنجاح من الـ GPS وإذن الموقع
    window.onLocationReceived = function(lat, lng) {
        console.log(`📱 تم استقبال إحداثيات GPS حقيقية من الأندرويد: ${lat}, ${lng}`);
        
        // حفظ الموقع محلياً
        const resolvedCountry = (lng >= -17 && lng < -1) ? 'MA' : 'SA';
        const dummyCity = {
            name: `موقعك الحالي (GPS)`,
            country: resolvedCountry,
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
            timezone: resolvedCountry === 'MA' ? 1 : 3
        };

        localStorage.setItem('prayerCity', JSON.stringify(dummyCity));
        localStorage.setItem('fur9an_user_location', JSON.stringify(dummyCity));

        // عرض تنبيه بنجاح التحديد
        if (typeof window.showToast === 'function') {
            window.showToast('تم تحديد وتحديث موقعك بنجاح من جهازك الأندرويد 📍');
        }

        // تحديث أوقات الصلاة في كامل الواجهات
        if (typeof window.calculateUnifiedPrayerTimes === 'function') {
            window.calculateUnifiedPrayerTimes();
        }
        if (typeof window.updateAllPrayerTimesUI === 'function') {
            window.updateAllPrayerTimesUI();
        }

        // إذا كان هناك صفحة صلاة مفتوحة، نقوم بإعادة تحميل محتواها أو تحديثه فوراً
        const path = window.location.pathname;
        if (path.includes('/prayer/') || path.includes('prayer')) {
            window.location.reload();
        }
    };

    // 2. يستدعيها الأندرويد عند ضغط المستخدم على أزرار إشعار مشغل التلاوة (شاشة القفل أو شريط الإشعارات)
    window.onMediaCommandReceived = function(command) {
        console.log(`📱 استقبلت منصة الفرقان أمراً من مشغل الأندرويد: ${command}`);
        if (!window.Fur9anAudio) return;

        switch (command) {
            case 'play':
                if (!window.Fur9anAudio.isPlaying) {
                    window.Fur9anAudio.togglePlay();
                }
                break;
            case 'pause':
                if (window.Fur9anAudio.isPlaying) {
                    window.Fur9anAudio.togglePlay();
                }
                break;
            case 'next':
                window.Fur9anAudio.nextSurah();
                break;
            case 'prev':
                window.Fur9anAudio.prevSurah();
                break;
            case 'stop':
                if (window.Fur9anAudio.isPlaying) {
                    window.Fur9anAudio.togglePlay();
                }
                break;
        }
    };

    // 3. يستدعيها الأندرويد لإيقاف صوت الأذان المشغل في الويب عند ضغط زر إيقاف الإشعار
    window.onStopAdhanReceived = function() {
        console.log('📱 استلم أمر إيقاف الأذان من الأندرويد');
        if (typeof window.stopAdhanPlayback === 'function') {
            window.stopAdhanPlayback();
        }
    };

})();
