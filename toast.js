/**
 * نظام التنبيهات الموحد والحديث لمنصة الفرقان (Modern Toast Notification System)
 * بديل احترافي وعصري لـ alert() و confirm() المتخلفين القديمين
 */

(function() {
    'use strict';

    // أنماط CSS للتنبيهات العصرية وصندوق التأكيد الراقي
    const toastStyles = `
    .furqan-toast-container {
        position: fixed;
        bottom: 85px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 99999;
        display: flex;
        flex-direction: column-reverse;
        align-items: center;
        gap: 8px;
        pointer-events: none;
        max-width: 90vw;
        width: max-content;
    }

    .furqan-toast-item {
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 18px;
        border-radius: 9999px;
        background: #1E293B;
        color: #F8FAFC;
        font-family: 'Cairo', sans-serif;
        font-size: 13.5px;
        font-weight: 600;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
        animation: furqanToastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        transition: all 0.25s ease;
        border: 1px solid rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
    }

    .furqan-toast-item.success {
        background: #064E3B;
        color: #ECFDF5;
        border-color: rgba(52, 211, 153, 0.3);
    }
    .furqan-toast-item.success i { color: #34D399; }

    .furqan-toast-item.error {
        background: #7F1D1D;
        color: #FEF2F2;
        border-color: rgba(248, 113, 113, 0.3);
    }
    .furqan-toast-item.error i { color: #F87171; }

    .furqan-toast-item.info {
        background: #1E3A8A;
        color: #EFF6FF;
        border-color: rgba(96, 165, 250, 0.3);
    }
    .furqan-toast-item.info i { color: #60A5FA; }

    @keyframes furqanToastIn {
        from {
            opacity: 0;
            transform: translateY(16px) scale(0.95);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    @keyframes furqanToastOut {
        from {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
        to {
            opacity: 0;
            transform: translateY(12px) scale(0.95);
        }
    }

    /* نافذة التأكيد العصرية (Custom Confirm Dialog) */
    .furqan-dialog-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        opacity: 0;
        transition: opacity 0.2s ease;
    }
    .furqan-dialog-overlay.active {
        opacity: 1;
    }
    .furqan-dialog-card {
        background: #FFFFFF;
        border-radius: 20px;
        padding: 24px 20px;
        max-width: 380px;
        width: 100%;
        text-align: center;
        box-shadow: 0 20px 35px rgba(0,0,0,0.25);
        transform: scale(0.9);
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        border: 1px solid rgba(0,0,0,0.06);
    }
    .furqan-dialog-overlay.active .furqan-dialog-card {
        transform: scale(1);
    }
    .furqan-dialog-icon {
        width: 54px;
        height: 54px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        margin: 0 auto 16px;
    }
    .furqan-dialog-icon.danger {
        background: #FEE2E2;
        color: #DC2626;
    }
    .furqan-dialog-icon.info {
        background: #E0F2FE;
        color: #0284C7;
    }
    .furqan-dialog-title {
        font-size: 17px;
        font-weight: 800;
        color: #0F172A;
        margin-bottom: 8px;
    }
    .furqan-dialog-desc {
        font-size: 14px;
        color: #475569;
        line-height: 1.6;
        margin-bottom: 20px;
    }
    .furqan-dialog-actions {
        display: flex;
        gap: 10px;
    }
    .furqan-dialog-btn {
        flex: 1;
        padding: 11px 16px;
        border-radius: 12px;
        font-family: 'Cairo', sans-serif;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        border: none;
        transition: all 0.15s ease;
    }
    .furqan-dialog-btn.cancel {
        background: #F1F5F9;
        color: #475569;
    }
    .furqan-dialog-btn.confirm-danger {
        background: #DC2626;
        color: #FFFFFF;
    }
    .furqan-dialog-btn.confirm-primary {
        background: #0284C7;
        color: #FFFFFF;
    }
    `;

    // حقن الأنماط في الصفحة
    function injectStyles() {
        if (document.getElementById('furqanToastStyles')) return;
        const styleEl = document.createElement('style');
        styleEl.id = 'furqanToastStyles';
        styleEl.textContent = toastStyles;
        document.head.appendChild(styleEl);
    }

    // جلب حاوية التنبيهات أو إنشاؤها
    function getToastContainer() {
        injectStyles();
        let container = document.getElementById('furqanToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'furqanToastContainer';
            container.className = 'furqan-toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * إظهار تنبيه حديث Toast
     * @param {string} message - نص التنبيه
     * @param {string} type - 'success' | 'error' | 'info'
     * @param {number} duration - بالمللي ثانية
     */
    function showToast(message, type = 'info', duration = 3000) {
        if (!message) return;
        const container = getToastContainer();

        const toast = document.createElement('div');
        toast.className = `furqan-toast-item ${type}`;

        let iconClass = 'fa-solid fa-circle-info';
        if (type === 'success') iconClass = 'fa-solid fa-circle-check';
        if (type === 'error') iconClass = 'fa-solid fa-triangle-exclamation';

        toast.innerHTML = `
            <i class="${iconClass}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'furqanToastOut 0.25s forwards';
            setTimeout(() => {
                toast.remove();
            }, 250);
        }, duration);
    }

    /**
     * بديل عصري جميل لـ confirm()
     * @param {string} title
     * @param {string} message
     * @param {string} confirmText
     * @param {string} cancelText
     * @param {boolean} isDanger
     * @returns {Promise<boolean>}
     */
    function showConfirmDialog(title, message, confirmText = 'نعم، تأكيد', cancelText = 'إلغاء', isDanger = true) {
        injectStyles();
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'furqan-dialog-overlay';

            overlay.innerHTML = `
                <div class="furqan-dialog-card" dir="rtl">
                    <div class="furqan-dialog-icon ${isDanger ? 'danger' : 'info'}">
                        <i class="fa-solid ${isDanger ? 'fa-trash-can' : 'fa-circle-question'}"></i>
                    </div>
                    <div class="furqan-dialog-title">${title}</div>
                    <div class="furqan-dialog-desc">${message}</div>
                    <div class="furqan-dialog-actions">
                        <button class="furqan-dialog-btn cancel" id="dialogCancelBtn">${cancelText}</button>
                        <button class="furqan-dialog-btn ${isDanger ? 'confirm-danger' : 'confirm-primary'}" id="dialogConfirmBtn">${confirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('active'));

            const cleanup = (result) => {
                overlay.classList.remove('active');
                setTimeout(() => overlay.remove(), 200);
                resolve(result);
            };

            overlay.querySelector('#dialogConfirmBtn').onclick = () => cleanup(true);
            overlay.querySelector('#dialogCancelBtn').onclick = () => cleanup(false);
            overlay.onclick = (e) => {
                if (e.target === overlay) cleanup(false);
            };
        });
    }

    // تصدير الواجهة العامة
    window.FurqanToast = {
        show: showToast,
        success: (msg, dur) => showToast(msg, 'success', dur),
        error: (msg, dur) => showToast(msg, 'error', dur),
        info: (msg, dur) => showToast(msg, 'info', dur),
        confirm: showConfirmDialog
    };

    // استبدال window.showToast ليتماشى مع التنبيه العصري
    window.showToast = showToast;
    window.showAppToast = showToast;

    // استبدال دالة alert في المتصفح بحلول أنيقة لا توقف الصفحة
    window.alert = function(msg) {
        showToast(msg, 'info', 3500);
    };

})();
