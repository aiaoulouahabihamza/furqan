const ISLAMCONTENT_BASE_URL = 'https://api3.islamhouse.com/v3/paV29H2gm56kvLPy/main';

let lecturesState = {
    items: [],
    filteredItems: [],
    loading: true,
    currentPage: 1,
    itemsPerPage: 24,
    totalCount: 0,
    searchQuery: '',
    selectedItem: null,
    activeTrackUrl: null,
    activeTrackTitle: null
};

// المشغل الصوتي المدمج
let audioPlayer = null;
let playBtn = null;
let playIcon = null;
let seekSlider = null;
let currentTimeText = null;
let durationText = null;
let isPlaying = false;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initLectures();
    });
} else {
    initLectures();
}

const STORAGE_LECTURES_KEY = 'al_furqan_lectures_cache_v2';
const STORAGE_LECTURES_TOTAL_KEY = 'al_furqan_lectures_total_v2';

function initLectures() {
    bindEvents();
    initAudioPlayer();

    // استرجاع المحاضرات من الكاش المحلي أولاً للعمل بدون نت
    loadCachedLectures();

    if (navigator.onLine) {
        fetchLectures(1);
    } else {
        lecturesState.loading = false;
        renderLectures();
        if (lecturesState.items.length > 0) {
            const badge = document.getElementById('lecturesTotalBadge');
            if (badge) badge.textContent = `${lecturesState.items.length} مادة صوتية (محفوظ أوفلاين)`;
        }
    }
}

function loadCachedLectures() {
    try {
        const cached = localStorage.getItem(STORAGE_LECTURES_KEY);
        const cachedTotal = localStorage.getItem(STORAGE_LECTURES_TOTAL_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
                lecturesState.items = parsed;
                lecturesState.filteredItems = [...parsed];
                lecturesState.totalCount = Number(cachedTotal) || parsed.length;
                lecturesState.loading = false;
                const badge = document.getElementById('lecturesTotalBadge');
                if (badge) badge.textContent = `${lecturesState.totalCount} مادة صوتية`;
                renderLectures();
            }
        }
    } catch (e) {
        console.warn('Error loading cached lectures:', e);
    }
}

function getDownloadProxyUrl(url, title, extension) {
    if (!url) return '#';
    return url.replace(/^http:\/\//i, 'https://');
}

async function fetchLectures(page) {
    if (!navigator.onLine) {
        if (lecturesState.items.length === 0) {
            loadCachedLectures();
        }
        lecturesState.loading = false;
        renderLectures();
        return;
    }

    if (lecturesState.items.length === 0) {
        lecturesState.loading = true;
        renderLectures();
    }
    
    try {
        const res = await fetch(`${ISLAMCONTENT_BASE_URL}/audios/ar/ar/${page}/${lecturesState.itemsPerPage}/json`)
            .then(r => r.json())
            .catch(() => null);

        if (res && Array.isArray(res.data)) {
            lecturesState.items = processApiData(res.data);
            lecturesState.filteredItems = [...lecturesState.items];
            
            if (res.links && res.links.total_items) {
                lecturesState.totalCount = res.links.total_items;
            } else {
                lecturesState.totalCount = lecturesState.items.length;
            }
            
            try {
                localStorage.setItem(STORAGE_LECTURES_KEY, JSON.stringify(lecturesState.items));
                localStorage.setItem(STORAGE_LECTURES_TOTAL_KEY, String(lecturesState.totalCount));
            } catch (e) {}

            const badge = document.getElementById('lecturesTotalBadge');
            if (badge) badge.textContent = `${lecturesState.totalCount} مادة صوتية`;
            lecturesState.loading = false;
            
            renderLectures();
            renderPagination(res.links);
        } else if (lecturesState.items.length === 0) {
            showErrorState('فشل استدعاء المواد الصوتية من المصدر.');
        }
    } catch (err) {
        console.error('Error fetching lectures:', err);
        if (lecturesState.items.length === 0) {
            showErrorState('حدث خطأ أثناء الاتصال بمزود الخدمة.');
        }
    }
}

function getRandomGradient(str) {
    const gradients = [
        'linear-gradient(135deg, #1A365D 0%, #2A4365 100%)', // Deep Sapphire
        'linear-gradient(135deg, #2C5282 0%, #2B6CB0 100%)', // Blue
        'linear-gradient(135deg, #276749 0%, #2F855A 100%)', // Forest Emerald
        'linear-gradient(135deg, #2F7E7C 0%, #1E5150 100%)', // Teal Classic
        'linear-gradient(135deg, #7B341E 0%, #9C4221 100%)', // Terracotta
        'linear-gradient(135deg, #4A1268 0%, #5B2182 100%)', // Rich Purple
        'linear-gradient(135deg, #744210 0%, #975A16 100%)', // Antique Gold
        'linear-gradient(135deg, #1A202C 0%, #2D3748 100%)'  // Slate Dark
    ];
    let sum = 0;
    for (let i = 0; i < str.length; i++) {
        sum += str.charCodeAt(i);
    }
    return gradients[sum % gradients.length];
}

function processApiData(data) {
    return data.map(item => {
        const scholar = (item.prepared_by && item.prepared_by.length > 0)
            ? item.prepared_by[0].title
            : 'الشيخ / الداعية';

        // تجميع كل المرفقات الصوتية كأجزاء للسلسلة
        let parts = [];
        if (item.attachments && item.attachments.length > 0) {
            item.attachments.forEach(att => {
                const urlLower = (att.url || '').toLowerCase();
                const extLower = (att.extension_type || '').toLowerCase();
                if (att.url && (urlLower.endsWith('.mp3') || urlLower.endsWith('.m4a') || extLower === 'mp3')) {
                    let rawTitle = att.description || (att.url ? att.url.split('/').pop().replace('.mp3', '') : 'جزء غير معنون');
                    let title = rawTitle;
                    let subtitle = '';
                    if (rawTitle.includes(' - ')) {
                        const splitted = rawTitle.split(' - ');
                        title = splitted[0].trim();
                        subtitle = splitted.slice(1).join(' - ').trim();
                    }
                    parts.push({
                        title: title,
                        subtitle: subtitle,
                        url: att.url,
                        size: att.size || 'غير محدد'
                    });
                }
            });
        }

        return {
            id: item.id,
            title: item.title,
            scholar: scholar,
            description: cleanTextExcerpt(item.full_description || item.description || 'محاضرة وخطبة إسلامية قيمة تتناول جوانب الإيمان والشريعة المطهرة.'),
            parts: parts,
            importance: item.importance_level || 'عام',
            image: item.image
        };
    });
}

function renderLectures() {
    const container = document.getElementById('lecturesContainer');
    if (!container) return;

    if (libraryStateAndLecturesLoadingCheck()) {
        container.innerHTML = `
            <div class="skeleton-wrapper">
                <div class="skeleton-card"><div class="skeleton-cover"></div><div class="skeleton-line" style="width: 70%;"></div><div class="skeleton-line" style="width: 40%;"></div><div class="skeleton-text"></div></div>
                <div class="skeleton-card"><div class="skeleton-cover"></div><div class="skeleton-line" style="width: 70%;"></div><div class="skeleton-line" style="width: 40%;"></div><div class="skeleton-text"></div></div>
                <div class="skeleton-card"><div class="skeleton-cover"></div><div class="skeleton-line" style="width: 70%;"></div><div class="skeleton-line" style="width: 40%;"></div><div class="skeleton-text"></div></div>
            </div>
        `;
        return;
    }

    const query = lecturesState.searchQuery.trim().toLowerCase();
    const itemsToShow = lecturesState.filteredItems.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.scholar.toLowerCase().includes(query) || 
        item.description.toLowerCase().includes(query)
    );

    if (itemsToShow.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #718096; grid-column: 1 / -1;">
                <i class="fa-solid fa-microphone-slash" style="font-size: 50px; color: #3A9B99; opacity: 0.5; margin-bottom: 16px;"></i>
                <p style="font-weight: 700;">لا توجد محاضرات مطابقة لخيارات البحث حالياً.</p>
            </div>
        `;
        return;
    }

    let html = '<div class="lectures-grid">';
    itemsToShow.forEach(item => {
        const partsCount = item.parts.length;
        let coverHtml = '';
        if (item.image) {
            coverHtml = `
                <img src="${item.image}" class="lecture-cover-img" alt="${item.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div class="lecture-cover-fallback" style="background: ${getRandomGradient(item.title)}">
                    <span class="lecture-cover-fallback-title">${item.title}</span>
                </div>
            `;
        } else {
            coverHtml = `
                <div class="lecture-cover-fallback" style="background: ${getRandomGradient(item.title)}">
                    <span class="lecture-cover-fallback-title">${item.title}</span>
                </div>
            `;
        }

        html += `
            <div class="lecture-card" data-id="${item.id}">
                <div class="lecture-cover">
                    <span class="lecture-parts-badge"><i class="fa-solid fa-list-ol"></i> ${partsCount} أجزاء</span>
                    ${coverHtml}
                </div>
                <div class="lecture-info">
                    <h4 class="lecture-title" title="${item.title}">${item.title}</h4>
                    <div class="lecture-scholar">
                        <i class="fa-solid fa-chalkboard-user"></i>
                        <span>${item.scholar}</span>
                    </div>
                    <p class="lecture-desc">${item.description}</p>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function libraryStateAndLecturesLoadingCheck() {
    return lecturesState.loading;
}

function renderPagination(links) {
    const wrap = document.getElementById('paginationWrap');
    if (!wrap) return;

    const totalPages = links ? (links.pages_number || links.total_pages || 1) : 1;

    if (totalPages <= 1) {
        wrap.style.display = 'none';
        return;
    }

    wrap.style.display = 'flex';
    let html = '';

    const current = lecturesState.currentPage;

    // زر السابق
    if (current > 1) {
        html += `<button class="btn-page btn-page-nav" data-page="${current - 1}"><i class="fa-solid fa-chevron-right"></i> السابق</button>`;
    }

    // صفحات مرقمة بمدى ذكي وممتد
    let startPage = Math.max(1, current - 4);
    let endPage = Math.min(totalPages, current + 4);

    if (startPage > 1) {
        html += `<button class="btn-page" data-page="1">1</button>`;
        if (startPage > 2) {
            html += `<span style="align-self: center; color: #A0AEC0; padding: 0 4px;">...</span>`;
        }
    }

    for (let p = startPage; p <= endPage; p++) {
        html += `<button class="btn-page ${p === current ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span style="align-self: center; color: #A0AEC0; padding: 0 4px;">...</span>`;
        }
        html += `<button class="btn-page" data-page="${totalPages}">${totalPages}</button>`;
    }

    // زر التالي
    if (current < totalPages) {
        html += `<button class="btn-page btn-page-nav" data-page="${current + 1}">التالي <i class="fa-solid fa-chevron-left"></i></button>`;
    }

    wrap.innerHTML = html;
}

function bindEvents() {
    const headerBackBtn = document.getElementById('headerBackBtn');
    if (headerBackBtn) {
        headerBackBtn.addEventListener('click', (e) => {
            if (window.history.length > 1) {
                e.preventDefault();
                window.history.back();
            }
        });
    }

    // مربع البحث الديناميكي
    const searchInput = document.getElementById('lectureSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            lecturesState.searchQuery = e.target.value;
            renderLectures();
        });
    }

    // النقر على كرت المحاضرة
    const container = document.getElementById('lecturesContainer');
    if (container) {
        container.addEventListener('click', (e) => {
            const card = e.target.closest('.lecture-card');
            if (card) {
                const id = card.dataset.id;
                const item = lecturesState.items.find(l => String(l.id) === String(id));
                if (item) {
                    try {
                        sessionStorage.setItem('current_view_lecture', JSON.stringify(item));
                    } catch (err) {}
                }
                window.location.href = `./view.html?id=${id}`;
            }
        });
    }

    // التبديل بين الصفحات
    const pagWrap = document.getElementById('paginationWrap');
    if (pagWrap) {
        pagWrap.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-page]');
            if (btn) {
                const targetPage = parseInt(btn.dataset.page);
                lecturesState.currentPage = targetPage;
                fetchLectures(targetPage);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    // إغلاق المودال وإيقاف الصوت
    const modalClose = document.getElementById('lectureModalCloseBtn');
    const modal = document.getElementById('lectureDetailModal');
    if (modalClose && modal) {
        modalClose.addEventListener('click', () => {
            closeLectureModal();
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeLectureModal();
        });
    }
}

function openLectureDetails(id) {
    const item = lecturesState.items.find(l => l.id == id);
    if (!item) return;

    lecturesState.selectedItem = item;

    const modal = document.getElementById('lectureDetailModal');
    const titleEl = document.getElementById('modalLectureTitle');
    const scholarEl = document.getElementById('modalLectureScholar');
    const descEl = document.getElementById('modalLectureDesc');
    const partsListEl = document.getElementById('modalPartsList');
    const fullPageBtn = document.getElementById('modalFullPageBtn');

    if (titleEl) titleEl.textContent = item.title;
    if (scholarEl) scholarEl.innerHTML = `<i class="fa-solid fa-chalkboard-user"></i> الشيخ / الداعية: ${item.scholar}`;
    if (descEl) descEl.textContent = item.description || 'لم يتوفر وصف تفصيلي لهذه المحاضرة.';
    if (fullPageBtn) {
        fullPageBtn.href = `./view.html?id=${item.id}`;
    }

    // تفجير قائمة الأجزاء
    if (partsListEl) {
        if (item.parts.length === 0) {
            partsListEl.innerHTML = '<p style="font-size:13px; color:#A0AEC0;">الملفات الصوتية غير متوفرة لهذه السلسلة حالياً.</p>';
        } else {
            let html = '';
            item.parts.forEach((part, index) => {
                html += `
                    <div class="part-item" id="partItem_${index}">
                        <div class="part-title-col">
                            <i class="fa-solid fa-circle-play part-icon"></i>
                            <div>
                                <div class="part-title" style="font-weight: 700; color: #2D3748; font-size: 13.5px;">${part.title}</div>
                                ${part.subtitle ? `<div class="part-subtitle" style="font-size: 12px; color: #718096; margin-top: 3px; font-weight: 500; line-height: 1.4;">${part.subtitle}</div>` : ''}
                                <div class="part-meta" style="margin-top: 4px; font-size: 11.5px; color: #A0AEC0;"><i class="fa-solid fa-sd-card"></i> الحجم: ${part.size}</div>
                            </div>
                        </div>
                        <div class="part-actions-col">
                            <button class="btn-part btn-part-play" data-index="${index}" title="تشغيل المستمع">
                                <i class="fa-solid fa-play"></i>
                            </button>
                            <button class="btn-part btn-part-download" data-url="${part.url}" data-title="${part.title}" title="تحميل مباشر">
                                <i class="fa-solid fa-download"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            partsListEl.innerHTML = html;

            // ربط ضغطات تشغيل وتحميل الأجزاء
            bindPartActionListeners();
        }
    }

    // تفعيل المشغل الصوتي المدمج مع تحميل الجزء الأول تلقائياً إن وجد
    if (item.parts.length > 0) {
        const firstPart = item.parts[0];
        
        // إظهار المشغل
        const playerBox = document.getElementById('modalAudioPlayerBox');
        if (playerBox) playerBox.style.display = 'flex';
        
        // تحديث الاسم المعروض
        const trackTitleEl = document.getElementById('playerTrackTitle');
        if (trackTitleEl) trackTitleEl.textContent = firstPart.title;
        
        // تحميل المسار ليكون جاهزاً للتشغيل
        lecturesState.activeTrackUrl = firstPart.url;
        if (audioPlayer) {
            audioPlayer.src = firstPart.url;
            audioPlayer.load();
            isPlaying = false;
            if (playIcon) playIcon.className = 'fa-solid fa-play';
        }
        
        const statusBadge = document.getElementById('playerStatusBadge');
        if (statusBadge) {
            statusBadge.textContent = 'جاهز للاستماع';
            statusBadge.style.background = '#3A9B99';
        }

        // تمييز الجزء الأول في القائمة كأول عنصر نشط
        setTimeout(() => {
            const partsListEl = document.getElementById('modalPartsList');
            if (partsListEl) {
                const items = partsListEl.querySelectorAll('.part-item');
                items.forEach(el => el.classList.remove('playing'));
                
                const activePlayBtns = partsListEl.querySelectorAll('.btn-part-play');
                activePlayBtns.forEach(b => b.classList.remove('active-play'));

                const firstItem = document.getElementById('partItem_0');
                if (firstItem) {
                    firstItem.classList.add('playing');
                    const firstPlayBtn = firstItem.querySelector('.btn-part-play');
                    if (firstPlayBtn) firstPlayBtn.classList.add('active-play');
                }
            }
        }, 100);
    } else {
        document.getElementById('modalAudioPlayerBox').style.display = 'none';
        if (audioPlayer) {
            audioPlayer.src = '';
            audioPlayer.load();
        }
    }

    if (modal) modal.style.display = 'flex';
}

function closeLectureModal() {
    const modal = document.getElementById('lectureDetailModal');
    if (modal) modal.style.display = 'none';

    if (audioPlayer) {
        audioPlayer.pause();
        isPlaying = false;
        if (playIcon) playIcon.className = 'fa-solid fa-play';
    }
}

function bindPartActionListeners() {
    const partsListEl = document.getElementById('modalPartsList');
    if (!partsListEl) return;

    // أزرار تشغيل المسارات الصوتية
    const playBtns = partsListEl.querySelectorAll('.btn-part-play');
    playBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(btn.dataset.index);
            const part = lecturesState.selectedItem.parts[index];
            if (part) {
                playTrack(part, index);
            }
        });
    });

    // أزرار تنزيل المسارات بدون أي توجيه أو فتح نوافذ
    const downloadBtns = partsListEl.querySelectorAll('.btn-part-download');
    downloadBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const url = btn.dataset.url;
            const title = btn.dataset.title;
            if (url) {
                const cleanFilename = (title || 'مقطع_صوتي').replace(/[\/\\?%*:|"<>\s]+/g, '_') + '.mp3';
                if (window.Fur9anBridge && typeof window.Fur9anBridge.downloadFile === 'function') {
                    window.Fur9anBridge.downloadFile(url, cleanFilename, 'الفرقان');
                } else if (typeof window.downloadFur9anFile === 'function') {
                    window.downloadFur9anFile(url, cleanFilename);
                } else {
                    const proxyUrl = `/api/download-file?url=${encodeURIComponent(url)}&filename=${encodeURIComponent('الفرقان - ' + cleanFilename)}`;
                    const iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    iframe.src = proxyUrl;
                    document.body.appendChild(iframe);
                    setTimeout(() => {
                        if (document.body.contains(iframe)) document.body.removeChild(iframe);
                    }, 15000);
                }
            }
        });
    });
}

function initAudioPlayer() {
    audioPlayer = document.getElementById('modalAudioElement');
    playBtn = document.getElementById('playerPlayBtn');
    playIcon = document.getElementById('playerPlayIcon');
    seekSlider = document.getElementById('playerSeekSlider');
    currentTimeText = document.getElementById('playerCurrentTime');
    durationText = document.getElementById('playerDuration');

    if (!audioPlayer || !playBtn) return;

    // تشغيل / إيقاف
    playBtn.addEventListener('click', () => {
        if (!audioPlayer.src || audioPlayer.src === '' || audioPlayer.src === window.location.href) {
            if (lecturesState.selectedItem && lecturesState.selectedItem.parts && lecturesState.selectedItem.parts.length > 0) {
                playTrack(lecturesState.selectedItem.parts[0], 0);
            }
            return;
        }
        
        if (isPlaying) {
            audioPlayer.pause();
        } else {
            audioPlayer.play().catch(e => {
                if (e.name === 'AbortError') return; // تجاهل الانقطاعات العادية
                
                if (!audioPlayer.dataset.fallbackTried && lecturesState.activeTrackUrl) {
                    audioPlayer.dataset.fallbackTried = 'true';
                    audioPlayer.src = `/api/proxy-audio?url=${encodeURIComponent(lecturesState.activeTrackUrl)}`;
                    audioPlayer.load();
                    audioPlayer.play().catch(() => {
                        if (window.FurqanToast) window.FurqanToast.error('فشل تشغيل المسار الصوتي من المصدر.');
                    });
                } else {
                    if (window.FurqanToast) window.FurqanToast.error('فشل تشغيل المسار الصوتي من المصدر.');
                }
            });
        }
    });

    audioPlayer.addEventListener('play', () => {
        isPlaying = true;
        if (playIcon) playIcon.className = 'fa-solid fa-pause';
        document.getElementById('playerStatusBadge').textContent = 'قيد الاستماع';
        document.getElementById('playerStatusBadge').style.background = '#2F7E7C';
    });

    audioPlayer.addEventListener('pause', () => {
        isPlaying = false;
        if (playIcon) playIcon.className = 'fa-solid fa-play';
        document.getElementById('playerStatusBadge').textContent = 'متوقف مؤقتاً';
        document.getElementById('playerStatusBadge').style.background = '#718096';
    });

    audioPlayer.addEventListener('timeupdate', () => {
        if (!audioPlayer.duration) return;
        const current = audioPlayer.currentTime;
        const duration = audioPlayer.duration;
        const pct = (current / duration) * 100;

        if (seekSlider) seekSlider.value = pct;
        if (currentTimeText) currentTimeText.textContent = formatTime(current);
    });

    audioPlayer.addEventListener('loadedmetadata', () => {
        if (durationText) durationText.textContent = formatTime(audioPlayer.duration);
    });

    audioPlayer.addEventListener('ended', () => {
        isPlaying = false;
        if (playIcon) playIcon.className = 'fa-solid fa-play';
        if (seekSlider) seekSlider.value = 0;
        if (currentTimeText) currentTimeText.textContent = '00:00';
        document.getElementById('playerStatusBadge').textContent = 'جاهز للاستماع';
        document.getElementById('playerStatusBadge').style.background = '#3A9B99';
    });

    if (seekSlider) {
        seekSlider.addEventListener('input', () => {
            if (!audioPlayer.duration) return;
            const pct = parseFloat(seekSlider.value);
            audioPlayer.currentTime = (pct / 100) * audioPlayer.duration;
        });
    }
}

function playTrack(part, index) {
    if (!audioPlayer) return;

    // إظهار المشغل المدمج
    const playerBox = document.getElementById('modalAudioPlayerBox');
    if (playerBox) playerBox.style.display = 'flex';

    // تحديث الاسم المعروض
    const trackTitleEl = document.getElementById('playerTrackTitle');
    if (trackTitleEl) trackTitleEl.textContent = part.title;

    // تمييز الجزء النشط في القائمة
    const partsListEl = document.getElementById('modalPartsList');
    const items = partsListEl.querySelectorAll('.part-item');
    items.forEach(el => el.classList.remove('playing'));
    
    const activePlayBtns = partsListEl.querySelectorAll('.btn-part-play');
    activePlayBtns.forEach(b => b.classList.remove('active-play'));

    const currentItem = document.getElementById(`partItem_${index}`);
    if (currentItem) {
        currentItem.classList.add('playing');
        const playBtn = currentItem.querySelector('.btn-part-play');
        if (playBtn) playBtn.classList.add('active-play');
    }

    // إذا كان المقطع المطلوب هو نفسه النشط حالياً، قم بتبديل حالة التشغيل فقط
    if (lecturesState.activeTrackUrl === part.url) {
        if (isPlaying) {
            audioPlayer.pause();
        } else {
            audioPlayer.play().catch(() => {});
        }
        return;
    }

    // تحميل وتدفق المسار الجديد مع معالجة الرابط والبروكسي
    let safeUrl = (part.url || '').replace(/^http:\/\//i, 'https://');
    lecturesState.activeTrackUrl = safeUrl;
    
    // إزالة معالج الخطأ السابق لعدم التكرار
    audioPlayer.onerror = () => {
        if (!audioPlayer.dataset.fallbackTried && part.url) {
            audioPlayer.dataset.fallbackTried = 'true';
            console.log('Direct audio failed, using proxy:', part.url);
            audioPlayer.src = `/api/proxy-audio?url=${encodeURIComponent(part.url)}`;
            audioPlayer.load();
            audioPlayer.play().catch(() => {});
        } else {
            console.error('Playback error with audio proxy');
            if (window.FurqanToast) window.FurqanToast.error('فشل في جلب وتدفق الصوت من المصدر.');
        }
    };
    
    audioPlayer.dataset.fallbackTried = 'false';
    audioPlayer.src = safeUrl;
    audioPlayer.load();
    
    document.getElementById('playerStatusBadge').textContent = 'جاري الاتصال...';
    document.getElementById('playerStatusBadge').style.background = '#D8B887';

    audioPlayer.play().catch(e => {
        if (e.name === 'AbortError') return; // تجاهل انقطاع التشغيل بسبب تغيير المسار أو الإيقاف السريع
        console.error('Playback error:', e);
        // تجربة البروكسي عند فشل التشغيل المباشر
        if (!audioPlayer.dataset.fallbackTried && part.url) {
            audioPlayer.dataset.fallbackTried = 'true';
            audioPlayer.src = `/api/proxy-audio?url=${encodeURIComponent(part.url)}`;
            audioPlayer.load();
            audioPlayer.play().catch(() => {});
        }
    });
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function cleanTextExcerpt(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.innerHTML = str;
    const text = temp.textContent || temp.innerText || '';
    return text.trim();
}

function showErrorState(msg) {
    const container = document.getElementById('lecturesContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #EF4444; grid-column: 1 / -1;">
                <i class="fa-solid fa-circle-exclamation" style="font-size: 50px; margin-bottom: 16px;"></i>
                <p style="font-weight: 700;">${msg}</p>
                <button onclick="window.location.reload();" class="btn-page btn-page-nav" style="margin-top: 12px; display:inline-flex; align-items:center; gap:8px;">إعادة المحاولة</button>
            </div>
        `;
    }
}
