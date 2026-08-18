document.addEventListener('DOMContentLoaded', () => {
    // 1. كتالوج التسابيح والأذكار الافتراضية المنسقة
    const defaultCatalog = [
        { id: '1', text: 'سبحان الله', target: 33, rounds: 0, count: 0, isDefault: true },
        { id: '2', text: 'الحمد لله', target: 33, rounds: 0, count: 0, isDefault: true },
        { id: '3', text: 'لا إله إلا الله', target: 99, rounds: 0, count: 0, isDefault: true },
        { id: '4', text: 'الله أكبر', target: 33, rounds: 0, count: 0, isDefault: true },
        { id: '5', text: 'أستغفر الله العظيم', target: 100, rounds: 0, count: 0, isDefault: true },
        { id: '6', text: 'اللهم صلِّ وسلِّم على نبينا محمد', target: 100, rounds: 0, count: 0, isDefault: true },
        { id: '7', text: 'لا حول ولا قوة إلا بالله', target: 100, rounds: 0, count: 0, isDefault: true }
    ];

    // استعادة الكتالوج المخصص أو تهيئته
    let catalog = JSON.parse(localStorage.getItem('tasbeehDhikrCatalog'));
    if (!catalog || catalog.length === 0) {
        catalog = defaultCatalog;
        localStorage.setItem('tasbeehDhikrCatalog', JSON.stringify(catalog));
    }

    // استعادة الذكر النشط الحالي
    let activeId = localStorage.getItem('activeDhikrId') || '1';
    let activeDhikr = catalog.find(x => x.id === activeId);
    if (!activeDhikr) {
        activeDhikr = catalog[0];
        activeId = activeDhikr.id;
        localStorage.setItem('activeDhikrId', activeId);
    }

    // استعادة خيار التفاعل المفضل (الصوت والاهتزاز)
    // الخيارات المتوفرة: 'all' (صوت واهتزاز)، 'vibrate' (اهتزاز فقط)، 'mute' (صامت كلياً)
    let feedbackMode = localStorage.getItem('tasbeehFeedbackMode') || 'all';

    // عناصر واجهة المستخدم
    const masbahatiClicker = document.getElementById('masbahatiClicker');
    const progressRingFill = document.getElementById('progressRingFill');
    const countDisplay = document.getElementById('tasbeehCountDisplay');
    const phraseDisplayText = document.getElementById('tasbeehPhraseDisplayText');
    const roundsDisplay = document.getElementById('tasbeehRounds');
    const targetDisplay = document.getElementById('tasbeehTargetDisplay');
    
    // أزرار التحكم
    const resetBtn = document.getElementById('tasbeehResetBtn');
    const cycleTargetBtn = document.getElementById('cycleTargetBtn');
    const toggleFeedbackBtn = document.getElementById('toggleFeedbackBtn');
    const feedbackIcon = document.getElementById('feedbackIcon');
    const feedbackLabel = document.getElementById('feedbackLabel');

    // نموذج الإضافة والكتالوج
    const toggleAddFormBtn = document.getElementById('toggleAddFormBtn');
    const addDhikrForm = document.getElementById('addDhikrForm');
    const btnSubmitDhikr = document.getElementById('btnSubmitDhikr');
    const newDhikrText = document.getElementById('newDhikrText');
    const newDhikrTarget = document.getElementById('newDhikrTarget');
    const dhikrCatalogList = document.getElementById('dhikrCatalogList');

    // مودال التأكيد
    const resetModal = document.getElementById('tasbeehResetModal');
    const confirmResetBtn = document.getElementById('confirmResetBtn');
    const cancelResetBtn = document.getElementById('cancelResetBtn');

    // 2. حساب محيط حلقة التقدم الدائرية (Circumference)
    // نصف القطر r = 110 -> المحيط C = 2 * pi * r = 2 * 3.14159 * 110 = 691.15
    const circumference = 691.15;
    if (progressRingFill) {
        progressRingFill.style.strokeDasharray = `${circumference} ${circumference}`;
        progressRingFill.style.strokeDashoffset = circumference;
    }

    // 3. التوليف الصوتي الفوري (Synthesized Web Audio API)
    function playClickSound() {
        if (feedbackMode === 'mute') return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(580, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.07);
            
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.07);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.07);
        } catch (e) {
            console.log("AudioContext is blocked or not supported on this device");
        }
    }

    function playTargetChime() {
        if (feedbackMode === 'mute') return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
            
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        } catch (e) {
            console.log("AudioContext chime failed");
        }
    }

    // تشغيل الاهتزاز التفاعلي بناء على خيار التفاعل المفضل
    function triggerVibration(ms) {
        if (feedbackMode === 'mute') return;
        if (window.Fur9anBridge) {
            try {
                if (Array.isArray(ms)) {
                    window.Fur9anBridge.vibratePattern(JSON.stringify(ms));
                } else {
                    window.Fur9anBridge.vibrate(ms);
                }
                return;
            } catch (e) {}
        }
        if (navigator.vibrate) {
            navigator.vibrate(ms);
        }
    }

    // 4. تحديث مؤشر التفاعل البصري وأيقونة الصوت
    function updateFeedbackUI() {
        if (!feedbackIcon || !feedbackLabel) return;
        
        if (feedbackMode === 'all') {
            feedbackIcon.className = 'fa-solid fa-volume-high';
            feedbackLabel.textContent = 'صوت + اهتزاز';
            toggleFeedbackBtn.classList.add('active-state');
        } else if (feedbackMode === 'vibrate') {
            feedbackIcon.className = 'fa-solid fa-mobile-screen-button';
            feedbackLabel.textContent = 'اهتزاز فقط';
            toggleFeedbackBtn.classList.add('active-state');
        } else {
            feedbackIcon.className = 'fa-solid fa-volume-xmark';
            feedbackLabel.textContent = 'صامت';
            toggleFeedbackBtn.classList.remove('active-state');
        }
    }

    // تغيير وضع التفاعل عند النقر
    if (toggleFeedbackBtn) {
        toggleFeedbackBtn.addEventListener('click', () => {
            if (feedbackMode === 'all') {
                feedbackMode = 'vibrate';
            } else if (feedbackMode === 'vibrate') {
                feedbackMode = 'mute';
            } else {
                feedbackMode = 'all';
            }
            localStorage.setItem('tasbeehFeedbackMode', feedbackMode);
            updateFeedbackUI();
            
            // اهتزاز ترويجي خفيف لتأكيد التغيير
            triggerVibration(40);
        });
    }

    // 5. دوران وتعبئة الحلقة الدائرية التقدمية
    function setProgress(percent) {
        if (!progressRingFill) return;
        const offset = circumference - (percent / 100 * circumference);
        progressRingFill.style.strokeDashoffset = offset;
    }

    // 6. تحديث شاشات العرض للواجهة بالكامل
    function updateTasbeehUI() {
        if (!activeDhikr) return;

        // تحديث الرقم المركزي ونص الذكر الحالي
        countDisplay.textContent = activeDhikr.count;
        phraseDisplayText.textContent = activeDhikr.text;
        roundsDisplay.textContent = activeDhikr.rounds;

        // تحديث الهدف المعين
        const target = activeDhikr.target;
        if (target === 0) {
            targetDisplay.textContent = 'الهدف: مفتوح';
            setProgress(100); // حلقة كاملة دائمًا في حالة الهدف المفتوح
        } else {
            targetDisplay.textContent = `الهدف: ${target}`;
            const percentage = Math.min(100, (activeDhikr.count / target) * 100);
            setProgress(percentage);
        }
    }

    // 7. نقرة التسبيح التفاعلية للعداد الدائري العملاق (Tap Action)
    function handleTasbeehTap() {
        if (!activeDhikr) return;

        activeDhikr.count++;

        const target = activeDhikr.target;
        if (target > 0 && activeDhikr.count >= target) {
            // إتمام الدورة الكاملة
            activeDhikr.count = 0;
            activeDhikr.rounds++;
            
            triggerVibration([120, 80, 120]); // اهتزاز اهتزازي مزدوج مبهج لإتمام الدورة
            playTargetChime();
        } else {
            // تسبيحة فردية عادية
            triggerVibration(30); // اهتزاز ناعم وقصير جداً لمحاكاة نقرات الخرز الطبيعية
            playClickSound();
        }

        // حفظ الحالة والكتالوج
        localStorage.setItem('tasbeehDhikrCatalog', JSON.stringify(catalog));
        updateTasbeehUI();
        renderDhikrCatalog(); // لتحديث تفاصيل الأعداد الفورية في كتالوج الأذكار السفلي
    }

    if (masbahatiClicker) {
        masbahatiClicker.addEventListener('click', (e) => {
            e.preventDefault();
            handleTasbeehTap();
        });
    }

    // 8. ميزة تبديل وتعديل الهدف السريع بلمسة زر (33 -> 100 -> مفتوح)
    if (cycleTargetBtn) {
        cycleTargetBtn.addEventListener('click', () => {
            if (!activeDhikr) return;

            let currentTarget = activeDhikr.target;
            if (currentTarget === 33) {
                activeDhikr.target = 100;
            } else if (currentTarget === 100) {
                activeDhikr.target = 0; // هدف مفتوح
            } else {
                activeDhikr.target = 33;
            }

            // إعادة ضبط العد لتجنب التعارض مع الهدف الجديد المختار
            if (activeDhikr.target > 0 && activeDhikr.count >= activeDhikr.target) {
                activeDhikr.count = 0;
            }

            localStorage.setItem('tasbeehDhikrCatalog', JSON.stringify(catalog));
            updateTasbeehUI();
            renderDhikrCatalog();
            triggerVibration(45);
        });
    }

    // 9. تصفير العداد وتأكيد التصفير عبر نافذة تأكيد مصقولة
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (resetModal) {
                resetModal.classList.add('active');
            } else {
                performReset();
            }
        });
    }

    if (confirmResetBtn) {
        confirmResetBtn.addEventListener('click', () => {
            performReset();
            if (resetModal) resetModal.classList.remove('active');
        });
    }

    if (cancelResetBtn) {
        cancelResetBtn.addEventListener('click', () => {
            if (resetModal) resetModal.classList.remove('active');
        });
    }

    if (resetModal) {
        resetModal.addEventListener('click', (e) => {
            if (e.target === resetModal) resetModal.classList.remove('active');
        });
    }

    function performReset() {
        if (!activeDhikr) return;
        activeDhikr.count = 0;
        activeDhikr.rounds = 0;

        localStorage.setItem('tasbeehDhikrCatalog', JSON.stringify(catalog));
        updateTasbeehUI();
        renderDhikrCatalog();
        triggerVibration(80);
    }

    // 10. بناء ورسم كتالوج الأذكار والتسابيح التفاعلي السفلي
    function renderDhikrCatalog() {
        if (!dhikrCatalogList) return;

        let html = '';
        catalog.forEach(item => {
            const isActive = item.id === activeId;
            html += `
                <div class="dhikr-card-item ${isActive ? 'active' : ''}" data-id="${item.id}">
                    <div class="dhikr-card-details">
                        <span class="dhikr-card-title">${item.text}</span>
                        <span class="dhikr-card-goal">
                            ${item.target > 0 ? `الهدف الحالي: ${item.target}` : 'الهدف: مفتوح'} 
                            ${item.count > 0 ? ` | التكرار الحالي: ${item.count}` : ''}
                        </span>
                    </div>
                    <div class="dhikr-card-actions">
                        <span class="dhikr-card-rounds-badge">${item.rounds} دورة</span>
                        ${!item.isDefault ? `
                            <button class="delete-custom-dhikr-btn" data-id="${item.id}" title="حذف الذكر">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        dhikrCatalogList.innerHTML = html;

        // ربط تفعيل الأذكار عند النقر
        const items = dhikrCatalogList.querySelectorAll('.dhikr-card-item');
        items.forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.delete-custom-dhikr-btn')) return; // لمنع تشغيل الاختيار عند الرغبة بالحذف

                activeId = el.dataset.id;
                localStorage.setItem('activeDhikrId', activeId);
                activeDhikr = catalog.find(x => x.id === activeId);

                items.forEach(i => i.classList.remove('active'));
                el.classList.add('active');

                updateTasbeehUI();
                playClickSound();
                triggerVibration(30);
            });
        });

        // ربط وظيفة الحذف للأذكار المخصصة المضافة
        const deleteBtns = dhikrCatalogList.querySelectorAll('.delete-custom-dhikr-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const deleteId = btn.dataset.id;

                if (confirm('هل تريد حذف هذا الذكر المخصص نهائياً من قائمتك؟')) {
                    catalog = catalog.filter(x => x.id !== deleteId);
                    localStorage.setItem('tasbeehDhikrCatalog', JSON.stringify(catalog));

                    if (activeId === deleteId) {
                        activeId = '1';
                        localStorage.setItem('activeDhikrId', activeId);
                        activeDhikr = catalog.find(x => x.id === activeId);
                    }

                    renderDhikrCatalog();
                    updateTasbeehUI();
                    triggerVibration(50);
                }
            });
        });
    }

    // 11. نموذج إضافة ذكر مخصص جديد منزلق
    if (toggleAddFormBtn) {
        toggleAddFormBtn.addEventListener('click', () => {
            addDhikrForm.classList.toggle('open');
            toggleAddFormBtn.classList.toggle('active-state');
            
            toggleAddFormBtn.innerHTML = addDhikrForm.classList.contains('open') 
                ? '<i class="fa-solid fa-xmark"></i> <span>إغلاق</span>' 
                : '<i class="fa-solid fa-plus"></i> <span>إضافة ذكر</span>';
        });
    }

    if (btnSubmitDhikr) {
        btnSubmitDhikr.addEventListener('click', () => {
            const text = newDhikrText.value.trim();
            const targetVal = parseInt(newDhikrTarget.value, 10);

            if (!text) {
                alert('الرجاء كتابة نص الذكر المقترح أولاً');
                return;
            }

            const target = isNaN(targetVal) || targetVal <= 0 ? 0 : targetVal;
            const newId = Date.now().toString();

            const newDhikr = {
                id: newId,
                text: text,
                target: target,
                rounds: 0,
                count: 0,
                isDefault: false
            };

            catalog.push(newDhikr);
            localStorage.setItem('tasbeehDhikrCatalog', JSON.stringify(catalog));

            // تفعيل الذكر المضاف فورياً
            activeId = newId;
            localStorage.setItem('activeDhikrId', activeId);
            activeDhikr = newDhikr;

            // تصفير نموذج الإدخال وإغلاقه بمرونة
            newDhikrText.value = '';
            newDhikrTarget.value = '33';
            addDhikrForm.classList.remove('open');
            if (toggleAddFormBtn) {
                toggleAddFormBtn.classList.remove('active-state');
                toggleAddFormBtn.innerHTML = '<i class="fa-solid fa-plus"></i> <span>إضافة ذكر</span>';
            }

            renderDhikrCatalog();
            updateTasbeehUI();
            playTargetChime();
            triggerVibration([60, 40, 60]);
        });
    }

    // التهيئة والمطابقة المبدئية عند تشغيل المسبحة لأول مرة
    updateFeedbackUI();
    renderDhikrCatalog();
    updateTasbeehUI();
});
