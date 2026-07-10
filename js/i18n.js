/* js/i18n.js */

export const TRANSLATIONS = {
  en: {
    // Popup
    title: "Cookie Guardian",
    activeTab: "Active Tab Status",
    protected: "Protected",
    unprotected: "Unprotected",
    sessionProtection: "Session Protection",
    cookiesFound: "cookies found",
    btnWhitelist: "Whitelist Site",
    btnGreylist: "Greylist Site",
    btnClean: "Clean Non-Whitelisted",
    btnSettings: "Open Settings",
    cookiesDeletedCount: "Total Deleted",
    
    // Options Header / Sidebar
    sidebarGeneral: "General",
    sidebarWhitelist: "Whitelist",
    sidebarGreylist: "Greylist",
    sidebarStatistics: "Statistics",
    sidebarAdvanced: "Advanced",
    
    // General Tab
    appTitle: "Cookie Guardian Settings",
    cardAppearance: "Appearance",
    labelTheme: "Theme",
    descTheme: "Choose your preferred color scheme",
    labelLanguage: "Language",
    descLanguage: "Select UI language",
    cardCleanupRules: "Cleanup Rules",
    labelDeleteClose: "Delete on Tab Close",
    descDeleteClose: "Automatically delete domain cookies when its last tab is closed",
    labelDeleteStartup: "Delete on Browser Startup",
    descDeleteStartup: "Clear all non-whitelisted cookies when starting the browser",
    labelDeleteNav: "Delete on Navigation Away",
    descDeleteNav: "Delete cookies of the previous site immediately when you navigate away",
    labelKeepSession: "Keep Session Cookies",
    descKeepSession: "Do not delete temporary session cookies",
    labelShowCounter: "Show Badge Counter",
    descShowCounter: "Display cookie count on the extension icon",
    labelNotifications: "Show Notifications",
    descNotifications: "Show system notification after cleaning cookies",
    labelCookieAging: "Enable Cookie Aging",
    descCookieAging: "Automatically delete cookies older than a specific duration",
    labelMaxAge: "Max Cookie Age (Hours)",
    descMaxAge: "Maximum age allowed for non-protected cookies",
    labelScheduledCleanup: "Scheduled Cleanup",
    descScheduledCleanup: "Periodically run a background cleanup loop",
    labelScheduleInterval: "Cleanup Interval",
    descScheduleInterval: "How often to run the background cleaning process",
    
    // Whitelist Tab
    titleWhitelist: "Whitelisted Sites",
    introWhitelist: "Whitelisted sites are permanently protected. Their cookies will never be deleted.",
    placeholderWhitelist: "example.com",
    btnAdd: "Add",
    titleQuickAdd: "Quick Add Popular Sites",
    introQuickAdd: "Click to whitelist sites you use frequently:",
    
    // Greylist Tab
    titleGreylist: "Temporary Protection",
    introGreylist: "Greylist sites are temporarily protected from cookie deletion. Unlike whitelisted sites, greylisted cookies will be deleted after a set period of inactivity. Perfect for sites you visit occasionally but don't want to permanently whitelist.",
    placeholderGreylist: "example.com",
    cardGreylistSettings: "Greylist Settings",
    labelAutoExpire: "Auto-Expire Greylist",
    descAutoExpire: "Automatically remove sites from greylist after inactivity",
    labelExpireDays: "Inactivity Limit (Days)",
    descExpireDays: "Days of inactivity before removing from greylist",
    titleFeatureCompare: "Protection Mode Comparison",
    colFeature: "Feature",
    colWhitelist: "Whitelist",
    colGreylist: "Greylist",
    rowPermProtect: "Permanent Protection",
    rowSessionCleanup: "Clean on Tab Close",
    rowInactivityClean: "Inactivity Auto-Expiry",
    rowQuickAdd: "Popular Quick-Add Support",
    rowYes: "Yes",
    rowNo: "No",
    rowTemp: "Temporary",
    
    // Statistics Tab
    titleOverview: "Overview",
    statTotal: "TOTAL COOKIES DELETED",
    statToday: "DELETED TODAY",
    statAverage: "DAILY AVERAGE",
    titleLast7Days: "Last 7 Days Deletions",
    titleLog: "Detailed Deletion Log",
    btnLogClear: "Clear Log",
    logEmpty: "No deletions logged yet",
    
    // Advanced Tab
    titleAdvanced: "Advanced Storage Cleansing",
    introAdvanced: "In addition to cookies, clean other client-side storage technologies to fully protect your privacy.",
    labelCleanLocal: "Clean LocalStorage",
    descCleanLocal: "Remove localStorage data for non-whitelisted sites",
    labelCleanIndexed: "Clean IndexedDB",
    descCleanIndexed: "Remove IndexedDB databases for non-whitelisted sites",
    labelCleanCache: "Clean Cache",
    descCleanCache: "Clear browser cache files during cleanups",
    titleAbout: "About Cookie Guardian",
    descAbout: "Cookie Guardian is a premium privacy extension designed to give you complete control over your browser cookies and tracking footprints.",
    textVersion: "Version",
    textRelease: "Channel: Stable Pack",
    textDeveloper: "Created by: DeepMind Team",
    cardDataManagement: "Data Management",
    btnExportSettings: "Export Settings",
    btnImportSettings: "Import Settings",
    btnResetStats: "Reset Statistics",
    btnResetDefaults: "Reset to Defaults",
    cardLicense: "License Management",
    btnActivatePro: "Activate PRO (Free)",
    placeholderSearchCookies: "Search cookies...",
    panelAddTitle: "Add Cookie",
    panelImportTitle: "Import Cookies (JSON)",
    panelExportTitle: "Export Cookies (JSON)",
    btnSave: "Save",
    btnCancel: "Cancel",
    btnImport: "Import",
    btnCopy: "Copy",
    btnClose: "Close"
  },
  tr: {
    // Popup
    title: "Cookie Guardian",
    activeTab: "Aktif Sekme Durumu",
    protected: "Koruma Altında",
    unprotected: "Korunmuyor",
    sessionProtection: "Geçici Oturum Koruması",
    cookiesFound: "çerez bulundu",
    btnWhitelist: "Sarı Listeye Ekle (Kalıcı)",
    btnGreylist: "Gri Listeye Ekle (Geçici)",
    btnClean: "Korunmayanları Şimdi Sil",
    btnSettings: "Ayarları Aç",
    cookiesDeletedCount: "Toplam Silinen",
    
    // Options Header / Sidebar
    sidebarGeneral: "Genel Ayarlar",
    sidebarWhitelist: "Güvenli Liste (Kalıcı)",
    sidebarGreylist: "Geçici Liste",
    sidebarStatistics: "İstatistikler",
    sidebarAdvanced: "Gelişmiş Veriler",
    
    // General Tab
    appTitle: "Cookie Guardian Ayarları",
    cardAppearance: "Görünüm",
    labelTheme: "Tema",
    descTheme: "Tercih ettiğiniz renk şemasını seçin",
    labelLanguage: "Dil",
    descLanguage: "Arayüz dilini seçin",
    cardCleanupRules: "Temizlik Kuralları",
    labelDeleteClose: "Sekme Kapanınca Sil",
    descDeleteClose: "Bir sitenin son sekmesi kapandığında çerezlerini otomatik sil",
    labelDeleteStartup: "Tarayıcı Başlangıcında Sil",
    descDeleteStartup: "Tarayıcı açıldığında güvenli listede olmayan tüm çerezleri temizle",
    labelDeleteNav: "Siteden Ayrılınca Sil",
    descDeleteNav: "Başka bir siteye geçtiğiniz anda eski sitenin çerezlerini sil",
    labelKeepSession: "Oturum Çerezlerini Koru",
    descKeepSession: "Geçici oturum (session) çerezlerini silme",
    labelShowCounter: "Simge Üzerinde Sayaç Göster",
    descShowCounter: "Eklenti simgesinde anlık çerez sayısını göster",
    labelNotifications: "Bildirimleri Göster",
    descNotifications: "Çerezler temizlendiğinde sistem bildirimi göster",
    labelCookieAging: "Çerez Yaşlandırmayı Etkinleştir",
    descCookieAging: "Belirli bir süreden eski çerezleri otomatik olarak temizle",
    labelMaxAge: "Maksimum Çerez Ömrü (Saat)",
    descMaxAge: "Korunmayan çerezlerin saklanabileceği maksimum süre",
    labelScheduledCleanup: "Zamanlanmış Temizlik",
    descScheduledCleanup: "Arka planda belirli aralıklarla temizlik çalıştır",
    labelScheduleInterval: "Temizlik Sıklığı",
    descScheduleInterval: "Arka plan temizliğinin ne sıklıkla çalışacağı",
    
    // Whitelist Tab
    titleWhitelist: "Güvenli Listelenmiş Siteler (Kalıcı)",
    introWhitelist: "Güvenli listedeki siteler kalıcı olarak korunur. Çerezleri asla silinmez.",
    placeholderWhitelist: "ornek.com",
    btnAdd: "Ekle",
    titleQuickAdd: "Popüler Siteleri Hızlı Ekle",
    introQuickAdd: "Sık kullandığınız siteleri güvenli listeye eklemek için tıklayın:",
    
    // Greylist Tab
    titleGreylist: "Geçici Koruma (Greylist)",
    introGreylist: "Geçici listedeki siteler çerez silinmesinden geçici olarak korunur. Whitelist'in aksine, bu sitelerin çerezleri belirli bir süre ziyaret edilmediklerinde otomatik olarak silinir. Ara sıra ziyaret ettiğiniz siteler için mükemmeldir.",
    placeholderGreylist: "ornek.com",
    cardGreylistSettings: "Geçici Liste Ayarları",
    labelAutoExpire: "Geçici Listeyi Otomatik Temizle",
    descAutoExpire: "Ziyaret edilmeyen siteleri belirli süre sonra listeden otomatik kaldır",
    labelExpireDays: "Pasif Kalma Sınırı (Gün)",
    descExpireDays: "Listeden kaldırılmadan önceki maksimum pasif gün sayısı",
    titleFeatureCompare: "Koruma Modu Karşılaştırması",
    colFeature: "Özellik",
    colWhitelist: "Whitelist (Kalıcı)",
    colGreylist: "Greylist (Geçici)",
    rowPermProtect: "Kalıcı Koruma",
    rowSessionCleanup: "Sekme Kapanınca Temizlik",
    rowInactivityClean: "Pasiflikte Otomatik Kaldırma",
    rowQuickAdd: "Popüler Hızlı Ekleme Desteği",
    rowYes: "Evet",
    rowNo: "Hayır",
    rowTemp: "Geçici",
    
    // Statistics Tab
    titleOverview: "Genel Bakış",
    statTotal: "TOPLAM SİLİNEN ÇEREZ",
    statToday: "BUGÜN SİLİNEN",
    statAverage: "GÜNLÜK ORTALAMA",
    titleLast7Days: "Son 7 Günün Silme Geçmişi",
    titleLog: "Detaylı Silme Günlüğü",
    btnLogClear: "Günlüğü Temizle",
    logEmpty: "Henüz kayıtlı silme işlemi yok",
    
    // Advanced Tab
    titleAdvanced: "Gelişmiş Depolama Temizliği",
    introAdvanced: "Gizliliğinizi tam korumak için çerezlerin yanı sıra diğer istemci tarafı depolama verilerini de temizleyin.",
    labelCleanLocal: "LocalStorage Temizliği",
    descCleanLocal: "Güvenli listede olmayan sitelerin localStorage verilerini kaldır",
    labelCleanIndexed: "IndexedDB Temizliği",
    descCleanIndexed: "Güvenli listede olmayan sitelerin IndexedDB verilerini kaldır",
    labelCleanCache: "Önbellek Temizliği",
    descCleanCache: "Temizlik sırasında tarayıcı önbelleğini de temizle",
    titleAbout: "Cookie Guardian Hakkında",
    descAbout: "Cookie Guardian, tarayıcı çerezleriniz ve takip izleriniz üzerinde tam denetim sağlamanız için tasarlanmış birinci sınıf bir gizlilik eklentisidir.",
    textVersion: "Versiyon",
    textRelease: "Dağıtım: Kararlı Sürüm",
    textDeveloper: "Geliştirici: DeepMind Sürümü",
    cardDataManagement: "Veri Yönetimi",
    btnExportSettings: "Ayarları Dışa Aktar",
    btnImportSettings: "Ayarları İçe Aktar",
    btnResetStats: "İstatistikleri Sıfırla",
    btnResetDefaults: "Varsayılana Sıfırla",
    cardLicense: "Lisans Yönetimi",
    btnActivatePro: "PRO Sürümü Etkinleştir (Ücretsiz)",
    placeholderSearchCookies: "Çerezlerde ara...",
    panelAddTitle: "Yeni Çerez Ekle",
    panelImportTitle: "Çerezleri İçe Aktar (JSON)",
    panelExportTitle: "Çerezleri Dışa Aktar (JSON)",
    btnSave: "Kaydet",
    btnCancel: "İptal",
    btnImport: "İçe Aktar",
    btnCopy: "Kopyala",
    btnClose: "Kapat"
  }
};

export function applyTranslations(documentNode, lang) {
  const dictionary = TRANSLATIONS[lang] || TRANSLATIONS.en;
  
  // Translate standard text contents
  const textElements = documentNode.querySelectorAll('[data-i18n]');
  textElements.forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (dictionary[key]) {
      element.textContent = dictionary[key];
    }
  });
  
  // Translate placeholders
  const placeholderElements = documentNode.querySelectorAll('[data-i18n-placeholder]');
  placeholderElements.forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (dictionary[key]) {
      element.setAttribute('placeholder', dictionary[key]);
    }
  });
}
