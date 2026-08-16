/**
 * منصة الفرقان - وحدة الجسر الموحد للأندرويد والويب (Fur9an Unified Android & Web Bridge)
 * يعمل كجسر تواصل ذكي وسلس بين صفحات الويب وبيئة أندرويد (Java WebView Native / Cordova / Capacitor / PWA)
 */

(function () {
    'use strict';

    var Fur9anBridge = {
        isAndroidNative: false,
        isCordova: false,
        version: '2.0.0',

        init: function () {
            // 1. فحص وجود واجهة أندرويد الأصلية (Java @JavascriptInterface)
            if (window.Android || window.Fur9anAndroid) {
                this.isAndroidNative = true;
                console.log('🤖 [الفرقان] تم ربط واجهة أندرويد الأصلية (Java WebAppInterface) بنجاح');
            }

            // 2. فحص كوردوفا
            document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);

            // 3. ضبط معالجات الأزرار والحالة الافتراضية
            this.setupBackButton();
            this.setupWebFallbacks();
            this.updateStatusBarTheme();

            // 4. الاستماع لتغييرات الثيم لمزامنتها مع شريط الحالة في أندرويد
            var observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                    if (mutation.attributeName === 'data-theme') {
                        Fur9anBridge.updateStatusBarTheme();
                    }
                });
            });
            observer.observe(document.documentElement, { attributes: true });

            console.log('🌐 [الفرقان] تم تهيئة جسر الربط الشامل للإصدار ' + this.version);
        },

        onDeviceReady: function () {
            this.isCordova = true;
            console.log('🚀 [الفرقان] تم الاتصال مع بيئة كوردوفا (Device Ready)');

            this.updateStatusBarTheme();
            this.requestAndroidPermissions();
            this.setupNotificationHandlers();
            this.configureKeepAlive();
        },

        /* =========================================================================
           1. التحكم في شريط الحالة (Status Bar)
           ========================================================================= */
        updateStatusBarTheme: function () {
            var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            var bgColor = isDark ? '#091D26' : '#10828D';

            // أندرويد ناتيف (Java)
            if (window.Android && typeof window.Android.setStatusBarColor === 'function') {
                try {
                    window.Android.setStatusBarColor(bgColor, !isDark);
                } catch (e) {}
            } else if (window.Fur9anAndroid && typeof window.Fur9anAndroid.setStatusBarColor === 'function') {
                try {
                    window.Fur9anAndroid.setStatusBarColor(bgColor, !isDark);
                } catch (e) {}
            }

            // كوردوفا
            if (window.StatusBar) {
                try {
                    window.StatusBar.backgroundColorByHexString(bgColor);
                    if (isDark) {
                        window.StatusBar.styleLightContent();
                    } else {
                        window.StatusBar.styleLightContent();
                    }
                } catch (e) {}
            }
        },

        /* =========================================================================
           2. الاهتزاز والردود اللمسية (Vibration & Haptics)
           ========================================================================= */
        vibrate: function (pattern) {
            var duration = typeof pattern === 'number' ? pattern : (Array.isArray(pattern) ? pattern[0] : 50);

            // أندرويد ناتيف (Java)
            if (window.Android && typeof window.Android.vibrate === 'function') {
                try {
                    window.Android.vibrate(duration);
                    return;
                } catch (e) {}
            }
            if (window.Fur9anAndroid && typeof window.Fur9anAndroid.vibrate === 'function') {
                try {
                    window.Fur9anAndroid.vibrate(duration);
                    return;
                } catch (e) {}
            }

            // Web API
            if (navigator && typeof navigator.vibrate === 'function') {
                try {
                    navigator.vibrate(pattern || 50);
                } catch (e) {}
            }
        },

        /* =========================================================================
           3. إشعارات وتنبيهات الأذان والصلوات (Notifications & Adhan Alarms)
           ========================================================================= */
        requestAndroidPermissions: function () {
            if (window.Android && typeof window.Android.requestPermissions === 'function') {
                try {
                    window.Android.requestPermissions();
                } catch (e) {}
            }

            if (window.cordova && window.cordova.plugins && window.cordova.plugins.notification && window.cordova.plugins.notification.local) {
                window.cordova.plugins.notification.local.hasPermission(function (granted) {
                    if (!granted) {
                        window.cordova.plugins.notification.local.requestPermission(function (hasPermission) {
                            console.log('📱 [أندرويد] حالة صلاحيات الإشعارات:', hasPermission);
                        });
                    }
                });
            }
        },

        sendNotification: function (title, body, id, prayerName) {
            // أندرويد ناتيف (Java)
            if (window.Android && typeof window.Android.showNotification === 'function') {
                try {
                    window.Android.showNotification(title, body, id || 100, prayerName || '');
                    return;
                } catch (e) {}
            }
            if (window.Fur9anAndroid && typeof window.Fur9anAndroid.showNotification === 'function') {
                try {
                    window.Fur9anAndroid.showNotification(title, body, id || 100, prayerName || '');
                    return;
                } catch (e) {}
            }

            // كوردوفا
            if (window.cordova && window.cordova.plugins && window.cordova.plugins.notification && window.cordova.plugins.notification.local) {
                window.cordova.plugins.notification.local.schedule({
                    id: id || Math.floor(Math.random() * 100000),
                    title: title,
                    text: body,
                    foreground: true,
                    smallIcon: 'res://icon',
                    color: '10828D',
                    data: { prayerName: prayerName || '' }
                });
                return;
            }

            // Web Notification
            if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    new Notification(title, {
                        body: body,
                        icon: '/data/images/logo.png',
                        data: { prayerName: prayerName }
                    });
                } catch (e) {}
            }
        },

        /* =========================================================================
           4. مزامنة مواقيت الصلاة والساعة الصيفية واستدعاء الأذان في الجافا
           ========================================================================= */
        onPrayerTimeArrived: function (prayerKey, prayerNameAr, reciterName, audioFile) {
            console.log('🕌 [الفرقان] نداء الأذان الفعلي للجافا:', prayerNameAr, reciterName, audioFile);
            if (window.Android && typeof window.Android.onPrayerTimeArrived === 'function') {
                try {
                    window.Android.onPrayerTimeArrived(prayerNameAr, reciterName, audioFile);
                    return;
                } catch (e) {}
            }
            if (window.Fur9anAndroid && typeof window.Fur9anAndroid.onPrayerTimeArrived === 'function') {
                try {
                    window.Fur9anAndroid.onPrayerTimeArrived(prayerNameAr, reciterName, audioFile);
                    return;
                } catch (e) {}
            }
            if (window.Android && typeof window.Android.showPrayerAlert === 'function') {
                try {
                    window.Android.showPrayerAlert(prayerNameAr, reciterName, audioFile);
                } catch (e) {}
            }
        },

        syncPrayerTimesToAndroid: function (prayerData) {
            try {
                var jsonStr = typeof prayerData === 'string' ? prayerData : JSON.stringify(prayerData);
                if (window.Android && typeof window.Android.updatePrayerTimes === 'function') {
                    window.Android.updatePrayerTimes(jsonStr);
                    console.log('🕌 [أندرويد] تم مزامنة مواقيت الصلاة مع الجافا بنجاح');
                } else if (window.Fur9anAndroid && typeof window.Fur9anAndroid.updatePrayerTimes === 'function') {
                    window.Fur9anAndroid.updatePrayerTimes(jsonStr);
                }
            } catch (e) {
                console.warn('Failed to sync prayer times to native Android:', e);
            }
        },

        syncSettingsToAndroid: function (settings) {
            try {
                var jsonStr = typeof settings === 'string' ? settings : JSON.stringify(settings);
                if (window.Android && typeof window.Android.saveSettings === 'function') {
                    window.Android.saveSettings(jsonStr);
                } else if (window.Fur9anAndroid && typeof window.Fur9anAndroid.saveSettings === 'function') {
                    window.Fur9anAndroid.saveSettings(jsonStr);
                }
            } catch (e) {}
        },

        /* =========================================================================
           5. مشاركة النصوص ورسائل Toast وإبقاء الشاشة مضاءة
           ========================================================================= */
        shareText: function (title, text) {
            if (window.Android && typeof window.Android.shareText === 'function') {
                window.Android.shareText(title, text);
                return;
            }
            if (window.Fur9anAndroid && typeof window.Fur9anAndroid.shareText === 'function') {
                window.Fur9anAndroid.shareText(title, text);
                return;
            }
            if (navigator.share) {
                navigator.share({ title: title, text: text }).catch(function () {});
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(function () {
                    Fur9anBridge.showToast('تم نسخ النص بنجاح');
                });
            }
        },

        showToast: function (message) {
            if (window.Android && typeof window.Android.showToast === 'function') {
                window.Android.showToast(message);
                return;
            }
            if (window.Fur9anAndroid && typeof window.Fur9anAndroid.showToast === 'function') {
                window.Fur9anAndroid.showToast(message);
                return;
            }
            // fallback toast
            var toastEl = document.getElementById('fur9anToast');
            if (!toastEl) {
                toastEl = document.createElement('div');
                toastEl.id = 'fur9anToast';
                toastEl.style.cssText = 'position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.85); color:#fff; padding:10px 20px; border-radius:25px; font-size:13px; z-index:99999; pointer-events:none; transition:opacity 0.3s; font-family:Cairo,sans-serif; text-align:center; box-shadow:0 4px 12px rgba(0,0,0,0.2);';
                document.body.appendChild(toastEl);
            }
            toastEl.textContent = message;
            toastEl.style.opacity = '1';
            setTimeout(function () {
                toastEl.style.opacity = '0';
            }, 2500);
        },

        setKeepScreenOn: function (enable) {
            if (window.Android && typeof window.Android.setKeepScreenOn === 'function') {
                window.Android.setKeepScreenOn(enable);
            }
            if (window.Fur9anAndroid && typeof window.Fur9anAndroid.setKeepScreenOn === 'function') {
                window.Fur9anAndroid.setKeepScreenOn(enable);
            }
        },

        /* =========================================================================
           6. التعامل الذكي مع زر الرجوع الفعلي (Hardware Back Button)
           ========================================================================= */
        onBackPressed: function () {
            // 1. إغلاق أي نافذة منبثقة أو مودال مفتوح
            var activeModal = document.querySelector('.modal-overlay.active, .modal.active, #storyModal[style*="display: block"], #storyModal.active, #fullPlayerModal.active, #tasbeehResetModal.active');
            if (activeModal) {
                if (typeof window.closeStoryModalFunc === 'function') {
                    window.closeStoryModalFunc();
                } else if (activeModal.id === 'storyModal' || activeModal.classList.contains('story-modal')) {
                    activeModal.style.display = 'none';
                    activeModal.classList.remove('active');
                } else {
                    activeModal.classList.remove('active');
                    if (activeModal.style) activeModal.style.display = 'none';
                }
                document.body.style.overflow = '';
                return true; // تم التعامل معه
            }

            // 2. تفاصيل الأذكار أو السُنّة أو القراء
            if (window.location.pathname.indexOf('/adkar') !== -1 && document.getElementById('detailView') && document.getElementById('detailView').style.display !== 'none') {
                var backBtn = document.getElementById('backToCategoriesBtn');
                if (backBtn) { backBtn.click(); return true; }
            }
            if (window.location.pathname.indexOf('/sunah') !== -1) {
                var hadithsStage = document.getElementById('hadithsStage');
                var chaptersStage = document.getElementById('chaptersStage');
                if (hadithsStage && hadithsStage.style.display !== 'none') {
                    document.getElementById('backToChaptersBtn')?.click();
                    return true;
                }
                if (chaptersStage && chaptersStage.style.display !== 'none') {
                    document.getElementById('backToBooksBtn')?.click();
                    return true;
                }
            }
            if (window.location.pathname.indexOf('/recitations') !== -1 && document.getElementById('surahsView') && document.getElementById('surahsView').style.display !== 'none') {
                document.getElementById('backToRecitersBtn')?.click();
                return true;
            }

            // 3. الرجوع للصفحة الرئيسية إذا كنا في صفحة فرعية
            var path = window.location.pathname;
            if (path !== '/' && path !== '/index.html' && !path.endsWith('/index.html') && path !== '') {
                window.location.href = '/index.html';
                return true;
            }

            // 4. إذا كنا في الصفحة الرئيسية
            return false; // دع النظام يخرج أو يظهر تأكيد الخروج
        },

        setupBackButton: function () {
            var self = this;
            document.addEventListener('backbutton', function (e) {
                var handled = self.onBackPressed();
                if (handled) {
                    e.preventDefault();
                } else {
                    if (navigator.app && navigator.app.exitApp) {
                        navigator.app.exitApp();
                    } else if (window.Android && typeof window.Android.exitApp === 'function') {
                        window.Android.exitApp();
                    }
                }
            }, false);
        },

        setupNotificationHandlers: function () {
            if (window.cordova && window.cordova.plugins && window.cordova.plugins.notification && window.cordova.plugins.notification.local) {
                var localNotif = window.cordova.plugins.notification.local;
                localNotif.on('click', function (notification) {
                    if (notification.data && notification.data.prayerName) {
                        if (window.location.pathname.indexOf('prayer') === -1) {
                            window.location.href = '/prayer/index.html';
                        }
                    }
                });
            }
        },

        configureKeepAlive: function () {
            if (window.cordova && window.cordova.plugins && window.cordova.plugins.backgroundMode) {
                try {
                    window.cordova.plugins.backgroundMode.enable();
                    window.cordova.plugins.backgroundMode.setDefaults({
                        title: 'تطبيق الفرقان يعمل في الخلفية',
                        text: 'يتم متابعة مواقيت الصلاة والأذان بدقة',
                        icon: 'icon',
                        color: '10828D',
                        resume: true,
                        hidden: true,
                        bigText: true
                    });
                } catch (e) {}
            }
        },

        setupWebFallbacks: function () {
            if ('Notification' in window && Notification.permission === 'default') {
                try {
                    Notification.requestPermission();
                } catch (e) {}
            }
        }
    };

    window.Fur9anBridge = Fur9anBridge;
    Fur9anBridge.init();
})();
