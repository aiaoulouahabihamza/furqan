const ISLAMCONTENT_BASE_URL = 'https://api3.islamhouse.com/v3/paV29H2gm56kvLPy/main';

function getDownloadProxyUrl(url, title, extension) {
    if (!url) return '#';
    // استخدام الرابط المباشر للملف لضمان عمله في الاستضافات الساكنة كـ Netlify و GitHub Pages وتيرمكس
    return url.replace(/^http:\/\//i, 'https://');
}

document.addEventListener('DOMContentLoaded', () => {
    initView();
});

async function initView() {
    const loadingView = document.getElementById('loadingView');
    const contentBox = document.getElementById('fatwaContentBox');
    
    const urlParams = new URLSearchParams(window.location.search);
    const sourceId = urlParams.get('id');

    // محاولة جلب الفتوى من الـ Session Storage أولاً لسرعة العرض
    const storedFatwaStr = sessionStorage.getItem('current_view_fatwa');
    let fatwa = null;

    if (storedFatwaStr) {
        try {
            const parsed = JSON.parse(storedFatwaStr);
            // تحقق من تطابق الفتوى المخزنة مع المعرّف الموجود في العنوان لضمان عدم عرض بيانات خاطئة أو قديمة
            if (parsed && sourceId && String(parsed.sourceId) === String(sourceId)) {
                fatwa = parsed;
            } else {
                sessionStorage.removeItem('current_view_fatwa');
            }
        } catch (e) {
            console.error(e);
        }
    }

    if (!fatwa && !sourceId) {
        loadingView.innerHTML = '<p style="font-weight:700; color:#EF4444;">لم يتم العثور على الفتوى المطلوبة.</p>';
        return;
    }

    if (fatwa) {
        renderFatwaDetails(fatwa);
        contentBox.style.display = 'block';
        loadingView.style.display = 'none';

        // محاولة جلب المزيد من التفاصيل إذا كانت فتوى API
        if (fatwa.sourceId) {
            fetchExtraDetails(fatwa.sourceId, fatwa);
        }
    } else if (sourceId) {
        // جلب الفتوى من الـ API مباشرة
        fetchAndRenderFromApi(sourceId);
    }
    
    bindViewEvents();
    setupProfessionalAudioPlayer();
}

function renderFatwaDetails(fatwa) {
    const viewTitle = document.getElementById('viewTitle');
    const viewQuestion = document.getElementById('viewQuestion');
    const viewAnswer = document.getElementById('viewAnswer');
    const viewScholar = document.getElementById('viewScholar');

    if (viewTitle) viewTitle.textContent = fatwa.title;
    if (viewQuestion) viewQuestion.innerHTML = fatwa.question || fatwa.title;
    if (viewAnswer) viewAnswer.innerHTML = fatwa.answer;
    if (viewScholar) viewScholar.innerHTML = `<i class="fa-solid fa-landmark"></i> ${fatwa.scholar || 'دار الإفتاء وعلماء الإسلام'}`;

    const evidenceBox = document.getElementById('viewEvidenceBox');
    const evidenceText = document.getElementById('viewEvidenceText');
    if (fatwa.evidence && evidenceBox && evidenceText) {
        evidenceText.textContent = fatwa.evidence;
        evidenceBox.style.display = 'block';
    } else if (evidenceBox) {
        evidenceBox.style.display = 'none';
    }

    const audioBox = document.getElementById('viewAudioBox');
    const audioPlayer = document.getElementById('viewAudioPlayer');
    const audioDownloadBtn = document.getElementById('customAudioDownloadBtn');
    if (audioBox && audioPlayer) {
        if (fatwa.audioUrl) {
            audioPlayer.src = fatwa.audioUrl;
            audioPlayer.load(); // شحن الصوت رسمياً لضمان استعداد المتصفح
            audioBox.style.display = 'block';
            if (audioDownloadBtn) {
                audioDownloadBtn.href = getDownloadProxyUrl(fatwa.audioUrl, fatwa.title, 'mp3');
            }
            resetCustomAudioUI();
        } else {
            audioPlayer.removeAttribute('src');
            audioBox.style.display = 'none';
        }
    }

    const pdfBox = document.getElementById('viewPdfBox');
    const pdfBtn = document.getElementById('viewPdfBtn');
    if (pdfBox && pdfBtn) {
        if (fatwa.pdfUrl) {
            pdfBtn.href = getDownloadProxyUrl(fatwa.pdfUrl, fatwa.title, 'pdf');
            pdfBox.style.display = 'block';
        } else {
            pdfBtn.removeAttribute('href');
            pdfBox.style.display = 'none';
        }
    }


}

async function fetchExtraDetails(sourceId, baseFatwa) {
    try {
        const detailRes = await fetch(`${ISLAMCONTENT_BASE_URL}/get-item/${sourceId}/ar/json`).then(r => r.json()).catch(() => null);
        if (detailRes) {
            if (detailRes.full_description || detailRes.description) {
                const fullAns = detailRes.full_description || detailRes.description;
                const vAns = document.getElementById('viewAnswer');
                if (vAns) vAns.innerHTML = fullAns;
                baseFatwa.answer = fullAns;
            }
            
            const evidenceBox = document.getElementById('viewEvidenceBox');
            const evidenceText = document.getElementById('viewEvidenceText');
            if (detailRes.prepared_by && detailRes.prepared_by[0] && detailRes.prepared_by[0].description) {
                if (evidenceText) evidenceText.textContent = detailRes.prepared_by[0].description;
                if (evidenceBox) evidenceBox.style.display = 'block';
                baseFatwa.evidence = detailRes.prepared_by[0].description;
            }

            const audioBox = document.getElementById('viewAudioBox');
            const audioPlayer = document.getElementById('viewAudioPlayer');
            const audioDownloadBtn = document.getElementById('customAudioDownloadBtn');
            const pdfBox = document.getElementById('viewPdfBox');
            const pdfBtn = document.getElementById('viewPdfBtn');

            if (detailRes.attachments && detailRes.attachments.length > 0) {
                detailRes.attachments.forEach(att => {
                    if (att.url) {
                        const urlLower = att.url.toLowerCase();
                        const extLower = (att.extension_type || '').toLowerCase();
                        
                        if (urlLower.includes('.mp3') || urlLower.includes('.m4a') || extLower === 'mp3') {
                            if (audioBox && audioPlayer && (!baseFatwa.audioUrl || baseFatwa.audioUrl !== att.url)) {
                                audioPlayer.src = att.url;
                                audioPlayer.load();
                                audioBox.style.display = 'block';
                                if (audioDownloadBtn) {
                                    audioDownloadBtn.href = getDownloadProxyUrl(att.url, baseFatwa.title, 'mp3');
                                }
                                baseFatwa.audioUrl = att.url;
                                resetCustomAudioUI();
                            } else if (audioDownloadBtn && att.url) {
                                audioDownloadBtn.href = getDownloadProxyUrl(att.url, baseFatwa.title, 'mp3');
                            }
                        }
                        if (urlLower.includes('.pdf') || extLower === 'pdf') {
                            if (pdfBox && pdfBtn) {
                                pdfBtn.href = getDownloadProxyUrl(att.url, baseFatwa.title, 'pdf');
                                pdfBox.style.display = 'block';
                                baseFatwa.pdfUrl = att.url;
                            }
                        }
                    }
                });
            }
            
            // تحديث السجل المخزن
            sessionStorage.setItem('current_view_fatwa', JSON.stringify(baseFatwa));
        }
    } catch (e) {
        console.warn('Notice loading extra detail for item:', e);
    }
}

async function fetchAndRenderFromApi(sourceId) {
    const loadingView = document.getElementById('loadingView');
    const contentBox = document.getElementById('fatwaContentBox');

    try {
        const detailRes = await fetch(`${ISLAMCONTENT_BASE_URL}/get-item/${sourceId}/ar/json`).then(r => r.json()).catch(() => null);
        if (detailRes) {
            const scholarName = (detailRes.prepared_by && detailRes.prepared_by.length > 0)
                ? detailRes.prepared_by[0].title : 'دار الإفتاء وعلماء الإسلام';
            
            const fullAns = detailRes.full_description || detailRes.description || 'لم يتم العثور على التفاصيل';
            const evidence = (detailRes.prepared_by && detailRes.prepared_by.length > 0)
                ? detailRes.prepared_by[0].description : '';

            let audioUrl = '';
            let pdfUrl = '';
            if (detailRes.attachments && detailRes.attachments.length > 0) {
                detailRes.attachments.forEach(att => {
                    if (att.url) {
                        const urlLower = att.url.toLowerCase();
                        const extLower = (att.extension_type || '').toLowerCase();
                        if (urlLower.includes('.mp3') || urlLower.includes('.m4a') || extLower === 'mp3') audioUrl = att.url;
                        if (urlLower.includes('.pdf') || extLower === 'pdf') pdfUrl = att.url;
                    }
                });
            }

            const fatwaObj = {
                title: detailRes.title || 'فتوى شرعية',
                question: detailRes.title,
                answer: fullAns,
                scholar: scholarName,
                evidence: evidence,
                audioUrl: audioUrl,
                pdfUrl: pdfUrl,
                sourceId: sourceId
            };

            renderFatwaDetails(fatwaObj);
            sessionStorage.setItem('current_view_fatwa', JSON.stringify(fatwaObj));
            
            loadingView.style.display = 'none';
            contentBox.style.display = 'block';
        } else {
            loadingView.innerHTML = '<p style="font-weight:700; color:#EF4444;">تعذر جلب بيانات الفتوى من المصدر.</p>';
        }
    } catch (e) {
        console.error(e);
        loadingView.innerHTML = '<p style="font-weight:700; color:#EF4444;">حدث خطأ أثناء الاتصال بالمصدر.</p>';
    }
}

function bindViewEvents() {
    document.getElementById('viewShareBtn')?.addEventListener('click', () => {
        const fStr = sessionStorage.getItem('current_view_fatwa');
        if (!fStr) return;
        const f = JSON.parse(fStr);
        
        const plainTextAnswer = cleanTextExcerpt(f.answer);
        const text = `فتوى من منصة الفرقان:\nالسؤال: ${f.title}\n\nالجواب: ${plainTextAnswer}\n\nالرابط: ${window.location.href}`;
        
        if (navigator.share) {
            navigator.share({ title: f.title, text: text, url: window.location.href });
        } else {
            copyToClipboard(text);
            if (window.FurqanToast) window.FurqanToast.success('تم نسخ نص الفتوى للحافظة بنجاح');
            else alert('تم نسخ الفتوى للمشاركة');
        }
    });

    document.getElementById('viewCopyBtn')?.addEventListener('click', () => {
        const fStr = sessionStorage.getItem('current_view_fatwa');
        if (!fStr) return;
        const f = JSON.parse(fStr);
        
        const plainTextAnswer = cleanTextExcerpt(f.answer);
        const text = `${f.title}\n\nالسؤال: ${f.question || f.title}\n\nالجواب: ${plainTextAnswer}\n\nالمصدر: ${f.scholar || 'دار الإفتاء'}`;
        
        copyToClipboard(text);
        if (window.FurqanToast) window.FurqanToast.success('تم نسخ الفتوى بالكامل للمستند');
        else alert('تم نسخ الفتوى بنجاح');
    });

    // تفعيل التنزيل وحفظ الملفات في مجلد الفرقان
    ['customAudioDownloadBtn', 'viewPdfBtn'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            e.preventDefault();
            const el = e.currentTarget;
            const href = el.getAttribute('href');
            const isPdf = id === 'viewPdfBtn';
            const fStr = sessionStorage.getItem('current_view_fatwa');
            let f = null;
            let filename = isPdf ? 'فتوى_شرعية.pdf' : 'فتوى_صوتية.mp3';
            if (fStr) {
                try {
                    f = JSON.parse(fStr);
                    filename = (f.title || 'فتوى') + (isPdf ? '.pdf' : '.mp3');
                } catch(err) {}
            }

            if (href && href !== '#' && !href.startsWith('javascript:')) {
                if (window.Fur9anBridge && typeof window.Fur9anBridge.downloadFile === 'function') {
                    window.Fur9anBridge.downloadFile(href, filename, 'الفرقان');
                } else if (window.downloadFur9anFile) {
                    window.downloadFur9anFile(href, filename);
                } else {
                    const proxyUrl = `/api/download-file?url=${encodeURIComponent(href)}&filename=${encodeURIComponent('الفرقان - ' + filename)}`;
                    const link = document.createElement('a');
                    link.href = proxyUrl;
                    link.setAttribute('download', 'الفرقان - ' + filename);
                    link.setAttribute('target', '_blank');
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(() => { if (document.body.contains(link)) document.body.removeChild(link); }, 3000);
                }
            } else if (isPdf && f) {
                // توليد ملف نصي منسق إذا لم يتوفر ملف PDF خارجي من المصدر
                const plainAns = cleanTextExcerpt(f.answer);
                const docContent = `بسم الله الرحمن الرحيم\nتطبيق الفرقان - قسم الفتاوى الشرعية\n\nالعنوان: ${f.title}\nالمفتي/الجهة: ${f.scholar || 'دار الإفتاء'}\n\nالسؤال:\n${cleanTextExcerpt(f.question || f.title)}\n\nالجواب والفتوى:\n${plainAns}\n\n${f.evidence ? 'الأدلة والبيان:\n' + cleanTextExcerpt(f.evidence) + '\n\n' : ''}تم التصدير من تطبيق الفرقان`;
                const blob = new Blob([docContent], { type: 'text/plain;charset=utf-8' });
                if (window.Fur9anBridge && typeof window.Fur9anBridge.downloadFile === 'function') {
                    window.Fur9anBridge.downloadFile(blob, (f.title || 'فتوى') + '.txt', 'الفرقان');
                } else {
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = `الفرقان - ${(f.title || 'فتوى')}.txt`;
                    link.setAttribute('target', '_blank');
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(() => {
                        if (document.body.contains(link)) document.body.removeChild(link);
                        URL.revokeObjectURL(blobUrl);
                    }, 3000);
                }
            }
        });
    });
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }
}

function cleanTextExcerpt(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.innerHTML = str;
    const text = temp.textContent || temp.innerText || '';
    return text.trim();
}

/* ================================================================
   التحكم في المشغل الصوتي الاحترافي المخصص
   ================================================================ */
function setupProfessionalAudioPlayer() {
    const audio = document.getElementById('viewAudioPlayer');
    const playPauseBtn = document.getElementById('customAudioPlayPauseBtn');
    const seekSlider = document.getElementById('customAudioSeekSlider');
    const currentTimeText = document.getElementById('customAudioCurrentTime');
    const durationText = document.getElementById('customAudioDuration');
    const muteBtn = document.getElementById('customAudioMuteBtn');
    const volumeSlider = document.getElementById('customAudioVolumeSlider');
    const audioWaveVisualizer = document.getElementById('audioWaveVisualizer');
    const audioLiveStatus = document.getElementById('audioLiveStatus');

    if (!audio || !playPauseBtn) return;

    // تتبع حالة التحميل وبدء جلب المقطع
    audio.addEventListener('loadstart', () => {
        if (audioLiveStatus) audioLiveStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color: #3A9B99;"></i> جاري التحميل...';
        playPauseBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    });

    // عندما يصبح المقطع جاهزاً للاستماع
    audio.addEventListener('canplay', () => {
        if (audioLiveStatus && audio.paused) {
            audioLiveStatus.innerHTML = '<i class="fa-solid fa-circle" style="color: #3A9B99;"></i> جاهز للاستماع';
        }
        if (audio.paused) {
            playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        }
        if (durationText && audio.duration) {
            durationText.textContent = formatTime(audio.duration);
        }
    });

    // حالة انتظار التنزيل (Buffering)
    audio.addEventListener('waiting', () => {
        if (audioLiveStatus) audioLiveStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color: #D8B887;"></i> جاري الاستدعاء...';
        playPauseBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    });

    // بدء البث والتشغيل الفعلي
    audio.addEventListener('playing', () => {
        if (audioLiveStatus) audioLiveStatus.innerHTML = '<i class="fa-solid fa-circle" style="color: #2F7E7C;"></i> قيد التشغيل';
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        if (audioWaveVisualizer) audioWaveVisualizer.style.display = 'inline-flex';
    });

    // تشغيل / إيقاف مؤقت عند النقر على الزر الرئيسي
    playPauseBtn.addEventListener('click', () => {
        if (audio.paused) {
            if (!audio.src || audio.src === '' || audio.src === window.location.href) {
                if (currentFatwaData && currentFatwaData.audioUrl) {
                    audio.src = currentFatwaData.audioUrl;
                    audio.load();
                } else {
                    if (window.FurqanToast) window.FurqanToast.warning('عذراً، لا يتوفر ملف صوتي لهذه الفتوى');
                    return;
                }
            }

            audio.play().catch(err => {
                if (err.name === 'AbortError') return;
                
                // تجربة البروكسي الداخلي فوراً في حال منع المصدر التشغيل المباشر
                if (!audio.dataset.proxyTried && currentFatwaData && currentFatwaData.audioUrl) {
                    audio.dataset.proxyTried = 'true';
                    audio.src = `/api/proxy-audio?url=${encodeURIComponent(currentFatwaData.audioUrl)}`;
                    audio.load();
                    audio.play().then(() => {
                        if (audioLiveStatus) audioLiveStatus.innerHTML = '<i class="fa-solid fa-circle" style="color: #2F7E7C;"></i> قيد التشغيل';
                        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                        if (audioWaveVisualizer) audioWaveVisualizer.style.display = 'inline-flex';
                    }).catch(() => {
                        if (audioLiveStatus) audioLiveStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #EF4444;"></i> فشل الاتصال بالمصدر';
                        playPauseBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i>';
                        if (window.FurqanToast) window.FurqanToast.error('فشل في تشغيل الملف الصوتي من المصدر');
                    });
                } else {
                    if (audioLiveStatus) audioLiveStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #EF4444;"></i> فشل الاتصال بالمصدر';
                    playPauseBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i>';
                    if (window.FurqanToast) window.FurqanToast.error('فشل في تشغيل الملف الصوتي من المصدر');
                }
            });
        } else {
            audio.pause();
        }
    });

    audio.addEventListener('play', () => {
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        if (audioWaveVisualizer) audioWaveVisualizer.style.display = 'inline-flex';
        if (audioLiveStatus) audioLiveStatus.innerHTML = '<i class="fa-solid fa-circle" style="color: #2F7E7C;"></i> قيد التشغيل';
    });

    audio.addEventListener('pause', () => {
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        if (audioWaveVisualizer) audioWaveVisualizer.style.display = 'none';
        if (audioLiveStatus) audioLiveStatus.innerHTML = '<i class="fa-solid fa-circle" style="color: #D8B887;"></i> متوقف مؤقتاً';
    });

    // تحديث الوقت والشريط الزمني تلقائياً
    audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        const current = audio.currentTime;
        const duration = audio.duration;
        const pct = (current / duration) * 100;

        if (seekSlider) seekSlider.value = pct;
        if (currentTimeText) currentTimeText.textContent = formatTime(current);
    });

    audio.addEventListener('loadedmetadata', () => {
        if (durationText) durationText.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('ended', () => {
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        if (seekSlider) seekSlider.value = 0;
        if (currentTimeText) currentTimeText.textContent = '00:00';
        if (audioWaveVisualizer) audioWaveVisualizer.style.display = 'none';
        if (audioLiveStatus) audioLiveStatus.innerHTML = '<i class="fa-solid fa-circle" style="color: #3A9B99;"></i> اكتمل الاستماع';
    });

    audio.addEventListener('error', () => {
        if (audioLiveStatus) audioLiveStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #EF4444;"></i> الملف الصوتي غير متاح';
        playPauseBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
        if (audioWaveVisualizer) audioWaveVisualizer.style.display = 'none';
    });

    // سحب شريط التقدم والتنقل البرمجي الفوري
    if (seekSlider) {
        seekSlider.addEventListener('input', () => {
            if (!audio.duration) return;
            const pct = parseFloat(seekSlider.value);
            audio.currentTime = (pct / 100) * audio.duration;
        });
    }

    // كتم الصوت وإلغاء الكتم
    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            audio.muted = !audio.muted;
            if (audio.muted) {
                muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
                if (volumeSlider) volumeSlider.value = 0;
            } else {
                muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                if (volumeSlider) volumeSlider.value = audio.volume;
            }
        });
    }

    // تغيير مستوى الصوت التفاعلي
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            audio.volume = val;
            audio.muted = (val === 0);
            if (audio.muted) {
                muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
            } else {
                muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
            }
        });
    }
}

function resetCustomAudioUI() {
    const playPauseBtn = document.getElementById('customAudioPlayPauseBtn');
    const seekSlider = document.getElementById('customAudioSeekSlider');
    const currentTimeText = document.getElementById('customAudioCurrentTime');
    const durationText = document.getElementById('customAudioDuration');
    const audioWaveVisualizer = document.getElementById('audioWaveVisualizer');
    const audioLiveStatus = document.getElementById('audioLiveStatus');

    if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    if (seekSlider) seekSlider.value = 0;
    if (currentTimeText) currentTimeText.textContent = '00:00';
    if (durationText) durationText.textContent = '00:00';
    if (audioWaveVisualizer) audioWaveVisualizer.style.display = 'none';
    if (audioLiveStatus) audioLiveStatus.innerHTML = '<i class="fa-solid fa-circle" style="color: #3A9B99;"></i> جاهز للاستماع';
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
