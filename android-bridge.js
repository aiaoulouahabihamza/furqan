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

        // طلب جلب الموقع بدقة وإظهار حوار التفعيل الأصلي للأندرويد
        requestNativeLocation: function() {
            if (this.isAndroidWrapper()) {
                try {
                    window.AndroidFur9anApp.requestGPSLocation();
                    console.log('📱 تم إرسال طلب جلب الموقع للأندرويد');
                } catch (e) {
                    console.error('📱 خطأ في طلب الموقع من الأندرويد:', e);
                }
            } else {
                console.log('💻 محاكاة الويب: جاري جلب الموقع من متصفح الويب...');
                // تشغيل الجلب الاحتياطي عبر المتصفح
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            if (typeof window.onLocationReceived === 'function') {
                                window.onLocationReceived(pos.coords.latitude, pos.coords.longitude);
                            }
                        },
                        (err) => {
                            const code = err ? err.code : 0;
                            const msg = err ? (err.message || 'Location unavailable') : 'Permission not granted';
                            console.warn(`💻 محاكاة الويب: تنبيه الموقع الجغرافي (${code}: ${msg})`);
                        },
                        { timeout: 8000, enableHighAccuracy: false, maximumAge: 60000 }
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

        // نظام إرسال الإشعارات والمنبهات دون تداخل أو تكرار
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
            
            // حماية فائقة لمنع تكرار الإشعار نفسه أو التداخل خلال 45 ثانية
            const now = Date.now();
            if (window._lastSentNotifs && window._lastSentNotifs[notifTag] && (now - window._lastSentNotifs[notifTag] < 45000)) {
                console.log(`📱 [Bridge] تم منع الإشعار المتكرر: [${title}]`);
                return;
            }
            if (!window._lastSentNotifs) window._lastSentNotifs = {};
            window._lastSentNotifs[notifTag] = now;

            // 1. الأندرويد الأصلي عبر JavascriptInterface
            if (this.isAndroidWrapper()) {
                try {
                    window.AndroidFur9anApp.triggerNotification(title, body, uniqueId, prayerKey || '');
                    console.log(`📱 تم إرسال الإشعار الأصلي للأندرويد: [${title}]`);
                    return;
                } catch (e) {
                    console.error('📱 خطأ في إرسال الإشعار للأندرويد:', e);
                }
            }

            // 2. إشعارات الويب المباشرة عبر Web Notifications API بأسلوب نقي وبدون كود جافا خارجي
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
            } else {
                console.log(`💻 إشعار محاكى: [${title}] ${body} (ID: ${uniqueId})`);
            }
        },

        _displayWebNotification: function(title, body, tag) {
            try {
                const options = {
                    body: body,
                    icon: '/icon.png',
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
                console.log(`🔔 تم إشعار الويب بنجاح: [${title}]`);
            } catch (err) {
                console.warn('تنبيه إشعار الويب:', err);
            }
        },

        // تنقل آمن وسريع بين الصفحات متوافق مع WebView
        navigateTo: function(url) {
            if (!url) return;
            window.location.href = url;
        },

        // إيقاف صوت الأذان من الأندرويد بشكل كامل
        stopAndroidAdhan: function() {
            if (this.isAndroidWrapper()) {
                try {
                    window.AndroidFur9anApp.stopAdhan();
                } catch (e) {}
            }
        },

        // منع الشاشة من وضع النوم (Screen Wake Lock / KeepAwake API)
        requestWakeLock: async function() {
            try {
                if ('wakeLock' in navigator && !this._wakeLockSentinel) {
                    this._wakeLockSentinel = await navigator.wakeLock.request('screen');
                    console.log('🔒 Screen WakeLock activated');
                }
            } catch (e) {
                console.warn('WakeLock error:', e);
            }
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.KeepAwake) {
                try { window.Capacitor.Plugins.KeepAwake.keepAwake(); } catch(e){}
            }
        },

        releaseWakeLock: function() {
            if (this._wakeLockSentinel) {
                try {
                    this._wakeLockSentinel.release();
                } catch (e) {}
                this._wakeLockSentinel = null;
            }
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.KeepAwake) {
                try { window.Capacitor.Plugins.KeepAwake.allowSleep(); } catch(e){}
            }
        },

        // جدولة الإشعارات المحلية لتذكير الورد اليومي والصلوات عبر Capacitor / Web
        scheduleLocalNotifications: function(settings) {
            const config = settings || (typeof window.getAppSettings === 'function' ? window.getAppSettings() : {});
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
                try {
                    const Ln = window.Capacitor.Plugins.LocalNotifications;
                    Ln.requestPermissions().then(permission => {
                        if (permission.display === 'granted') {
                            const notifications = [];

                            // تذكير الورد اليومي للقرآن
                            if (config.quranWirdNotif !== false && config.quranWirdTime) {
                                const parts = config.quranWirdTime.split(':');
                                const hrs = parseInt(parts[0], 10) || 20;
                                const mins = parseInt(parts[1], 10) || 0;
                                notifications.push({
                                    title: '📖 تذكير الورد اليومي للقرآن الكريم',
                                    body: 'حان الآن وقت قراءة وردك اليومي من كتاب الله الكريم، بارك الله في وقتك.',
                                    id: 999,
                                    schedule: { on: { hour: hrs, minute: mins }, repeats: true },
                                    smallIcon: 'ic_stat_quran',
                                    actionTypeId: 'OPEN_QURAN'
                                });
                            }

                            if (notifications.length > 0) {
                                Ln.schedule({ notifications });
                                console.log('📱 تم جدولة الإشعارات المحلية عبر Capacitor');
                            }
                        }
                    });
                } catch(e) {
                    console.warn('Capacitor LocalNotifications schedule error:', e);
                }
            }
        }
    };

    // تصدير الجسر على المستوى العالمي
    window.Fur9anBridge = Fur9anBridge;

    // --- دوال الاستقبال العامة (التي يستدعيها كود الأندرويد WebView ليرسل لنا تحديثات) ---

    // 1. يستدعيها الأندرويد بعد جلب الموقع بنجاح من مستشعر الموقع وإذن الجهاز
    window.onLocationReceived = async function(lat, lng) {
        console.log(`📱 تم استقبال إحداثيات الموقع الحقيقية من الأندرويد: ${lat}, ${lng}`);
        
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);
        const resolvedCountry = (parsedLng >= -17 && parsedLng < -1) ? 'MA' : 'SA';
        
        let resolvedName = '';
        if (typeof window.reverseGeocodeLocation === 'function') {
            resolvedName = await window.reverseGeocodeLocation(parsedLat, parsedLng);
        }
        if (!resolvedName) {
            resolvedName = 'موقعك الحالي';
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

        // عرض تنبيه بنجاح التحديد
        if (typeof window.showToast === 'function') {
            window.showToast(`تم تحديد موقعك بنجاح: ${resolvedName} 📍`);
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
        if (window.Fur9anAudio) {
            switch (command) {
                case 'play':
                    if (!window.Fur9anAudio.isPlaying) window.Fur9anAudio.togglePlay();
                    break;
                case 'pause':
                    if (window.Fur9anAudio.isPlaying) window.Fur9anAudio.togglePlay();
                    break;
                case 'next':
                    window.Fur9anAudio.nextSurah();
                    break;
                case 'prev':
                    window.Fur9anAudio.prevSurah();
                    break;
                case 'stop':
                    if (window.Fur9anAudio.isPlaying) window.Fur9anAudio.togglePlay();
                    break;
            }
        }
    };

    // 3. يستدعيها الأندرويد لإيقاف صوت الأذان المشغل في الويب عند ضغط زر إيقاف الإشعار
    window.onStopAdhanReceived = function() {
        console.log('📱 استلم أمر إيقاف الأذان من الأندرويد');
        if (typeof window.stopAdhanPlayback === 'function') {
            window.stopAdhanPlayback();
        }
    };

    // 4. يستدعيها الأندرويد عند ضغط زر الرجوع الفعلي للهاتف (Hardware Back Button) لمنع إغلاق التطبيق المفاجئ
    window.onAndroidBackPressed = function() {
        console.log('📱 تم التقاط ضغطة زر الرجوع من الأندرويد');

        // إغلاق أي نافذة منبثقة أو مودال نشط أولاً
        const activeModals = document.querySelectorAll(
            '.modal-overlay.active, .modal-overlay[style*="flex"], #tafsirModal[style*="flex"], #batchDownloadModal[style*="flex"], #cityModal.active, #profileModal.active, .modal-backdrop[style*="flex"]'
        );

        if (activeModals && activeModals.length > 0) {
            activeModals.forEach(m => {
                if (m.id === 'tafsirModal' && typeof window.closeTafsirModal === 'function') {
                    window.closeTafsirModal();
                } else if (m.id === 'cityModal' && typeof window.closeCityModal === 'function') {
                    window.closeCityModal();
                } else {
                    m.style.display = 'none';
                    m.classList.remove('active');
                }
            });
            return 'MODAL_CLOSED';
        }

        // في صفحات المراحل المتعددة (السنة النبوية، التلاوات)
        if (typeof window.handleStageBack === 'function') {
            const handled = window.handleStageBack();
            if (handled) return 'STAGE_BACK';
        }

        // الرجوع بالصفحة في سجل المتصفح
        const currentPath = window.location.pathname;
        const isHomePage = currentPath === '/' || currentPath === '/index.html' || currentPath.endsWith('/index.html') || currentPath === '';
        
        if (!isHomePage) {
            window.location.href = '/index.html';
            return 'NAVIGATED_HOME';
        }

        return 'EXIT_APP';
    };

})();
