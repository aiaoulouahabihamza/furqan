/**
 * android-bridge.js
 * الجسر البرمجي الموحد عالي الاعتمادية لربط منصة الفرقان الرقمية بتطبيق الأندرويد الأصلي والويب
 * مصمم ومحسن للبناء والتجميع (Termux / Cordova / Capacitor / WebView) والنشر الإنتاجي
 */

(function() {
    'use strict';

    // اسم مجلد التنزيلات الموحد لجميع ملفات المنصة
    const FUR9AN_DOWNLOAD_DIR = 'الفرقان';

    // 1. تعريف كائن الجسر الموحد
    const Fur9anBridge = {
        // التحقق من العمل داخل بيئة الأندرويد الأصلية
        isAndroidWrapper: function() {
            return typeof window.AndroidFur9anApp !== 'undefined' || 
                   typeof window.FurqanAndroidInterface !== 'undefined' ||
                   (typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
        },

        getNativeApp: function() {
            return window.AndroidFur9anApp || window.FurqanAndroidInterface || null;
        },

        // تنزيل أي ملف من الموقع وحفظه في مجلد مخصص باسم "الفرقان" بدون أي توجيه لصفحة أخرى
        downloadFile: function(urlOrBlob, filename, folderName = FUR9AN_DOWNLOAD_DIR) {
            if (!urlOrBlob) {
                console.error('📱 [Bridge] Download failed: No URL or Blob provided');
                return;
            }

            const cleanTitle = (filename || 'ملف_الفرقان').trim();
            const sanitizedName = cleanTitle.replace(/[\/\\?%*:|"<>]/g, '_');
            const downloadFilename = sanitizedName.startsWith(folderName) ? sanitizedName : `${folderName} - ${sanitizedName}`;

            // إذا كان المدخل كائن Blob مباشر (مثل تلاوات التخزين الداخلي أو التسجيلات)
            if (urlOrBlob instanceof Blob) {
                try {
                    const blobUrl = window.URL.createObjectURL(urlOrBlob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = downloadFilename;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(() => {
                        if (document.body.contains(link)) document.body.removeChild(link);
                        window.URL.revokeObjectURL(blobUrl);
                    }, 3000);

                    if (typeof window.showToast === 'function') {
                        window.showToast(`تم تنزيل ${cleanTitle} في وحدة التخزين! 📥`, 'success');
                    } else if (window.FurqanToast) {
                        window.FurqanToast.success(`تم بدء تنزيل ${cleanTitle} بنجاح 📥`);
                    }
                    return;
                } catch (blobErr) {
                    console.error('Error downloading Blob:', blobErr);
                }
            }

            const url = String(urlOrBlob);
            const nativeApp = this.getNativeApp();

            // 1. أندرويد الأصلي: توجيه التنزيل لمجلد "الفرقان" في وحدة التخزين
            if (nativeApp && typeof nativeApp.downloadFile === 'function') {
                try {
                    nativeApp.downloadFile(url, cleanTitle, folderName);
                    console.log(`📱 [Bridge] تم إرسال أمر التنزيل للأندرويد: ${cleanTitle} في مجلد [${folderName}]`);
                    if (typeof window.showToast === 'function') {
                        window.showToast(`جاري تنزيل الملف في مجلد "${folderName}"... 📥`, 'success');
                    } else if (window.FurqanToast) {
                        window.FurqanToast.info(`جاري تنزيل الملف في مجلد "${folderName}"... 📥`);
                    }
                    return;
                } catch (e) {
                    console.error('📱 [Bridge] فشل استدعاء التنزيل الأصلي للأندرويد:', e);
                }
            }

            // 2. متصفح الويب القياسي بدون مغادرة الصفحة نهائياً
            try {
                if (typeof window.showToast === 'function') {
                    window.showToast(`جاري بدء تنزيل: ${cleanTitle}... 📥`, 'success');
                } else if (window.FurqanToast) {
                    window.FurqanToast.info(`جاري بدء تنزيل: ${cleanTitle}... 📥`);
                }

                // استخراج الرابط الحقيقي إذا تم تمرير بروكسي مسبقاً
                let targetUrl = url;
                if (url.startsWith('/api/download-file?') || url.includes('/api/download-file?url=')) {
                    try {
                        const m = url.match(/[?&]url=([^&]+)/);
                        if (m) targetUrl = decodeURIComponent(m[1]);
                    } catch (e) {}
                }
                targetUrl = targetUrl.replace(/^http:\/\//i, 'https://');

                const proxyDownloadUrl = `/api/download-file?url=${encodeURIComponent(targetUrl)}&filename=${encodeURIComponent(downloadFilename)}`;

                // تشغيل التنزيل الفوري عبر فتح نافذة جديدة (لتجاوز قيود الـ iframe في المعاينة)
                // المتصفح سيغلق النافذة تلقائياً بمجرد بدء التحميل بفضل ترويسة attachment
                const link = document.createElement('a');
                link.href = proxyDownloadUrl;
                link.setAttribute('download', downloadFilename);
                link.setAttribute('target', '_blank');
                document.body.appendChild(link);
                link.click();

                // إزالة الرابط بعد التنفيذ
                setTimeout(() => {
                    if (document.body.contains(link)) document.body.removeChild(link);
                }, 1000);

            } catch (err) {
                console.error('📱 [Bridge] خطأ في تنزيل الملف عبر الويب:', err);
            }
        },

        // معالجة حلول وقت الصلاة وتشغيل التنبيه الموحد بدون كود HTML غير منسق
        onPrayerTimeTriggered: function(prayerKey, prayerNameAr, cityName, reciterObj) {
            console.log(`🕌 [Bridge] حان وقت صلاة ${prayerNameAr} في ${cityName}`);
            
            const title = `🕌 حان الآن موعد صلاة ${prayerNameAr}`;
            const body = `حسب التوقيت المحلي لمدينة ${cityName || 'موقعك الحالي'}`;
            
            // 1. إرسال إشعار فوري للنظام
            this.sendNotification(title, body, null, prayerKey);

            // 2. إخطار الأندرويد الأصلي لتشغيل الأذان في الخلفية أو المنبه
            const nativeApp = this.getNativeApp();
            if (nativeApp && typeof nativeApp.triggerAdhan === 'function') {
                try {
                    nativeApp.triggerAdhan(prayerKey, (reciterObj && reciterObj.id) ? reciterObj.id : 'alafasi');
                } catch (e) {
                    console.error('📱 [Bridge] خطأ في تشغيل أذان الأندرويد الأصلي:', e);
                }
            }

            // 3. إظهار إشعار Toast أنيق داخل الواجهة بدلاً من المودال غير المنسق
            if (typeof window.showToast === 'function') {
                window.showToast(`${title} - ${body} 🕋`, 'success');
            }
        },

        // مزامنة الإعدادات مع تطبيق الأندرويد الأصلي
        syncSettingsToAndroid: function(settings) {
            const nativeApp = this.getNativeApp();
            if (nativeApp && typeof nativeApp.saveSettings === 'function') {
                try {
                    nativeApp.saveSettings(JSON.stringify(settings));
                    console.log('📱 [Bridge] تم مزامنة الإعدادات مع الأندرويد');
                } catch (e) {
                    console.error('📱 [Bridge] خطأ في مزامنة الإعدادات:', e);
                }
            }
        },

        // مزامنة مواقيت الصلاة لتطبيق الأندرويد لجدولة الأذان بدقة أوفلاين
        syncPrayerTimesToAndroid: function(prayerTimesData) {
            const nativeApp = this.getNativeApp();
            if (nativeApp && typeof nativeApp.savePrayerTimes === 'function') {
                try {
                    nativeApp.savePrayerTimes(JSON.stringify(prayerTimesData));
                    console.log('📱 [Bridge] تم مزامنة مواقيت الصلاة مع الأندرويد لجدولة الأذان');
                } catch (e) {
                    console.error('📱 [Bridge] خطأ في مزامنة مواقيت الصلاة:', e);
                }
            }
        },

        // تحديث إشعار مشغل التلاوات والدروس في شريط إشعارات الأندرويد
        updateMediaNotification: function(title, subtitle, isPlaying) {
            const nativeApp = this.getNativeApp();
            if (nativeApp && typeof nativeApp.updateMediaNotification === 'function') {
                try {
                    nativeApp.updateMediaNotification(title, subtitle, isPlaying);
                    console.log(`📱 [Bridge] تم تحديث إشعار الصوتيات: ${title} - ${subtitle} (${isPlaying ? 'شغال' : 'متوقف'})`);
                } catch (e) {
                    console.error('📱 [Bridge] خطأ في تحديث إشعار الوسائط:', e);
                }
            }
        },

        // طلب جلب الموقع بدقة
        requestNativeLocation: function() {
            const nativeApp = this.getNativeApp();
            if (nativeApp && typeof nativeApp.requestGPSLocation === 'function') {
                try {
                    nativeApp.requestGPSLocation();
                    console.log('📱 [Bridge] تم إرسال طلب جلب الموقع للأندرويد');
                    return;
                } catch (e) {
                    console.error('📱 [Bridge] خطأ في طلب الموقع من الأندرويد:', e);
                }
            }

            // الجلب الاحتياطي عبر متصفح الويب
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        if (typeof window.onLocationReceived === 'function') {
                            window.onLocationReceived(pos.coords.latitude, pos.coords.longitude);
                        }
                    },
                    (err) => {
                        console.warn('📱 [Bridge] تنبيه تحديد الموقع الجغرافي:', err ? err.message : 'غير متاح');
                    },
                    { timeout: 8000, enableHighAccuracy: false, maximumAge: 60000 }
                );
            }
        },

        // إطلاق اهتزاز تفاعلي (Haptic Feedback)
        vibrate: function(ms) {
            const nativeApp = this.getNativeApp();
            if (nativeApp && typeof nativeApp.vibrate === 'function') {
                try {
                    nativeApp.vibrate(ms);
                    return;
                } catch (e) {}
            }
            if (navigator.vibrate) {
                try { navigator.vibrate(ms); } catch (e) {}
            }
        },

        vibratePattern: function(patternJson) {
            const nativeApp = this.getNativeApp();
            if (nativeApp && typeof nativeApp.vibratePattern === 'function') {
                try {
                    nativeApp.vibratePattern(patternJson);
                    return;
                } catch (e) {}
            }
            if (navigator.vibrate) {
                try {
                    navigator.vibrate(typeof patternJson === 'string' ? JSON.parse(patternJson) : patternJson);
                } catch (e) {}
            }
        },

        // إرسال الإشعارات مع حماية تامة من التكرار
        sendNotification: function(title, body, id, prayerKey) {
            let uniqueId = id || 100;
            if (prayerKey) {
                const prayerIdMap = {
                    'fajr': 101, 'sunrise': 102, 'dhuhr': 103, 
                    'asr': 104, 'maghrib': 105, 'isha': 106
                };
                uniqueId = prayerIdMap[prayerKey.toLowerCase()] || uniqueId;
            }

            const notifTag = `fur9an_notif_${uniqueId}_${prayerKey || 'general'}`;
            const now = Date.now();
            if (window._lastSentNotifs && window._lastSentNotifs[notifTag] && (now - window._lastSentNotifs[notifTag] < 45000)) {
                return;
            }
            if (!window._lastSentNotifs) window._lastSentNotifs = {};
            window._lastSentNotifs[notifTag] = now;

            // 1. الأندرويد الأصلي
            const nativeApp = this.getNativeApp();
            if (nativeApp && typeof nativeApp.triggerNotification === 'function') {
                try {
                    nativeApp.triggerNotification(title, body, uniqueId, prayerKey || '');
                    console.log(`📱 [Bridge] تم إرسال الإشعار للأندرويد: [${title}]`);
                    return;
                } catch (e) {
                    console.error('📱 [Bridge] خطأ في إرسال الإشعار للأندرويد:', e);
                }
            }

            // 2. إشعارات الويب المباشرة
            if ('Notification' in window) {
                if (Notification.permission === 'granted') {
                    this._displayWebNotification(title, body, notifTag);
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission().then(perm => {
                        if (perm === 'granted') {
                            this._displayWebNotification(title, body, notifTag);
                        }
                    });
                }
            }
        },

        _displayWebNotification: function(title, body, tag) {
            try {
                const options = {
                    body: body,
                    icon: '/data/images/logo.png',
                    badge: '/data/images/logo.png',
                    tag: tag,
                    renotify: false,
                    silent: false
                };
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then(reg => {
                        reg.showNotification(title, options);
                    });
                } else {
                    new Notification(title, options);
                }
            } catch (err) {
                console.warn('📱 [Bridge] إشعار الويب:', err);
            }
        },

        // إيقاف صوت الأذان من الأندرويد
        stopAndroidAdhan: function() {
            const nativeApp = this.getNativeApp();
            if (nativeApp && typeof nativeApp.stopAdhan === 'function') {
                try {
                    nativeApp.stopAdhan();
                } catch (e) {}
            }
            if (typeof window.stopAdhanPlayback === 'function') {
                window.stopAdhanPlayback();
            }
        },

        // منع إغلاق الشاشة أثناء القراءة (Screen Wake Lock)
        requestWakeLock: async function() {
            try {
                if ('wakeLock' in navigator && !this._wakeLockSentinel) {
                    this._wakeLockSentinel = await navigator.wakeLock.request('screen');
                }
            } catch (e) {}
        },

        releaseWakeLock: function() {
            if (this._wakeLockSentinel) {
                try { this._wakeLockSentinel.release(); } catch (e) {}
                this._wakeLockSentinel = null;
            }
        }
    };

    // تصدير الجسر ودالة التنزيل العامة
    window.Fur9anBridge = Fur9anBridge;
    window.downloadFur9anFile = function(url, filename) {
        Fur9anBridge.downloadFile(url, filename, FUR9AN_DOWNLOAD_DIR);
    };

    // =========================================================================
    // 2. نظام محاكاة ومعالجة زر الرجوع الشامل للأندرويد (Android Back Handler)
    // =========================================================================

    window.onAndroidBackPressed = function() {
        console.log('📱 [Bridge] التقاط حدث زر الرجوع للأندرويد');

        // أولوية 1: إغلاق أي نافذة منبثقة أو مودال نشط
        const activeModals = document.querySelectorAll(
            '.modal-overlay.active, .modal-overlay[style*="flex"], .modal-overlay[style*="block"], ' +
            '#tafsirModal[style*="flex"], #tafsirModal[style*="block"], #ayahSheet.active, #ayahSheetBackdrop.active, ' +
            '#batchDownloadModal[style*="flex"], #cityModal.active, #profileModal.active, #bookDetailModal.active, ' +
            '#lecturePartsModal.active, #furqanUpdatePopup.active, .drawer-overlay.active, #fatwaDrawerOverlay.active, ' +
            '.adhan-overlay-card.active, #adhanAlertModal.active, .modal-backdrop[style*="flex"]'
        );

        if (activeModals && activeModals.length > 0) {
            let closedAny = false;
            activeModals.forEach(m => {
                if (m.id === 'tafsirModal' && typeof window.closeTafsirModal === 'function') {
                    window.closeTafsirModal();
                    closedAny = true;
                } else if (m.id === 'cityModal' && typeof window.closeCityModal === 'function') {
                    window.closeCityModal();
                    closedAny = true;
                } else if (m.id === 'bookDetailModal') {
                    m.classList.remove('active');
                    m.style.display = 'none';
                    closedAny = true;
                } else if (m.id === 'lecturePartsModal') {
                    m.classList.remove('active');
                    m.style.display = 'none';
                    closedAny = true;
                } else if (m.id === 'furqanUpdatePopup') {
                    m.classList.remove('active');
                    closedAny = true;
                } else {
                    m.classList.remove('active');
                    m.style.display = 'none';
                    closedAny = true;
                }
            });
            if (closedAny) return 'MODAL_CLOSED';
        }

        // أولوية 2: إغلاق القوائم الجانبية ومربعات البحث النشطة
        const openDrawers = document.querySelectorAll('.drawer-overlay.active, .drawer-content.active, #fatwaDrawer.active');
        if (openDrawers && openDrawers.length > 0) {
            openDrawers.forEach(d => d.classList.remove('active'));
            return 'DRAWER_CLOSED';
        }

        // أولوية 3: صفحات التبديل والمراحل المتعددة
        if (typeof window.handleStageBack === 'function') {
            const handled = window.handleStageBack();
            if (handled) return 'STAGE_BACK';
        }

        // أولوية 4: إذا كان في صفحة تفاصيل فرعية (view.html)، العودة لقسم الفهرس التابع له
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('/fatwas/view') || currentPath.endsWith('/fatwas/view.html')) {
            window.location.href = '/fatwas/index.html';
            return 'SUBPAGE_BACK';
        }
        if (currentPath.includes('/lectures/view') || currentPath.endsWith('/lectures/view.html')) {
            window.location.href = '/lectures/index.html';
            return 'SUBPAGE_BACK';
        }
        if (currentPath.includes('/quran/page') || currentPath.endsWith('/quran/page.html')) {
            window.location.href = '/quran/index.html';
            return 'SUBPAGE_BACK';
        }

        // أولوية 5: إذا كان في أي صفحة داخلية أخرى، الرجوع للصفحة الرئيسية
        const isHomePage = currentPath === '/' || 
                           currentPath === '/index.html' || 
                           currentPath.endsWith('/index.html') && !currentPath.includes('/', 1) || 
                           currentPath === '';

        if (!isHomePage) {
            // محاولة الرجوع بالسجل أولاً إذا وجد، وإلا الذهاب للرئيسية
            if (window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host)) {
                window.history.back();
            } else {
                window.location.href = '/index.html';
            }
            return 'NAVIGATED_BACK';
        }

        // إذا كان في الرئيسية يرسل إشارة للأندرويد
        return 'EXIT_APP';
    };

    // الاستماع لزر الرجوع في Cordova / Capacitor
    document.addEventListener('backbutton', function(e) {
        if (e) e.preventDefault();
        window.onAndroidBackPressed();
    }, false);

    // الاستماع لزر Escape من لوحة المفاتيح
    window.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            window.onAndroidBackPressed();
        }
    });

    // ربط أزرار الرجوع في الهيدر لجميع الصفحات تلقائياً
    document.addEventListener('DOMContentLoaded', function() {
        const headerBackButtons = document.querySelectorAll('#headerBackBtn, .header-content .back-btn, .fixed-header .back-btn');
        headerBackButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                // إذا كان الزر يحتوي على رابط مباشر نتركه أو نطبق العودة الذكية
                const href = btn.getAttribute('href');
                if (!href || href === '#' || href === 'javascript:void(0)') {
                    e.preventDefault();
                    window.onAndroidBackPressed();
                }
            });
        });
    });

    // الاستقبالات العامة من كود WebView
    window.onLocationReceived = async function(lat, lng) {
        console.log(`📱 [Bridge] تم استقبال الإحداثيات: ${lat}, ${lng}`);
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);
        const resolvedCountry = (parsedLng >= -17 && parsedLng < -1) ? 'MA' : 'SA';
        
        let resolvedName = 'موقعك الحالي';
        if (typeof window.reverseGeocodeLocation === 'function') {
            const name = await window.reverseGeocodeLocation(parsedLat, parsedLng);
            if (name) resolvedName = name;
        }

        const cleanLoc = {
            name: resolvedName,
            country: resolvedCountry,
            latitude: parsedLat,
            longitude: parsedLng,
            timezone: resolvedCountry === 'MA' ? 1 : 3
        };

        localStorage.setItem('prayerCity', JSON.stringify(cleanLoc));
        localStorage.setItem('fur9an_user_location', JSON.stringify(cleanLoc));

        if (typeof window.showToast === 'function') {
            window.showToast(`تم تحديد موقعك بنجاح: ${resolvedName} 📍`, 'success');
        }

        if (typeof window.calculateUnifiedPrayerTimes === 'function') {
            window.calculateUnifiedPrayerTimes();
        }
        if (typeof window.updateAllPrayerTimesUI === 'function') {
            window.updateAllPrayerTimesUI();
        }
    };

    window.onMediaCommandReceived = function(command) {
        if (window.Fur9anAudio) {
            switch (command) {
                case 'play': if (!window.Fur9anAudio.isPlaying) window.Fur9anAudio.togglePlay(); break;
                case 'pause': if (window.Fur9anAudio.isPlaying) window.Fur9anAudio.togglePlay(); break;
                case 'next': if (typeof window.Fur9anAudio.nextSurah === 'function') window.Fur9anAudio.nextSurah(); break;
                case 'prev': if (typeof window.Fur9anAudio.prevSurah === 'function') window.Fur9anAudio.prevSurah(); break;
                case 'stop': if (window.Fur9anAudio.isPlaying) window.Fur9anAudio.togglePlay(); break;
            }
        }
    };

    window.onStopAdhanReceived = function() {
        Fur9anBridge.stopAndroidAdhan();
    };

})();
