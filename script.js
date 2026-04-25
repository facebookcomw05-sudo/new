// ==================== انتظار تحميل Firebase ====================
function waitForFirebase() {
  return new Promise((resolve, reject) => {
    if (typeof firebase !== 'undefined') {
      resolve();
    } else {
      const checkInterval = setInterval(() => {
        if (typeof firebase !== 'undefined') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Firebase لم يتم تحميله بعد 10 ثوانٍ'));
      }, 10000);
    }
  });
}

waitForFirebase().then(() => {
  // إعدادات Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyBg9k9ralgHyx6cBTIXcOiHSiE-Nm9ZaA4",
    authDomain: "web-programming-d3561.firebaseapp.com",
    projectId: "web-programming-d3561",
    storageBucket: "web-programming-d3561.firebasestorage.app",
    messagingSenderId: "307497227438",
    appId: "1:307497227438:web:0ee66f2fc924db4582c93f",
    measurementId: "G-4P6HXQJ232"
  };

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const auth = firebase.auth();

  // التحقق من صحة النطاق (محاولة عملية مصادقة بسيطة)
  auth.onAuthStateChanged(user => {
    console.log("Auth state changed. User:", user);
    // لا نحتاج لعمل إضافي هنا، لكن هذا يكشف عن وجود مشكلة نطاق إذا لم يعمل
  }).catch(err => {
    console.error("Auth error (likely domain issue):", err);
    document.body.innerHTML += '<div style="background:#dc2626;color:white;padding:10px;text-align:center;">⚠️ مشكلة في المصادقة: تأكد من إضافة نطاق GitHub Pages إلى Firebase (Authorized domains).</div>';
  });

  // ==================== Preloader ====================
  function hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.style.opacity = '0';
      setTimeout(() => preloader.style.display = 'none', 300);
    }
  }
  window.addEventListener('load', hidePreloader);

  function showModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
  function hideModal(id) { document.getElementById(id)?.classList.add('hidden'); }

  // ==================== صفحة المنحة ====================
  if (window.location.pathname.includes('grant.html')) {
    const form = document.getElementById('grantForm');
    let collectedData = null;
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const obj = {};
      data.forEach((v,k)=> obj[k]=v);
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
        console.error("Firestore add error:", e);
        alert("فشل الحفظ: "+ (e.message || "تأكد من إضافة نطاق GitHub Pages إلى Firebase"));
        showModal('errorModal');
      }
    });
    document.getElementById('confirmNo2')?.addEventListener('click', ()=> { hideModal('confirmModal2'); });
    document.getElementById('successOk')?.addEventListener('click', ()=> window.location.href='index.html');
    document.getElementById('errorOk')?.addEventListener('click', ()=> hideModal('errorModal'));
  }

  // ==================== صفحة الاتصال ====================
  if (window.location.pathname.includes('contact.html')) {
    const form = document.getElementById('contactForm');
    form?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const data = new FormData(form);
      const obj = { name: data.get('name'), email: data.get('email'), message: data.get('message'), timestamp: firebase.firestore.FieldValue.serverTimestamp() };
      try {
        await db.collection('contacts').add(obj);
        showModal('successModal');
        form.reset();
      } catch(e){
        console.error(e);
        alert("حدث خطأ: "+ (e.message || "مشكلة في النطاق أو الاتصال"));
      }
    });
    document.getElementById('successOk')?.addEventListener('click', ()=> window.location.href='index.html');
  }

  // ==================== لوحة المدير ====================
  if (window.location.pathname.includes('admin.html')) {
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
          <div><strong>الرقم الوطني:</strong> ${g.nationalId || ''}</div>
          <div><strong>الجوال:</strong> ${g.phone || ''}</div>
          <div><strong>المحافظة:</strong> ${g.province || ''}</div>
          <div><strong>البريد:</strong> ${g.email || ''}</div>
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
      if(user) {
        authSection.style.display = 'none';
        adminPanel.style.display = 'block';
        db.collection('grants').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
          allGrants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          renderCards();
        }, error => {
          console.error("Firestore snapshot error:", error);
          alert("خطأ في تحميل البيانات: " + (error.message || "مشكلة في النطاق أو التصريحات"));
        });
      } else {
        authSection.style.display = 'block';
        adminPanel.style.display = 'none';
      }
    });

    loginBtn?.addEventListener('click', async () => {
      const email = document.getElementById('adminEmail').value;
      const pwd = document.getElementById('adminPassword').value;
      try {
        await auth.signInWithEmailAndPassword(email, pwd);
        document.getElementById('loginError').innerText = '';
      } catch(e) {
        document.getElementById('loginError').innerText = 'فشل تسجيل الدخول: '+ (e.message || "تحقق من النطاق المسموح به في Firebase");
      }
    });
    logoutBtn?.addEventListener('click', () => auth.signOut());
    document.getElementById('closeDetailBtn')?.addEventListener('click', () => hideModal('detailModal'));

    const registerBtn = document.createElement('button');
    registerBtn.textContent = "تسجيل مدير جديد";
    registerBtn.className = "btn-secondary";
    registerBtn.style.marginTop = "10px";
    registerBtn.onclick = async () => {
      const email = prompt("البريد الإلكتروني للمدير الجديد:");
      const pwd = prompt("كلمة المرور (6 أحرف على الأقل):");
      if (email && pwd) {
        try {
          await auth.createUserWithEmailAndPassword(email, pwd);
          alert("تم إنشاء حساب المدير! يمكنك الآن تسجيل الدخول.");
        } catch(e) { alert("خطأ: "+ (e.message || "تحقق من نطاقك المسموح")); }
      }
    };
    document.getElementById('authSection')?.appendChild(registerBtn);
  }
}).catch(error => {
  console.error("Firebase loading error:", error);
  document.body.innerHTML = '<div style="text-align:center; margin-top:50px; padding:20px;"><h2>⚠️ خطأ في تحميل Firebase</h2><p>يرجى التحقق من اتصال الإنترنت أو تحديث الصفحة.</p><button onclick="location.reload()">تحديث</button></div>';
});
