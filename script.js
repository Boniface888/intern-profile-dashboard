/* =========
   Intern Project Manager (frontend-only)
   Stores projects + attached files in localStorage as Base64.
   - Supports multiple files per project
   - Allows folder selection in browsers that support webkitdirectory
   - Dark/Light theme persisted
   ========= */

const DEFAULT_PROFILE = {
  name: 'Boniface',
  role: 'Frontend Intern',
  email: 'bonifacesimon888@gmail.com'
};

/* ---------- Utility helpers ---------- */
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from((root || document).querySelectorAll(sel)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

/* ---------- THEME ---------- */
const body = document.body;
function applyTheme(theme) {
  if (theme === 'dark') body.classList.add('dark');
  else body.classList.remove('dark');
  localStorage.setItem('ip_theme', theme);
}
(function initTheme(){
  const saved = localStorage.getItem('ip_theme') || 'light';
  applyTheme(saved);
})();
document.addEventListener('click', (e) => {
  if (e.target.id === 'themeToggle' || e.target.id === 'toggleThemeSmall') {
    const next = body.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(next);
  }
});

/* ---------- AUTH (simple) ---------- */
const loginForm = qs('#loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    // any username/password allowed
    localStorage.setItem('ip_logged_in', 'true');
    // Save username optionally
    const username = qs('#username').value || DEFAULT_PROFILE.name;
    localStorage.setItem('ip_username', username);
    window.location.href = 'dashboard.html';
  });
}

/* Redirect to login if not authenticated on dashboard */
if (window.location.pathname.includes('dashboard.html')) {
  if (localStorage.getItem('ip_logged_in') !== 'true') {
    window.location.href = 'index.html';
  } else {
    // initialize dashboard
    initDashboard();
  }
}

/* Logout */
const logoutBtn = qs('#logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('ip_logged_in');
    window.location.href = 'index.html';
  });
}

/* Export data button (download JSON backup) */
const exportBtn = qs('#exportBtn');
if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    const payload = {
      profile: DEFAULT_PROFILE,
      projects: loadProjects()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `intern-projects-backup-${new Date().toISOString()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });
}

/* ---------- Projects storage ---------- */
const STORAGE_KEY = 'ip_projects_v1';
function loadProjects(){ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
function saveProjects(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

/* Convert File -> Base64 (returns Promise that resolves to {name,type,size,lastModified,data}) */
function fileToBase64(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        data: reader.result.split(',')[1] // keep only base64 payload, not data:...
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/* Convert base64 payload + mime -> Blob */
function base64ToBlob(base64, mime) {
  const bytes = atob(base64);
  const len = bytes.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = bytes.charCodeAt(i);
  return new Blob([out], {type: mime || 'application/octet-stream'});
}

/* ---------- Dashboard UI ---------- */
function initDashboard(){
  // populate profile
  qs('#profileName').textContent = localStorage.getItem('ip_username') || DEFAULT_PROFILE.name;
  qs('#profileEmail').textContent = DEFAULT_PROFILE.email;
  qs('#profileEmail').href = 'mailto:' + DEFAULT_PROFILE.email;

  // elements
  const addProjectBtn = qs('#addProjectBtn');
  const modal = qs('#modal');
  const closeModal = qs('#closeModal');
  const cancelBtn = qs('#cancelBtn');
  const projectForm = qs('#projectForm');
  const projectList = qs('#projectList');
  const projectCount = qs('#projectCount');
  const searchInput = qs('#searchInput');

  // show modal
  addProjectBtn.addEventListener('click', () => {
    openModal();
  });
  closeModal?.addEventListener('click', closeModalFn);
  cancelBtn?.addEventListener('click', closeModalFn);

  // search filter
  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    renderProjects(q);
  });

  // form submit - create project with attached files
  projectForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const title = qs('#title').value.trim();
    const description = qs('#description').value.trim();
    const fileInput = qs('#files');
    const files = Array.from(fileInput.files || []);
    // read files into base64
    const filePromises = files.map(f => fileToBase64(f));
    const fileObjs = await Promise.all(filePromises);

    const projects = loadProjects();
    const newProject = {
      id: uid(),
      title,
      description,
      createdAt: new Date().toISOString(),
      files: fileObjs // store metadata + base64
    };
    projects.unshift(newProject); // newest first
    saveProjects(projects);
    projectForm.reset();
    closeModalFn();
    renderProjects();
  });

  // initial render
  renderProjects();

  /* ---------- Modal functions ---------- */
  function openModal() {
    qs('#modalTitle').textContent = 'Add Project';
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }
  function closeModalFn(){
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    qs('#projectForm').reset();
  }

  /* ---------- Render projects ---------- */
  function renderProjects(filter = '') {
    const projects = loadProjects();
    projectList.innerHTML = '';
    const filtered = projects.filter(p => {
      if (!filter) return true;
      return (p.title + ' ' + p.description).toLowerCase().includes(filter);
    });
    projectCount.textContent = `${filtered.length} project${filtered.length !== 1 ? 's' : ''}`;
    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = 'project-card';
      const titleRow = document.createElement('h4');
      titleRow.innerHTML = `<span>${escapeHtml(p.title)}</span>`;
      const btnGroup = document.createElement('div');

      // View first file button (if any)
      const viewBtn = document.createElement('button');
      viewBtn.className = 'icon-btn';
      viewBtn.textContent = 'View';
      viewBtn.title = 'Preview first file (or download)';
      viewBtn.addEventListener('click', () => {
        if (!p.files || p.files.length === 0) { alert('No files attached.'); return; }
        previewFile(p.files[0]);
      });

      // Download all files (zips them client-side? we will create individual downloads)
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'icon-btn';
      downloadBtn.textContent = 'Download';
      downloadBtn.title = 'Download all attached files';
      downloadBtn.addEventListener('click', () => {
        if (!p.files || p.files.length === 0) { alert('No files attached.'); return; }
        p.files.forEach(f => triggerDownloadFromBase64(f.data, f.type, f.name));
      });

      // Edit project (simple edit: load into modal)
      const editBtn = document.createElement('button');
      editBtn.className = 'icon-btn';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => {
        openEditModal(p);
      });

      // Delete
      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn';
      delBtn.style.borderColor = 'rgba(231,76,60,0.18)';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        if (!confirm('Delete this project? This will remove stored files locally.')) return;
        const arr = loadProjects();
        const idx = arr.findIndex(x => x.id === p.id);
        if (idx > -1) {
          arr.splice(idx,1);
          saveProjects(arr);
          renderProjects();
        }
      });

      btnGroup.append(viewBtn, downloadBtn, editBtn, delBtn);

      titleRow.appendChild(btnGroup);
      const desc = document.createElement('div');
      desc.className = 'project-meta';
      desc.textContent = p.description;

      // attached files list
      const fileList = document.createElement('div');
      if (p.files && p.files.length) {
        p.files.forEach((f, idx) => {
          const el = document.createElement('div');
          el.className = 'project-meta';
          el.innerHTML = `<strong>${escapeHtml(f.name)}</strong> · ${(f.size/1024).toFixed(1)} KB
                          <button class="icon-btn" style="margin-left:8px" title="Preview/Download this file">Open</button>`;
          const openBtn = el.querySelector('button');
          openBtn.addEventListener('click', () => previewFile(f));
          fileList.appendChild(el);
        });
      } else {
        fileList.textContent = 'No attached files';
      }

      card.appendChild(titleRow);
      card.appendChild(desc);
      card.appendChild(fileList);
      projectList.appendChild(card);
    });
  }

  /* ---------- Preview & Download helpers ---------- */
  function previewFile(f) {
    // f: {name,type,size,data}
    const blob = base64ToBlob(f.data, f.type);
    const url = URL.createObjectURL(blob);

    // If PDF or image, open in new tab for preview
    if (f.type === 'application/pdf' || f.type.startsWith('image/')) {
      window.open(url, '_blank');
      setTimeout(()=>URL.revokeObjectURL(url), 60000);
    } else {
      // trigger download
      triggerDownloadFromBase64(f.data, f.type, f.name);
    }
  }

  function triggerDownloadFromBase64(base64, mime, filename){
    const blob = base64ToBlob(base64, mime);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename || 'file';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 60000);
  }

  /* ---------- Edit modal ---------- */
  function openEditModal(project) {
    openModal();
    qs('#modalTitle').textContent = 'Edit Project';
    qs('#title').value = project.title;
    qs('#description').value = project.description;
    // On save, replace the project (keeping original files unless user attaches new ones)
    const onSubmit = async (ev) => {
      ev.preventDefault();
      const title = qs('#title').value.trim();
      const description = qs('#description').value.trim();
      const newFiles = Array.from(qs('#files').files || []);
      let newFileObjs = [];
      if (newFiles.length) {
        newFileObjs = await Promise.all(newFiles.map(f => fileToBase64(f)));
      }
      const arr = loadProjects();
      const idx = arr.findIndex(x => x.id === project.id);
      if (idx > -1) {
        arr[idx].title = title;
        arr[idx].description = description;
        if (newFileObjs.length) arr[idx].files = newFileObjs; // replace files if new ones provided
        saveProjects(arr);
      }
      projectForm.removeEventListener('submit', onSubmit); // cleanup
      closeModalFn();
      renderProjects();
    };
    projectForm.addEventListener('submit', onSubmit);
  }

  /* ---------- Escape HTML helper ---------- */
  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
}

/* ---------- Allow small theme toggle on login page small button ---------- */
const toggleThemeSmall = qs('#toggleThemeSmall');
if (toggleThemeSmall) {
  toggleThemeSmall.addEventListener('click', () => {
    const next = body.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(next);
  });
}
