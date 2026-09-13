
const params = new URLSearchParams(window.location.search);
const startPage = parseInt(params.get('page')) || 2;
const surahNumber = parseInt(params.get('surah')) || 1;
const surahName = decodeURIComponent(params.get('name') || 'الفاتحة');
const surahType = decodeURIComponent(params.get('type') || 'مكية');

let allPages = [];
let allAhzab = [];
let pageData = []; // كل أرقام صفحات المصحف مرتبة تسلسلياً
let currentIndex = 0; // فهرس الصفحة الحالية داخل pageData

const viewer = document.getElementById('quranViewer');
const pageCache = new Map(); // يخزن HTML بيانات JSON الخام (مو عناصر DOM)
const CACHE_MAX_SIZE = 30;

const arabicNums = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
function toArabicNum(n) {
    return n.toString().split('').map(d => arabicNums[parseInt(d)]).join('');
}

// ===== المظهر يُدار مركزياً عبر settings.js =====
function setupQuranThemeToggle() {
    if (typeof window.applyAppTheme === 'function') {
        window.applyAppTheme();
    }
}

function updateHeader(surahNameText, hizbText) {
    document.getElementById('surahNameFixed').textContent = surahNameText;
    document.getElementById('hizbInfo').textContent = hizbText;
}

function getJuzFromHizb(hizbNumber) {
    return Math.ceil(hizbNumber / 2);
}

function formatHizbText(hizbNumber) {
    const juz = getJuzFromHizb(hizbNumber);
    return `الجزء ${toArabicNum(juz)} · الحزب ${toArabicNum(hizbNumber)}`;
}

// ===== محرك التخزين المؤقت المتقدم (Memory + Cache API) لمنع تكرار التحميل والبطء السلحفائي =====
const JSON_CACHE_NAME = 'al-jami-json-cache-v1';
const memoryCache = new Map();

// كاش عناصر الـ DOM لكل صفحة لمنع إعادة البناء وتداخل الأسطر أو الوميض
const domPageCache = new Map();

// كاش ذكي لربط آيات ورش بآيات حفص
const warshToHafsMap = new Map();

async function fetchJsonCached(url) {
    if (memoryCache.has(url)) {
        return memoryCache.get(url);
    }
    
    let data = null;
    if (window.caches) {
        try {
            const cache = await window.caches.open(JSON_CACHE_NAME);
            const cachedResponse = await cache.match(url);
            if (cachedResponse) {
                data = await cachedResponse.json();
                memoryCache.set(url, data);
                return data;
            }
        } catch (e) {
            console.warn(`⚠️ فشل التحقق من الكاش للملف ${url}`, e);
        }
    }
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            const clone = response.clone();
            data = await response.json();
            memoryCache.set(url, data);
            
            if (window.caches) {
                try {
                    const cache = await window.caches.open(JSON_CACHE_NAME);
                    await cache.put(url, clone);
                } catch (e) {}
            }
            return data;
        }
        throw new Error(`Fetch failed: ${response.status}`);
    } catch (e) {
        console.error(`❌ فشل تحميل الملف: ${url}`, e);
        throw e;
    }
}

async function loadBaseData() {
    try {
        allPages = await fetchJsonCached('/data/json/pages.json');
        allAhzab = await fetchJsonCached('/data/json/ahzab.json');
    } catch (e) {
        console.warn('⚠️ فشل تحميل البيانات الأساسية عبر الكاش، جاري المحاولة المباشرة', e);
        try {
            const pagesRes = await fetch('/data/json/pages.json');
            if (pagesRes.ok) allPages = await pagesRes.json();
            const ahzabRes = await fetch('/data/json/ahzab.json');
            if (ahzabRes.ok) allAhzab = await ahzabRes.json();
        } catch (err) {
            console.error('❌ فشل مطلق في تحميل البيانات الأساسية', err);
        }
    }
}

function getHizbForPage(pageNum) {
    const pageInfo = allPages.find(p => parseInt(p.page_number) === pageNum);
    if (pageInfo && pageInfo.hizb_number) return parseInt(pageInfo.hizb_number);

    for (const hizb of allAhzab) {
        if (pageNum >= parseInt(hizb.first_page) && pageNum <= parseInt(hizb.last_page)) {
            return parseInt(hizb.hizb_number);
        }
    }
    return Math.ceil(pageNum / 2);
}

function getSurahNameForPage(pageNum) {
    const pageInfo = allPages.find(p => parseInt(p.page_number) === pageNum);
    if (pageInfo && pageInfo.page_surah_title) {
        return pageInfo.page_surah_title.replace(/^سورة\s*/, '').trim();
    }
    return surahName;
}

async function fetchPageData(pageNum) {
    const cacheKey = `page_${pageNum}`;
    if (pageCache.has(cacheKey)) return pageCache.get(cacheKey);

    try {
        let data;
        try {
            data = await fetchJsonCached(`/data/quran/${pageNum}.json`);
        } catch (err) {
            // Fallback inside same folder
            data = await fetchJsonCached(`${pageNum}.json`);
        }

        if (pageCache.size >= CACHE_MAX_SIZE) {
            const firstKey = pageCache.keys().next().value;
            pageCache.delete(firstKey);
        }
        pageCache.set(cacheKey, data);
        return data;
    } catch (e) {
        console.error(`❌ خطأ أثناء تحميل صفحة ${pageNum} — النوع: ${e.name} — الرسالة: ${e.message}`, e);
        return { __error: 'network', message: `${e.name}: ${e.message}` };
    }
}

function buildQuranLine(line) {
    if (!line.words || line.words.length === 0) return '';

    let html = '';
    let lastVerseNum = null;

    for (const word of line.words) {
        const vNum = word.verse ? word.verse.verse_number : null;
        if (word.text) {
            html += `<span class="q-word" data-verse="${vNum || ''}" data-surah="${word.surah_number || surahNumber}">${word.text}</span> `;
        }

        if (word.is_last_word === '1' && vNum) {
            if (lastVerseNum !== vNum) {
                html += `<span class="ayah-marker" data-verse="${vNum}"><img class="ayah-frame" src="/data/images/ayah_frame_brown.svg" alt="" /><span class="ayah-number">${toArabicNum(vNum)}</span></span>`;
                lastVerseNum = vNum;
            }
        }
    }

    return html.trim();
}

function buildSurahHeader(title) {
    return `<div class="surah-header-block"><img class="surah-frame" src="/data/images/surah_frame_brown.svg" alt="" /><span class="surah-title-text">سُورَةُ ${title}</span></div>`;
}

function buildPageSeparator(pageNum) {
    const displayNum = pageNum - 1;
    return `
        <div class="page-separator">
            <div class="page-frame-box">
                <img class="page-frame" src="/data/images/page_frame_box_brown.svg" alt="" />
                <span class="page-number-text">${toArabicNum(displayNum)}</span>
            </div>
        </div>
    `;
}

// حجم خط وارتفاع سطر ثابتان (لا يتغيران بين الصفحات) محسوبان مرة واحدة بناءً
// على حاوية العرض نفسها (لا تتأثر بشريط أدوات المتصفح لأن كل صفحة مساحتها
// ثابتة داخل .page-viewport بحجم الشاشة الكامل المُدار عبر position:fixed)
let fixedLineHeight = null;
let fixedGap = null;
let fixedFontSize = null;
const STANDARD_LINE_COUNT = 15;

function computeFixedSizesIfNeeded(pageDiv) {
    if (fixedLineHeight !== null) return;

    const separator = pageDiv.querySelector('.page-separator');
    const availableHeight = pageDiv.clientHeight;
    const separatorHeight = separator ? separator.getBoundingClientRect().height : 40;
    const usableForLines = availableHeight - separatorHeight;
    if (usableForLines <= 0) return;

    const gapRatio = 0.08;
    const idealLineHeight = usableForLines / (STANDARD_LINE_COUNT + (STANDARD_LINE_COUNT - 1) * gapRatio);
    const clampedLineHeight = Math.max(30, Math.min(idealLineHeight, 58));

    fixedLineHeight = clampedLineHeight;
    fixedGap = clampedLineHeight * gapRatio;
    fixedFontSize = clampedLineHeight * 0.58;
}

/**
 * تطبّق حجم الخط الثابت على أي صفحة، بغض النظر عن عدد أسطرها. الصفحات
 * القصيرة (الفاتحة، بدايات بعض السور) تُعرض بتمركز عمودي متقارب بدل تكبير
 * الخط لملء المساحة، تماماً كما تُعرض في تطبيقات المصحف المرجعية.
 * مع إضافة خوارزمية ذكية لمقاومة وتصغير الخط عند صغر شاشة العرض (Responsive text fitting)
 */
function fitPageToViewport(pageDiv) {
    const content = pageDiv.querySelector('.page-content');
    if (!content) return;

    const pageLines = content.querySelectorAll('.quran-line');
    if (pageLines.length === 0) return;

    const pageNum = parseInt(pageDiv.dataset.page);
    const isIntro = (pageNum === 2 || pageNum === 3 || pageDiv.dataset.isIntro === "true");

    if (isIntro) {
        pageDiv.classList.add('quran-page--intro');
    } else {
        pageDiv.classList.remove('quran-page--intro');
    }

    computeFixedSizesIfNeeded(pageDiv);
    if (fixedLineHeight === null) return;

    const COMPACT_THRESHOLD = 10;
    content.classList.toggle('page-content--compact', pageLines.length <= COMPACT_THRESHOLD);

    if (isIntro) {
        // تنسيق مخصص تماماً لصفحتي الفاتحة وأول البقرة لمطابقة صور المصحف الحقيقي
        pageDiv.style.setProperty('--quran-line-height', 'auto');
        pageDiv.style.setProperty('--quran-line-gap', '14px');
        
        computeFixedSizesIfNeeded(pageDiv);
        const introFontSize = fixedFontSize || 28;
        pageLines.forEach(line => {
            line.style.fontSize = `${introFontSize}px`;
            line.style.lineHeight = '2.1';
            line.style.height = 'auto';
            line.style.marginBottom = '14px';
        });
        return;
    }

    pageDiv.style.setProperty('--quran-line-height', `${fixedLineHeight}px`);
    pageDiv.style.setProperty('--quran-line-gap', `${fixedGap}px`);

    let fontSize = fixedFontSize;

    // تطبيق المقاسات المبدئية
    pageLines.forEach(line => {
        line.style.fontSize = `${fontSize}px`;
        line.style.lineHeight = `${fixedLineHeight}px`;
        line.style.height = `${fixedLineHeight}px`;
        line.style.whiteSpace = 'nowrap';
    });

    // خوارزمية قياس واحتواء السطر (Text fitting) لضمان عدم تشويه الكلمات في الشاشات الصغيرة
    const containerWidth = content.clientWidth;
    if (containerWidth > 0) {
        let maxScrollWidth = 0;
        pageLines.forEach(line => {
            if (line.scrollWidth > maxScrollWidth) {
                maxScrollWidth = line.scrollWidth;
            }
        });

        // إذا كان السطر الأعرض يتجاوز عرض الشاشة، نصغر الخط بنسبة الفرق لحمايته من الاقتطاع والتشويه
        if (maxScrollWidth > containerWidth) {
            const scaleFactor = containerWidth / (maxScrollWidth + 12);
            fontSize = fontSize * scaleFactor;
            
            // حد أدنى كبير ومقروء جداً لمنع صغر الخط الشديد
            const minAllowedFloor = window.innerWidth < 480 ? 21 : 25;
            fontSize = Math.max(minAllowedFloor, Math.min(fontSize, fixedFontSize)); 

            pageLines.forEach(line => {
                line.style.fontSize = `${fontSize}px`;
            });
        }
    }
}

/**
 * ضبط دقيق لعرض كل سطر قرآني بحيث يساوي بالضبط عرض السطر الأعرض (المرجع)
 * داخل نفس الصفحة — تماماً كما في رسم المصحف المطبوع.
 */
function justifyQuranLines(pageDiv) {
    if (pageDiv.classList.contains('quran-page--intro')) {
        return; // لا نمدد نصوص صفحات الفاتحة وأول البقرة (نعرضها بتركيز بالوسط)
    }
    const lines = pageDiv.querySelectorAll('.quran-line');
    if (lines.length === 0) return;

    const containerWidth = pageDiv.querySelector('.page-content')?.clientWidth;
    if (!containerWidth) return;

    lines.forEach(line => {
        line.style.wordSpacing = '0px';
        const words = line.querySelectorAll('.q-word');
        if (words.length <= 1) return;

        const naturalWidth = line.scrollWidth;
        const diff = containerWidth - naturalWidth;
        if (Math.abs(diff) < 1) return;

        const gaps = words.length - 1;
        if (gaps <= 0) return;

        const extraPerGap = diff / gaps;
        const clamped = Math.max(-2, Math.min(extraPerGap, 14));
        line.style.wordSpacing = `${clamped}px`;
    });
}

/**
 * يبني HTML كامل لصفحة واحدة من بيانات JSON الخام، ويعيد نص HTML جاهز
 * (وليس عنصر DOM) — يُستخدم هذا لإدراج الصفحة داخل حاوية العرض الثابتة.
 */
function buildPageHTML(pageNum, data) {
    if (!data || data.__error) {
        const reason = data && data.__error === 'not_found'
            ? `الملف data/quran/${pageNum}.json غير موجود على الخادم`
            : `${data && data.message ? data.message : 'تعذّر الاتصال بالخادم'}`;
        return `
            <div class="page-error">
                <p>تعذّر تحميل الصفحة ${pageNum}</p>
                <p class="page-error-hint">${reason}</p>
                <button class="page-error-retry" data-retry-page="${pageNum}">
                    <i class="fa-solid fa-rotate-right"></i> إعادة المحاولة
                </button>
            </div>
        `;
    }

    const lines = data.lines || [];
    let linesHtml = '';
    for (const line of lines) {
        if (line.is_surah_title === '1') {
            const title = line.surah_title_ar || line.surah_title || surahName;
            linesHtml += buildSurahHeader(title);
        } else {
            const lineText = buildQuranLine(line);
            if (lineText) {
                linesHtml += `<div class="quran-line">${lineText}</div>`;
            }
        }
    }

    return `
        <div class="page-content">
            ${linesHtml}
        </div>
        ${buildPageSeparator(pageNum)}
    `;
}

/**
 * يبني عنصر DOM كاملاً لصفحة واحدة أو يعيده من الكاش إن وُجد.
 */
async function createPageElement(pageNum) {
    if (domPageCache.has(pageNum)) {
        return domPageCache.get(pageNum);
    }

    const pageDiv = document.createElement('div');
    pageDiv.className = 'quran-page';
    pageDiv.dataset.page = pageNum;

    const data = await fetchPageData(pageNum);
    if (pageNum === 2 || pageNum === 3 || (data && (data.is_intro === "1" || data.is_intro === 1))) {
        pageDiv.dataset.isIntro = "true";
        pageDiv.classList.add('quran-page--intro');
    }
    pageDiv.innerHTML = buildPageHTML(pageNum, data);

    attachRetryHandlerIfNeeded(pageDiv, pageNum);

    domPageCache.set(pageNum, pageDiv);
    return pageDiv;
}

function attachRetryHandlerIfNeeded(pageDiv, pageNum) {
    const retryBtn = pageDiv.querySelector('.page-error-retry');
    if (retryBtn) {
        retryBtn.addEventListener('click', async () => {
            pageCache.delete(`page_${pageNum}`);
            domPageCache.delete(pageNum);
            const freshDiv = await createPageElement(pageNum);
            if (pageDiv.parentNode) {
                pageDiv.parentNode.replaceChild(freshDiv, pageDiv);
            }
        });
    }
}

function settleNewPageContent(pageDiv) {
    if (pageDiv.dataset.fitted === "true") return;
    
    const content = pageDiv.querySelector('.page-content');
    if (content && content.clientWidth > 0) {
        fitPageToViewport(pageDiv);
        justifyQuranLines(pageDiv);
        pageDiv.dataset.fitted = "true";
    }
}

/**
 * يبني pageData من كل صفحات المصحف مرتبة تسلسلياً، بحيث يمكن الانتقال من
 * آخر صفحة بسورة إلى أول صفحة بالسورة التالية بنفس آلية السحب العادية.
 */
async function determinePageRange() {
    if (allPages.length > 0) {
        pageData = allPages
            .map(p => parseInt(p.page_number))
            .filter(n => !isNaN(n))
            .sort((a, b) => a - b);
        return;
    }
    const FALLBACK_TOTAL_PAGES = 604;
    pageData = Array.from({ length: FALLBACK_TOTAL_PAGES }, (_, i) => i + 1);
}

// ===== حاوية العرض: 3 صفحات فقط في الـ DOM دائماً (سابقة، حالية، تالية) =====
// هذا يبسّط كل شيء: لا حاجة لتحميل كسول معقد أو مراقبة تقاطع، فقط نستبدل
// محتوى العناصر الثلاثة عند كل تنقل.
const pageViewport = document.createElement('div');
pageViewport.className = 'page-viewport';
viewer.appendChild(pageViewport);

let slotPrev, slotCurrent, slotNext;

function updatePageHeaderInfo(pageNum) {
    const hizbNum = getHizbForPage(pageNum);
    const surahNameForPage = getSurahNameForPage(pageNum);
    updateHeader(surahNameForPage, formatHizbText(hizbNum));
    document.title = `الفرقان - ${surahNameForPage} (صفحة ${pageNum})`;
    saveLastRead(pageNum, surahNameForPage);
}

/**
 * يعيد بناء الشرائح الثلاث (سابقة/حالية/تالية) بناءً على currentIndex.
 * تُستدعى عند البدء وعند كل انتقال ناجح لصفحة جديدة.
 */
async function renderSlotsAround(index) {
    const prevNum = index > 0 ? pageData[index - 1] : null;
    const currentNum = pageData[index];
    const nextNum = index < pageData.length - 1 ? pageData[index + 1] : null;

    const [prevDiv, currentDiv, nextDiv] = await Promise.all([
        prevNum ? createPageElement(prevNum) : Promise.resolve(document.createElement('div')),
        createPageElement(currentNum),
        nextNum ? createPageElement(nextNum) : Promise.resolve(document.createElement('div')),
    ]);

    pageViewport.innerHTML = '';
    
    // إزالة الفئات القديمة حتى لا تتداخل وتحدث فوضى
    [prevDiv, currentDiv, nextDiv].forEach(div => {
        if (div) {
            div.classList.remove('page-slot', 'page-slot--next', 'page-slot--current', 'page-slot--prev');
        }
    });

    nextDiv.classList.add('page-slot', 'page-slot--next');
    currentDiv.classList.add('page-slot', 'page-slot--current');
    prevDiv.classList.add('page-slot', 'page-slot--prev');

    // ترتيب الشرائح كالتالي: [التالي، الحالي، السابق] ليتناسب مع اتجاه السحب الجديد
    pageViewport.appendChild(nextDiv);
    pageViewport.appendChild(currentDiv);
    pageViewport.appendChild(prevDiv);

    slotPrev = prevDiv;
    slotCurrent = currentDiv;
    slotNext = nextDiv;

    // نضبط الموضع الأساسي فوراً وبدون أي انتقال حركي (الشريحة الوسطى تظهر
    // مباشرة داخل نافذة العرض، دون أي وميض أو حركة غير مقصودة)
    pageViewport.style.transition = 'none';
    setViewportOffset(0);

    settleNewPageContent(currentDiv);
    if (prevNum) settleNewPageContent(prevDiv);
    if (nextNum) settleNewPageContent(nextDiv);

    updatePageHeaderInfo(currentNum);
}

async function renderAllPages() {
    if (pageData.length === 0) {
        pageViewport.innerHTML = `<div class="page-error">لم يتم العثور على صفحات لسورة ${surahName}</div>`;
        return;
    }

    let startIdx = pageData.indexOf(startPage);
    if (startIdx === -1) {
        startIdx = pageData.reduce((closest, p, i) =>
            Math.abs(p - startPage) < Math.abs(pageData[closest] - startPage) ? i : closest, 0);
    }
    currentIndex = startIdx;

    await renderSlotsAround(currentIndex);
}

// ===== الانتقال بين الصفحات (سحب أفقي) =====
// تعديل بناءً على طلب المستخدم: السحب في اليمين (مع السهم »»») يعني التالي، والعكس السابق
let isAnimating = false;

function getSlotWidth() {
    return viewer.clientWidth;
}

function setViewportOffset(extraPx) {
    const base = -getSlotWidth(); // إزاحة شريحة واحدة كاملة نحو اليسار
    pageViewport.style.transform = `translateX(${base + extraPx}px)`;
}

async function goToNextPage() {
    if (isAnimating || currentIndex >= pageData.length - 1) return;
    isAnimating = true;

    pageViewport.style.transition = 'transform 0.26s cubic-bezier(0.4,0,0.2,1)';
    setViewportOffset(getSlotWidth()); // سحب لليمين لعرض التالي (الشريحة اليسرى الأولى index 0)
    await new Promise(r => setTimeout(r, 260));

    currentIndex++;
    await renderSlotsAround(currentIndex);
    pageViewport.style.transition = 'none';
    setViewportOffset(0);

    isAnimating = false;
}

async function goToPrevPage() {
    if (isAnimating || currentIndex <= 0) return;
    isAnimating = true;

    pageViewport.style.transition = 'transform 0.26s cubic-bezier(0.4,0,0.2,1)';
    setViewportOffset(-getSlotWidth()); // سحب ليسار لعرض السابق (الشريحة اليمنى الثالثة index 2)
    await new Promise(r => setTimeout(r, 260));

    currentIndex--;
    await renderSlotsAround(currentIndex);
    pageViewport.style.transition = 'none';
    setViewportOffset(0);

    isAnimating = false;
}

// ===== معالجة السحب (touch) =====
let touchStartX = 0;
let touchStartY = 0;
let touchDeltaX = 0;
const SWIPE_THRESHOLD = 60; // أقل مسافة سحب أفقية لاعتبارها "تنقّل صفحة"

function handleTouchStart(e) {
    if (isAnimating) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchDeltaX = 0;
    pageViewport.style.transition = 'none';
}

function handleTouchMove(e) {
    if (isAnimating || touchStartX === 0) return;
    const touch = e.touches[0];
    touchDeltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    // إذا كانت الحركة عمودية بوضوح أكثر من الأفقية، نتجاهلها (لا نتدخل
    // بأي سكرول عمودي محتمل داخل عناصر أخرى)
    if (Math.abs(deltaY) > Math.abs(touchDeltaX) * 1.5) return;

    e.preventDefault();
    setViewportOffset(touchDeltaX);
}

function handleTouchEnd() {
    if (isAnimating || touchStartX === 0) return;

    if (Math.abs(touchDeltaX) >= SWIPE_THRESHOLD) {
        // السحب لليمين (deltaX موجب): الصفحة التالية (Next)
        // السحب لليسار (deltaX سالب): الصفحة السابقة (Prev)
        if (touchDeltaX > 0) {
            goToNextPage();
        } else {
            goToPrevPage();
        }
    } else {
        // سحب غير كافٍ للتنقل: نعيد الشريحة الحالية لموضعها الطبيعي بحركة سلسة
        pageViewport.style.transition = 'transform 0.2s ease';
        setViewportOffset(0);
    }

    touchStartX = 0;
    touchDeltaX = 0;
}

viewer.addEventListener('touchstart', handleTouchStart, { passive: true });
viewer.addEventListener('touchmove', handleTouchMove, { passive: false });
viewer.addEventListener('touchend', handleTouchEnd, { passive: true });

// دعم السحب بالفأرة أيضاً (سطح المكتب)
let mouseIsDown = false;
viewer.addEventListener('mousedown', (e) => {
    if (isAnimating) return;
    mouseIsDown = true;
    touchStartX = e.clientX;
    touchStartY = e.clientY;
    touchDeltaX = 0;
    pageViewport.style.transition = 'none';
});
viewer.addEventListener('mousemove', (e) => {
    if (!mouseIsDown || isAnimating) return;
    touchDeltaX = e.clientX - touchStartX;
    setViewportOffset(touchDeltaX);
});
window.addEventListener('mouseup', () => {
    if (!mouseIsDown) return;
    mouseIsDown = false;
    handleTouchEnd();
});

// ===== معالجة عجلة الفأرة (تُترجم لتنقل صفحة) =====
let wheelLocked = false;
viewer.addEventListener('wheel', (e) => {
    if (isAnimating || wheelLocked) return;
    e.preventDefault();
    wheelLocked = true;
    if (e.deltaY > 20 || e.deltaX < -20) {
        goToNextPage();
    } else if (e.deltaY < -20 || e.deltaX > 20) {
        goToPrevPage();
    }
    setTimeout(() => { wheelLocked = false; }, 400);
}, { passive: false });

// ===== قائمة خيارات الآية (الضغط المطول) =====
const LONG_PRESS_MS = 480;
const LONG_PRESS_MOVE_TOLERANCE = 10;

let longPressTimer = null;
let longPressStartPos = null;
let activeVerse = null;

const ayahSheet = document.getElementById('ayahSheet');
const ayahSheetBackdrop = document.getElementById('ayahSheetBackdrop');
const ayahSheetPreview = document.getElementById('ayahSheetPreview');
const bookmarkBtn = document.getElementById('ayahActionBookmark');

function getVerseWordElements(surah, verse) {
    return Array.from(
        (slotCurrent || viewer).querySelectorAll(`.q-word[data-surah="${surah}"][data-verse="${verse}"]`)
    );
}

function highlightVerse(wordEls) {
    wordEls.forEach(el => el.classList.add('q-word--highlighted'));
}

function clearVerseHighlight() {
    viewer.querySelectorAll('.q-word--highlighted').forEach(el =>
        el.classList.remove('q-word--highlighted')
    );
}

function bookmarkKey(surah, verse) {
    const pageNum = (typeof pageData !== 'undefined' && pageData[currentIndex]) ? pageData[currentIndex] : '';
    return `${surah}:${verse}:${pageNum}`;
}

function isVerseBookmarked(surah, verse) {
    try {
        const saved = JSON.parse(localStorage.getItem('bookmarkedVerses') || '[]');
        return saved.some(k => {
            const parts = k.split(':');
            return parts[0] === String(surah) && parts[1] === String(verse);
        });
    } catch (e) {
        return false;
    }
}

function toggleBookmark(surah, verse) {
    let saved = [];
    try {
        const stored = localStorage.getItem('bookmarkedVerses');
        saved = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(saved)) saved = [];
    } catch (e) { 
        console.error('❌ خطأ في قراءة العلامات:', e);
        saved = []; 
    }

    const key = bookmarkKey(surah, verse);
    const existingIdx = saved.findIndex(k => {
        const parts = k.split(':');
        return parts[0] === String(surah) && parts[1] === String(verse);
    });

    if (existingIdx === -1) {
        saved.push(key);
    } else {
        saved.splice(existingIdx, 1);
    }
    localStorage.setItem('bookmarkedVerses', JSON.stringify(saved));
    console.log('🔖 تم تحديث العلامات المرجعية:', saved);
    return existingIdx === -1;
}

function openAyahSheet(surah, verse) {
    const wordEls = getVerseWordElements(surah, verse);
    if (wordEls.length === 0) return;

    clearVerseHighlight();
    highlightVerse(wordEls);
    activeVerse = { surah, verse, wordEls };

    const verseText = wordEls.map(el => el.textContent.trim()).join(' ');
    ayahSheetPreview.textContent = verseText;

    bookmarkBtn.classList.toggle('is-saved', isVerseBookmarked(surah, verse));

    ayahSheetBackdrop.classList.add('is-open');
    ayahSheet.classList.add('is-open');
}

function closeAyahSheet() {
    ayahSheetBackdrop.classList.remove('is-open');
    ayahSheet.classList.remove('is-open');
    clearVerseHighlight();
    activeVerse = null;
}

function clearLongPressTimer() {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    longPressStartPos = null;
}

viewer.addEventListener('click', (e) => {
    if (isAnimating) return;
    if (touchDeltaX && Math.abs(touchDeltaX) > 10) return;

    const wordEl = e.target.closest('.q-word');
    if (!wordEl || !wordEl.dataset.verse) return;

    openAyahSheet(wordEl.dataset.surah, wordEl.dataset.verse);
});

viewer.addEventListener('touchstart', (e) => {
    const wordEl = e.target.closest('.q-word');
    if (!wordEl || !wordEl.dataset.verse) return;

    const touch = e.touches[0];
    longPressStartPos = { x: touch.clientX, y: touch.clientY };

    longPressTimer = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(15);
        openAyahSheet(wordEl.dataset.surah, wordEl.dataset.verse);
        longPressTimer = null;
    }, LONG_PRESS_MS);
}, { passive: true });

viewer.addEventListener('touchmove', (e) => {
    if (!longPressStartPos || !longPressTimer) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - longPressStartPos.x);
    const dy = Math.abs(touch.clientY - longPressStartPos.y);
    if (dx > LONG_PRESS_MOVE_TOLERANCE || dy > LONG_PRESS_MOVE_TOLERANCE) {
        clearLongPressTimer();
    }
}, { passive: true });

viewer.addEventListener('touchend', clearLongPressTimer, { passive: true });
viewer.addEventListener('touchcancel', clearLongPressTimer, { passive: true });

ayahSheetBackdrop.addEventListener('click', closeAyahSheet);

bookmarkBtn.addEventListener('click', () => {
    if (!activeVerse) return;
    const added = toggleBookmark(activeVerse.surah, activeVerse.verse);
    bookmarkBtn.classList.toggle('is-saved', added);
    bookmarkBtn.querySelector('span').textContent = added
        ? 'تمت الإضافة للمرجعية'
        : 'حفظ كعلامة مرجعية';
    setTimeout(() => {
        if (bookmarkBtn.querySelector('span')) {
            bookmarkBtn.querySelector('span').textContent = 'حفظ كعلامة مرجعية';
        }
    }, 1500);
});

document.getElementById('ayahActionCopy').addEventListener('click', () => {
    if (!activeVerse) return;
    const text = ayahSheetPreview.textContent;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
    }
    closeAyahSheet();
});

document.getElementById('ayahActionShare').addEventListener('click', () => {
    if (!activeVerse) return;
    const text = ayahSheetPreview.textContent;
    if (navigator.share) {
        navigator.share({ text }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
    }
    closeAyahSheet();
});

// ===== آليات وإدارة مودال التفسير والبيان التفاعلي الحركي السريع =====
const tafsirModal = document.getElementById('tafsirModal');
const tafsirModalBackdrop = document.getElementById('tafsirModalBackdrop');
const closeTafsirBtn = document.getElementById('closeTafsirBtn');
const tafsirVerseText = document.getElementById('tafsirVerseText');
const tafsirVerseInfo = document.getElementById('tafsirVerseInfo');
const tafsirContentText = document.getElementById('tafsirContentText');
const tafsirLoading = document.getElementById('tafsirLoading');

window.closeTafsirModal = function() {
    if (tafsirModal) {
        tafsirModal.style.display = 'none';
        tafsirModal.classList.remove('active');
    }
};

let tafsirActiveAyah = null; // { surah, verse, arabicText }

// جلب التفسير بسرعة فائقة وتخزين السورة كاملة عند أول طلب
async function loadTafsir(surah, verse) {
    if (!tafsirLoading) return;
    tafsirLoading.style.display = 'flex';
    if (tafsirContentText) tafsirContentText.textContent = '';
    
    // 1. فحص التخزين المحلي الفوري
    const cacheKey = `tafsir_muyassar_${surah}_${verse}`;
    const cachedTafsir = localStorage.getItem(cacheKey);
    if (cachedTafsir) {
        if (tafsirContentText) tafsirContentText.textContent = cachedTafsir;
        tafsirLoading.style.display = 'none';
        return;
    }
    
    try {
        // 2. جلب تفسير السورة كاملة دفعة واحدة وتخزينها لسرعة 0ms في باقي آيات السورة
        const surahUrl = `https://api.alquran.cloud/v1/surah/${surah}/ar.muyassar`;
        const res = await fetchJsonCached(surahUrl);
        if (res && res.code === 200 && res.data && res.data.ayahs) {
            let targetText = "";
            res.data.ayahs.forEach(a => {
                try {
                    localStorage.setItem(`tafsir_muyassar_${surah}_${a.numberInSurah}`, a.text);
                    if (a.numberInSurah === parseInt(verse, 10)) {
                        targetText = a.text;
                    }
                } catch (e) {}
            });

            if (targetText && tafsirContentText) {
                tafsirContentText.textContent = targetText;
                tafsirLoading.style.display = 'none';
                return;
            }
        }

        // 3. مسار بديل للآية المنفردة
        const singleUrl = `https://api.alquran.cloud/v1/ayah/${surah}:${verse}/ar.muyassar`;
        const singleRes = await fetchJsonCached(singleUrl);
        if (singleRes && singleRes.code === 200 && singleRes.data && singleRes.data.text) {
            const tafsirText = singleRes.data.text;
            if (tafsirContentText) tafsirContentText.textContent = tafsirText;
            try { localStorage.setItem(cacheKey, tafsirText); } catch (e) {}
        } else {
            throw new Error("Invalid API response");
        }
    } catch (e) {
        console.error('Failed to load tafsir from API', e);
        if (tafsirContentText) {
            tafsirContentText.textContent = `تعذّر تحميل التفسير الإلكتروني للآية حالياً. تأكد من اتصالك بالإنترنت ثم حاول مجدداً.`;
        }
    } finally {
        if (tafsirLoading) tafsirLoading.style.display = 'none';
    }
}

// تنظيف وتطبيع النص العربي من التشكيل وعلامات الضبط المغربي الخاص برواية ورش من أجل البحث الذكي والربط الدقيق جداً
function cleanArabicTextForSearch(text) {
    if (!text) return "";
    
    let clean = text;
    
    // 1. استبدال الرموز الخاصة بالرسم العثماني المغربي لورش بالحروف العربية المقابلة لها
    // الأرقام من 0 إلى 9 الشرقية والغربية المستخدمة كألف (مثل 1لله، 0لرحمن، 4لفاتحة)
    clean = clean.replace(/[0-9۰-۹]/g, 'ا');
    
    // الحروف اللاتينية المشكلة مثل è المستخدمة كهمزة وصل أو ألف (مثل èهدنا)
    clean = clean.replace(/[èéêëàâäôöûüç]/gi, 'ا');
    
    // الفاصلة المنقوطة وغيرها المستخدمة كألف خنجرية (مثل صر؛ط)
    clean = clean.replace(/;/g, 'ا');
    
    // 2. إزالة التشكيل وعلامات الضبط والوقف والمد الشاملة لضمان البحث السليم
    clean = clean.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06EC\u06ED]/g, "");
    
    // إزالة التطويل (الكشيدة) كلياً لأنها تمنع المطابقة في الـ API
    clean = clean.replace(/ـ/g, "");
    
    // 3. تطبيع الألف والهمزات (Normalization) لضمان دقة المطابقة بنسبة 100% بين المصاحف المختلفة
    clean = clean.replace(/[أإآٱ]/g, 'ا');
    
    // 4. تطبيع الياء والألف المقصورة والتاء المربوطة
    clean = clean.replace(/ى/g, 'ي');
    clean = clean.replace(/ة/g, 'ه');
    
    // تنظيف أي رموز غير عربية متبقية مع الإبقاء على الحروف العربية والمسافات
    clean = clean.replace(/[^\u0621-\u064A\s]/g, "");
    
    // ضغط المسافات المتعددة الناتجة عن التنظيف
    clean = clean.replace(/\s+/g, " ").trim();
    
    return clean;
}

// محرك الربط الذكي والتحويل الديناميكي بين عد آيات ورش وعد آيات حفص
async function mapWarshToHafs(surah, verse, text) {
    const cacheKey = `${surah}:${verse}`;
    if (warshToHafsMap.has(cacheKey)) {
        return warshToHafsMap.get(cacheKey);
    }

    const cleanText = cleanArabicTextForSearch(text);
    if (!cleanText) return verse;

    const words = cleanText.split(" ");
    // نأخذ أول 4 كلمات من الآية لضمان البحث العادل غير المتأثر بالفروقات اللفظية الطفيفة بنهاية الآية
    const phrase = words.slice(0, 4).join(" ");
    if (!phrase) return verse;

    try {
        // نستخدم محرك البحث الذكي لـ Al-Quran Cloud للبحث عن الكلمات المحددة داخل نفس السورة برواية حفص
        const url = `https://api.alquran.cloud/v1/search/${encodeURIComponent(phrase)}/${surah}/quran-simple-clean`;
        
        let res = null;
        if (memoryCache.has(url)) {
            res = memoryCache.get(url);
        } else {
            // محاولة التحقق من كاش المتصفح بصمت
            if (window.caches) {
                try {
                    const cache = await window.caches.open(JSON_CACHE_NAME);
                    const cachedResponse = await cache.match(url);
                    if (cachedResponse) {
                        res = await cachedResponse.json();
                        memoryCache.set(url, res);
                    }
                } catch (e) {}
            }
            
            if (!res) {
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        const clone = response.clone();
                        res = await response.json();
                        memoryCache.set(url, res);
                        
                        if (window.caches) {
                            try {
                                const cache = await window.caches.open(JSON_CACHE_NAME);
                                await cache.put(url, clone);
                            } catch (e) {}
                        }
                    }
                } catch (fetchErr) {
                    console.warn("⚠️ فشل الاتصال بخادم البحث:", fetchErr);
                }
            }
        }

        if (res && res.code === 200 && res.data && res.data.matches && res.data.matches.length > 0) {
            // البحث عن المطابقة الأقرب لرقم الآية الحالية لضمان دقة بالغة وتجنب الخلط مع آيات متشابهة البداية
            let closestMatch = res.data.matches[0];
            let minDiff = Math.abs(parseInt(closestMatch.numberInSurah) - parseInt(verse));
            
            for (let i = 1; i < res.data.matches.length; i++) {
                const match = res.data.matches[i];
                const diff = Math.abs(parseInt(match.numberInSurah) - parseInt(verse));
                if (diff < minDiff) {
                    minDiff = diff;
                    closestMatch = match;
                }
            }
            
            const hafsVerse = closestMatch.numberInSurah;
            warshToHafsMap.set(cacheKey, hafsVerse);
            return hafsVerse;
        }
    } catch (e) {
        console.warn("⚠️ فشل الربط التلقائي عبر البحث، جاري تجربة المحاذاة التقليدية للعد:", e);
    }

    // الربط التلقائي التقريبي لبعض السور المعروفة كبديل محلي آمن في حال انقطاع الشبكة أو تعذر المطابقة
    if (parseInt(surah) === 1) { // الفاتحة
        if (parseInt(verse) <= 5) return parseInt(verse) + 1;
        return 7;
    }
    if (parseInt(surah) === 2) { // البقرة
        if (parseInt(verse) > 1 && parseInt(verse) < 5) return parseInt(verse) + 1;
    }

    return verse; // الوضع الافتراضي عند عدم توفر المطابقة
}

async function openTafsirModal(surah, verse, arabicText) {
    if (!tafsirModal) return;
    tafsirActiveAyah = { surah, verse, arabicText };
    if (tafsirVerseText) tafsirVerseText.textContent = arabicText;
    
    const currentNum = pageData[currentIndex];
    const sName = getSurahNameForPage(currentNum) || `سورة ${surah}`;
    
    if (tafsirVerseInfo) {
        tafsirVerseInfo.textContent = `سورة ${sName} · آية رقم ${verse} (جاري ربط الروايات...)`;
    }
    
    tafsirModal.style.display = 'flex';
    
    if (tafsirLoading) tafsirLoading.style.display = 'flex';
    if (tafsirContentText) tafsirContentText.textContent = 'جاري مطابقة الرواية مع التفسير والبيان...';

    // الحصول على رقم الآية بمصحف حفص عبر محرك الربط الذكي
    const hafsVerse = await mapWarshToHafs(surah, verse, arabicText);
    
    if (tafsirVerseInfo) {
        if (parseInt(hafsVerse) !== parseInt(verse)) {
            tafsirVerseInfo.textContent = `سورة ${sName} · آية رقم ${verse} ورش (يقابلها آية ${hafsVerse} بمصحف حفص)`;
        } else {
            tafsirVerseInfo.textContent = `سورة ${sName} · آية رقم ${verse}`;
        }
    }

    loadTafsir(surah, hafsVerse);
}

function closeTafsirModal() {
    if (tafsirModal) tafsirModal.style.display = 'none';
    tafsirActiveAyah = null;
}

// ربط مستمعات الأحداث للتفسير
const ayahActionTafsirBtn = document.getElementById('ayahActionTafsir');
if (ayahActionTafsirBtn) {
    ayahActionTafsirBtn.addEventListener('click', () => {
        if (!activeVerse) return;
        const arabicText = ayahSheetPreview.textContent;
        const { surah, verse } = activeVerse;
        closeAyahSheet();
        openTafsirModal(surah, verse, arabicText);
    });
}

if (closeTafsirBtn) closeTafsirBtn.addEventListener('click', closeTafsirModal);
if (tafsirModalBackdrop) tafsirModalBackdrop.addEventListener('click', closeTafsirModal);

// ===== حفظ آخر قراءة (لعرضها في الصفحة الرئيسية) =====
function saveLastRead(pageNum, surahNameForPage) {
    try {
        const record = {
            page: pageNum,
            surahName: surahNameForPage,
            surahNumber: surahNumber,
            timestamp: Date.now(),
        };
        localStorage.setItem('lastRead', JSON.stringify(record));
    } catch (e) {
        console.warn('⚠️ تعذّر حفظ آخر قراءة', e);
    }
}

// إعادة ضبط الرص عند تغيير حجم النافذة/الاتجاه فقط (لا علاقة له الآن بشريط
// أدوات المتصفح لأن الصفحة تُدار بـ position:fixed بارتفاع ثابت فعلياً)
let resizeTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        fixedLineHeight = null; // نسمح بإعادة حساب كاملة عند تغيّر حجم حقيقي
        domPageCache.clear(); // إفراغ كاش عناصر الـ DOM لإعادة احتساب المقاسات
        [slotPrev, slotCurrent, slotNext].forEach(pageDiv => {
            if (!pageDiv) return;
            pageDiv.removeAttribute('data-fitted'); // إزالة فحص الملائمة القديم
            settleNewPageContent(pageDiv);
        });
    }, 150);
});

async function init() {
    console.log('🌙 الفرقان - صفحة المصحف');
    setupQuranThemeToggle();
    console.log(`📖 سورة: ${surahName} (${surahType})`);
    console.log(`📄 بدء من صفحة: ${startPage}`);

    await loadBaseData();
    await determinePageRange();
    await renderAllPages();
}

init();

// التعامل مع زر الرجوع الفعلي للأندرويد (Cordova backbutton)
document.addEventListener('deviceready', () => {
    document.addEventListener('backbutton', (e) => {
        const tafsirModal = document.getElementById('tafsirModal');
        if (tafsirModal && tafsirModal.style.display === 'flex') {
            closeTafsirModal();
            return;
        }
        
        // العودة لصفحة قائمة السور
        window.location.href = '/quran/index.html';
    }, false);
}, false);