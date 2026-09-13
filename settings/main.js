document.addEventListener('DOMContentLoaded', () => {
    // 1. استعادة الإعدادات الحالية
    const settings = window.getAppSettings();
    let previewAudioInstance = null;

    // 2. تهيئة القوائم المنسدلة
    function setupSettingsDropdown(containerId, hiddenInputId, initialValue) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const hiddenInput = document.getElementById(hiddenInputId);
        const selectElement = container.querySelector('.custom-select');
        const trigger = container.querySelector('.custom-select-trigger');
        const options = container.querySelectorAll('.custom-option');
        const selectedText = trigger.querySelector('span');

        // تعيين القيمة الأولية
        hiddenInput.value = initialValue;
        options.forEach(opt => {
            if (opt.dataset.value == initialValue) {
                options.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                selectedText.textContent = opt.textContent;
            }
        });

        // فتح/إغلاق القائمة
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = selectElement.classList.contains('open');
            document.querySelectorAll('.custom-select').forEach(el => el.classList.remove('open'));
            if (!isOpen) {
                selectElement.classList.add('open');
            }
        });

        // اختيار عنصر
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                const val = option.dataset.value;
                selectedText.textContent = option.textContent;
                hiddenInput.value = val;
                
                selectElement.classList.remove('open');
            });
        });
    }

    // إغلاق أي قائمة مفتوحة عند النقر خارجها
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown-container')) {
            document.querySelectorAll('.custom-select').forEach(el => el.classList.remove('open'));
        }
    });

    setupSettingsDropdown('preAdhanDropdown', 'settingsPreAdhanSelect', (settings.preAdhanMinutes || 5).toString());
    setupSettingsDropdown('calcMethodDropdown', 'settingsCalcMethodSelect', settings.calcMethod || 'Morocco');
    setupSettingsDropdown('hijriAdjustmentDropdown', 'settingsHijriAdjustmentSelect', (settings.hijriAdjustment || 0).toString());

    // 3. تهيئة اختيار المذهب الفقهي
    const madhabGrid = document.getElementById('settingsMadhabGrid');
    const madhabHiddenInput = document.getElementById('settingsMadhabSelect');
    if (madhabGrid && madhabHiddenInput) {
        const currentMadhab = (settings.madhab || 'maliki').toLowerCase();
        madhabHiddenInput.value = currentMadhab;
        const cards = madhabGrid.querySelectorAll('.madhab-card-option');
        cards.forEach(card => {
            const m = (card.getAttribute('data-madhab') || '').toLowerCase();
            if (m === currentMadhab) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
            card.addEventListener('click', () => {
                cards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                madhabHiddenInput.value = m;
            });
        });
    }

    // 4. تهيئة قائمة المؤذنين مع تجربة الصوت الفورية
    const recitersListContainer = document.getElementById('settingsRecitersList');
    const reciterHiddenInput = document.getElementById('settingsReciterSelect');
    const reciters = window.ADHAN_RECITERS || [
        { id: 'alafasi', name: 'الشيخ مشاري راشد العفاسي', file: '/audio/macharialafasi.mp3' },
        { id: 'aldosari', name: 'الشيخ ياسر الدوسري', file: '/audio/yassiradosari.mp3' },
        { id: 'alqatami', name: 'الشيخ ناصر القطامي', file: '/audio/nasiralqatami.mp3' },
        { id: 'islam_sobhi', name: 'القارئ إسلام صبحي', file: '/audio/islamsobhi.mp3' },
        { id: 'qzabri', name: 'الشيخ عمر القزابري', file: '/audio/3omaralqzabri.mp3' },
        { id: 'anafis', name: 'الشيخ أحمد النفيس', file: '/audio/ahmedanafis.mp3' },
        { id: 'yamani', name: 'الشيخ وديع اليمني', file: '/audio/wadiaalyamani.mp3' },
        { id: 'tazi', name: 'القارئ أنس التازي', file: '/audio/anasatazi.mp3' }
    ];

    let currentReciterVal = settings.adhanReciter || 'alafasi';
    if (reciterHiddenInput) reciterHiddenInput.value = currentReciterVal;

    if (recitersListContainer) {
        recitersListContainer.innerHTML = '';
        reciters.forEach(rec => {
            const isSelected = rec.id === currentReciterVal;
            const row = document.createElement('div');
            row.className = `reciter-preview-row ${isSelected ? 'selected' : ''}`;
            row.setAttribute('data-id', rec.id);
            row.innerHTML = `
                <div class="reciter-info-col">
                    <div class="reciter-radio-btn"></div>
                    <span class="reciter-title-text">${rec.name}</span>
                </div>
                <button type="button" class="reciter-preview-play-btn" data-id="${rec.id}" title="تجربة الصوت">
                    <i class="fa-solid fa-play"></i>
                </button>
            `;

            // اختيار المؤذن
            row.addEventListener('click', (e) => {
                if (e.target.closest('.reciter-preview-play-btn')) return;
                recitersListContainer.querySelectorAll('.reciter-preview-row').forEach(r => r.classList.remove('selected'));
                row.classList.add('selected');
                currentReciterVal = rec.id;
                if (reciterHiddenInput) reciterHiddenInput.value = rec.id;
            });

            // تجربة صوت الأذان
            const playBtn = row.querySelector('.reciter-preview-play-btn');
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const icon = playBtn.querySelector('i');
                const isPlaying = playBtn.classList.contains('playing');

                if (previewAudioInstance) {
                    previewAudioInstance.pause();
                    previewAudioInstance.currentTime = 0;
                    previewAudioInstance = null;
                }
                document.querySelectorAll('.reciter-preview-play-btn').forEach(b => {
                    b.classList.remove('playing');
                    const ic = b.querySelector('i');
                    if (ic) ic.className = 'fa-solid fa-play';
                });

                if (isPlaying) {
                    return;
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

            recitersListContainer.appendChild(row);
        });
    }

    // 6. تهيئة التنبيهات (المفاتيح)
    const toggleIds = {
        settingsDaylightSaving: settings.daylightSaving,
        notifFajr: settings.notifications.Fajr,
        notifSunrise: settings.notifications.Sunrise,
        notifDhuhr: settings.notifications.Dhuhr,
        notifAsr: settings.notifications.Asr,
        notifMaghrib: settings.notifications.Maghrib,
        notifIsha: settings.notifications.Isha,
        notifMorning: settings.azkarNotifs.morning,
        notifEvening: settings.azkarNotifs.evening,
        notifSleep: settings.azkarNotifs.sleep,
        notifWakeup: settings.azkarNotifs.wakeup,
        notifQuranWird: settings.quranWirdNotif !== false
    };

    for (const [id, value] of Object.entries(toggleIds)) {
        const el = document.getElementById(id);
        if (el) el.checked = !!value;
    }

    const quranWirdTimeEl = document.getElementById('quranWirdTime');
    if (quranWirdTimeEl) {
        quranWirdTimeEl.value = settings.quranWirdTime || '20:00';
    }

    // 7. حفظ الإعدادات
    window.saveAllSettingsAndClose = function() {
        if (previewAudioInstance) {
            previewAudioInstance.pause();
        }

        // جمع القوائم المنسدلة والمذهب
        const preAdhan = parseInt(document.getElementById('settingsPreAdhanSelect').value, 10);
        const madhab = (document.getElementById('settingsMadhabSelect') ? document.getElementById('settingsMadhabSelect').value : 'maliki') || 'maliki';
        const reciter = (document.getElementById('settingsReciterSelect') ? document.getElementById('settingsReciterSelect').value : 'alafasi') || 'alafasi';
        const calcMethod = (document.getElementById('settingsCalcMethodSelect') ? document.getElementById('settingsCalcMethodSelect').value : 'Morocco') || 'Morocco';
        const hijriAdj = parseInt(document.getElementById('settingsHijriAdjustmentSelect') ? document.getElementById('settingsHijriAdjustmentSelect').value : '0', 10) || 0;
        const daylightSaving = document.getElementById('settingsDaylightSaving') ? document.getElementById('settingsDaylightSaving').checked : false;

        // بناء كائن الإعدادات الجديد
        const newSettings = {
            ...settings,
            theme: 'light',
            madhab: madhab,
            adhanReciter: reciter,
            calcMethod: calcMethod,
            hijriAdjustment: hijriAdj,
            preAdhanMinutes: isNaN(preAdhan) ? 5 : preAdhan,
            daylightSaving: daylightSaving,
            hasConfiguredPrayer: true,
            notifications: {
                Fajr: document.getElementById('notifFajr') ? document.getElementById('notifFajr').checked : true,
                Sunrise: document.getElementById('notifSunrise') ? document.getElementById('notifSunrise').checked : true,
                Dhuhr: document.getElementById('notifDhuhr') ? document.getElementById('notifDhuhr').checked : true,
                Asr: document.getElementById('notifAsr') ? document.getElementById('notifAsr').checked : true,
                Maghrib: document.getElementById('notifMaghrib') ? document.getElementById('notifMaghrib').checked : true,
                Isha: document.getElementById('notifIsha') ? document.getElementById('notifIsha').checked : true
            },
            azkarNotifs: {
                morning: document.getElementById('notifMorning') ? document.getElementById('notifMorning').checked : true,
                evening: document.getElementById('notifEvening') ? document.getElementById('notifEvening').checked : true,
                sleep: document.getElementById('notifSleep') ? document.getElementById('notifSleep').checked : true,
                wakeup: document.getElementById('notifWakeup') ? document.getElementById('notifWakeup').checked : true
            },
            quranWirdNotif: document.getElementById('notifQuranWird') ? document.getElementById('notifQuranWird').checked : true,
            quranWirdTime: document.getElementById('quranWirdTime') ? document.getElementById('quranWirdTime').value : '20:00'
        };

        // حفظ في التخزين المحلي
        window.saveAppSettings(newSettings);
        localStorage.setItem('selectedAdhanReciter', reciter);
        localStorage.setItem('prayer_setup_completed', 'true');
        localStorage.setItem('fur9an_prayer_onboarding_done', 'true');
        
        // جدولة الإشعارات المحلية
        if (window.Fur9anBridge && typeof window.Fur9anBridge.scheduleLocalNotifications === 'function') {
            window.Fur9anBridge.scheduleLocalNotifications(newSettings);
        }
        
        // إشعار بالنجاح (اهتزاز إن وجد)
        if (navigator.vibrate) navigator.vibrate(50);
        
        // الرجوع للصفحة السابقة
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/index.html';
        }
    };
});
