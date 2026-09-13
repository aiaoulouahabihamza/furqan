const ISLAMCONTENT_BASE_URL = 'https://api3.islamhouse.com/v3/paV29H2gm56kvLPy/main';

let libraryState = {
    books: [],
    filteredBooks: [],
    loading: true,
    currentPage: 1,
    itemsPerPage: 24,
    totalCount: 0,
    searchQuery: '',
    selectedBook: null
};

document.addEventListener('DOMContentLoaded', () => {
    initLibrary();
});

function initLibrary() {
    bindEvents();
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    if (searchParam) {
        libraryState.searchQuery = searchParam;
        const searchInput = document.getElementById('bookSearchInput');
        if (searchInput) searchInput.value = searchParam;
    }
    fetchBooks(1);
}

function getDownloadProxyUrl(url, title, extension) {
    if (!url) return '#';
    const cleanTitle = (title || 'file').replace(/[\s\/\\?%*:|"<>]/g, '_');
    return `/api/download-file?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(cleanTitle)}.${extension}`;
}

async function fetchBooks(page) {
    libraryState.loading = true;
    renderBooks();
    
    try {
        const res = await fetch(`${ISLAMCONTENT_BASE_URL}/books/ar/ar/${page}/${libraryState.itemsPerPage}/json`)
            .then(r => r.json())
            .catch(() => null);

        if (res && Array.isArray(res.data)) {
            libraryState.books = processApiData(res.data);
            libraryState.filteredBooks = [...libraryState.books];
            
            // تحديث العدد الإجمالي
            if (res.links && res.links.total_items) {
                libraryState.totalCount = res.links.total_items;
            } else {
                libraryState.totalCount = libraryState.books.length;
            }
            
            document.getElementById('booksTotalBadge').textContent = `${libraryState.totalCount} كتاب`;
            libraryState.loading = false;
            
            renderBooks();
            renderPagination(res.links);
        } else {
            showErrorState('فشل استدعاء الكتب من المصدر.');
        }
    } catch (err) {
        console.error('Error fetching books:', err);
        showErrorState('حدث خطأ أثناء الاتصال بمزود الخدمة.');
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
        const author = (item.prepared_by && item.prepared_by.length > 0)
            ? item.prepared_by[0].title
            : 'مؤلف غير معروف';

        let pdfUrl = '';
        if (item.attachments && item.attachments.length > 0) {
            const pdfAttachment = item.attachments.find(att => 
                att.url && (att.url.toLowerCase().endsWith('.pdf') || (att.extension_type || '').toLowerCase() === 'pdf')
            );
            if (pdfAttachment) pdfUrl = pdfAttachment.url;
            else pdfUrl = item.attachments[0].url; // fallback to first attachment
        }

        return {
            id: item.id,
            title: item.title,
            author: author,
            description: cleanTextExcerpt(item.full_description || item.description || 'كتاب إسلامي قيم يتناول موضوعات الشريعة والدعوة الموثوقة.'),
            pdfUrl: pdfUrl,
            importance: item.importance_level || 'عام',
            image: item.image
        };
    });
}

function renderBooks() {
    const container = document.getElementById('booksContainer');
    if (!container) return;

    if (libraryState.loading) {
        container.innerHTML = `
            <div class="skeleton-wrapper">
                <div class="skeleton-card"><div class="skeleton-cover"></div><div class="skeleton-line" style="width: 70%;"></div><div class="skeleton-line" style="width: 40%;"></div><div class="skeleton-text"></div><div class="skeleton-btns"><div class="skeleton-btn"></div><div class="skeleton-btn"></div></div></div>
                <div class="skeleton-card"><div class="skeleton-cover"></div><div class="skeleton-line" style="width: 70%;"></div><div class="skeleton-line" style="width: 40%;"></div><div class="skeleton-text"></div><div class="skeleton-btns"><div class="skeleton-btn"></div><div class="skeleton-btn"></div></div></div>
                <div class="skeleton-card"><div class="skeleton-cover"></div><div class="skeleton-line" style="width: 70%;"></div><div class="skeleton-line" style="width: 40%;"></div><div class="skeleton-text"></div><div class="skeleton-btns"><div class="skeleton-btn"></div><div class="skeleton-btn"></div></div></div>
            </div>
        `;
        return;
    }

    const query = libraryState.searchQuery.trim().toLowerCase();
    const booksToShow = libraryState.filteredBooks.filter(book => 
        book.title.toLowerCase().includes(query) || 
        book.author.toLowerCase().includes(query) || 
        book.description.toLowerCase().includes(query)
    );

    if (booksToShow.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #718096; grid-column: 1 / -1;">
                <i class="fa-solid fa-book-open-reader" style="font-size: 50px; color: #3A9B99; opacity: 0.5; margin-bottom: 16px;"></i>
                <p style="font-weight: 700;">لا توجد كتب مطابقة لخيارات البحث حالياً.</p>
            </div>
        `;
        return;
    }

    let html = '<div class="books-grid">';
    booksToShow.forEach(book => {
        let coverHtml = '';
        if (book.image) {
            coverHtml = `
                <img src="${book.image}" class="book-cover-img" alt="${book.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div class="book-cover-fallback" style="background: ${getRandomGradient(book.title)}">
                    <span class="book-cover-fallback-title">${book.title}</span>
                </div>
            `;
        } else {
            coverHtml = `
                <div class="book-cover-fallback" style="background: ${getRandomGradient(book.title)}">
                    <span class="book-cover-fallback-title">${book.title}</span>
                </div>
            `;
        }

        html += `
            <div class="book-card" data-id="${book.id}">
                <div class="book-cover">
                    <span class="book-badge"><i class="fa-solid fa-bookmark"></i> ${book.importance}</span>
                    ${coverHtml}
                </div>
                <div class="book-info">
                    <h4 class="book-title" title="${book.title}">${book.title}</h4>
                    <div class="book-author">
                        <i class="fa-solid fa-pen-nib"></i>
                        <span>${book.author}</span>
                    </div>
                    <p class="book-desc">${book.description}</p>
                    <div class="book-actions">
                        <button class="btn-book btn-book-download" data-action="download" data-id="${book.id}" style="width: 100%;">
                            <i class="fa-solid fa-download"></i> تحميل هذا الكتاب (PDF)
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
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

    const current = libraryState.currentPage;

    // زر السابق
    if (current > 1) {
        html += `<button class="btn-page btn-page-nav" data-page="${current - 1}"><i class="fa-solid fa-chevron-right"></i> السابق</button>`;
    }

    // صفحات مرقمة حول الصفحة الحالية بمدى ذكي وممتد
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
    // مربع البحث الديناميكي
    const searchInput = document.getElementById('bookSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            libraryState.searchQuery = e.target.value;
            renderBooks();
        });
    }

    // النقر على أزرار الكتب في الشبكة
    const container = document.getElementById('booksContainer');
    if (container) {
        container.addEventListener('click', (e) => {
            const targetBtn = e.target.closest('button[data-action]');
            if (!targetBtn) {
                // إذا نقر على الكرت في مكان آخر، افتح التفاصيل في مودال
                const card = e.target.closest('.book-card');
                if (card) {
                    const id = card.dataset.id;
                    openBookDetails(id);
                }
                return;
            }

            e.stopPropagation();
            const action = targetBtn.dataset.action;
            const bookId = targetBtn.dataset.id;
            const book = libraryState.books.find(b => b.id == bookId);

            if (!book) return;

            if (action === 'download') {
                triggerBookDownload(book);
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
                libraryState.currentPage = targetPage;
                fetchBooks(targetPage);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    // إغلاق المودال
    const modalClose = document.getElementById('bookModalCloseBtn');
    const modal = document.getElementById('bookDetailModal');
    if (modalClose && modal) {
        modalClose.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }

    // تفعيل أزرار المودال الداخلي
    const modalDownloadBtn = document.getElementById('modalDownloadBtn');

    if (modalDownloadBtn) {
        modalDownloadBtn.addEventListener('click', () => {
            if (libraryState.selectedBook) {
                triggerBookDownload(libraryState.selectedBook);
            }
        });
    }
}

function openBookDetails(id) {
    const book = libraryState.books.find(b => b.id == id);
    if (!book) return;

    libraryState.selectedBook = book;

    const modal = document.getElementById('bookDetailModal');
    const titleEl = document.getElementById('modalBookTitle');
    const authorEl = document.getElementById('modalBookAuthor');
    const descEl = document.getElementById('modalBookDesc');

    if (titleEl) titleEl.textContent = book.title;
    if (authorEl) authorEl.innerHTML = `<i class="fa-solid fa-pen-nib"></i> المؤلف: ${book.author}`;
    if (descEl) descEl.textContent = book.description;

    if (modal) modal.style.display = 'flex';
}

function triggerBookDownload(book) {
    if (!book.pdfUrl) {
        if (window.FurqanToast) window.FurqanToast.error('تعذر العثور على رابط التحميل لهذا الكتاب.');
        return;
    }

    if (window.downloadFur9anFile) {
        window.downloadFur9anFile(book.pdfUrl, `${book.title}.pdf`);
    } else {
        if (window.FurqanToast) window.FurqanToast.success(`جاري بدء تنزيل كتاب: ${book.title}...`);
        const cleanFilename = (book.title || 'book').replace(/[\/\\?%*:|"<>\s]+/g, '_') + '.pdf';
        const downloadUrl = `/api/download-file?url=${encodeURIComponent(book.pdfUrl)}&filename=${encodeURIComponent('الفرقان - ' + cleanFilename)}`;
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `الفرقان - ${cleanFilename}`);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            if (link.parentNode) link.parentNode.removeChild(link);
        }, 1500);
    }
}

function cleanTextExcerpt(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.innerHTML = str;
    const text = temp.textContent || temp.innerText || '';
    return text.trim();
}

function showErrorState(msg) {
    const container = document.getElementById('booksContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #EF4444; grid-column: 1 / -1;">
                <i class="fa-solid fa-circle-exclamation" style="font-size: 50px; margin-bottom: 16px;"></i>
                <p style="font-weight: 700;">${msg}</p>
                <button onclick="window.location.reload();" class="btn-book btn-book-download" style="margin-top: 12px; padding: 8px 16px;">إعادة المحاولة</button>
            </div>
        `;
    }
}
