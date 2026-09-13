/**
 * الفرقان - الأذكار النبوية واليومية
 * نظام ملاحة ذكي ثنائي المراحل يحل مشكلة زر الرجوع بالكامل
 */

// ===== 1. المظهر يُدار مركزياً عبر settings.js =====

// ===== 2. تعريف المجموعات والأيقونات والألوان التعبيرية الأنيقة =====
const CATEGORY_STYLES = {
    'أذكار الصباح': { icon: 'fa-solid fa-cloud-sun', bg: '#FDF2E9', color: '#D35400' },
    'أذكار المساء': { icon: 'fa-solid fa-cloud-moon', bg: '#F4ECF7', color: '#8E44AD' },
    'أذكار بعد الصلاة': { icon: 'fa-solid fa-mosque', bg: '#E8F8F5', color: '#16A085' },
    'أذكار النوم': { icon: 'fa-solid fa-moon', bg: '#EBF5FB', color: '#2980B9' },
    'أذكار الاستيقاظ': { icon: 'fa-solid fa-sun', bg: '#FEF9E7', color: '#F39C12' },
    'أذكار الوضوء': { icon: 'fa-solid fa-faucet-drip', bg: '#EAF2F8', color: '#3498DB' },
    'أذكار المسجد': { icon: 'fa-solid fa-place-of-worship', bg: '#E8F8F5', color: '#27AE60' },
    'أذكار الطعام': { icon: 'fa-solid fa-utensils', bg: '#FDEDEC', color: '#C0392B' },
    'تسابيح': { icon: 'fa-solid fa-hands-praying', bg: '#F5EEF8', color: '#9B59B6' },
    'أدعية قرآنية': { icon: 'fa-solid fa-book-quran', bg: '#E8F8F5', color: '#11B981' }
};

const DEFAULT_STYLE = { icon: 'fa-solid fa-hands-praying', bg: '#F6F5F3', color: '#588585' };

// ===== 3. المتغيرات الرئيسية =====
let allAzkar = [];
let userRemainingCounts = {}; // تتبع عدد التكرار المتبقي لكل ذكر نشط
let currentView = 'categories'; // 'categories' | 'detail'
let activeCategory = '';

const loadingState = document.getElementById('loadingState');
const adkarSearchSection = document.getElementById('adkarSearchSection');
const adkarSearchInput = document.getElementById('adkarSearchInput');
const adkarSearchClear = document.getElementById('adkarSearchClear');
const categoriesView = document.getElementById('categoriesView');
const categoriesGrid = document.getElementById('categoriesGrid');
const adkarNoResults = document.getElementById('adkarNoResults');
const clearAdkarSearchBtn = document.getElementById('clearAdkarSearchBtn');
const detailView = document.getElementById('detailView');
const azkarList = document.getElementById('azkarList');
const activeCategoryTitle = document.getElementById('activeCategoryTitle');
const backToCategoriesBtn = document.getElementById('backToCategoriesBtn');
const headerBackBtn = document.getElementById('headerBackBtn');
const toastMsg = document.getElementById('toastMsg');

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

// ===== 4. تحميل البيانات =====
fetch('/data/json/azkar.json')
    .then(response => {
        if (!response.ok) throw new Error('فشل تحميل الملف');
        return response.json();
    })
    .then(data => {
        allAzkar = data.data || data;
        loadingState.style.display = 'none';
        if (adkarSearchSection) adkarSearchSection.style.display = 'block';
        
        // تهيئة ملاحة الصفحة وإظهار تصنيفات الأذكار أولاً
        initNavigation();
        initSearch();
    })
    .catch(error => {
        console.error('خطأ الأذكار:', error);
        loadingState.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation" style="color:var(--color-error);font-size:36px;"></i>
            <span>حدث خطأ أثناء تحميل بيانات الأذكار</span>
            <button onclick="location.reload()" style="padding:10px 24px;border:none;border-radius:var(--radius);background:var(--color-primary);color:white;font-family:var(--font-family);font-weight:700;cursor:pointer;margin-top:10px;">
                <i class="fa-solid fa-arrow-rotate-right"></i> إعادة المحاولة
            </button>
        `;
    });

// ===== 5. ملاحة ذكية ثنائية الواجهات (حل زر الرجوع) =====
function initNavigation() {
    // قراءة الحالة الأولية أو إظهار التصنيفات افتراضياً
    showCategoriesView();
    
    // الاستماع لزر الرجوع في المتصفح (popstate)
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.view === 'detail') {
            switchToDetailView(e.state.category, false);
        } else {
            switchToCategoriesView(false);
        }
    });

    // زر الرجوع المخصص أعلى واجهة التفاصيل
    backToCategoriesBtn.addEventListener('click', () => {
        history.back();
    });

    // زر الرجوع في الشريط العلوي (الهيدر)
    headerBackBtn.addEventListener('click', (e) => {
        if (currentView === 'detail') {
            e.preventDefault();
            history.back();
        }
    });
}

// التبديل إلى واجهة المجموعات (التصنيفات)
function switchToCategoriesView(pushState = true) {
    currentView = 'categories';
    activeCategory = '';
    
    if (pushState) {
        history.replaceState({ view: 'categories' }, '', '');
    }
    
    detailView.style.display = 'none';
    categoriesView.style.display = 'block';
    
    // تصفير شريط الرجوع في الهيدر ليعيد إلى الصفحة الرئيسية
    headerBackBtn.href = '/index.html';
    
    renderCategories();
}

function showCategoriesView() {
    switchToCategoriesView(false);
}

// التبديل إلى واجهة تفاصيل الأذكار لمجموعة معينة
function switchToDetailView(category, push = true) {
    currentView = 'detail';
    activeCategory = category;
    
    if (push) {
        history.pushState({ view: 'detail', category: category }, '', `#cat=${encodeURIComponent(category)}`);
    }
    
    categoriesView.style.display = 'none';
    detailView.style.display = 'block';
    
    // تحديث الهيدر ليعمل كزر رجوع للتصنيفات
    headerBackBtn.href = '#';
    activeCategoryTitle.textContent = category;
    
    renderAzkar(category);
}

// ===== 6. عرض مجموعات الأذكار (Stage 1) =====
function renderCategories() {
    const rawQuery = (adkarSearchInput?.value || '').trim();
    if (adkarSearchClear) {
        adkarSearchClear.style.display = rawQuery.length > 0 ? 'flex' : 'none';
    }

    const normQuery = normalizeArabic(rawQuery);
    const allUniqueCategories = [...new Set(allAzkar.map(item => item.category))];

    let matchedCategories = allUniqueCategories;
    if (rawQuery.length > 0) {
        matchedCategories = allUniqueCategories.filter(cat => {
            const catNorm = normalizeArabic(cat);
            // البحث أيضاً في نصوص الأذكار التابعة للتصنيف
            const hasMatchingZekr = allAzkar.some(item => 
                item.category === cat && 
                (normalizeArabic(item.zekr || '').includes(normQuery) || 
                 normalizeArabic(item.description || '').includes(normQuery))
            );
            return catNorm.includes(normQuery) || cat.toLowerCase().includes(rawQuery.toLowerCase()) || hasMatchingZekr;
        });
    }

    if (matchedCategories.length === 0) {
        categoriesGrid.style.display = 'none';
        if (adkarNoResults) adkarNoResults.style.display = 'block';
        return;
    }

    if (adkarNoResults) adkarNoResults.style.display = 'none';
    categoriesGrid.style.display = 'grid';

    categoriesGrid.innerHTML = matchedCategories.map(cat => {
        const count = allAzkar.filter(item => item.category === cat).length;
        
        return `
            <div class="category-card" data-category="${cat}" style="padding: 16px 20px;">
                <div class="category-info">
                    <span class="category-name">${cat}</span>
                    <span class="category-count">${count} ذكر ومأثور</span>
                </div>
                <div class="category-arrow">
                    <i class="fa-solid fa-chevron-left"></i>
                </div>
            </div>
        `;
    }).join('');
    
    // إضافة مستمعي النقر للتنقل للتفاصيل
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', function() {
            const cat = this.dataset.category;
            switchToDetailView(cat);
        });
    });
}

function initSearch() {
    if (adkarSearchInput) {
        adkarSearchInput.addEventListener('input', () => {
            if (currentView === 'detail') {
                switchToCategoriesView(true);
            }
            renderCategories();
        });
    }

    if (adkarSearchClear) {
        adkarSearchClear.addEventListener('click', () => {
            if (adkarSearchInput) adkarSearchInput.value = '';
            renderCategories();
            if (adkarSearchInput) adkarSearchInput.focus();
        });
    }

    if (clearAdkarSearchBtn) {
        clearAdkarSearchBtn.addEventListener('click', () => {
            if (adkarSearchInput) adkarSearchInput.value = '';
            renderCategories();
        });
    }
}

// ===== 7. عرض تفاصيل الأذكار والعد التنازلي (Stage 2) =====
function renderAzkar(category) {
    const filtered = allAzkar.filter(item => item.category === category);
    
    if (filtered.length === 0) {
        azkarList.innerHTML = `
            <div style="padding:40px 0;text-align:center;color:var(--color-text-lighter);">
                <i class="fa-solid fa-book-open" style="font-size:32px;opacity:0.3;"></i>
                <p style="margin-top:8px;">لا توجد أذكار في هذه المجموعة حالياً</p>
            </div>
        `;
        return;
    }
    
    azkarList.innerHTML = filtered.map((item, index) => {
        // إذا لم تكن مهيأة بعد، نهيئها بالعدد الأصلي
        if (userRemainingCounts[item.id] === undefined) {
            userRemainingCounts[item.id] = parseInt(item.count) || 1;
        }
        
        const countLeft = userRemainingCounts[item.id];
        const isCompleted = countLeft === 0;
        
        return `
            <div class="zekr-card ${isCompleted ? 'completed' : ''}" id="zekr_card_${item.id}" data-id="${item.id}">
                <div class="zekr-body-row">
                    <!-- تفاصيل ومحتوى الذكر -->
                    <div class="zekr-main-content">
                        <span class="zekr-number-badge">الذكر ${index + 1} من ${filtered.length}</span>
                        <div class="zekr-arabic-text">${item.zekr}</div>
                    </div>
                    
                    <!-- هدف الضغط والعد التنازلي -->
                    <div class="counter-target-wrapper">
                        <div class="counter-circle-btn" id="counter_circle_${item.id}">
                            ${isCompleted ? 
                                `<span class="count-val" style="font-size: 20px;"><i class="fa-solid fa-check"></i></span>` : 
                                `<span class="count-val">${countLeft}</span>
                                 <span class="count-lbl">تكرار</span>`
                            }
                        </div>
                    </div>
                </div>
                
                <!-- المرجع والشرح إن وجدا -->
                ${(item.reference || item.description) ? `
                    <div class="zekr-meta-info">
                        ${item.reference ? `<span class="zekr-reference"><i class="fa-solid fa-book-open-reader"></i> ${item.reference}</span>` : ''}
                        ${item.description ? `<span class="zekr-description"><i class="fa-solid fa-circle-info"></i> ${item.description}</span>` : ''}
                    </div>
                ` : ''}
                
                <!-- أزرار النسخ والمشاركة المباشرة -->
                <div class="zekr-actions-row">
                    <button class="zekr-card-btn copy-btn" data-text="${item.zekr.replace(/"/g, '&quot;')}" title="نسخ الذكر">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                    <button class="zekr-card-btn share-btn" data-text="${item.zekr.replace(/"/g, '&quot;')}" title="مشاركة">
                        <i class="fa-solid fa-share-nodes"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // ربط ميكانيكية العد التنازلي التفاعلية
    filtered.forEach(item => {
        const card = document.getElementById(`zekr_card_${item.id}`);
        const circle = document.getElementById(`counter_circle_${item.id}`);
        
        const handleCountDown = (e) => {
            e.stopPropagation();
            decrementZekr(item.id);
        };
        
        // دعم الضغط على الدائرة والبطاقة معاً لتسهيل الاستخدام
        circle.addEventListener('click', handleCountDown);
        card.addEventListener('click', (e) => {
            // تجاهل النقر إذا كان على زر النسخ/المشاركة لتفادي خفض العداد بالخطأ
            if (e.target.closest('.zekr-card-btn')) return;
            decrementZekr(item.id);
        });
    });
    
    // ربط أزرار النسخ
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            copyZekrText(this.dataset.text);
        });
    });
    
    // ربط أزرار المشاركة
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            shareZekrText(this.dataset.text);
        });
    });
}

// خفض قيمة تكرار الذكر بمقدار 1
function decrementZekr(id) {
    if (userRemainingCounts[id] === undefined || userRemainingCounts[id] <= 0) return;
    
    userRemainingCounts[id]--;
    const currentVal = userRemainingCounts[id];
    
    const card = document.getElementById(`zekr_card_${id}`);
    const circle = document.getElementById(`counter_circle_${id}`);
    
    if (circle) {
        if (currentVal === 0) {
            // تم الانتهاء بنجاح!
            circle.innerHTML = `<span class="count-val" style="font-size: 20px;"><i class="fa-solid fa-check"></i></span>`;
            card.classList.add('completed');
            
            // اهتزاز خفيف للأجهزة التي تدعمه لإضافة شعور بالإنجاز
            if (navigator.vibrate) navigator.vibrate(25);
            
            // تشغيل تأثير تفاعلي خفيف للبطاقة
            card.style.transform = 'scale(0.97)';
            setTimeout(() => {
                card.style.transform = '';
            }, 180);
        } else {
            // خفض مستمر
            const valEl = circle.querySelector('.count-val');
            if (valEl) valEl.textContent = currentVal;
            
            // تأثير نبض صغير للدائرة
            circle.style.transform = 'scale(0.85)';
            setTimeout(() => {
                circle.style.transform = '';
            }, 100);
            
            if (navigator.vibrate) navigator.vibrate(10);
        }
    }
}

// ===== 8. آليات النسخ والمشاركة المتقدمة =====
function copyZekrText(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
            .then(() => showToast('تم نسخ الذكر بنجاح'))
            .catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast('تم نسخ الذكر بنجاح');
    } catch (e) {
        showToast('تعذر نسخ الذكر');
    }
    document.body.removeChild(textarea);
}

function shareZekrText(text) {
    if (navigator.share) {
        navigator.share({
            text: text,
            title: 'الأذكار اليومية - تطبيق الفرقان'
        }).catch(() => {
            // في حال تم إلغاء المشاركة أو عدم الدعم الفعلي
            copyZekrText(text);
        });
    } else {
        // fallback للنسخ التلقائي
        copyZekrText(text);
        showToast('تم نسخ الذكر للمشاركة');
    }
}

function showToast(msg) {
    toastMsg.textContent = msg;
    toastMsg.classList.add('show');
    setTimeout(() => {
        toastMsg.classList.remove('show');
    }, 2000);
}

// ===== 9. إخفاء وإظهار الهيدر السلس عند التمرير =====
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

console.log('🌙 الفرقان - الأذكار اليومية مدمجة بالكامل');

// التعامل مع زر الرجوع الفعلي للأندرويد (Cordova backbutton)
document.addEventListener('deviceready', () => {
    document.addEventListener('backbutton', (e) => {
        if (typeof currentView !== 'undefined' && currentView === 'detail') {
            switchToCategoriesView(false);
            return;
        }
        
        // العودة للرئيسية
        window.location.href = '/index.html';
    }, false);
}, false);
