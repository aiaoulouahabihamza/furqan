/**
 * نظام المصادقة والملف الشخصي الموحد - منصة الفرقان
 * يدعم:
 * 1. تسجيل الدخول السريع والآمن بحساب Google
 * 2. تسجيل الدخول الحقيقي بالبريد الإلكتروني وكلمة المرور عبر Firebase Authentication
 * 3. إنشاء حساب جديد حقيقي وتحديث الاسم والنبذة ومزامنته في Firestore
 * 4. إدارة الملف الشخصي، متابعة برنامج الختمة، الإحصائيات، وتسجيل الخروج الآمن
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile,
    signOut, 
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// إعدادات Firebase الرسمية من مشروع الفرقان
const firebaseConfig = {
    apiKey: "AIzaSyCqGYbrliNQU_yO-gN_Vcv0Ykn5ZbJ5jBE",
    authDomain: "furqan-b752b.firebaseapp.com",
    projectId: "furqan-b752b",
    storageBucket: "furqan-b752b.firebasestorage.app",
    messagingSenderId: "172183159664",
    appId: "1:172183159664:web:10411663c0ad5a84dd45b5",
    measurementId: "G-JM5WGZSBP9"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// مزود Google
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// مفاتيح التخزين المحلي
const STORAGE_USER_KEY = 'al_furqan_current_user';

// الحالة الداخلية
let currentUser = null;
let authMode = 'login'; // 'login' | 'signup'
let isEditingProfile = false;

/**
 * استعادة المستخدم الحالي من التخزين إذا وجد
 */
function restoreStoredUser() {
    try {
        const raw = localStorage.getItem(STORAGE_USER_KEY);
        if (raw) {
            currentUser = JSON.parse(raw);
            updateHeaderProfileUI(currentUser);
        }
    } catch (e) {
        console.warn('Error restoring user:', e);
    }
}
restoreStoredUser();

/**
 * حقن نافذة المصادقة في الـ DOM والتأكد من ربط الأزرار بدقة
 */
function injectAuthModal() {
    let overlay = document.getElementById('furqanAuthModalOverlay');
    if (!overlay) {
        const modalHTML = `
        <div class="auth-modal-overlay" id="furqanAuthModalOverlay">
            <div class="auth-modal-container" id="furqanAuthModalContainer">
                <button type="button" class="auth-close-btn" id="furqanAuthCloseBtn" title="إغلاق النافذة" aria-label="إغلاق">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <div id="furqanAuthModalBody"></div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        overlay = document.getElementById('furqanAuthModalOverlay');
    }

    const closeBtn = document.getElementById('furqanAuthCloseBtn');
    
    if (closeBtn) {
        closeBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeAuthModal();
        };
    }
    
    if (overlay) {
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                closeAuthModal();
            }
        };
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAuthModal();
    });
}

/**
 * فتح نافذة المصادقة أو البروفايل
 */
function openAuthModal() {
    injectAuthModal();
    const overlay = document.getElementById('furqanAuthModalOverlay');
    if (!overlay) return;

    isEditingProfile = false;
    renderAuthModalContent();
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}
window.openAuthModal = openAuthModal;

/**
 * إغلاق نافذة المصادقة بالكامل
 */
function closeAuthModal() {
    const overlay = document.getElementById('furqanAuthModalOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
    const confirmOverlay = document.getElementById('logoutConfirmOverlay');
    if (confirmOverlay) {
        confirmOverlay.remove();
    }
    document.body.style.overflow = '';
}
window.closeAuthModal = closeAuthModal;

function getCurrentUser() {
    return currentUser;
}
window.getCurrentUser = getCurrentUser;

/**
 * توليد محتوى النافذة بناءً على حالة المستخدم
 */
function renderAuthModalContent() {
    const body = document.getElementById('furqanAuthModalBody');
    if (!body) return;

    if (currentUser) {
        if (isEditingProfile) {
            renderProfileEditView(body);
        } else {
            renderProfileView(body);
        }
    } else {
        renderAuthFormView(body);
    }
}

/**
 * واجهة تسجيل الدخول وإنشاء الحساب (تصميم عصري ونظيف)
 */
function renderAuthFormView(container) {
    container.innerHTML = `
        <div class="auth-header">
            <div class="auth-logo-badge">
                <img src="/data/images/logo.png" alt="الفرقان" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='/icons/icon-192.png'" />
            </div>
            <h2 class="auth-title">منصة الفرقان</h2>
            <p class="auth-subtitle">سجّل دخولك لحفظ ختماتك القرآنية، متابعة أورادك، ومزامنة بياناتك</p>
        </div>

        <!-- شريط التبديل بين الدخول والتسجيل -->
        <div class="auth-segmented-tabs">
            <button type="button" class="auth-tab-btn ${authMode === 'login' ? 'active' : ''}" id="tabLoginBtn">
                <i class="fa-solid fa-arrow-right-to-bracket"></i> تسجيل الدخول
            </button>
            <button type="button" class="auth-tab-btn ${authMode === 'signup' ? 'active' : ''}" id="tabSignupBtn">
                <i class="fa-solid fa-user-plus"></i> حساب جديد
            </button>
        </div>

        <div id="authAlertArea"></div>

        <!-- زر تسجيل الدخول بحساب Google المباشر -->
        <button type="button" class="google-auth-btn" id="googleSignInBtn" title="تسجيل الدخول بحساب Google">
            <svg class="google-icon-svg" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>المتابعة بحساب Google</span>
        </button>

        <div class="auth-divider">
            <span>أو عبر البريد الإلكتروني</span>
        </div>

        <!-- نموذج إدخال البريد وكلمة المرور الحقيقي -->
        <form id="emailAuthForm">
            ${authMode === 'signup' ? `
            <div class="auth-form-group">
                <label class="auth-label" for="authFullName">الاسم الكريم</label>
                <div class="auth-input-wrapper">
                    <i class="fa-regular fa-user auth-input-icon"></i>
                    <input type="text" id="authFullName" class="auth-input" placeholder="مثال: عبد الله أحمد" required />
                </div>
            </div>
            ` : ''}

            <div class="auth-form-group">
                <label class="auth-label" for="authEmail">البريد الإلكتروني</label>
                <div class="auth-input-wrapper">
                    <i class="fa-regular fa-envelope auth-input-icon"></i>
                    <input type="email" id="authEmail" class="auth-input" placeholder="name@example.com" required dir="ltr" />
                </div>
            </div>

            <div class="auth-form-group">
                <label class="auth-label" for="authPassword">كلمة المرور</label>
                <div class="auth-input-wrapper">
                    <i class="fa-solid fa-lock auth-input-icon"></i>
                    <input type="password" id="authPassword" class="auth-input" placeholder="••••••••" required dir="ltr" minlength="6" />
                    <button type="button" class="auth-eye-btn" id="togglePasswordVisibilityBtn" title="إظهار / إخفاء كلمة المرور">
                        <i class="fa-regular fa-eye"></i>
                    </button>
                </div>
                ${authMode === 'login' ? `
                <button type="button" class="auth-forgot-link" id="forgotPasswordBtn">نسيت كلمة المرور؟</button>
                ` : ''}
            </div>

            <button type="submit" class="auth-primary-btn" id="emailSubmitBtn">
                <span>${authMode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}</span>
                <i class="fa-solid ${authMode === 'login' ? 'fa-arrow-left' : 'fa-check'}"></i>
            </button>
        </form>

        <div class="auth-switch-prompt">
            ${authMode === 'login' ? `
            <span>ليس لديك حساب بعد؟</span>
            <button type="button" class="auth-switch-link" id="promptSwitchToSignup">إنشاء حساب جديد</button>
            ` : `
            <span>لديك حساب بالفعل؟</span>
            <button type="button" class="auth-switch-link" id="promptSwitchToLogin">تسجيل الدخول</button>
            `}
        </div>
    `;

    bindAuthEvents();
}

/**
 * ربط أحداث نموذج الدخول
 */
function bindAuthEvents() {
    // زر Google
    document.getElementById('googleSignInBtn')?.addEventListener('click', handleGoogleSignIn);

    // التبديل بين التبويبات
    document.getElementById('tabLoginBtn')?.addEventListener('click', () => {
        authMode = 'login';
        renderAuthModalContent();
    });
    document.getElementById('tabSignupBtn')?.addEventListener('click', () => {
        authMode = 'signup';
        renderAuthModalContent();
    });

    document.getElementById('promptSwitchToSignup')?.addEventListener('click', () => {
        authMode = 'signup';
        renderAuthModalContent();
    });
    document.getElementById('promptSwitchToLogin')?.addEventListener('click', () => {
        authMode = 'login';
        renderAuthModalContent();
    });

    // إظهار/إخفاء كلمة المرور
    const togglePassBtn = document.getElementById('togglePasswordVisibilityBtn');
    const passInput = document.getElementById('authPassword');
    if (togglePassBtn && passInput) {
        togglePassBtn.addEventListener('click', () => {
            const isPassword = passInput.type === 'password';
            passInput.type = isPassword ? 'text' : 'password';
            togglePassBtn.innerHTML = `<i class="fa-regular fa-eye${isPassword ? '-slash' : ''}"></i>`;
        });
    }

    // إرسال النموذج
    document.getElementById('emailAuthForm')?.addEventListener('submit', handleEmailAuth);

    // نسيت كلمة المرور
    document.getElementById('forgotPasswordBtn')?.addEventListener('click', handleForgotPassword);
}

/**
 * تسجيل الدخول بحساب Google
 */
async function handleGoogleSignIn() {
    setAuthLoading(true);
    clearAuthAlert();
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        const userData = {
            uid: user.uid,
            displayName: user.displayName || 'قارئ الفرقان',
            email: user.email,
            photoURL: user.photoURL || null,
            bio: '﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾',
            providerId: 'google',
            createdAt: user.metadata?.creationTime || new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
        };

        currentUser = userData;
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
        localStorage.setItem('al_furqan_uid', user.uid);
        localStorage.setItem('user_display_name', userData.displayName);

        // مزامنة مع Firestore
        syncUserToFirestore(userData, 'google').catch(err => console.warn('Firestore sync background notice:', err));
        
        updateHeaderProfileUI(userData);
        if (window.FurqanToast) {
            window.FurqanToast.success(`أهلاً بك يا ${userData.displayName}`);
        }

        renderAuthModalContent();
    } catch (error) {
        console.warn('Google Auth note:', error);
        if (error.code === 'auth/popup-closed-by-user') {
            showAuthAlert('تم إغلاق نافذة تسجيل الدخول قبل الإكمال', 'error');
        } else if (error.code === 'auth/unauthorized-domain') {
            showUnauthorizedDomainHelper();
        } else {
            showAuthAlert(getFirebaseErrorMessage(error), 'error');
        }
    } finally {
        setAuthLoading(false);
    }
}

/**
 * معالجة الدخول وإنشاء الحساب الحقيقي عبر البريد الإلكتروني
 */
async function handleEmailAuth(e) {
    e.preventDefault();
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const fullNameInput = document.getElementById('authFullName');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const fullName = fullNameInput ? fullNameInput.value.trim() : '';

    if (!email || !password) {
        showAuthAlert('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }

    if (password.length < 6) {
        showAuthAlert('يجب أن تتكون كلمة المرور من 6 خانات أو أكثر', 'error');
        return;
    }

    setAuthLoading(true);
    clearAuthAlert();

    try {
        if (authMode === 'signup') {
            // إنشاء حساب جديد حقيقي عبر Firebase
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const displayName = fullName || email.split('@')[0];
            
            try {
                await updateProfile(user, { displayName: displayName });
            } catch (pErr) {
                console.warn('Profile update notice:', pErr);
            }

            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: displayName,
                photoURL: null,
                bio: '﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾',
                providerId: 'email',
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString()
            };

            currentUser = userData;
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
            localStorage.setItem('al_furqan_uid', user.uid);
            localStorage.setItem('user_display_name', displayName);

            syncUserToFirestore(userData, 'email').catch(err => console.warn('Firestore sync notice:', err));

            updateHeaderProfileUI(userData);
            if (window.FurqanToast) {
                window.FurqanToast.success(`مرحباً بك يا ${displayName} في منصة الفرقان`);
            }

            renderAuthModalContent();
        } else {
            // تسجيل الدخول الحقيقي عبر Firebase
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || email.split('@')[0],
                photoURL: user.photoURL || null,
                bio: '﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾',
                providerId: 'email',
                lastLoginAt: new Date().toISOString()
            };

            // محاولة جلب النبذة والاسم المخصص من Firestore إن وجد
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (data.displayName) userData.displayName = data.displayName;
                    if (data.bio) userData.bio = data.bio;
                    if (data.photoURL) userData.photoURL = data.photoURL;
                }
            } catch (docErr) {}

            currentUser = userData;
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
            localStorage.setItem('al_furqan_uid', user.uid);
            localStorage.setItem('user_display_name', userData.displayName);

            syncUserToFirestore(userData, 'email').catch(err => console.warn('Firestore sync notice:', err));

            updateHeaderProfileUI(userData);
            if (window.FurqanToast) {
                window.FurqanToast.success(`أهلاً بك مجدداً يا ${userData.displayName}`);
            }

            renderAuthModalContent();
        }
    } catch (error) {
        console.warn('Firebase Auth Error:', error);
        showAuthAlert(getFirebaseErrorMessage(error), 'error');
    } finally {
        setAuthLoading(false);
    }
}

/**
 * نسيت كلمة المرور عبر البريد الرسمي
 */
async function handleForgotPassword() {
    const emailInput = document.getElementById('authEmail');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email) {
        showAuthAlert('يرجى كتابة بريدك الإلكتروني في حقل البريد أعلاه أولاً', 'error');
        emailInput?.focus();
        return;
    }

    setAuthLoading(true);
    try {
        await sendPasswordResetEmail(auth, email);
        showAuthAlert(`تم إرسال رابط استعادة كلمة المرور إلى بريدك (${email}). يرجى تفقد صندوق الوارد.`, 'success');
    } catch (error) {
        showAuthAlert(getFirebaseErrorMessage(error), 'error');
    } finally {
        setAuthLoading(false);
    }
}

/**
 * واجهة الملف الشخصي للمستخدم المسجل
 */
function renderProfileView(container) {
    const user = currentUser;
    const displayName = user.displayName || user.email?.split('@')[0] || 'قارئ الفرقان';
    const email = user.email || 'حساب الفرقان';
    const initialLetter = displayName.charAt(0).toUpperCase();
    const userBio = user.bio || '﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾';

    // حساب الختمة من آخر قراءة
    let khatmaInfo = {
        surahName: 'سورة الفاتحة',
        page: 1,
        surahNumber: 1,
        ayah: 1,
        percent: 0
    };

    try {
        const lastReadRaw = localStorage.getItem('lastRead');
        if (lastReadRaw) {
            const parsed = JSON.parse(lastReadRaw);
            if (parsed && (parsed.surahName || parsed.page)) {
                khatmaInfo.surahName = parsed.surahName || `سورة ${parsed.surahNumber || 1}`;
                khatmaInfo.page = Number(parsed.page) || 1;
                khatmaInfo.surahNumber = Number(parsed.surahNumber) || 1;
                khatmaInfo.percent = Math.min(100, Math.max(1, Math.round((khatmaInfo.page / 604) * 100)));
            }
        }
    } catch (e) {}

    // إجمالي التسبيحات
    let tasbeehTotal = 0;
    try {
        const catalog = JSON.parse(localStorage.getItem('tasbeehDhikrCatalog') || '[]');
        if (Array.isArray(catalog)) {
            tasbeehTotal = catalog.reduce((acc, item) => acc + (Number(item.count) || 0), 0);
        }
    } catch (e) {}

    // العلامات المرجعية
    let bookmarksTotal = 0;
    try {
        const bMarks = JSON.parse(localStorage.getItem('bookmarkedVerses') || localStorage.getItem('al_furqan_bookmarks') || '[]');
        bookmarksTotal = Array.isArray(bMarks) ? bMarks.length : 0;
    } catch (e) {}

    const khatmaProg = getKhatmaProgram();
    const khatmaPercent = Math.min(100, Math.round((khatmaProg.completedDays / Math.max(1, khatmaProg.targetDays)) * 100));

    container.innerHTML = `
        <div class="profile-card-header">
            <div class="profile-avatar-wrapper">
                ${user.photoURL ? `
                    <img src="${user.photoURL}" alt="${displayName}" class="profile-avatar-img" referrerpolicy="no-referrer" />
                ` : `
                    <div class="profile-avatar-placeholder">${initialLetter}</div>
                `}
                <span class="profile-online-badge" title="متصل الآن"></span>
                <button type="button" class="profile-avatar-edit-badge" id="changeAvatarBtn" title="تغيير الصورة">
                    <i class="fa-solid fa-camera"></i>
                </button>
                <input type="file" id="profileAvatarFileInput" accept="image/*" style="display:none;" />
            </div>

            <div class="profile-name-edit-row">
                <h3 class="profile-user-name">${escapeHTML(displayName)}</h3>
                <button type="button" class="profile-mini-edit-btn" id="editProfileNameBtn" title="تعديل الاسم والنبذة">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
            </div>
            <p class="profile-user-email">${escapeHTML(email)}</p>

            <div class="profile-bio-box" id="profileBioBox" title="انقر لتعديل النبذة الشخصية">
                <i class="fa-solid fa-quote-right" style="font-size:11px;color:var(--color-primary,#0F766E);opacity:0.7;"></i>
                <span>${escapeHTML(userBio)}</span>
            </div>
        </div>

        <!-- شبكة الإحصائيات -->
        <div class="profile-stats-grid">
            <div class="profile-stat-box">
                <div class="profile-stat-num">${khatmaProg.totalCompletedKhatmas || 0}</div>
                <div class="profile-stat-label">ختمات مكتملة</div>
            </div>
            <div class="profile-stat-box">
                <div class="profile-stat-num">${tasbeehTotal}</div>
                <div class="profile-stat-label">إجمالي التسبيح</div>
            </div>
            <div class="profile-stat-box">
                <div class="profile-stat-num">${bookmarksTotal}</div>
                <div class="profile-stat-label">علامات محفوظة</div>
            </div>
        </div>

        <!-- بطاقة متابعة الختمة القرآنية -->
        <div class="profile-khatma-card">
            <div class="khatma-card-top">
                <span class="khatma-card-title">
                    <i class="fa-solid fa-book-open-reader"></i>
                    برنامج الختمة (${khatmaProg.targetDays} يوم)
                </span>
                <span class="khatma-badge">${khatmaPercent}%</span>
            </div>
            <div class="khatma-progress-track">
                <div class="khatma-progress-bar" style="width: ${khatmaPercent}%;"></div>
            </div>
            <div class="khatma-meta-row">
                <span>الجزء الحالي: ${khatmaProg.currentJuz || 1}</span>
                <span>الأيام المنجزة: ${khatmaProg.completedDays} من ${khatmaProg.targetDays}</span>
            </div>
            <div class="khatma-btns-row">
                <button type="button" class="khatma-btn primary" id="markWirdDoneBtn">
                    <i class="fa-solid fa-check"></i> تسجيل ورْد اليوم
                </button>
                <button type="button" class="khatma-btn secondary" id="changeKhatmaPlanBtn">
                    <i class="fa-solid fa-gear"></i> ضبط الخطة
                </button>
            </div>
        </div>

        <!-- أزرار الإجراءات -->
        <div class="profile-actions-list">
            <button type="button" class="profile-action-btn" id="openEditProfileBtn">
                <span><i class="fa-solid fa-user-pen" style="color:var(--color-primary,#0F766E);margin-left:8px;"></i> تعديل الملف الشخصي والنبذة</span>
                <i class="fa-solid fa-chevron-left" style="font-size:12px;color:var(--color-text-light,#94A3B8);"></i>
            </button>
            <button type="button" class="profile-action-btn" id="profileGoToSettingsBtn">
                <span><i class="fa-solid fa-sliders" style="color:var(--color-primary,#0F766E);margin-left:8px;"></i> تفضيلات التطبيق والقراءة</span>
                <i class="fa-solid fa-chevron-left" style="font-size:12px;color:var(--color-text-light,#94A3B8);"></i>
            </button>
            <button type="button" class="profile-action-btn logout" id="logoutBtn">
                <span><i class="fa-solid fa-arrow-right-from-bracket" style="margin-left:8px;"></i> تسجيل الخروج</span>
                <i class="fa-solid fa-chevron-left" style="font-size:12px;"></i>
            </button>
        </div>
    `;

    // ربط الأحداث
    document.getElementById('changeKhatmaPlanBtn')?.addEventListener('click', configureKhatmaPlan);
    document.getElementById('markWirdDoneBtn')?.addEventListener('click', markTodayWirdCompleted);
    
    document.getElementById('editProfileNameBtn')?.addEventListener('click', () => {
        isEditingProfile = true;
        renderAuthModalContent();
    });
    document.getElementById('openEditProfileBtn')?.addEventListener('click', () => {
        isEditingProfile = true;
        renderAuthModalContent();
    });
    document.getElementById('profileBioBox')?.addEventListener('click', () => {
        isEditingProfile = true;
        renderAuthModalContent();
    });

    document.getElementById('logoutBtn')?.addEventListener('click', promptSignOutConfirmation);

    const fileInput = document.getElementById('profileAvatarFileInput');
    document.getElementById('changeAvatarBtn')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', handleProfileImageSelected);

    document.getElementById('profileGoToSettingsBtn')?.addEventListener('click', () => {
        closeAuthModal();
        window.location.href = '/settings/index.html';
    });
}

/**
 * نموذج تعديل الملف الشخصي
 */
function renderProfileEditView(container) {
    const user = currentUser || {};
    const displayName = user.displayName || '';
    const bio = user.bio || '﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾';

    container.innerHTML = `
        <div style="text-align:right;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                <h3 style="font-size:18px;font-weight:800;margin:0;color:var(--color-text,#0F172A);">
                    <i class="fa-solid fa-user-pen" style="color:var(--color-primary,#0F766E);margin-left:6px;"></i> تعديل البيانات الشخصية
                </h3>
                <button type="button" class="profile-mini-edit-btn" id="cancelEditProfileBtn" title="رجوع" style="font-size:16px;">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
            </div>

            <form id="saveProfileForm">
                <div class="auth-form-group">
                    <label class="auth-label" for="inputEditDisplayName">الاسم المعروض</label>
                    <div class="auth-input-wrapper">
                        <i class="fa-regular fa-user auth-input-icon"></i>
                        <input type="text" id="inputEditDisplayName" class="auth-input" value="${escapeAttr(displayName)}" placeholder="مثال: عبد الله أحمد" required />
                    </div>
                </div>

                <div class="auth-form-group">
                    <label class="auth-label" for="inputEditBio">النبذة الشخصية أو الآية المفضلة</label>
                    <div class="auth-input-wrapper">
                        <i class="fa-solid fa-quote-right auth-input-icon"></i>
                        <input type="text" id="inputEditBio" class="auth-input" value="${escapeAttr(bio)}" placeholder="﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾" />
                    </div>
                </div>

                <div style="display:flex;gap:10px;margin-top:20px;">
                    <button type="submit" class="auth-primary-btn" style="margin-top:0;flex:2;">
                        <i class="fa-solid fa-check"></i> حفظ التغييرات
                    </button>
                    <button type="button" class="khatma-btn secondary" id="cancelEditProfileBtn2" style="flex:1;">
                        إلغاء
                    </button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('cancelEditProfileBtn')?.addEventListener('click', () => {
        isEditingProfile = false;
        renderAuthModalContent();
    });
    document.getElementById('cancelEditProfileBtn2')?.addEventListener('click', () => {
        isEditingProfile = false;
        renderAuthModalContent();
    });

    document.getElementById('saveProfileForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('inputEditDisplayName').value.trim();
        const newBio = document.getElementById('inputEditBio').value.trim();

        if (!newName) return;

        currentUser.displayName = newName;
        currentUser.bio = newBio || '﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾';

        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(currentUser));
        localStorage.setItem('user_display_name', currentUser.displayName);

        try {
            await setDoc(doc(db, "users", currentUser.uid), {
                displayName: currentUser.displayName,
                bio: currentUser.bio,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (err) {
            console.warn('Firestore user update error:', err);
        }

        if (window.FurqanToast) {
            window.FurqanToast.success('تم حفظ التعديلات بنجاح');
        }

        isEditingProfile = false;
        renderAuthModalContent();
        updateHeaderProfileUI(currentUser);
    });
}

/**
 * تأكيد تسجيل الخروج
 */
function promptSignOutConfirmation() {
    const confirmOverlayHTML = `
        <div class="auth-modal-overlay active" id="logoutConfirmOverlay" style="z-index: 100010;">
            <div class="confirm-dialog-card">
                <div class="confirm-icon-danger">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i>
                </div>
                <h3 class="confirm-title">تسجيل الخروج</h3>
                <p class="confirm-desc">
                    هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟ يمكنك العودة وتسجيل الدخول مجدداً في أي وقت لحفظ ومزامنة ختماتك.
                </p>
                <div class="confirm-actions">
                    <button type="button" class="btn-confirm-danger" id="confirmSignOutBtn">
                        <i class="fa-solid fa-check"></i> نعم، تسجيل الخروج
                    </button>
                    <button type="button" class="btn-confirm-cancel" id="cancelSignOutBtn">
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', confirmOverlayHTML);

    const overlay = document.getElementById('logoutConfirmOverlay');
    const confirmBtn = document.getElementById('confirmSignOutBtn');
    const cancelBtn = document.getElementById('cancelSignOutBtn');

    const removeConfirm = () => overlay?.remove();

    confirmBtn?.addEventListener('click', async () => {
        removeConfirm();
        await handleSignOut();
    });

    cancelBtn?.addEventListener('click', removeConfirm);
    overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) removeConfirm();
    });
}

/**
 * تنفيذ تسجيل الخروج الفعلي
 */
async function handleSignOut() {
    try {
        await signOut(auth);
    } catch (e) {
        console.warn('Sign out warning:', e);
    }

    currentUser = null;
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem('al_furqan_uid');
    localStorage.removeItem('user_display_name');

    updateHeaderProfileUI(null);
    closeAuthModal();

    if (window.FurqanToast) {
        window.FurqanToast.info('تم تسجيل الخروج بنجاح. في أمان الله وحفظه');
    }
}

/**
 * معالجة اختيار وضغط صورة البروفايل
 */
function handleProfileImageSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        if (window.FurqanToast) window.FurqanToast.error('يرجى اختيار ملف صورة صالح');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = async function() {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

            currentUser.photoURL = compressedBase64;
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(currentUser));

            try {
                await setDoc(doc(db, "users", currentUser.uid), {
                    photoURL: compressedBase64,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            } catch (err) {}

            updateHeaderProfileUI(currentUser);
            renderAuthModalContent();

            if (window.FurqanToast) {
                window.FurqanToast.success('تم تحديث الصورة الشخصية بنجاح');
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

/**
 * إدارة برنامج الختمة القرآنية
 */
function getKhatmaProgram() {
    try {
        const raw = localStorage.getItem('al_furqan_khatma_program');
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
        targetDays: 30,
        completedDays: 0,
        totalCompletedKhatmas: 0,
        currentJuz: 1,
        lastCompletedDate: null
    };
}

async function saveKhatmaProgram(prog) {
    localStorage.setItem('al_furqan_khatma_program', JSON.stringify(prog));
    if (currentUser && db) {
        try {
            await setDoc(doc(db, "users", currentUser.uid), {
                khatmaProgram: prog,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (e) {}
    }
}

async function markTodayWirdCompleted() {
    const prog = getKhatmaProgram();
    const todayStr = new Date().toISOString().split('T')[0];

    if (prog.lastCompletedDate === todayStr) {
        if (window.FurqanToast) window.FurqanToast.info('لقد أتممت ورْد هذا اليوم بالفعل، بارك الله فيك!');
        return;
    }

    prog.completedDays += 1;
    prog.currentJuz = Math.min(30, (prog.currentJuz % 30) + 1);
    prog.lastCompletedDate = todayStr;

    if (prog.completedDays >= prog.targetDays || prog.currentJuz === 1) {
        prog.totalCompletedKhatmas = (prog.totalCompletedKhatmas || 0) + 1;
        if (window.FurqanToast) window.FurqanToast.success('مبارك! لقد أتممت ختمة كاملة لكتاب الله بحمد الله وفضله! 🎉');
    } else {
        if (window.FurqanToast) window.FurqanToast.success(`تم تسجيل إنجاز ورْد اليوم بنجاح! الجزء ${prog.currentJuz - 1} مكتمل`);
    }

    await saveKhatmaProgram(prog);
    renderAuthModalContent();
}

async function configureKhatmaPlan() {
    const prog = getKhatmaProgram();
    const choice = prompt(
        "اختر نظام برنامج الختمة القرآنية الخاص بك:\n" +
        "1- ختمة شهرية (جزء واحد يومياً - 30 يوماً)\n" +
        "2- ختمة شهرين (نصف جزء يومياً - 60 يوماً)\n" +
        "3- ختمة سريعة (جزآن يومياً - 15 يوماً)\n" +
        "4- إضافة عدد الختمات المنجزة سابقاً يدوياً",
        "1"
    );

    if (choice === null) return;
    const trimmed = choice.trim();

    if (trimmed === '1') {
        prog.targetDays = 30;
        if (window.FurqanToast) window.FurqanToast.success('تم اختيار برنامج الختمة الشهري (30 يوماً)');
    } else if (trimmed === '2') {
        prog.targetDays = 60;
        if (window.FurqanToast) window.FurqanToast.success('تم اختيار برنامج الختمة الميسر (60 يوماً)');
    } else if (trimmed === '3') {
        prog.targetDays = 15;
        if (window.FurqanToast) window.FurqanToast.success('تم اختيار برنامج الختمة المكثف (15 يوماً)');
    } else if (trimmed === '4') {
        const count = prompt('أدخل إجمالي عدد الختمات المكتملة سابقاً:', prog.totalCompletedKhatmas || 0);
        if (count !== null && !isNaN(parseInt(count))) {
            prog.totalCompletedKhatmas = Math.max(0, parseInt(count));
            if (window.FurqanToast) window.FurqanToast.success(`تم تحديث عدد ختماتك إلى ${prog.totalCompletedKhatmas}`);
        }
    } else {
        return;
    }

    await saveKhatmaProgram(prog);
    renderAuthModalContent();
}

/**
 * مزامنة المستخدم مع Firestore
 */
async function syncUserToFirestore(user, provider) {
    if (!user || !user.uid || !db) return;
    try {
        const userRef = doc(db, "users", user.uid);
        const userData = {
            uid: user.uid,
            displayName: user.displayName || 'قارئ الفرقان',
            email: user.email || null,
            photoURL: user.photoURL || null,
            bio: user.bio || '﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾',
            providerId: provider,
            lastLoginAt: new Date().toISOString()
        };

        if (user.createdAt) {
            userData.createdAt = user.createdAt;
        }

        await setDoc(userRef, userData, { merge: true });
    } catch (err) {
        console.warn('Firestore user sync notice:', err);
    }
}

/**
 * تنبيهات الحالة في نافذة المصادقة
 */
function showAuthAlert(message, type = 'error') {
    const alertArea = document.getElementById('authAlertArea');
    if (!alertArea) return;
    alertArea.innerHTML = `
        <div class="auth-alert auth-alert-${type}">
            <i class="fa-solid ${type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i>
            <span>${message}</span>
        </div>
    `;
}

function showUnauthorizedDomainHelper() {
    const alertArea = document.getElementById('authAlertArea');
    if (!alertArea) return;
    const currentDomain = window.location.hostname;
    alertArea.innerHTML = `
        <div class="auth-alert auth-alert-warning" style="display:flex; flex-direction:column; gap:8px; text-align:right; background:#FFFBEB; border:1px solid #FCD34D; color:#92400E; padding:12px; border-radius:10px;">
            <div style="display:flex; align-items:center; gap:8px; font-weight:700; font-size:13.5px;">
                <i class="fa-solid fa-shield-halved" style="color:#D97706; font-size:16px;"></i>
                <span>تفعيل النطاق في Firebase لتسجيل Google</span>
            </div>
            <div style="font-size:12px; line-height:1.6; color:#78350F;">
                لحماية حساباتك، يتطلب Firebase إضافة اسم النطاق (وليس الرابط كاملاً) إلى <b>Authorized Domains</b>:
            </div>
            <div style="display:flex; align-items:center; gap:6px; background:#FEF3C7; padding:6px 10px; border-radius:6px; font-family:monospace; font-size:11.5px; justify-content:space-between;" dir="ltr">
                <span id="domainToCopy" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px;">${escapeHTML(currentDomain)}</span>
                <button type="button" id="copyDomainBtn" style="padding:4px 10px; font-size:11px; background:#0F766E; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:700; font-family:inherit; white-space:nowrap;">
                    نسخ النطاق
                </button>
            </div>
            <div style="font-size:11.5px; color:#0F766E; font-weight:700; margin-top:2px;">
                💡 يمكنك فوراً إنشاء حساب أو تسجيل الدخول بالبريد الإلكتروني بالأسفل بدون أي انتظار!
            </div>
        </div>
    `;

    const copyBtn = document.getElementById('copyDomainBtn');
    if (copyBtn) {
        copyBtn.onclick = () => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(currentDomain);
            }
            copyBtn.textContent = 'تم النسخ! ✓';
            copyBtn.style.background = '#059669';
            setTimeout(() => {
                copyBtn.textContent = 'نسخ النطاق';
                copyBtn.style.background = '#0F766E';
            }, 3000);
        };
    }
}

function clearAuthAlert() {
    const alertArea = document.getElementById('authAlertArea');
    if (alertArea) alertArea.innerHTML = '';
}

function setAuthLoading(loading) {
    const buttons = document.querySelectorAll('.auth-primary-btn, .google-auth-btn');
    buttons.forEach(btn => {
        btn.disabled = loading;
    });
}

/**
 * ترجمة رسائل أخطاء Firebase إلى العربية بدقة
 */
function getFirebaseErrorMessage(error) {
    const code = error.code || '';
    switch (code) {
        case 'auth/invalid-email':
            return 'صيغة البريد الإلكتروني غير صحيحة، يرجى كتابته بشكل سليم';
        case 'auth/user-disabled':
            return 'تم تعطيل هذا الحساب من قِبل إدارة النظام';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'البريد الإلكتروني أو كلمة المرور غير صحيحة، أو الحساب غير مسجل بعد. يمكنك التبديل إلى (إنشاء حساب جديد) بالأسفل.';
        case 'auth/email-already-in-use':
            return 'هذا البريد الإلكتروني مسجل بالفعل مسبقاً، يمكنك التبديل إلى تبويب (تسجيل الدخول).';
        case 'auth/weak-password':
            return 'كلمة المرور ضعيفة، يجب أن تحتوي على 6 أحرف أو أرقام على الأقل.';
        case 'auth/popup-closed-by-user':
            return 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية';
        case 'auth/unauthorized-domain':
            return 'نطاق الموقع الحالي يحتاج إلى تفعيل في Authorized Domains في لوحة تحكم Firebase.';
        default:
            return error.message || 'حدث خطأ غير متوقع، يرجى التحقق من اتصالك والمحاولة مجدداً';
    }
}

/**
 * تحديث صورة / شارة الملف الشخصي في شريط الهيدر
 */
function updateHeaderProfileUI(user) {
    const profileBtns = document.querySelectorAll('#profileBtn, .profile-btn');
    profileBtns.forEach(btn => {
        if (!btn) return;
        if (user) {
            const initial = (user.displayName || user.email || 'ف').charAt(0).toUpperCase();
            if (user.photoURL) {
                btn.innerHTML = `<img src="${user.photoURL}" alt="الملف الشخصي" class="header-profile-avatar" referrerpolicy="no-referrer" />`;
            } else {
                btn.innerHTML = `<div class="header-profile-letter">${initial}</div>`;
            }
            btn.title = `الملف الشخصي (${user.displayName || user.email || 'متصل'})`;
        } else {
            btn.innerHTML = `<i class="fa-solid fa-circle-user"></i>`;
            btn.title = 'تسجيل الدخول / الملف الشخصي';
        }
    });
}

function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * مراقبة تغيرات حالة Firebase Auth الرسمية
 */
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userData = {
            uid: user.uid,
            displayName: user.displayName || 'قارئ الفرقان',
            email: user.email,
            photoURL: user.photoURL || null,
            providerId: user.providerData?.[0]?.providerId || 'google',
            lastLoginAt: new Date().toISOString()
        };
        currentUser = userData;
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
        localStorage.setItem('al_furqan_uid', user.uid);
        updateHeaderProfileUI(currentUser);
    } else if (!localStorage.getItem(STORAGE_USER_KEY)) {
        currentUser = null;
        updateHeaderProfileUI(null);
    }
});

// تهيئة تلقائية
document.addEventListener('DOMContentLoaded', () => {
    injectAuthModal();
    restoreStoredUser();
    
    document.body.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('#profileBtn, .profile-btn, [data-open-auth]');
        if (targetBtn) {
            e.preventDefault();
            openAuthModal();
        }
    });
});

// تصدير واجهات عامة
window.FurqanAuth = {
    open: openAuthModal,
    close: closeAuthModal,
    getCurrentUser: () => currentUser,
    auth,
    db
};

export {
    auth,
    db,
    currentUser,
    openAuthModal,
    closeAuthModal,
    getCurrentUser
};
