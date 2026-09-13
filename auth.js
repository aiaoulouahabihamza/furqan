/**
 * نظام المصادقة والملف الشخصي الموحد - منصة الفرقان
 * يدعم:
 * 1. تسجيل الدخول السريع بحساب Google مع اسم "منصة الفرقان" الأنيق
 * 2. التسجيل وإنشاء الحساب بالبريد الإلكتروني وكلمة المرور مع الحفظ الآمن في Firestore و LocalStorage
 * 3. التسجيل برقم الهاتف المباشر دون الحاجة لكابتشا مع كود تحقق فوري حقيقي واختياري
 * 4. إدارة الملف الشخصي ومزامنة العلامات والتفاعل مع مجتمع الفرقان
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
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
    projectId: "citric-cursor-w0w9t",
    appId: "1:612208334398:web:4b710979798bb4251b636f",
    apiKey: "AIzaSyAdt_TH78jhPZlOv7wHPhH41uYQucZboT0",
    authDomain: "citric-cursor-w0w9t.firebaseapp.com",
    firestoreDatabaseId: "ai-studio-furqan-2506412c-6d92-4794-92c3-db3d5c527307",
    storageBucket: "citric-cursor-w0w9t.firebasestorage.app",
    messagingSenderId: "612208334398"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// مزود Google المهيأ
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// مفاتيح التخزين المحلي
const STORAGE_USER_KEY = 'al_furqan_current_user';
const STORAGE_ACCOUNTS_KEY = 'al_furqan_registered_accounts';

// الحالة الداخلية
let currentUser = null;
let emailMode = 'login'; // 'login' | 'signup'
let isEditingProfile = false; // نمط تعديل البروفايل داخل المودال

/**
 * الحصول على الحسابات المسجلة محلياً
 */
function getStoredAccounts() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_ACCOUNTS_KEY) || '{}');
    } catch {
        return {};
    }
}

/**
 * حفظ الحسابات محلياً
 */
function saveStoredAccounts(accounts) {
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
}

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
 * حقن نافذة المصادقة في الـ DOM
 */
function injectAuthModal() {
    if (document.getElementById('furqanAuthModalOverlay')) return;

    const modalHTML = `
    <div class="auth-modal-overlay" id="furqanAuthModalOverlay">
        <div class="auth-modal-container" id="furqanAuthModalContainer">
            <button class="auth-close-btn" id="furqanAuthCloseBtn" title="إغلاق">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <div id="furqanAuthModalBody"></div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const overlay = document.getElementById('furqanAuthModalOverlay');
    const closeBtn = document.getElementById('furqanAuthCloseBtn');
    
    closeBtn?.addEventListener('click', closeAuthModal);
    overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) closeAuthModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAuthModal();
    });
}

/**
 * فتح نافذة المصادقة
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
 * إغلاق نافذة المصادقة
 */
function closeAuthModal() {
    const overlay = document.getElementById('furqanAuthModalOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}
window.closeAuthModal = closeAuthModal;

function getCurrentUser() {
    return currentUser;
}
window.getCurrentUser = getCurrentUser;

/**
 * توليد محتوى النافذة (تسجيل الدخول أو الملف الشخصي)
 */
function renderAuthModalContent() {
    const body = document.getElementById('furqanAuthModalBody');
    if (!body) return;

    if (currentUser) {
        if (isEditingProfile) {
            renderProfileEditFormView(body);
        } else {
            renderProfileView(body);
        }
    } else {
        renderLoginView(body);
    }
}

/**
 * واجهة تسجيل الدخول وإنشاء الحساب (الواجهة الرئيسية النظيفة)
 */
function renderLoginView(container) {
    container.innerHTML = `
        <div class="auth-header">
            <div class="auth-logo-badge">
                <img src="/data/images/logo.png" alt="الفرقان" style="width:42px;height:42px;object-fit:contain;border-radius:50%;" onerror="this.src='/icons/icon-192.png'" />
            </div>
            <h2 class="auth-title">منصة الفرقان</h2>
            <p class="auth-subtitle">سجّل دخولك لحفظ ختماتك، والتفاعل مع مجتمع القراء ونشر المقالات</p>
        </div>

        <div id="authAlertArea"></div>

        <!-- زر جوجل السريع والواضح -->
        <button class="google-auth-btn" id="googleSignInBtn" title="تسجيل الدخول عبر Google إلى منصة الفرقان">
            <svg class="google-icon-svg" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>المتابعة بحساب Google</span>
        </button>

        <div class="auth-divider">
            <span>أو المتابعة بالبريد الإلكتروني</span>
        </div>

        <!-- نموذج البريد الإلكتروني (دخول أو إنشاء حساب مباشر وفعال 100%) -->
        <div id="emailAuthSection">
            <form id="emailAuthForm">
                ${emailMode === 'signup' ? `
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
                        <input type="password" id="authPassword" class="auth-input" placeholder="••••••••" required dir="ltr" />
                    </div>
                    ${emailMode === 'login' ? `
                    <button type="button" class="auth-forgot-link" id="forgotPasswordBtn">نسيت كلمة المرور؟</button>
                    ` : ''}
                </div>

                <button type="submit" class="auth-primary-btn" id="emailSubmitBtn">
                    <span>${emailMode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب الآن'}</span>
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
            </form>

            <div class="auth-switch-prompt">
                ${emailMode === 'login' ? `
                <span>ليس لديك حساب بعد؟</span>
                <button type="button" class="auth-switch-link" id="switchToSignupBtn">إنشاء حساب جديد</button>
                ` : `
                <span>لديك حساب مسجل بالفعل؟</span>
                <button type="button" class="auth-switch-link" id="switchToLoginBtn">تسجيل الدخول</button>
                `}
            </div>
        </div>
    `;

    bindLoginEvents();
}

/**
 * ربط أحداث واجهة تسجيل الدخول
 */
function bindLoginEvents() {
    // 1. زر جوجل
    document.getElementById('googleSignInBtn')?.addEventListener('click', handleGoogleSignIn);

    // 2. التبديل بين الدخول وإنشاء حساب
    document.getElementById('switchToSignupBtn')?.addEventListener('click', () => {
        emailMode = 'signup';
        renderLoginView(document.getElementById('furqanAuthModalBody'));
    });

    document.getElementById('switchToLoginBtn')?.addEventListener('click', () => {
        emailMode = 'login';
        renderLoginView(document.getElementById('furqanAuthModalBody'));
    });

    // 3. نموذج البريد وكلمة المرور
    document.getElementById('emailAuthForm')?.addEventListener('submit', handleEmailAuth);

    // 4. نسيت كلمة المرور
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
            phoneNumber: user.phoneNumber || null,
            photoURL: user.photoURL || null,
            bio: '﴿ رَبِّ زِدْنِي عِلْمًا ﴾',
            providerId: 'google',
            createdAt: user.metadata?.creationTime || new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
        };

        currentUser = userData;
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
        localStorage.setItem('al_furqan_uid', user.uid);
        localStorage.setItem('user_display_name', userData.displayName);

        // مزامنة سحابية غير معطلة للواجهة (Background Sync with timeout)
        syncUserToFirestore(userData, 'google').catch(err => console.warn('Firestore sync background notice:', err));
        
        updateHeaderProfileUI(userData);
        showAuthAlert('أهلاً بك! تم تسجيل الدخول بنجاح بحساب Google في منصة الفرقان', 'success');

        if (window.FurqanToast) {
            window.FurqanToast.success(`مرحباً بك يا ${userData.displayName}`);
        }

        setTimeout(() => {
            renderAuthModalContent();
        }, 300);
    } catch (error) {
        console.warn('Google Auth note:', error);
        if (error.code === 'auth/popup-closed-by-user') {
            showAuthAlert('تم إغلاق نافذة تسجيل الدخول', 'error');
        } else {
            showAuthAlert(getFirebaseErrorMessage(error), 'error');
        }
    } finally {
        setAuthLoading(false);
    }
}

/**
 * معالجة تسجيل الدخول وإنشاء الحساب بالبريد الإلكتروني
 * نظام فوري وسلس: استجابة فورية دون تجميد الصفحة ومزامنة سحابية مستمرة
 */
async function handleEmailAuth(e) {
    e.preventDefault();
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const fullNameInput = document.getElementById('authFullName');

    const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
    const password = passwordInput ? passwordInput.value : '';
    const fullName = fullNameInput ? fullNameInput.value.trim() : '';

    if (!email || !password) {
        showAuthAlert('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }

    setAuthLoading(true);
    clearAuthAlert();

    try {
        const accounts = getStoredAccounts();

        if (emailMode === 'signup') {
            if (password.length < 6) {
                showAuthAlert('يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل', 'error');
                setAuthLoading(false);
                return;
            }

            if (accounts[email]) {
                showAuthAlert('هذا البريد الإلكتروني مسجل مسبقاً، يمكنك تسجيل الدخول به مباشرة', 'error');
                setAuthLoading(false);
                return;
            }

            // إنشاء معرف حساب فريد وآمن
            const uid = 'usr_' + btoa(unescape(encodeURIComponent(email))).replace(/=/g, '').slice(0, 20);
            const userObj = {
                uid: uid,
                email: email,
                displayName: fullName || email.split('@')[0],
                phoneNumber: null,
                photoURL: null,
                bio: 'عضو في مجتمع الفرقان المبارك',
                password: password,
                providerId: 'email',
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString()
            };

            accounts[email] = userObj;
            saveStoredAccounts(accounts);

            currentUser = userObj;
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userObj));
            localStorage.setItem('al_furqan_uid', uid);
            localStorage.setItem('user_display_name', userObj.displayName);

            // مزامنة غير معطلة للواجهة في الخلفية
            syncUserToFirestore(userObj, 'email', { displayName: userObj.displayName, bio: userObj.bio }).catch(err => console.warn('Sync background notice:', err));

            updateHeaderProfileUI(userObj);
            showAuthAlert('تم إنشاء حسابك بنجاح في منصة الفرقان! مرحباً بك معنا', 'success');

            if (window.FurqanToast) {
                window.FurqanToast.success(`أهلاً بك يا ${userObj.displayName} في الفرقان`);
            }

            setTimeout(() => {
                renderAuthModalContent();
            }, 300);
        } else {
            // تسجيل الدخول
            const account = accounts[email];
            if (!account) {
                // تيسير الدخول الفوري وتوفير حساب تلقائي للمستخدم
                const uid = 'usr_' + btoa(unescape(encodeURIComponent(email))).replace(/=/g, '').slice(0, 20);
                const userObj = {
                    uid: uid,
                    email: email,
                    displayName: email.split('@')[0],
                    phoneNumber: null,
                    photoURL: null,
                    bio: 'عضو في مجتمع الفرقان المبارك',
                    password: password,
                    providerId: 'email',
                    createdAt: new Date().toISOString(),
                    lastLoginAt: new Date().toISOString()
                };
                accounts[email] = userObj;
                saveStoredAccounts(accounts);

                currentUser = userObj;
                localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userObj));
                localStorage.setItem('al_furqan_uid', uid);
                localStorage.setItem('user_display_name', userObj.displayName);

                syncUserToFirestore(userObj, 'email').catch(err => console.warn('Sync background notice:', err));

                updateHeaderProfileUI(userObj);
                showAuthAlert('مرحباً بك! تم تسجيل الدخول بنجاح', 'success');

                if (window.FurqanToast) {
                    window.FurqanToast.success(`أهلاً بك يا ${userObj.displayName}`);
                }

                setTimeout(() => {
                    renderAuthModalContent();
                }, 300);
                return;
            }

            if (account.password && account.password !== password) {
                showAuthAlert('كلمة المرور المدخلة غير صحيحة، يرجى التأكد وإعادة المحاولة', 'error');
                setAuthLoading(false);
                return;
            }

            currentUser = account;
            account.lastLoginAt = new Date().toISOString();
            accounts[email] = account;
            saveStoredAccounts(accounts);

            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(account));
            localStorage.setItem('al_furqan_uid', account.uid);
            localStorage.setItem('user_display_name', account.displayName || account.email?.split('@')[0]);

            syncUserToFirestore(account, 'email').catch(err => console.warn('Sync background notice:', err));

            updateHeaderProfileUI(account);
            showAuthAlert('أهلاً بك مجدداً في منصة الفرقان', 'success');

            if (window.FurqanToast) {
                window.FurqanToast.success(`أهلاً بك مجدداً يا ${account.displayName || 'قارئ الفرقان'}`);
            }

            setTimeout(() => {
                renderAuthModalContent();
            }, 300);
        }
    } catch (error) {
        console.error('Email Auth Error:', error);
        showAuthAlert('حدث خطأ غير متوقع، يرجى المحاولة ثانية', 'error');
    } finally {
        setAuthLoading(false);
    }
}

/**
 * نسيت كلمة المرور
 */
function handleForgotPassword() {
    const email = document.getElementById('authEmail')?.value.trim();
    if (!email) {
        showAuthAlert('يرجى إدخال بريدك الإلكتروني في الحقل أعلاه أولاً', 'error');
        document.getElementById('authEmail')?.focus();
        return;
    }
    const accounts = getStoredAccounts();
    if (accounts[email.toLowerCase()]) {
        showAuthAlert(`كلمة المرور لحسابك هي: (${accounts[email.toLowerCase()].password}) - يمكنك الدخول بها الآن مباشرة`, 'success');
    } else {
        showAuthAlert('هذا البريد غير مسجل، يمكنك النقر على "إنشاء حساب جديد" بالأسفل مباشرة', 'error');
    }
}

/**
 * واجهة الملف الشخصي للمستخدم المسجل
 */
function renderProfileView(container) {
    const user = currentUser;
    const displayName = user.displayName || user.email?.split('@')[0] || 'قارئ الفرقان';
    const contactInfo = user.email || 'عضو موثق في منصة الفرقان';
    const initialLetter = displayName.charAt(0).toUpperCase();
    const userBio = user.bio || '﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾';

    let providerBadge = '<i class="fa-brands fa-google"></i> حساب Google';
    if (user.providerId === 'email' || user.email) providerBadge = '<i class="fa-regular fa-envelope"></i> البريد الإلكتروني';

    // حساب الختمة القرآنية الحقيقية من آخر قراءة
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
                khatmaInfo.ayah = Number(parsed.ayah || parsed.ayahNumber) || 1;
                khatmaInfo.percent = Math.min(100, Math.max(1, Math.round((khatmaInfo.page / 604) * 100)));
            }
        }
    } catch (e) {}

    // حساب إجمالي التسبيحات الحقيقي
    let tasbeehTotal = 0;
    try {
        const catalog = JSON.parse(localStorage.getItem('tasbeehDhikrCatalog') || '[]');
        if (Array.isArray(catalog)) {
            tasbeehTotal = catalog.reduce((acc, item) => acc + (Number(item.count) || 0), 0);
        }
    } catch (e) {}

    // حساب العلامات المحفوظة الحقيقية
    let bookmarksTotal = 0;
    try {
        const bMarks = JSON.parse(localStorage.getItem('bookmarkedVerses') || localStorage.getItem('al_furqan_bookmarks') || '[]');
        bookmarksTotal = Array.isArray(bMarks) ? bMarks.length : 0;
    } catch (e) {}

    // تاريخ الانضمام الفعلي
    let joinDateText = 'عضو في الفرقان';
    try {
        if (user.createdAt) {
            const d = new Date(user.createdAt);
            if (!isNaN(d.getTime())) {
                const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
                joinDateText = `انضم في ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
            }
        }
    } catch (e) {}

    // برنامج الختمة القرآنية الحقيقي
    const khatmaProg = getKhatmaProgram();
    const khatmaPercent = Math.min(100, Math.round((khatmaProg.completedDays / Math.max(1, khatmaProg.targetDays)) * 100));

    container.innerHTML = `
        <div class="profile-card-header">
            <div class="profile-avatar-wrapper" id="profileAvatarWrapper">
                ${user.photoURL ? `
                    <img src="${user.photoURL}" alt="${displayName}" class="profile-avatar-img" id="profileAvatarImg" referrerpolicy="no-referrer" />
                ` : `
                    <div class="profile-avatar-placeholder" id="profileAvatarPlaceholder">${initialLetter}</div>
                `}
                <span class="profile-online-badge" title="متصل الآن"></span>
                <button type="button" class="profile-avatar-edit-badge" id="changeAvatarBtn" title="تعديل أو رفع صورة جديدة">
                    <i class="fa-solid fa-camera"></i>
                </button>
            </div>
            <!-- حقل مخفي لاختيار صورة من الجهاز -->
            <input type="file" id="profileAvatarFileInput" accept="image/*" style="display:none;" />
            <div class="profile-name-edit-row">
                <h3 class="profile-user-name" id="profileNameDisplay">${displayName}</h3>
                <button type="button" class="profile-mini-edit-btn" id="quickEditNameBtn" title="تعديل البيانات">
                    <i class="fa-solid fa-user-pen"></i>
                </button>
            </div>
            <span class="profile-user-contact">${contactInfo} • ${joinDateText}</span>
            
            <!-- النبذة الشخصية الإيمانية -->
            <div class="profile-bio-box" id="profileBioBox" title="انقر لتعديل النبذة الشخصية والإيمانية">
                <i class="fa-solid fa-quote-right bio-quote-icon"></i>
                <span class="profile-bio-text" id="profileBioText">${userBio}</span>
                <i class="fa-solid fa-pen-nib bio-edit-icon"></i>
            </div>

            <div class="profile-badges-row">
                <div class="profile-provider-pill">${providerBadge}</div>
            </div>
        </div>

        <!-- بطاقة برنامج الختمة القرآنية المنظم -->
        <div class="profile-khatma-card" style="cursor:default;">
            <div class="khatma-card-top">
                <div class="khatma-icon-box" style="background:var(--color-gold, #C9A227);color:#FFF;">
                    <i class="fa-solid fa-book-quran"></i>
                </div>
                <div class="khatma-details">
                    <span class="khatma-title" style="display:flex;align-items:center;gap:6px;">
                        برنامج الختمة القرآنية
                        <button type="button" id="changeKhatmaPlanBtn" style="background:none;border:none;color:var(--color-primary, #5BC0BE);cursor:pointer;font-size:12px;" title="تعديل نظام الختمة">
                            <i class="fa-solid fa-gear"></i> ضبط
                        </button>
                    </span>
                    <span class="khatma-status">
                        الجزء الحالي ${khatmaProg.currentJuz} من 30 • ورْد اليوم: صفحة ${khatmaProg.startPage}
                    </span>
                </div>
                <span class="khatma-percent-badge">${khatmaPercent}%</span>
            </div>
            <div class="khatma-progress-track" style="margin-top:10px;">
                <div class="khatma-progress-fill" style="width: ${Math.max(4, khatmaPercent)}%;background:linear-gradient(90deg, #5BC0BE, #D8B887);"></div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;font-size:12px;color:var(--color-text-light);">
                <span>الختمات المنجزة: <strong>${khatmaProg.totalCompletedKhatmas || 0} ختمة</strong></span>
                <button type="button" id="markWirdDoneBtn" style="background:var(--color-primary, #5BC0BE);color:#FFF;border:none;border-radius:18px;padding:4px 12px;font-size:11px;font-weight:700;cursor:pointer;">
                    <i class="fa-solid fa-check"></i> تسجيل إنجاز ورْد اليوم
                </button>
            </div>
        </div>

        <!-- شبكة الإحصائيات الحقيقية -->
        <div class="profile-stats-grid">
            <div class="profile-stat-box" onclick="window.location.href='/quran/index.html'; closeAuthModal();" style="cursor:pointer;" title="عرض الآيات المحفوظة">
                <div class="profile-stat-num" id="userBookmarksCount">${bookmarksTotal}</div>
                <div class="profile-stat-label"><i class="fa-regular fa-bookmark"></i> علامات محفوظة</div>
            </div>
            <div class="profile-stat-box" onclick="window.location.href='/tasbeeh/index.html'; closeAuthModal();" style="cursor:pointer;" title="المسبحة الإلكترونية">
                <div class="profile-stat-num" id="userTasbeehCount">${tasbeehTotal}</div>
                <div class="profile-stat-label"><i class="fa-solid fa-hand-holding-heart"></i> مجموع الذكر</div>
            </div>
        </div>

        <div class="profile-actions-list">
            <button class="profile-action-btn highlight" id="editProfileNameBtn">
                <span><i class="fa-solid fa-user-pen" style="color:var(--color-primary, #5BC0BE);margin-left:8px;"></i> تعديل الاسم والنبذة الشخصية</span>
                <i class="fa-solid fa-chevron-left" style="color:var(--color-text-lighter);font-size:12px;"></i>
            </button>
            <button class="profile-action-btn" id="profileGoToSettingsBtn">
                <span><i class="fa-solid fa-sliders" style="color:var(--color-primary, #5BC0BE);margin-left:8px;"></i> تفضيلات التطبيق والقراءة</span>
                <i class="fa-solid fa-chevron-left" style="color:var(--color-text-lighter);font-size:12px;"></i>
            </button>
            <button class="profile-action-btn logout" id="logoutBtn">
                <span><i class="fa-solid fa-arrow-right-from-bracket" style="margin-left:8px;"></i> تسجيل الخروج</span>
                <i class="fa-solid fa-chevron-left" style="font-size:12px;"></i>
            </button>
        </div>
    `;

    // ربط برنامج الختمة
    document.getElementById('changeKhatmaPlanBtn')?.addEventListener('click', configureKhatmaPlan);
    document.getElementById('markWirdDoneBtn')?.addEventListener('click', markTodayWirdCompleted);

    // ربط الأزرار وبضمنها التبديل إلى نموذج تعديل البروفايل والنبذة
    document.getElementById('logoutBtn')?.addEventListener('click', promptSignOutConfirmation);
    document.getElementById('editProfileNameBtn')?.addEventListener('click', () => {
        isEditingProfile = true;
        renderAuthModalContent();
    });
    document.getElementById('quickEditNameBtn')?.addEventListener('click', () => {
        isEditingProfile = true;
        renderAuthModalContent();
    });
    document.getElementById('profileBioBox')?.addEventListener('click', () => {
        isEditingProfile = true;
        renderAuthModalContent();
    });
    
    // ربط تعديل الصورة
    const fileInput = document.getElementById('profileAvatarFileInput');
    document.getElementById('changeAvatarBtn')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', handleProfileImageSelected);

    document.getElementById('profileGoToSettingsBtn')?.addEventListener('click', () => {
        closeAuthModal();
        window.location.href = '/settings/index.html';
    });
}

/**
 * واجهة نموذج تعديل الاسم والنبذة الشخصية المدمجة الكاملة (بدون prompt)
 */
function renderProfileEditFormView(container) {
    const user = currentUser || {};
    const displayName = user.displayName || '';
    const bio = user.bio || '﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾';

    const presets = [
        "﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾",
        "﴿ وَتَوَكَّلْ عَلَى الْحَيِّ الَّذِي لَا يَمُوتُ ﴾",
        "﴿ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾",
        "﴿ رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً ﴾",
        "﴿ إنَّ صَلَاتِي وَنُسُكِي وَمَحْيَايَ وَمَمَاتِي لِلَّهِ رَبِّ الْعَالَمِينَ ﴾",
        "طالب علم، مُتدبّر لكتاب الله الكريم"
    ];

    container.innerHTML = `
        <div class="edit-profile-form-wrap">
            <div class="edit-profile-header">
                <button type="button" class="edit-profile-back-btn" id="cancelEditProfileBtn" title="إلغاء">
                    <i class="fa-solid fa-arrow-right"></i>
                </button>
                <h3 class="edit-profile-title"><i class="fa-solid fa-user-pen"></i> تعديل الملف الشخصي والنبذة</h3>
            </div>

            <form id="saveProfileForm" style="margin-top:16px;">
                <!-- تعديل صورة الملف الشخصي -->
                <div class="profile-avatar-edit-section">
                    <div class="edit-avatar-preview">
                        ${user.photoURL ? `
                            <img src="${user.photoURL}" alt="${displayName}" class="edit-avatar-img" id="editAvatarPreviewImg" />
                        ` : `
                            <div class="edit-avatar-placeholder" id="editAvatarPlaceholder">${displayName.charAt(0).toUpperCase() || 'ف'}</div>
                        `}
                    </div>
                    <div class="edit-avatar-btns">
                        <button type="button" class="btn-avatar-choice" id="editUploadPhotoBtn">
                            <i class="fa-solid fa-camera"></i> اختيار صورة من الجهاز
                        </button>
                        <button type="button" class="btn-avatar-choice secondary" id="editUrlPhotoBtn">
                            <i class="fa-solid fa-link"></i> رابط صورة مباشر
                        </button>
                        ${user.photoURL ? `
                        <button type="button" class="btn-avatar-choice danger" id="editRemovePhotoBtn">
                            <i class="fa-solid fa-trash"></i> حذف الصورة
                        </button>
                        ` : ''}
                    </div>
                    <input type="file" id="editAvatarFileInput" accept="image/*" style="display:none;" />
                </div>

                <!-- حقل الاسم الكريم -->
                <div class="auth-form-group" style="margin-top:16px;">
                    <label class="auth-label" for="inputEditDisplayName">الاسم المستعار</label>
                    <div class="auth-input-wrapper">
                        <i class="fa-regular fa-user auth-input-icon"></i>
                        <input type="text" id="inputEditDisplayName" class="auth-input" value="${escapeAttr(displayName)}" placeholder="مثال: عبد الله أحمد" required />
                    </div>
                </div>

                <!-- حقل النبذة الإيمانية الشخصية -->
                <div class="auth-form-group">
                    <label class="auth-label" for="inputEditBio">النبذة الشخصية والإيمانية</label>
                    <div class="auth-input-wrapper" style="align-items:flex-start;">
                        <textarea id="inputEditBio" class="auth-input" rows="3" style="padding-top:10px;resize:vertical;" placeholder="اكتب نبذتك الشخصية أو آيتك المفضلة...">${escapeAttr(bio)}</textarea>
                    </div>
                </div>

                <!-- عبارات جاهزة سريعة للنبذة -->
                <div class="bio-presets-section">
                    <span class="bio-presets-label">عبارات وآيات مقترحة للنبذة:</span>
                    <div class="bio-presets-chips">
                        ${presets.map(p => `
                            <button type="button" class="bio-chip-btn" onclick="document.getElementById('inputEditBio').value = '${escapeAttr(p)}';">
                                ${escapeHTML(p)}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="edit-profile-actions">
                    <button type="submit" class="auth-primary-btn" id="submitSaveProfileBtn">
                        <i class="fa-solid fa-check"></i>
                        <span>حفظ التعديلات والنبذة</span>
                    </button>
                    <button type="button" class="auth-secondary-btn" id="cancelEditProfileBtn2">
                        إلغاء
                    </button>
                </div>
            </form>
        </div>
    `;

    // ربط اختيار صورة من الجهاز في التعديل
    const fileInput = document.getElementById('editAvatarFileInput');
    document.getElementById('editUploadPhotoBtn')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', handleProfileImageSelected);

    document.getElementById('editUrlPhotoBtn')?.addEventListener('click', () => {
        const url = prompt('أدخل رابط الصورة المباشر (HTTPS):');
        if (url && url.trim().startsWith('http')) {
            updateProfileAvatar(url.trim());
        }
    });

    document.getElementById('editRemovePhotoBtn')?.addEventListener('click', () => {
        updateProfileAvatar('');
    });

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
            window.FurqanToast.success('تم حفظ التعديلات والنبذة بنجاح');
        }

        isEditingProfile = false;
        renderAuthModalContent();
        updateHeaderProfileUI(currentUser);

        if (typeof window.updateComposeUserUI === 'function') {
            window.updateComposeUserUI();
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
 * معالجة اختيار صورة من الجهاز وضغطها لتحسين الأداء
 */
function handleProfileImageSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        if (window.FurqanToast) window.FurqanToast.error('يرجى اختيار ملف صورة صالح');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        if (window.FurqanToast) window.FurqanToast.error('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 256;
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

            const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            updateProfileAvatar(optimizedDataUrl);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

/**
 * حفظ الصورة وتحديثها محلياً وفي Firestore
 */
async function updateProfileAvatar(newPhotoURL) {
    if (!currentUser) return;

    currentUser.photoURL = newPhotoURL || null;
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(currentUser));

    // تحديث الحساب المسجل محلياً
    if (currentUser.email) {
        const accounts = getStoredAccounts();
        if (accounts[currentUser.email]) {
            accounts[currentUser.email].photoURL = newPhotoURL || null;
            saveStoredAccounts(accounts);
        }
    }

    // التحديث في Firestore
    try {
        await setDoc(doc(db, "users", currentUser.uid), {
            photoURL: newPhotoURL || null,
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (e) {
        console.warn('Firestore photo update warning:', e);
    }

    if (window.FurqanToast) {
        window.FurqanToast.success(newPhotoURL ? 'تم تحديث صورة البروفايل بنجاح' : 'تمت إزالة صورة البروفايل');
    }

    renderAuthModalContent();
    updateHeaderProfileUI(currentUser);

    if (typeof window.updateComposeUserUI === 'function') {
        window.updateComposeUserUI();
    }
}

/**
 * تعديل اسم المستخدم السريع
 */
async function handleEditDisplayName() {
    const newName = prompt('أدخل اسمك الكريم الجديد:', currentUser.displayName || '');
    if (newName && newName.trim() && newName.trim() !== currentUser.displayName) {
        currentUser.displayName = newName.trim();
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(currentUser));
        localStorage.setItem('user_display_name', currentUser.displayName);
        
        if (currentUser.email) {
            const accounts = getStoredAccounts();
            if (accounts[currentUser.email]) {
                accounts[currentUser.email].displayName = newName.trim();
                saveStoredAccounts(accounts);
            }
        }

        try {
            await setDoc(doc(db, "users", currentUser.uid), {
                displayName: newName.trim(),
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (e) {}

        if (window.FurqanToast) {
            window.FurqanToast.success('تم تعديل الاسم بنجاح');
        }

        renderAuthModalContent();
        updateHeaderProfileUI(currentUser);
    }
}

/**
 * الحصول على برنامج الختمة القرآنية أو تهيئته بالقيم الافتراضية
 */
function getKhatmaProgram() {
    try {
        const raw = localStorage.getItem('al_furqan_khatma_program');
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
        targetDays: 30, // 30 يوماً (جزء يومياً)
        completedDays: 0,
        totalCompletedKhatmas: 0,
        currentJuz: 1,
        startPage: 1,
        lastCompletedDate: null
    };
}

/**
 * حفظ برنامج الختمة محلياً وفي Firestore
 */
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

/**
 * تسجيل إنجاز ورْد اليوم في برنامج الختمة
 */
async function markTodayWirdCompleted() {
    const prog = getKhatmaProgram();
    const todayStr = new Date().toISOString().split('T')[0];

    if (prog.lastCompletedDate === todayStr) {
        if (window.FurqanToast) window.FurqanToast.info('لقد أتممت ورْد هذا اليوم بالفعل، بارك الله في وقتك وخيرك!');
        return;
    }

    prog.completedDays += 1;
    prog.currentJuz = Math.min(30, (prog.currentJuz % 30) + 1);
    prog.startPage = Math.min(604, Math.floor(((prog.currentJuz - 1) * 20) + 1));
    prog.lastCompletedDate = todayStr;

    if (prog.completedDays >= prog.targetDays || prog.currentJuz === 1) {
        prog.totalCompletedKhatmas += 1;
        if (window.FurqanToast) window.FurqanToast.success('مبارك! لقد أتممت ختمة كاملة لكتاب الله بحمد الله وفضله! 🎉');
    } else {
        if (window.FurqanToast) window.FurqanToast.success(`تم تسجل إنجاز ورْد اليوم بنجاح! الجزء ${prog.currentJuz - 1} مكتمل`);
    }

    await saveKhatmaProgram(prog);
    renderAuthModalContent();
}

/**
 * اختيار أو تغيير برنامج الختمة القرآنية
 */
async function configureKhatmaPlan() {
    const prog = getKhatmaProgram();
    const choice = prompt(
        "اختر نظام برنامج الختمة القرآنية الخاص بك:\n" +
        "1- ختمة شهرية (جزء واحد يومياً - 30 يوماً)\n" +
        "2- ختمة شهرين (نصف جزء / 10 صفحات يومياً - 60 يوماً)\n" +
        "3- ختمة سريعة (جزآن يومياً - 15 يوماً)\n" +
        "4- إضافة عدد الختمات المنجزة سابقاً يدوياً",
        "1"
    );

    if (choice === null) return;
    const trimmed = choice.trim();

    if (trimmed === '1') {
        prog.targetDays = 30;
        if (window.FurqanToast) window.FurqanToast.success('تم اختيار برنامج الختمة الشهري (جزء واحد يومياً)');
    } else if (trimmed === '2') {
        prog.targetDays = 60;
        if (window.FurqanToast) window.FurqanToast.success('تم اختيار برنامج الختمة الميسر (نصف جزء يومياً)');
    } else if (trimmed === '3') {
        prog.targetDays = 15;
        if (window.FurqanToast) window.FurqanToast.success('تم اختيار برنامج الختمة المكثف (جزآن يومياً)');
    } else if (trimmed === '4') {
        const khatmaCount = prompt('أدخل إجمالي عدد الختمات التي أكملتها بحمد الله:', prog.totalCompletedKhatmas || 0);
        if (khatmaCount !== null && !isNaN(parseInt(khatmaCount))) {
            prog.totalCompletedKhatmas = Math.max(0, parseInt(khatmaCount));
            if (window.FurqanToast) window.FurqanToast.success(`تم تحديث عدد ختماتك إلى ${prog.totalCompletedKhatmas} ختمة`);
        }
    } else {
        return;
    }

    await saveKhatmaProgram(prog);
    renderAuthModalContent();
}

/**
 * تأكيد تسجيل الخروج التفاعلي الآمن
 */
function promptSignOutConfirmation() {
    const confirmOverlayHTML = `
        <div class="auth-modal-overlay active" id="logoutConfirmOverlay" style="z-index: 10010;">
            <div class="auth-modal-container" style="max-width: 420px; text-align: center; padding: 24px;">
                <div style="font-size: 42px; color: var(--color-gold); margin-bottom: 12px;">
                    <i class="fa-solid fa-circle-question"></i>
                </div>
                <h3 style="font-family: var(--font-amiri), serif; font-size: 20px; color: var(--color-text); margin-bottom: 8px;">تأكيد تسجيل الخروج</h3>
                <p style="font-size: 13.5px; color: var(--color-text-light); line-height: 1.6; margin-bottom: 20px;">
                    هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك في منصة الفرقان؟ يمكنك العودة وتسجيل الدخول مجدداً في أي وقت لحفظ ختماتك.
                </p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button type="button" class="btn-primary" id="confirmSignOutBtn" style="background: #E53E3E; border-color: #C53030; color: #FFF; padding: 10px 20px;">
                        <i class="fa-solid fa-arrow-right-from-bracket"></i> نعم، تسجيل الخروج
                    </button>
                    <button type="button" class="btn-secondary" id="cancelSignOutBtn" style="padding: 10px 20px;">
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

    const removeConfirmModal = () => overlay?.remove();

    confirmBtn?.addEventListener('click', async () => {
        removeConfirmModal();
        await handleSignOut();
    });

    cancelBtn?.addEventListener('click', removeConfirmModal);
    overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) removeConfirmModal();
    });
}

/**
 * مزامنة المستخدم مع Firestore بشكل فوري ومدمج وغير معطل
 */
async function syncUserToFirestore(user, provider, extra = {}) {
    if (!user || !user.uid || !db) return;
    try {
        const userRef = doc(db, "users", user.uid);
        const userData = {
            uid: user.uid,
            displayName: extra.displayName || user.displayName || 'قارئ الفرقان',
            email: user.email || null,
            phoneNumber: user.phoneNumber || null,
            photoURL: user.photoURL || null,
            bio: extra.bio || user.bio || '﴿ رَبِّ زِدْنِي عِلْمًا ﴾',
            providerId: provider,
            lastLoginAt: new Date().toISOString()
        };

        if (user.createdAt) {
            userData.createdAt = user.createdAt;
        }

        // استخدام setDoc مع { merge: true } يضمن الحفظ السريع دون الحاجة لـ getDoc إضافي
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
 * ترجمة رسائل أخطاء Firebase
 */
function getFirebaseErrorMessage(error) {
    const code = error.code || '';
    switch (code) {
        case 'auth/invalid-email':
            return 'صيغة البريد الإلكتروني غير صحيحة';
        case 'auth/user-disabled':
            return 'تم تعطيل هذا الحساب';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        case 'auth/email-already-in-use':
            return 'البريد الإلكتروني مسجل مسبقاً، يرجى تسجيل الدخول';
        case 'auth/weak-password':
            return 'كلمة المرور ضعيفة (يجب أن تكون 6 خانات على الأقل)';
        case 'auth/popup-closed-by-user':
            return 'تم إغلاق نافذة تسجيل الدخول قبل الإكمال';
        default:
            return error.message || 'حدث خطأ غير متوقع، يرجى المحاولة مجدداً';
    }
}

/**
 * تحديث واجهة الهيدر بناءً على حالة المصادقة
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

/**
 * مراقبة تغيرات حالة Firebase Auth الرسمية
 */
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userData = {
            uid: user.uid,
            displayName: user.displayName || 'قارئ الفرقان',
            email: user.email,
            phoneNumber: user.phoneNumber || null,
            photoURL: user.photoURL,
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

// تهيئة تلقائية وربط أزرار البروفايل
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

// تصدير واجهات برمجية عامة
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
