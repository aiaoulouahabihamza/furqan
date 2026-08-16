document.addEventListener('DOMContentLoaded', () => {
    // إعداد العدادات
    let tasbeehCount = parseInt(localStorage.getItem('tasbeehCount') || '0', 10);
    let tasbeehRounds = parseInt(localStorage.getItem('tasbeehRounds') || '0', 10);
    let currentTarget = parseInt(localStorage.getItem('tasbeehTarget') || '33', 10);
    
    // العناصر في الواجهة
    const countDisplay = document.getElementById('tasbeehCountDisplay');
    const roundsDisplay = document.getElementById('tasbeehRounds');
    const targetDisplay = document.getElementById('tasbeehTargetDisplay');
    const tapBtn = document.getElementById('tasbeehTapBtn');
    const resetBtn = document.getElementById('tasbeehResetBtn');
    const phraseDisplayText = document.getElementById('tasbeehPhraseDisplayText');
    const progressFill = document.getElementById('tasbeehProgressFill');
    
    // عناصر اختيار الهدف والذكر (Custom Dropdown)
    const phraseSelect = document.getElementById('tasbeehPhraseCustomSelect');
    const targetSelect = document.getElementById('tasbeehTargetCustomSelect');
    
    // تهيئة الواجهة
    updateTasbeehUI();

    // 1. نظام القوائم المنسدلة المخصصة (Custom Dropdowns)
    function setupCustomDropdown(dropdownElement, storageKey, onSelectCallback) {
        const trigger = dropdownElement.querySelector('.custom-select-trigger');
        const options = dropdownElement.querySelectorAll('.custom-option');
        const selectedText = dropdownElement.querySelector('span');
        
        // استعادة القيمة المحفوظة
        const savedValue = localStorage.getItem(storageKey);
        if (savedValue) {
            options.forEach(opt => {
                if (opt.dataset.value === savedValue) {
                    options.forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    selectedText.textContent = opt.textContent;
                    if (onSelectCallback) onSelectCallback(savedValue, opt.textContent);
                }
            });
        }
        
        // فتح/إغلاق القائمة
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdownElement.classList.contains('open');
            // إغلاق أي قائمة مفتوحة أخرى
            document.querySelectorAll('.custom-select').forEach(el => el.classList.remove('open'));
            
            if (!isOpen) {
                dropdownElement.classList.add('open');
            }
        });
        
        // عند اختيار عنصر
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                const val = option.dataset.value;
                const text = option.textContent;
                selectedText.textContent = text;
                
                localStorage.setItem(storageKey, val);
                dropdownElement.classList.remove('open');
                
                if (onSelectCallback) onSelectCallback(val, text);
            });
        });
    }
    
    // إغلاق القوائم عند النقر خارجها
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select').forEach(el => el.classList.remove('open'));
    });

    // تهيئة القوائم
    setupCustomDropdown(phraseSelect, 'tasbeehPhrase', (val, text) => {
        phraseDisplayText.textContent = val; // يمكن تغيير هذا إذا كان النص يختلف عن القيمة
    });
    
    setupCustomDropdown(targetSelect, 'tasbeehTarget', (val, text) => {
        currentTarget = parseInt(val, 10);
        updateTasbeehUI();
    });

    // تهيئة أولية للنص المعروض للذكر (إذا لم يتغير عبر الدالة)
    const initialPhrase = localStorage.getItem('tasbeehPhrase') || 'سبحان الله';
    phraseDisplayText.textContent = initialPhrase;


    // 2. منطق التسبيح
    tapBtn.addEventListener('click', (e) => {
        // منع الزوم عند النقر المتكرر
        e.preventDefault();
        
        tasbeehCount++;
        
        // التحقق من الوصول للهدف
        if (currentTarget > 0 && tasbeehCount >= currentTarget) {
            tasbeehCount = 0;
            tasbeehRounds++;
            // اهتزاز طويل عند إتمام الهدف
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        } else {
            // اهتزاز خفيف لكل ضغطة
            if (navigator.vibrate) navigator.vibrate(50);
        }
        
        saveAndSyncTasbeeh();
        updateTasbeehUI();
    });

    // تصفير العداد
    const resetModal = document.getElementById('tasbeehResetModal');
    const confirmResetBtn = document.getElementById('confirmResetBtn');
    const cancelResetBtn = document.getElementById('cancelResetBtn');

    resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (resetModal) {
            resetModal.classList.add('active');
        } else {
            doReset();
        }
    });

    if (confirmResetBtn) {
        confirmResetBtn.addEventListener('click', () => {
            doReset();
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

    function doReset() {
        tasbeehCount = 0;
        tasbeehRounds = 0;
        saveAndSyncTasbeeh();
        updateTasbeehUI();
        if (navigator.vibrate) navigator.vibrate(80);
    }

    function saveAndSyncTasbeeh() {
        localStorage.setItem('tasbeehCount', tasbeehCount.toString());
        localStorage.setItem('tasbeehRounds', tasbeehRounds.toString());
    }

    function updateTasbeehUI() {
        countDisplay.textContent = tasbeehCount;
        roundsDisplay.textContent = `الدورات: ${tasbeehRounds}`;
        
        if (currentTarget === 0) {
            targetDisplay.textContent = 'الهدف: مفتوح';
            if (progressFill) progressFill.style.width = '100%';
        } else {
            targetDisplay.textContent = `الهدف: ${currentTarget}`;
            if (progressFill) {
                const percentage = Math.min(100, Math.round((tasbeehCount / currentTarget) * 100));
                progressFill.style.width = `${percentage}%`;
            }
        }
    }
});
