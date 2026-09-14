import { db } from "/auth.js?v=4";
import { collection, query, getDocs, orderBy, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ISLAMCONTENT_BASE_URL = 'https://api3.islamhouse.com/v3/paV29H2gm56kvLPy/main';

let fatwasState = {
    list: [],
    filteredList: [],
    activeSource: 'all',
    searchQuery: '',
    loading: true,
    currentPage: 1,
    itemsPerPage: 20
};

document.addEventListener('DOMContentLoaded', () => {
    initFatwas();
});

const STORAGE_FATWAS_KEY = 'al_furqan_fatwas_cache_v2';

async function initFatwas() {
    bindEvents();
    
    // استرجاع الفتاوى من الكاش المحلي أولاً للعمل بدون نت
    loadCachedFatwas();

    if (navigator.onLine) {
        if (fatwasState.list.length === 0) {
            fatwasState.loading = true;
            renderFatwas();
        }
        await fetchFreshFatwas();
    } else {
        fatwasState.loading = false;
        renderFatwas();
    }
}

function loadCachedFatwas() {
    try {
        const cached = localStorage.getItem(STORAGE_FATWAS_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
                fatwasState.list = parsed;
                fatwasState.filteredList = [...parsed];
                fatwasState.loading = false;
                extractAndRenderSources();
                renderFatwas();
            }
        }
    } catch (e) {
        console.warn('Error loading cached fatwas:', e);
    }
}

async function fetchFreshFatwas() {
    try {
        const res1 = await fetch(`${ISLAMCONTENT_BASE_URL}/fatwa/ar/ar/1/100/json`).then(r => r.json()).catch(() => null);

        let rawData = [];
        if (res1 && Array.isArray(res1.data)) rawData.push(...res1.data);

        const apiFatwas = processApiData(rawData);
        
        fatwasState.loading = false;
        if (apiFatwas.length > 0) {
            fatwasState.list = [...apiFatwas];
            fatwasState.filteredList = [...fatwasState.list];
            try {
                localStorage.setItem(STORAGE_FATWAS_KEY, JSON.stringify(fatwasState.list));
            } catch (e) {}
            extractAndRenderSources();
            renderFatwas();
        } else {
            renderFatwas();
        }
        
        fetchMorePagesInBackground();

    } catch (err) {
        console.error('Error fetching IslamContent API fatwas:', err);
        fatwasState.loading = false;
        renderFatwas();
    }
}

function processApiData(rawData) {
    return rawData.map(item => {
        const scholarName = (item.prepared_by && item.prepared_by.length > 0)
            ? item.prepared_by[0].title
            : 'دار الإفتاء وعلماء الإسلام';
            
        const scholarDesc = (item.prepared_by && item.prepared_by.length > 0)
            ? item.prepared_by[0].description
            : '';

        let audioUrl = '';
        let pdfUrl = '';
        if (item.attachments && item.attachments.length > 0) {
            item.attachments.forEach(att => {
                if (att.url && (att.url.endsWith('.mp3') || att.url.endsWith('.m4a'))) audioUrl = att.url;
                if (att.url && att.url.endsWith('.pdf')) pdfUrl = att.url;
            });
            if (!audioUrl && item.attachments[0].url && !item.attachments[0].url.endsWith('.pdf')) {
                audioUrl = item.attachments[0].url;
            }
        }

        return {
            id: `ic_${item.id || item.source_id}`,
            sourceId: item.id || item.source_id,
            title: item.title || 'فتوى شرعية',
            question: item.title,
            answer: item.full_description || item.description || 'لا توجد تفاصيل...',
            scholar: scholarName,
            scholarDesc: scholarDesc,
            evidence: scholarDesc || 'مصدر الفتوى: مركز IslamContent / IslamHouse الفقهي الموثوق',
            audioUrl: audioUrl,
            pdfUrl: pdfUrl,
            apiUrl: item.api_url,
            isApi: true
        };
    });
}

async function fetchMorePagesInBackground() {
    try {
        const pagesToFetch = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]; // expanded page list to get 500+ items if available
        const chunkSize = 4;
        const rawData = [];

        for (let i = 0; i < pagesToFetch.length; i += chunkSize) {
            const chunk = pagesToFetch.slice(i, i + chunkSize);
            const promises = chunk.map(page => 
                fetch(`${ISLAMCONTENT_BASE_URL}/fatwa/ar/ar/${page}/50/json`)
                    .then(async r => {
                        if (!r.ok) return null;
                        return r.json();
                    })
                    .catch(() => null)
            );
            
            const results = await Promise.all(promises);
            results.forEach(res => {
                if (res && Array.isArray(res.data)) {
                    rawData.push(...res.data);
                }
            });
            
            // Wait 120ms between chunks to prevent aggressive rate limits while remaining ultra-fast
            await new Promise(resolve => setTimeout(resolve, 120));
        }

        if (rawData.length > 0) {
            const moreFatwas = processApiData(rawData);
            const existingIds = new Set(fatwasState.list.map(f => f.id));
            const uniqueNew = moreFatwas.filter(f => !existingIds.has(f.id));
            
            if (uniqueNew.length > 0) {
                fatwasState.list = [...fatwasState.list, ...uniqueNew];
                applyFilters();
                extractAndRenderSources();
            }
        }
    } catch (e) {
        console.warn('Background fetch failed:', e);
    }
}

function bindEvents() {
    document.getElementById('openDrawerBtn')?.addEventListener('click', openDrawer);
    document.getElementById('closeDrawerBtn')?.addEventListener('click', closeDrawer);
    document.getElementById('fatwaDrawerOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'fatwaDrawerOverlay') closeDrawer();
    });

    const searchInput = document.getElementById('fatwaSearchInput');
    const clearBtn = document.getElementById('fatwaSearchClearBtn');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            fatwasState.searchQuery = e.target.value.trim().toLowerCase();
            if (clearBtn) clearBtn.style.display = fatwasState.searchQuery ? 'block' : 'none';
            applyFilters();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            clearBtn.style.display = 'none';
            fatwasState.searchQuery = '';
            applyFilters();
        });
    }

    document.getElementById('prevPageBtn')?.addEventListener('click', () => {
        if (fatwasState.currentPage > 1) {
            fatwasState.currentPage--;
            renderFatwas();
        }
    });

    document.getElementById('nextPageBtn')?.addEventListener('click', () => {
        const totalPages = Math.ceil(fatwasState.filteredList.length / fatwasState.itemsPerPage);
        if (fatwasState.currentPage < totalPages) {
            fatwasState.currentPage++;
            renderFatwas();
        }
    });
}

function openDrawer() {
    const drawer = document.getElementById('fatwaDrawerOverlay');
    if (drawer) drawer.classList.add('active');
}

function closeDrawer() {
    const drawer = document.getElementById('fatwaDrawerOverlay');
    if (drawer) drawer.classList.remove('active');
}

function extractAndRenderSources() {
    const list = document.getElementById('drawerSourcesList');
    if (!list) return;

    const sourcesCount = {};
    fatwasState.list.forEach(f => {
        sourcesCount[f.scholar] = (sourcesCount[f.scholar] || 0) + 1;
    });

    let html = `
        <div class="drawer-source-item ${fatwasState.activeSource === 'all' ? 'active' : ''}" data-source="all">
            <span>جميع المصادر</span>
            <span class="source-count">${fatwasState.list.length}</span>
        </div>
    `;

    Object.keys(sourcesCount).sort().forEach(src => {
        if (!src) return;
        const isActive = fatwasState.activeSource === src ? 'active' : '';
        html += `
            <div class="drawer-source-item ${isActive}" data-source="${escapeHTML(src)}">
                <span>${escapeHTML(src)}</span>
                <span class="source-count">${sourcesCount[src]}</span>
            </div>
        `;
    });

    list.innerHTML = html;

    list.querySelectorAll('.drawer-source-item').forEach(item => {
        item.addEventListener('click', () => {
            fatwasState.activeSource = item.getAttribute('data-source');
            applyFilters();
            closeDrawer();
            extractAndRenderSources();
        });
    });
}

function applyFilters() {
    fatwasState.currentPage = 1;
    fatwasState.filteredList = fatwasState.list.filter(f => {
        let matchSource = fatwasState.activeSource === 'all' || f.scholar === fatwasState.activeSource;
        let matchSearch = true;
        if (fatwasState.searchQuery) {
            matchSearch = f.title.toLowerCase().includes(fatwasState.searchQuery) ||
                          f.question.toLowerCase().includes(fatwasState.searchQuery);
        }
        return matchSource && matchSearch;
    });

    const badge = document.getElementById('fatwasTotalBadge');
    if (badge) badge.textContent = `${fatwasState.filteredList.length} فتوى`;
    
    const titleEl = document.getElementById('activeCategoryTitle');
    if (titleEl) {
        titleEl.textContent = fatwasState.activeSource === 'all' ? 'جميع الفتاوى' : fatwasState.activeSource;
    }

    renderFatwas();
}

function renderFatwas() {
    const grid = document.getElementById('fatwasGrid');
    if (!grid) return;

    if (fatwasState.loading) {
        let skeletonHtml = '';
        for (let i = 0; i < 6; i++) {
            skeletonHtml += `
                <div class="fatwa-card" style="pointer-events: none; opacity: 0.7;">
                    <div class="fatwa-card-header">
                        <span class="fatwa-scholar-tag skeleton-element" style="width: 120px; height: 16px; display: inline-block; border-radius: 8px;"></span>
                    </div>
                    <div class="skeleton-element" style="width: 80%; height: 22px; margin-top: 12px; border-radius: 8px;"></div>
                    <div class="skeleton-element" style="width: 100%; height: 14px; margin-top: 12px; border-radius: 6px;"></div>
                    <div class="skeleton-element" style="width: 90%; height: 14px; margin-top: 8px; border-radius: 6px;"></div>
                    <div class="fatwa-card-footer" style="border-top: none; margin-top: 16px; padding-top: 0; display: flex; justify-content: space-between; align-items: center;">
                        <div class="skeleton-element" style="width: 40px; height: 14px; border-radius: 6px;"></div>
                        <div class="skeleton-element" style="width: 100px; height: 32px; border-radius: 12px;"></div>
                    </div>
                </div>
            `;
        }
        grid.innerHTML = skeletonHtml;
        document.getElementById('paginationControls').style.display = 'none';
        return;
    }

    if (fatwasState.filteredList.length === 0) {
        grid.innerHTML = `
            <div class="fatwa-empty-state">
                <i class="fa-solid fa-scale-unbalanced-flip"></i>
                <p>لم نجد فتاوى مطابقة للبحث أو المصدر</p>
            </div>
        `;
        document.getElementById('paginationControls').style.display = 'none';
        return;
    }

    const totalPages = Math.ceil(fatwasState.filteredList.length / fatwasState.itemsPerPage);
    if (fatwasState.currentPage > totalPages) fatwasState.currentPage = totalPages;
    const startIndex = (fatwasState.currentPage - 1) * fatwasState.itemsPerPage;
    const currentItems = fatwasState.filteredList.slice(startIndex, startIndex + fatwasState.itemsPerPage);

    grid.innerHTML = currentItems.map(f => `
        <div class="fatwa-card" onclick="window.openIndependentFatwa('${f.id}')">
            <div class="fatwa-card-header">
                <span class="fatwa-scholar-tag"><i class="fa-solid fa-shield-halved"></i> ${escapeHTML(f.scholar || 'دار الإفتاء')}</span>
            </div>
            <h4 class="fatwa-card-title">${escapeHTML(f.title)}</h4>
            <p class="fatwa-card-excerpt">${escapeHTML(cleanTextExcerpt(f.question))}</p>
            <div class="fatwa-card-footer">
                <div style="display:flex; gap:8px;">
                    ${f.audioUrl ? '<span style="font-size:11px; color:#5BC0BE; font-weight:700;" title="مرفق صوتي"><i class="fa-solid fa-volume-high"></i></span>' : ''}
                    ${f.pdfUrl ? '<span style="font-size:11px; color:#ef4444; font-weight:700;" title="مرفق PDF"><i class="fa-solid fa-file-pdf"></i></span>' : ''}
                </div>
                <button type="button" class="btn-view-fatwa">
                    <span>قراءة الفتوى كاملة</span>
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
            </div>
        </div>
    `).join('');

    renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
    const container = document.getElementById('paginationControls');
    const pageNumbersEl = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (totalPages <= 1) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    prevBtn.disabled = fatwasState.currentPage === 1;
    nextBtn.disabled = fatwasState.currentPage === totalPages;

    let pagesHtml = '';
    let startPage = Math.max(1, fatwasState.currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        pagesHtml += `<div class="page-num ${i === fatwasState.currentPage ? 'active' : ''}" onclick="window.goToPage(${i})">${i}</div>`;
    }
    
    pageNumbersEl.innerHTML = pagesHtml;
}

window.goToPage = function(page) {
    fatwasState.currentPage = page;
    renderFatwas();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.openIndependentFatwa = function(fatwaId) {
    const fatwa = fatwasState.list.find(f => f.id === fatwaId);
    if (!fatwa) return;
    
    sessionStorage.setItem('current_view_fatwa', JSON.stringify(fatwa));
    window.location.href = `/fatwas/view.html?id=${fatwa.sourceId}`;
};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function cleanTextExcerpt(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.innerHTML = str;
    const text = temp.textContent || temp.innerText || '';
    return text.trim();
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
