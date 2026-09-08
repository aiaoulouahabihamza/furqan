/**
 * الفرقان - الصفحة الرئيسية
 */

// الثيم يُدار مركزياً عبر settings.js

// ============================================
// 2. حساب التاريخ الهجري 100% أوفلاين مع مراعاة تعديل الأيام
// ============================================
function updateTopbarHijriDate() {
    const topbarText = document.getElementById('topbarHijriText');
    if (!topbarText) return;

    if (typeof window.getOfflineHijriDate === 'function') {
        const hObj = window.getOfflineHijriDate(new Date());
        if (hObj && hObj.formatted) {
            topbarText.textContent = hObj.formatted;
        } else if (typeof hObj === 'string') {
            topbarText.textContent = hObj;
        } else {
            topbarText.textContent = String(hObj);
        }
    } else {
        try {
            const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Asia/Riyadh'
            });
            let formatted = formatter.format(new Date());
            formatted = formatted.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
            formatted = formatted.replace(/،/g, '').replace(/\s*هـ\s*/g, '').replace(/\s+/g, ' ').trim();
            topbarText.textContent = formatted;
        } catch (e) {
            topbarText.textContent = 'اليوم الهجري المبارك';
        }
    }
}
function updateDates() {
    updateTopbarHijriDate();
}
updateTopbarHijriDate();
window.updateTopbarHijriDate = updateTopbarHijriDate;
window.updateDates = updateDates;

// ============================================
// 3. جلب مواقيت الصلاة المصغرة الموحدة
// ============================================
function updateMiniPrayerTimesUI() {
    if (typeof window.calculateUnifiedPrayerTimes === 'function') {
        const unified = window.calculateUnifiedPrayerTimes();
        if (unified && unified.timings) {
            const miniLoc = document.getElementById('miniLocationDisplay');
            if (miniLoc) {
                const cleanName = (typeof window.cleanLocationName === 'function')
                    ? window.cleanLocationName(unified.cityName)
                    : (unified.cityName || '').replace(/\s*\(?\s*gps\s*\)?/gi, '').trim();
                miniLoc.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${cleanName || 'موقعك الحالي'}`;
            }

            if (document.getElementById('miniFajr')) document.getElementById('miniFajr').textContent = unified.timings.Fajr;
            if (document.getElementById('miniDhuhr')) document.getElementById('miniDhuhr').textContent = unified.timings.Dhuhr;
            if (document.getElementById('miniAsr')) document.getElementById('miniAsr').textContent = unified.timings.Asr;
            if (document.getElementById('miniMaghrib')) document.getElementById('miniMaghrib').textContent = unified.timings.Maghrib;
            if (document.getElementById('miniIsha')) document.getElementById('miniIsha').textContent = unified.timings.Isha;
            return;
        }
    }
}
window.updateAllPrayerTimesUI = updateMiniPrayerTimesUI;
updateMiniPrayerTimesUI();

// ============================================
// التحميل والتخزين المسبق لأصوات الأذان في ذاكرة التطبيق (CacheStorage)
// ============================================
function precacheAdhanAudioFiles() {
    if ('caches' in window) {
        const audioFiles = [
            '/audio/macharialafasi.mp3',
            '/audio/yassiradosari.mp3',
            '/audio/nasiralqatami.mp3',
            '/audio/3omaralqzabri.mp3',
            '/audio/ahmedanafis.mp3',
            '/audio/islamsobhi.mp3',
            '/audio/wadiaalyamani.mp3',
            '/audio/anasatazi.mp3'
        ];
        caches.open('mishkat-cache-v3').then(cache => {
            audioFiles.forEach(file => {
                cache.match(file).then(res => {
                    if (!res && navigator.onLine) {
                        cache.add(file).catch(err => console.log('Precache audio info:', err));
                    }
                });
            });
        });
    }
}
if (document.readyState === 'complete') {
    precacheAdhanAudioFiles();
} else {
    window.addEventListener('load', precacheAdhanAudioFiles);
}

// ============================================
// 4. التنبيهات السريعة (Toast System)
// ============================================
function showToast(message) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    container.innerHTML = '';
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.25s ease forwards';
        setTimeout(() => toast.remove(), 250);
    }, 2500);
}
window.showToast = showToast;

function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================
// 5. مودال البروفايل
// ============================================
const profileBtn = document.getElementById('profileBtn');
const profileModal = document.getElementById('profileModal');
const profileClose = document.getElementById('profileClose');

if (profileBtn) profileBtn.addEventListener('click', () => openModal(profileModal));
if (profileClose) profileClose.addEventListener('click', () => closeModal(profileModal));

if (profileModal) {
    profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) closeModal(profileModal);
    });
}

document.getElementById('profileSave')?.addEventListener('click', () => {
    const data = {
        name: document.getElementById('profileName')?.value || '',
        city: document.getElementById('profileCity')?.value || '',
        country: document.getElementById('profileCountry')?.value || '',
    };
    localStorage.setItem('profile', JSON.stringify(data));
    showAppToast('تم حفظ الملف الشخصي بنجاح', 'success');
    closeModal(profileModal);
});

const savedProfile = localStorage.getItem('profile');
if (savedProfile) {
    try {
        const data = JSON.parse(savedProfile);
        const nameInput = document.getElementById('profileName');
        const cityInput = document.getElementById('profileCity');
        const countryInput = document.getElementById('profileCountry');
        if (nameInput) nameInput.value = data.name || '';
        if (cityInput) cityInput.value = data.city || '';
        if (countryInput) countryInput.value = data.country || '';
    } catch(e) {}
}

// ============================================
// 6. التنقل النشط
// ============================================
const navItems = document.querySelectorAll('.nav-item');

navItems.forEach(item => {
    item.addEventListener('click', function(e) {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
        if (this.getAttribute('data-nav') === 'home') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
});

// ============================================
// 7. إخفاء الهيدر
// ============================================
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

// ============================================
// 8. آخر قراءة (مربوطة فعلياً بصفحة القرآن)
// ============================================
function buildQuranPageUrl(data) {
    const params = new URLSearchParams({
        page: data.page,
        surah: data.surahNumber,
        name: data.surahName,
    });
    return `./quran/page.html?${params.toString()}`;
}

function loadRecentReading() {
    const recentContent = document.getElementById('recentContent');
    if (!recentContent) return;

    const raw = localStorage.getItem('lastRead');
    if (!raw) return; // تبقى حالة "لم تقرأ شيئاً بعد" الافتراضية في HTML

    try {
        const data = JSON.parse(raw);
        if (!data || !data.page || !data.surahName) return;

        const url = buildQuranPageUrl(data);
        recentContent.innerHTML = `
            <a class="recent-item" href="${url}">
                <div class="recent-item-icon">
                    <i class="fa-solid fa-book-open"></i>
                </div>
                <div class="recent-item-info">
                    <span class="recent-item-surah">سورة ${data.surahName}</span>
                    <span class="recent-item-page">صفحة ${data.page}</span>
                </div>
                <i class="fa-solid fa-chevron-left recent-item-arrow"></i>
            </a>
        `;
    } catch (e) {
        console.warn('⚠️ تعذّر قراءة آخر قراءة', e);
    }
}
loadRecentReading();

document.getElementById('viewAllRecent')?.addEventListener('click', () => {
    const raw = localStorage.getItem('lastRead');
    if (raw) {
        try {
            const data = JSON.parse(raw);
            window.location.href = buildQuranPageUrl(data);
            return;
        } catch (e) {}
    }
    window.location.href = './quran/index.html';
});

// ============================================
// 9. تحديث أوقات الصلاة كل 5 دقائق
// ============================================
setInterval(updateMiniPrayerTimesUI, 300000);

// ============================================
// 10. تحديث التاريخ كل دقيقة
// ============================================
setInterval(updateDates, 60000);

// ============================================
// 11. الأدعية من 100dua.json
// ============================================
let allDua = [];
let duaIndex = 0;
let duaInterval = null;

async function loadDua() {
    try {
        const response = await fetch('./data/json/100dua.json');
        const data = await response.json();
        allDua = data;
        initDots('duaDots', allDua.length);
        displayDua(0);
        startDuaRotation();
    } catch (error) {
        console.error('خطأ في تحميل الأدعية:', error);
        document.getElementById('randomDua').textContent = 'اللهم إني أسألك العفو والعافية';
        document.getElementById('duaSource').textContent = 'دعاء مبارك';
    }
}

function displayDua(index) {
    if (allDua.length === 0) return;
    
    const duaItem = allDua[index % allDua.length];
    const duaText = document.getElementById('randomDua');
    const duaSource = document.getElementById('duaSource');
    
    if (duaItem && duaItem.duaa && duaItem.duaa.length > 0) {
        duaText.textContent = duaItem.duaa[0].text;
        
        // عرض المصدر
        const source = duaItem.duaa[0].source;
        let sourceText = '';
        if (source) {
            if (source.type === 'quran') {
                const ref = source.references[0];
                if (ref) {
                    sourceText = ` ${ref.surah.name} - ${ref.ayah.from}`;
                }
            } else if (source.type === 'hadith') {
                const ref = source.references[0];
                if (ref) {
                    sourceText = ` ${ref.book || ''} ${ref.numberOrPage || ''}`;
                }
            }
        }
        duaSource.textContent = sourceText || 'دعاء مبارك';
    }
    
    // تحديث النقاط
    updateDots('duaDots', index, allDua.length);
    duaIndex = index;
}

function startDuaRotation() {
    if (duaInterval) clearInterval(duaInterval);
    duaInterval = setInterval(() => {
        const nextIndex = (duaIndex + 1) % allDua.length;
        displayDua(nextIndex);
    }, 30000); // 30 ثانية (نصف دقيقة)
}

// ============================================
// 12. آية وعبرة من ayat&ebra.json
// ============================================
let allVerses = [];
let verseIndex = 0;
let verseInterval = null;

async function loadVerse() {
    try {
        const response = await fetch('./data/json/ayat&ebra.json');
        const data = await response.json();
        allVerses = data;
        initDots('verseDots', allVerses.length);
        displayVerse(0);
        startVerseRotation();
    } catch (error) {
        console.error('خطأ في تحميل الآيات:', error);
        document.getElementById('verseText').textContent = '"وَمَنْ يَتَّقِ اللَّهَ يَجْعَلْ لَهُ مَخْرَجًا"';
        document.getElementById('verseRef').textContent = 'الطلاق - 2';
        document.getElementById('verseLesson').textContent = 'التقوى باب الفرج، من تمسك بها فتح الله له من حيث لا يحتسب';
    }
}

function displayVerse(index) {
    if (allVerses.length === 0) return;
    
    const verse = allVerses[index % allVerses.length];
    const verseText = document.getElementById('verseText');
    const verseRef = document.getElementById('verseRef');
    const verseLesson = document.getElementById('verseLesson');
    
    if (verse) {
        verseText.textContent = verse.title1 || '';
        verseRef.textContent = verse.title2 || 'آية قرآنية';
        verseLesson.textContent = verse.title3 || 'تأمل في آيات الله وتدبر معانيها';
    }
    
    updateDots('verseDots', index, allVerses.length);
    verseIndex = index;
}

function startVerseRotation() {
    if (verseInterval) clearInterval(verseInterval);
    verseInterval = setInterval(() => {
        const nextIndex = (verseIndex + 1) % allVerses.length;
        displayVerse(nextIndex);
    }, 30000); // 30 ثانية (نصف دقيقة)
}

// ============================================
// 13. تهيئة وتحديث النقاط
// ============================================
function initDots(containerId, count) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const maxDots = Math.min(count, 5); // حد أقصى 5 نقاط لمنع التجاوز البصري
    for (let i = 0; i < maxDots; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        dot.dataset.index = i;
        container.appendChild(dot);
    }
}

function updateDots(containerId, activeIndex, total) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const dots = container.querySelectorAll('.dot');
    if (dots.length === 0) return;
    
    const activeDotIndex = activeIndex % dots.length;
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === activeDotIndex);
    });
}

// ============================================
// 14. النقر على النقاط للتبديل
// ============================================
document.addEventListener('click', function(e) {
    // نقاط الأدعية
    if (e.target.closest('#duaDots .dot')) {
        const dot = e.target.closest('.dot');
        const index = parseInt(dot.dataset.index);
        if (!isNaN(index) && allDua.length > 0) {
            displayDua(index % allDua.length);
            // إعادة تعيين المؤقت
            startDuaRotation();
        }
    }
    
    // نقاط الآيات
    if (e.target.closest('#verseDots .dot')) {
        const dot = e.target.closest('.dot');
        const index = parseInt(dot.dataset.index);
        if (!isNaN(index) && allVerses.length > 0) {
            displayVerse(index % allVerses.length);
            startVerseRotation();
        }
    }
});

// ============================================
// 15. دعم التمرير السريع (Swipe Gestures)
// ============================================
function addSwipeSupport(elementId, onSwipeLeft, onSwipeRight) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    
    el.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    el.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].clientX;
        touchEndY = e.changedTouches[0].clientY;
        handleGesture();
    }, { passive: true });
    
    function handleGesture() {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        // التأكد من أن الحركة أفقية وبمساحة كافية (أكبر من 50 بكسل)
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            if (deltaX > 0) {
                if (onSwipeRight) onSwipeRight();
            } else {
                if (onSwipeLeft) onSwipeLeft();
            }
        }
    }
}

// تشغيل التمرير لبطاقة الأدعية
addSwipeSupport('duaCard', () => {
    // تمرير لليسار -> التالي
    if (allDua.length > 0) {
        const nextIndex = (duaIndex + 1) % allDua.length;
        displayDua(nextIndex);
        startDuaRotation();
    }
}, () => {
    // تمرير لليمين -> السابق
    if (allDua.length > 0) {
        const prevIndex = (duaIndex - 1 + allDua.length) % allDua.length;
        displayDua(prevIndex);
        startDuaRotation();
    }
});

// تشغيل التمرير لبطاقة آية وعبرة
addSwipeSupport('verseCard', () => {
    // تمرير لليسار -> التالي
    if (allVerses.length > 0) {
        const nextIndex = (verseIndex + 1) % allVerses.length;
        displayVerse(nextIndex);
        startVerseRotation();
    }
}, () => {
    // تمرير لليمين -> السابق
    if (allVerses.length > 0) {
        const prevIndex = (verseIndex - 1 + allVerses.length) % allVerses.length;
        displayVerse(prevIndex);
        startVerseRotation();
    }
});

// ============================================
// 16. التهيئة
// ============================================
loadDua();
loadVerse();

// ============================================
// 17. نافذة الفرقان المنبثقة وإدارة الأندرويد
// ============================================

// عرض نافذة التحديث لمرة واحدة
document.addEventListener('DOMContentLoaded', () => {
    const popup = document.getElementById('furqanUpdatePopup') || document.getElementById('mishkatUpdatePopup');
    const closeBtn = document.getElementById('closeFurqanPopup') || document.getElementById('closeMishkatPopup');
    
    if (popup && closeBtn) {
        const hasSeenWelcome = localStorage.getItem('furqan_update_v3_5');
        if (!hasSeenWelcome) {
            setTimeout(() => {
                popup.classList.add('active');
            }, 800);
        }
        
        closeBtn.addEventListener('click', () => {
            popup.classList.remove('active');
            localStorage.setItem('furqan_update_v3_5', 'true');
        });
    }
});

// التعامل مع زر الرجوع الفعلي للأندرويد (Cordova backbutton)
document.addEventListener('deviceready', () => {
    console.log('📱 تم تحميل كوردوفا بنجاح وجاهز للتشغيل على الأندرويد');
    
    // طلب صلاحيات الإشعارات لنظام أندرويد 13 فما فوق
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.notification && window.cordova.plugins.notification.local) {
        window.cordova.plugins.notification.local.hasPermission((granted) => {
            if (!granted) {
                window.cordova.plugins.notification.local.requestPermission((hasPermission) => {
                    console.log('📱 صلاحية الإشعارات الأصلية:', hasPermission);
                });
            }
        });
    }
    
    document.addEventListener('backbutton', (e) => {
        // إذا كان هناك أي مودال مفتوح، نقوم بإغلاقه بدلاً من إغلاق التطبيق
        const activeModals = document.querySelectorAll('.modal-overlay.active, .furqan-popup-overlay.active, .mishkat-popup-overlay.active, .city-modal.active');
        if (activeModals.length > 0) {
            activeModals.forEach(modal => {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            });
            return;
        }

        // إذا كنا لست في الصفحة الرئيسية، نرجع للخلف في التاريخ بدلاً من الخروج
        const path = window.location.pathname;
        const isHomePage = path.endsWith('index.html') || path === '/' || path.split('/').pop() === '';
        if (!isHomePage) {
            window.history.back();
        } else {
            // في الصفحة الرئيسية، يخرج من التطبيق بأمان
            if (navigator.app && navigator.app.exitApp) {
                navigator.app.exitApp();
            }
        }
    }, false);
}, false);

console.log('✨ منصة الفرقان - الرقمية الشاملة بالهوية الزجاجية جاهزة بالكامل');
console.log('📖 تم تحميل الأدعية والآيات بالخط المغربي الأصيل');