/**
 * منصة الفرقان - قائمة السور
 * يعتمد على variables.css
 */

// الثيم يُدار مركزياً عبر settings.js

// ===== المتغيرات =====
let allSurahs = [];
const loadingState = document.getElementById('loadingState');
const surahList = document.getElementById('surahList');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const noResults = document.getElementById('noResults');
const clearSearchBtn = document.getElementById('clearSearchBtn');

const arabicNums = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
function toArabicNum(n) {
    return n.toString().split('').map(d => arabicNums[parseInt(d)]).join('');
}

// ===== تحميل السور =====
async function loadSurahs() {
    try {
        const res = await fetch('/data/json/surah.json');
        if (!res.ok) throw new Error('فشل التحميل');
        allSurahs = await res.json();
        
        loadingState.style.display = 'none';
        renderSurahs(allSurahs);
    } catch (error) {
        console.error('❌ خطأ:', error);
        loadingState.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
                <i class="fa-solid fa-triangle-exclamation" style="color:var(--color-gold, #C8B46E);font-size:48px;"></i>
                <span style="font-size:16px;font-weight:600;">حدث خطأ في تحميل القرآن</span>
                <button onclick="location.reload()" style="padding:10px 28px;border:none;border-radius:9999px;background:var(--color-primary, #5E7A55);color:white;font-family:var(--font-family, 'Tajawal');font-weight:700;cursor:pointer;font-size:14px;">
                    <i class="fa-solid fa-arrow-rotate-right" style="margin-left:6px;"></i>
                    إعادة المحاولة
                </button>
            </div>
        `;
    }
}

function normalizeArabic(text) {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[ؤئ]/g, 'ء');
}

// ===== عرض السور =====
function renderSurahs(surahs) {
    if (!surahs || surahs.length === 0) {
        surahList.innerHTML = '';
        noResults.style.display = 'flex';
        return;
    }
    
    noResults.style.display = 'none';
    
    surahList.innerHTML = surahs.map((surah) => {
        const typeClass = surah.type === 'مكية' ? 'makki' : 'madani';
        const typeLabel = surah.type === 'مكية' ? 'مكية' : 'مدنية';
        const versesCount = surah.surah_verses_count || '--';
        const latinName = surah.title_latin || '';
        
        return `
            <div class="surah-item" data-surah-number="${surah.surah_number}">
                <div class="surah-number-wrap">
                    <span class="surah-number">${toArabicNum(surah.surah_number)}</span>
                </div>
                <div class="surah-name-block">
                    <span class="surah-name">${surah.title_ar || surah.surah_title || '--'}</span>
                    ${latinName ? `<span class="surah-name-latin">${latinName}</span>` : ''}
                </div>
                <div class="surah-meta">
                    <span class="type-badge ${typeClass}">${typeLabel}</span>
                    <span class="surah-meta-item">
                        <i class="fa-solid fa-book-open"></i>
                        ${toArabicNum(versesCount)}
                    </span>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.surah-item').forEach(item => {
        item.addEventListener('click', function() {
            const surahNum = parseInt(this.dataset.surahNumber, 10);
            const surah = allSurahs.find(s => parseInt(s.surah_number, 10) === surahNum);
            if (surah) {
                navigateToSurah(surah);
            }
        });
    });
}

// ===== الانتقال إلى السورة =====
function navigateToSurah(surah) {
    // الفاتحة تبدأ من صفحة 2 (ليس 1)
    let startPage = parseInt(surah.page_debut_content) || 2;
    
    // إذا كانت الفاتحة (رقم 1) والصفحة 1، نستخدم 2
    if (surah.surah_number === 1 && startPage === 1) {
        startPage = 2;
    }
    
    const name = surah.title_ar || surah.surah_title || 'الفاتحة';
    const type = surah.type || 'مكية';
    
    // حفظ آخر قراءة
    localStorage.setItem('lastRead', JSON.stringify({
        surahNumber: surah.surah_number,
        surahName: name,
        page: startPage,
        timestamp: Date.now()
    }));
    
    window.location.href = `page.html?page=${startPage}&surah=${surah.surah_number}&name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
}

// ===== البحث =====
searchInput.addEventListener('input', function() {
    const rawQuery = this.value.trim();
    
    if (rawQuery.length > 0) {
        searchClear.classList.add('visible');
    } else {
        searchClear.classList.remove('visible');
    }
    
    if (rawQuery === '') {
        renderSurahs(allSurahs);
        return;
    }
    
    const normQuery = normalizeArabic(rawQuery);
    const filtered = allSurahs.filter(s => {
        const titleArNorm = normalizeArabic(s.title_ar || s.surah_title || '');
        const titleLatin = (s.title_latin || '').toLowerCase();
        const surahNum = (s.surah_number || '').toString();
        
        return titleArNorm.includes(normQuery) ||
               titleLatin.includes(rawQuery.toLowerCase()) ||
               surahNum.includes(rawQuery);
    });
    
    renderSurahs(filtered);
});

// ===== مسح البحث =====
searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    renderSurahs(allSurahs);
    searchInput.focus();
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    renderSurahs(allSurahs);
});

// ===== إخفاء/إظهار الهيدر =====
let lastScroll = 0;
const header = document.getElementById('mainHeader');
let ticking = false;

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const currentScroll = window.pageYOffset;
            if (currentScroll > 100 && currentScroll > lastScroll) {
                header.classList.add('hidden');
            } else {
                header.classList.remove('hidden');
            }
            lastScroll = currentScroll;
            ticking = false;
        });
        ticking = true;
    }
});

// ===== آخر قراءة =====
document.getElementById('lastReadBtn').addEventListener('click', (e) => {
    e.preventDefault();
    const lastRead = localStorage.getItem('lastRead');
    if (lastRead) {
        const data = JSON.parse(lastRead);
        window.location.href = `page.html?page=${data.page}&surah=${data.surahNumber}&name=${encodeURIComponent(data.surahName)}`;
    } else {
        // الفاتحة من صفحة 2
        window.location.href = `page.html?page=2&surah=1&name=${encodeURIComponent('الفاتحة')}&type=${encodeURIComponent('مكية')}`;
    }
});

// ===== إدارة العلامات المرجعية =====
const bookmarksBtn = document.getElementById('bookmarksBtn');
const headerBookmarksBtn = document.getElementById('headerBookmarksBtn');
const bookmarksModal = document.getElementById('bookmarksModal');
const closeBookmarksBtn = document.getElementById('closeBookmarksBtn');
const bookmarksList = document.getElementById('bookmarksList');

function openBookmarks() {
    bookmarksModal.classList.add('active');
    renderBookmarks();
}

function closeBookmarks() {
    bookmarksModal.classList.remove('active');
}

if (bookmarksBtn) {
    bookmarksBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openBookmarks();
    });
}
if (headerBookmarksBtn) {
    headerBookmarksBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openBookmarks();
    });
}

closeBookmarksBtn.addEventListener('click', closeBookmarks);
bookmarksModal.addEventListener('click', (e) => {
    if (e.target === bookmarksModal) closeBookmarks();
});

function renderBookmarks() {
    let saved = [];
    try {
        saved = JSON.parse(localStorage.getItem('bookmarkedVerses') || '[]');
    } catch (e) {
        saved = [];
    }

    if (saved.length === 0) {
        bookmarksList.innerHTML = `
            <div class="bookmark-empty-state">
                <i class="fa-regular fa-bookmark"></i>
                <span>لا توجد علامات مرجعية محفوظة حالياً</span>
            </div>
        `;
        return;
    }

    bookmarksList.innerHTML = saved.map(key => {
        const parts = key.split(':');
        const surahNum = parts[0];
        const verseNum = parts[1];
        const savedPage = parts[2];
        const surah = allSurahs.find(s => s.surah_number === parseInt(surahNum));
        const surahName = surah ? (surah.title_ar || surah.surah_title) : `سورة ${surahNum}`;
        const startPage = savedPage ? parseInt(savedPage) : (surah ? (parseInt(surah.page_debut_content) || 2) : 2);
        const type = surah ? (surah.type || 'مكية') : 'مكية';

        return `
            <div class="bookmark-item-card" data-page="${startPage}" data-surah="${surahNum}" data-name="${surahName}" data-type="${type}">
                <div class="bookmark-info">
                    <span class="bookmark-surah-line">سورة ${surahName} - آية ${toArabicNum(verseNum)}</span>
                    <span class="bookmark-verse-text">انقر للانتقال مباشرة إلى موضع الآية</span>
                </div>
                <button class="bookmark-delete-btn" data-key="${key}" title="حذف العلامة">
                    <i class="fa-solid fa-trash-can" style="font-size: 16px;"></i>
                </button>
            </div>
        `;
    }).join('');

    // تفعيل النقر للانتقال للآية
    bookmarksList.querySelectorAll('.bookmark-item-card').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.closest('.bookmark-delete-btn')) return;
            const page = this.dataset.page;
            const surah = this.dataset.surah;
            const name = this.dataset.name;
            const type = this.dataset.type;
            window.location.href = `page.html?page=${page}&surah=${surah}&name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
        });
    });

    // تفعيل زر الحذف
    bookmarksList.querySelectorAll('.bookmark-delete-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const keyToDelete = this.dataset.key;
            let currentSaved = [];
            try {
                currentSaved = JSON.parse(localStorage.getItem('bookmarkedVerses') || '[]');
            } catch (err) {}
            const filtered = currentSaved.filter(k => k !== keyToDelete);
            localStorage.setItem('bookmarkedVerses', JSON.stringify(filtered));
            renderBookmarks();
        });
    });
}

// ===== التهيئة =====
loadSurahs();
console.log('🌙 الفرقان - قائمة السور - تم التحميل');

// التعامل مع زر الرجوع الفعلي للأندرويد (Cordova backbutton)
document.addEventListener('deviceready', () => {
    document.addEventListener('backbutton', (e) => {
        // إغلاق مودال العلامات المرجعية إن كان مفتوحاً
        const bookmarksModal = document.getElementById('bookmarksModal');
        if (bookmarksModal && bookmarksModal.classList.contains('active')) {
            bookmarksModal.classList.remove('active');
            document.body.style.overflow = '';
            return;
        }
        
        // العودة للرئيسية
        window.location.href = '/index.html';
    }, false);
}, false);
