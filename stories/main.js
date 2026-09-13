/**
 * الفرقان - قسم قصص الأنبياء والصحابة والإسلام
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. المظهر يُدار مركزياً عبر settings.js

    // 2. العناصر الرئيسية
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    const tabProphets = document.getElementById('tabProphets');
    const tabSahaba = document.getElementById('tabSahaba');
    const tabIslamic = document.getElementById('tabIslamic');
    const statsText = document.getElementById('statsText');
    const loadingState = document.getElementById('loadingState');
    const storiesGrid = document.getElementById('storiesGrid');
    const noResults = document.getElementById('noResults');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    // العناصر الخاصة بالمودال
    const storyModal = document.getElementById('storyModal');
    const closeStoryModal = document.getElementById('closeStoryModal');
    const modalCategoryBadge = document.getElementById('modalCategoryBadge');
    const modalStoryTitle = document.getElementById('modalStoryTitle');
    const modalStoryBody = document.getElementById('modalStoryBody');
    const copyStoryBtn = document.getElementById('copyStoryBtn');

    // البيانات والمتغيرات
    let prophetsStories = [];
    let sahabaStories = [];
    let islamicStories = [];
    let activeTab = 'prophets'; // 'prophets' | 'sahaba' | 'islamic'
    let currentActiveStoryText = '';

    // 3. جلب البيانات
    async function fetchStories() {
        showLoading(true);
        try {
            const [prophetsRes, sahabaRes, islamicRes] = await Promise.all([
                fetch('/data/json/prophets_stories.json'),
                fetch('/data/json/sahaba_stories.json'),
                fetch('/data/json/islamic_stories.json')
            ]);

            prophetsStories = await prophetsRes.json();
            sahabaStories = await sahabaRes.json();
            islamicStories = await islamicRes.json();

            showLoading(false);
            renderCurrentStories();
        } catch (error) {
            console.error('خطأ أثناء جلب القصص:', error);
            showLoading(false);
            storiesGrid.innerHTML = `
                <div style="text-align:center; padding:30px; color:var(--color-text-light);">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:30px; color:var(--color-primary); margin-bottom:10px;"></i>
                    <p>تعذر تحميل بعض البيانات. يرجى المحاولة مرة أخرى.</p>
                </div>
            `;
        }
    }

    function showLoading(state) {
        if (loadingState) loadingState.style.display = state ? 'block' : 'none';
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

    // 4. عرض القصص بناءً على التبويب والبحث
    function renderCurrentStories() {
        const rawQuery = searchInput.value.trim();
        searchClear.style.display = rawQuery.length > 0 ? 'block' : 'none';

        const normQuery = normalizeArabic(rawQuery);
        let filteredStories = [];

        if (activeTab === 'prophets') {
            filteredStories = prophetsStories.filter(p => {
                const name = p.name || '';
                const storyParts = (p.story || []).map(s => (s.title || '') + ' ' + (s.description || '')).join(' ');
                return normalizeArabic(name).includes(normQuery) || 
                       normalizeArabic(storyParts).includes(normQuery) ||
                       name.toLowerCase().includes(rawQuery.toLowerCase());
            });
            statsText.textContent = `عرض ${filteredStories.length} من قصص الأنبياء والرسل عليهم السلام`;
        } else if (activeTab === 'sahaba') {
            filteredStories = sahabaStories.filter(story => {
                const header = story.header || '';
                const title = story.title || '';
                return normalizeArabic(header).includes(normQuery) || 
                       normalizeArabic(title).includes(normQuery) ||
                       header.toLowerCase().includes(rawQuery.toLowerCase()) || 
                       title.toLowerCase().includes(rawQuery.toLowerCase());
            });
            statsText.textContent = `عرض ${filteredStories.length} من قصص الصحابة والتابعين رضي الله عنهم`;
        } else if (activeTab === 'islamic') {
            filteredStories = islamicStories.filter(story => {
                const header = story.header || '';
                const title = story.title || '';
                return normalizeArabic(header).includes(normQuery) || 
                       normalizeArabic(title).includes(normQuery) ||
                       header.toLowerCase().includes(rawQuery.toLowerCase()) || 
                       title.toLowerCase().includes(rawQuery.toLowerCase());
            });
            statsText.textContent = `عرض ${filteredStories.length} من أروع القصص والعبر في الإسلام`;
        }

        if (filteredStories.length === 0) {
            storiesGrid.style.display = 'none';
            noResults.style.display = 'block';
            return;
        }

        noResults.style.display = 'none';
        storiesGrid.style.display = 'flex';
        storiesGrid.innerHTML = '';

        filteredStories.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'story-card';

            if (activeTab === 'prophets') {
                const titleText = `قصة نبي الله ${item.name}`;
                const partsCount = (item.story || []).length;
                const previewText = partsCount > 0 ? `${partsCount} فصول مباركة من السيرة الشريفة` : 'القصة الكاملة';

                card.innerHTML = `
                    <div class="story-card-main">
                        <div class="story-icon-box">
                            <i class="fa-solid fa-kaaba"></i>
                        </div>
                        <div class="story-card-info">
                            <h3 class="story-card-title">${escapeHtml(titleText)}</h3>
                            <span class="story-card-subtitle">${escapeHtml(previewText)}</span>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-left story-card-arrow"></i>
                `;

                card.addEventListener('click', () => openProphetStoryModal(item));
            } else if (activeTab === 'sahaba') {
                const titleText = item.header || `قصة صحابي رقم ${item.id}`;
                const previewText = (item.title || '').substring(0, 80).trim() + '...';

                card.innerHTML = `
                    <div class="story-card-main">
                        <div class="story-icon-box">
                            <i class="fa-solid fa-users-gear"></i>
                        </div>
                        <div class="story-card-info">
                            <h3 class="story-card-title">${escapeHtml(titleText)}</h3>
                            <span class="story-card-subtitle">${escapeHtml(previewText)}</span>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-left story-card-arrow"></i>
                `;

                card.addEventListener('click', () => openGenericStoryModal(item, 'من قصص الصحابة والتابعين'));
            } else {
                const titleText = item.header || `قصة رقم ${item.id}`;
                const previewText = (item.title || '').substring(0, 80).trim() + '...';

                card.innerHTML = `
                    <div class="story-card-main">
                        <div class="story-icon-box">
                            <i class="fa-solid fa-book-bookmark"></i>
                        </div>
                        <div class="story-card-info">
                            <h3 class="story-card-title">${escapeHtml(titleText)}</h3>
                            <span class="story-card-subtitle">${escapeHtml(previewText)}</span>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-left story-card-arrow"></i>
                `;

                card.addEventListener('click', () => openGenericStoryModal(item, 'قصص وعبر في الإسلام'));
            }

            storiesGrid.appendChild(card);
        });
    }

    // 5. فتح مودال القصة العامة (الصحابة / الإسلام)
    function openGenericStoryModal(story, categoryLabel) {
        modalCategoryBadge.textContent = categoryLabel;
        modalStoryTitle.textContent = story.header || 'قصة إسلامية';

        const paragraphs = (story.title || '').split('\n').filter(p => p.trim().length > 0);
        let html = '';

        paragraphs.forEach(p => {
            html += `<div class="story-paragraph">${escapeHtml(p)}</div>`;
        });

        modalStoryBody.innerHTML = html;
        currentActiveStoryText = `${story.header}\n\n${story.title}`;

        storyModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        history.pushState({ storyModalOpen: true }, '');
    }

    // 6. فتح مودال قصة نبي
    function openProphetStoryModal(prophet) {
        modalCategoryBadge.textContent = 'من قصص الأنبياء والرسل عليهم السلام';
        modalStoryTitle.textContent = `قصة نبي الله ${prophet.name}`;

        let html = '';
        let fullTextArr = [`قصة نبي الله ${prophet.name}`];

        if (prophet.story && prophet.story.length > 0) {
            prophet.story.forEach(part => {
                if (part.title) {
                    html += `<div class="story-part-title">${escapeHtml(part.title)}</div>`;
                    fullTextArr.push(`\n[${part.title}]`);
                }
                if (part.description) {
                    const paragraphs = part.description.split('\n').filter(p => p.trim().length > 0);
                    paragraphs.forEach(p => {
                        html += `<div class="story-paragraph">${escapeHtml(p)}</div>`;
                        fullTextArr.push(p);
                    });
                }
            });
        }

        modalStoryBody.innerHTML = html;
        currentActiveStoryText = fullTextArr.join('\n\n');

        storyModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        history.pushState({ storyModalOpen: true }, '');
    }

    // إغلاق المودال مع دعم زر الرجوع
    function closeModal(triggerHistoryBack = false) {
        if (!storyModal.classList.contains('active')) return;
        storyModal.classList.remove('active');
        document.body.style.overflow = '';

        if (triggerHistoryBack && history.state && history.state.storyModalOpen) {
            history.back();
        }
    }

    // الاستماع لزر الرجوع في المتصفح أو الجوال
    window.addEventListener('popstate', (e) => {
        if (storyModal && storyModal.classList.contains('active')) {
            closeModal(false);
        }
    });

    // التعامل مع زر الرجوع في الشريط العلوي
    const headerBackBtn = document.getElementById('storyPageHeaderBackBtn');
    if (headerBackBtn) {
        headerBackBtn.addEventListener('click', (e) => {
            if (storyModal && storyModal.classList.contains('active')) {
                e.preventDefault();
                closeModal(true);
            } else if (window.history.length > 1) {
                e.preventDefault();
                window.history.back();
            }
        });
    }

    // التعامل مع زر الرجوع في أجهزة أندرويد عبر Cordova
    document.addEventListener('deviceready', () => {
        document.addEventListener('backbutton', (e) => {
            if (storyModal && storyModal.classList.contains('active')) {
                e.preventDefault();
                e.stopPropagation();
                closeModal(true);
            }
        }, false);
    });

    if (closeStoryModal) closeStoryModal.addEventListener('click', () => closeModal(true));
    if (storyModal) {
        storyModal.addEventListener('click', (e) => {
            if (e.target === storyModal) closeModal(true);
        });
    }

    // نسخ القصة
    if (copyStoryBtn) {
        copyStoryBtn.addEventListener('click', () => {
            if (currentActiveStoryText) {
                navigator.clipboard.writeText(currentActiveStoryText).then(() => {
                    showToast('تم نسخ القصة بنجاح');
                }).catch(() => {
                    showToast('تعذر النسخ تلقائياً');
                });
            }
        });
    }

    // التبديل بين التبويبات الثلاثة
    tabProphets.addEventListener('click', () => {
        if (activeTab === 'prophets') return;
        activeTab = 'prophets';
        updateActiveTabUI();
        renderCurrentStories();
    });

    tabSahaba.addEventListener('click', () => {
        if (activeTab === 'sahaba') return;
        activeTab = 'sahaba';
        updateActiveTabUI();
        renderCurrentStories();
    });

    tabIslamic.addEventListener('click', () => {
        if (activeTab === 'islamic') return;
        activeTab = 'islamic';
        updateActiveTabUI();
        renderCurrentStories();
    });

    function updateActiveTabUI() {
        tabProphets.classList.toggle('active', activeTab === 'prophets');
        tabSahaba.classList.toggle('active', activeTab === 'sahaba');
        tabIslamic.classList.toggle('active', activeTab === 'islamic');
    }

    // البحث
    searchInput.addEventListener('input', renderCurrentStories);
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        renderCurrentStories();
    });
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            renderCurrentStories();
        });
    }

    // التوست
    function showToast(msg) {
        let container = document.getElementById('toastContainer');
        if (!container) return;
        container.innerHTML = '';
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--color-herbal)"></i> <span>${msg}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.25s ease forwards';
            setTimeout(() => toast.remove(), 250);
        }, 2200);
    }

    // دوال مساعدة
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // البدء
    fetchStories();
});
