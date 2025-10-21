// ===============================
// THEME TOGGLE
// ===============================
const body = document.body;
const themeToggle = document.getElementById("themeToggle") || document.getElementById("toggleThemeSmall");
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") body.classList.add("dark");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    body.classList.toggle("dark");
    localStorage.setItem("theme", body.classList.contains("dark") ? "dark" : "light");
  });
}

// ===============================
// LOGIN PAGE
// ===============================
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    if (!username || !password) return alert("Please fill in all fields");
    localStorage.setItem("loggedInUser", username);
    window.location.href = "dashboard.html";
  });
}

// ===============================
// DASHBOARD PAGE
// ===============================
const logoutBtn = document.getElementById("logoutBtn");
const addProjectBtn = document.getElementById("addProjectBtn");
const projectList = document.getElementById("projectList");
const projectCount = document.getElementById("projectCount");
const modal = document.getElementById("modal");
const projectForm = document.getElementById("projectForm");
const closeModal = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelBtn");
const profileName = document.getElementById("profileName");
const searchInput = document.getElementById("searchInput");

let projects = JSON.parse(localStorage.getItem("projects")) || [];

// --- Redirect to login if not logged in ---
if (window.location.pathname.includes("dashboard.html")) {
  const user = localStorage.getItem("loggedInUser");
  if (!user) {
    window.location.href = "index.html";
  } else if (profileName) {
    profileName.textContent = user;
  }
}

// --- Logout ---
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
  });
}

// --- Modal controls ---
if (addProjectBtn) addProjectBtn.addEventListener("click", () => modal.classList.remove("hidden"));
if (closeModal) closeModal.addEventListener("click", () => modal.classList.add("hidden"));
if (cancelBtn) cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));

// --- Save Project ---
if (projectForm) {
  projectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const filesInput = document.getElementById("files");

    if (!title || !description) return alert("Please fill in all fields");

    const files = [];
    for (const file of filesInput.files) {
      const base64 = await fileToBase64(file);
      files.push({ name: file.name, data: base64 });
    }

    const newProject = {
      id: Date.now(),
      title,
      description,
      files,
      createdAt: new Date().toLocaleString()
    };

    projects.push(newProject);
    localStorage.setItem("projects", JSON.stringify(projects));
    renderProjects(projects);
    modal.classList.add("hidden");
    projectForm.reset();
  });
}

// --- Convert file to base64 ---
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- Render Projects ---
function renderProjects(list) {
  if (!projectList) return;
  projectList.innerHTML = "";

  if (list.length === 0) {
    projectList.innerHTML = `<p class="muted">No projects yet. Click "Add Project" to start.</p>`;
  } else {
    list.forEach((proj) => {
      const div = document.createElement("div");
      div.className = "project-card";
      div.innerHTML = `
        <h4>${proj.title}</h4>
        <p>${proj.description.slice(0, 60)}${proj.description.length > 60 ? "..." : ""}</p>
        <small class="muted">Created: ${proj.createdAt}</small>
        <div class="card-actions">
          <button class="btn small view" data-id="${proj.id}">View</button>
          <button class="btn small danger" data-id="${proj.id}" data-del="true">Delete</button>
        </div>
      `;
      projectList.appendChild(div);
    });
  }
  projectCount.textContent = `${list.length} project${list.length !== 1 ? "s" : ""}`;
}

// --- Handle View/Delete ---
if (projectList) {
  projectList.addEventListener("click", (e) => {
    const id = parseInt(e.target.dataset.id);
    if (!id) return;

    if (e.target.dataset.del) {
      projects = projects.filter((p) => p.id !== id);
      localStorage.setItem("projects", JSON.stringify(projects));
      renderProjects(projects);
      return;
    }

    // View project
    const proj = projects.find((p) => p.id === id);
    if (proj) openProjectModal(proj);
  });
}

// --- View Modal ---
function openProjectModal(proj) {
  const viewer = document.createElement("div");
  viewer.className = "modal project-viewer";
  viewer.innerHTML = `
    <div class="modal-content">
      <header class="modal-header">
        <h3>${proj.title}</h3>
        <button class="btn-ghost close-viewer">✕</button>
      </header>
      <div class="modal-body">
        <p>${proj.description}</p>
        ${
          proj.files && proj.files.length
            ? `<h4>Attachments:</h4>
               <ul>${proj.files
                 .map(
                   (f) =>
                     `<li><a href="${f.data}" download="${f.name}" target="_blank">${f.name}</a></li>`
                 )
                 .join("")}</ul>`
            : "<p class='muted'>No attachments.</p>"
        }
      </div>
    </div>
  `;
  document.body.appendChild(viewer);

  viewer.querySelector(".close-viewer").addEventListener("click", () => {
    viewer.remove();
  });
}

// --- Search Projects ---
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase();
    const filtered = projects.filter((p) => p.title.toLowerCase().includes(q));
    renderProjects(filtered);
  });
}

// --- Initial Render ---
if (projectList) renderProjects(projects);
