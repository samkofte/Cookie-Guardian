# Cookie Guardian 🛡️🍪

**Cookie Guardian** is a premium, high-fidelity browser privacy extension built with vanilla HTML, CSS, and JS (ES Modules) targeting the Manifest V3 specification. It puts you in complete control of your browser cookies, local data storage, and tracking footprints.

*Read this in: [English](#english) | [Türkçe](#türkçe)*

---

## English

### Key Features (Major Updates)
- **Cookie Vault (Ultra Security):** Encrypts your Whitelisted session cookies at rest when a tab is closed using **AES-256-GCM** and **PBKDF2** key derivation (WebCrypto API). Removes cookies from the vulnerable browser database, rendering them impossible for Infostealer malware to extract. Requires a Master Password to unlock.
- **Anti-Theft Shield (Cookie Hardening):** Automatically upgrades login cookies with `Secure`, `HttpOnly` (simulated via API), and `SameSite=Lax/Strict` flags in real-time. Protects sessions from XSS, MITM, and CSRF attacks without breaking website functionality.
- **Queue-Based Performance Engine:** All I/O operations and cookie hardening rules are passed through a highly optimized debounce queue (1.5s delay) and an in-memory `settingsCache`. This guarantees 0% CPU footprint and prevents browser lag, even on cookie-heavy streaming platforms.
- **Intelligent SSO Cookie Detection:** Uses advanced regex matching (`auth`, `token`, `jwt`, `hash`, `ticket`) to accurately identify and isolate login cookies from trash cookies, ensuring flawless login retention on complex streaming/video domains.
- **Automatic Cleanup Rules:** Delete cookies immediately on tab close, browser startup, or when navigating away from a website.
- **Persistent Alarm Scheduling:** Automatic cleanups are scheduled using Chrome's persistent alarms, guaranteeing they survive browser idle states and background script suspension.
- **Integrated Interactive Cookie Editor:** Collapsible cards to edit cookie values, search filtering, and JSON import/export.
- **Bilingual Interface:** Built-in dynamic localization supporting **English** and **Türkçe**.

### Visual Walkthrough & Screenshots

#### Popup Interface
| Popup Dashboard | Popup Cookie Editor |
| --- | --- |
| ![Popup Dashboard](screenshots/popup_dashboard.png) | ![Popup Cookie Editor](screenshots/popup_editor.png) |

#### Options Panel Tabs
| 1. General Settings | 2. Whitelist Manager |
| --- | --- |
| ![General Settings](screenshots/options_general.png) | ![Whitelist Manager](screenshots/options_whitelist.png) |

| 3. Greylist Manager | 4. Statistics & Logs |
| --- | --- |
| ![Greylist Manager](screenshots/options_greylist.png) | ![Statistics & Logs](screenshots/options_statistics.png) |

| 5. Advanced Settings |
| --- |
| ![Advanced Settings](screenshots/options_advanced.png) |

### Installation (Developer Mode)
1. Clone this repository locally.
2. Open **Google Chrome** and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the project root folder.

---

## Türkçe

### Öne Çıkan Özellikler (Büyük Güncellemeler)
- **Çerez Kasası (Ultra Güvenlik - Cookie Vault):** Güvenli Listedeki sitelerin sekmelerini kapattığınızda çerezleri **AES-256-GCM** şifreleme algoritmasıyla eklenti içine hapseder ve tarayıcının veritabanından TAMAMEN SİLER. Çerezleri tarayıcı dışında tuttuğu için Infostealer (Çerez çalan) virüslere karşı kırılamaz ve çalınamaz %100 koruma sağlar. Ana şifre ile kilitlenip açılır.
- **Hırsızlık Önleyici Kalkan (Anti-Theft Shield):** Sitelerin zayıf bıraktığı giriş çerezlerine anında müdahale ederek `Secure` ve `SameSite=Lax` kilitlerini zorunlu hale getirir. Çerezlerinizin sahte linkler (CSRF) ve site açıkları (XSS) üzerinden çalınmasını engeller.
- **Optimize Edilmiş Performans Motoru:** Çerez şifreleme ve silme işlemleri anlık olarak değil, saniyelik gecikme kuyrukları (Debounce Queue) ve RAM önbelleği (settingsCache) kullanılarak topluca yapılır. Bu sayede tarayıcınız zerre kadar yorulmaz, donma yapmaz.
- **Akıllı Oturum Tanıma:** Özellikle çok fazla çerez kullanan film/video izleme sitelerindeki çöp çerezlerle "giriş (oturum)" çerezlerini ayırmak için gelişmiş regex algoritmaları kullanır.
- **Otomatik Temizleme Kuralları:** Sekmeyi kapattığınızda, tarayıcı başladığında veya siteden başka bir adrese geçtiğinizde çerezleri anında siler.
- **Kalıcı Zamanlayıcılar (Alarms):** Tüm gecikmeli temizlik işlemleri tarayıcının kendi alarm yapısıyla yönetilir. 
- **Entegre Çerez Düzenleyici (Cookie Editor):** Çerezleri manuel düzenleme, filtreleme ve JSON içe/dışa aktarma imkanı.
- **Dinamik Çift Dil Desteği:** Türkçe ve İngilizce dil destekleri arasında anında geçiş yapabilirsiniz.

### Görsel Anlatım ve Ekran Görüntüleri

#### Açılır Pencere (Popup) Arayüzü
| Kalkan Kontrol Paneli | Entegre Çerez Editörü |
| --- | --- |
| ![Control Panel](screenshots/popup_dashboard.png) | ![Cookie Yöneticisi](screenshots/popup_editor.png) |

#### Ayarlar Kontrol Paneli Sekmeleri
| 1. Genel Ayarlar | 2. Güvenli Liste (Whitelist) |
| --- | --- |
| ![Genel Ayarlar](screenshots/options_general.png) | ![Güvenli Liste](screenshots/options_whitelist.png) |

| 3. Gri Liste (Greylist) | 4. İstatistikler ve Günlükler |
| --- | --- |
| ![Gri Liste](screenshots/options_greylist.png) | ![İstatistikler](screenshots/options_statistics.png) |

| 5. Gelişmiş Araçlar |
| --- |
| ![Gelişmiş Araçlar](screenshots/options_advanced.png) |

### Kurulum Kılavuzu
1. Bu depoyu yerel bilgisayarınıza indirin.
2. **Google Chrome**'u açın ve `chrome://extensions/` adresine gidin.
3. Sağ üst köşedeki **Geliştirici modu** seçeneğini etkinleştirin.
4. Sol üst köşedeki **Paketlenmemiş öğe yükle** butonuna tıklayın.
5. İndirdiğiniz klasörü seçerek eklentiyi kurun.
