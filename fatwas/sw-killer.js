if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        if (registrations.length > 0) {
            console.log("🛠️ تم اكتشاف Service Worker نشط، جاري إزالته وتطهير الكاش...");
            for (let registration of registrations) {
                registration.unregister();
            }
            if ('caches' in window) {
                caches.keys().then(function(names) {
                    return Promise.all(names.map(name => caches.delete(name)));
                }).then(function() {
                    console.log("🧹 تم مسح جميع ملفات الكاش بنجاح. جاري إعادة تحميل الصفحة لتطبيق التحديثات...");
                    window.location.reload();
                });
            } else {
                window.location.reload();
            }
        }
    });
}
