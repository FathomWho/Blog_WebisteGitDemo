/* ============================================================
   Marginalia — a small blog
   Plain JS, localStorage-backed. No server: this is a demo app
   for practicing Git, not a real authentication system.
   ============================================================ */

const STORAGE_USERS = "marginalia_users";
const STORAGE_POSTS = "marginalia_posts";
const STORAGE_SESSION = "marginalia_session";

const root = document.getElementById("root");

const state = {
  view: "auth", // auth | feed | editor | profile
  authMode: "login", // login | register
  editingPostId: null,
  pendingImage: null, // dataURL held while composing a post
  error: "",
  success: "",
};

/* ---------- storage helpers ---------- */

function getUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_USERS) || "{}");
}
function saveUsers(users) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}
function getPosts() {
  return JSON.parse(localStorage.getItem(STORAGE_POSTS) || "[]");
}
function savePosts(posts) {
  localStorage.setItem(STORAGE_POSTS, JSON.stringify(posts));
}
function getSession() {
  return localStorage.getItem(STORAGE_SESSION);
}
function setSession(username) {
  if (username) localStorage.setItem(STORAGE_SESSION, username);
  else localStorage.removeItem(STORAGE_SESSION);
}

// Not cryptographic. This only exists so a password isn't sitting in
// localStorage as plain text during the demo.

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function clearFlash() {
  state.error = "";
  state.success = "";
}

/* ---------- render dispatcher ---------- */

function render() {
  const session = getSession();
  if (!session && state.view !== "auth") state.view = "auth";

  if (state.view === "auth") {
    root.innerHTML = renderAuth();
  } else {
    root.innerHTML = renderAppShell(session);
  }
}

/* ---------- auth screen ---------- */

function renderAuth() {
  const isLogin = state.authMode === "login";
  return `
  <div class="auth-shell">
    <div class="auth-hero">
      <div class="wordmark">Marginalia</div>
      <div>
        <div class="hero-line">Notes worth keeping in the margin.</div>
        <p class="hero-note">A small place to write posts, attach a picture,
        and practice shipping changes with Git — register an account to
        start writing.</p>
      </div>
      <div></div>
    </div>
    <div class="auth-panel">
      <div class="auth-card">
        <h2>${isLogin ? "Welcome back" : "Create an account"}</h2>
        <p class="auth-sub">${
          isLogin
            ? "Sign in with your username and password."
            : "Just a username and password — no email needed."
        }</p>
        ${state.error ? `<div class="form-error">${escapeHtml(state.error)}</div>` : ""}
        ${state.success ? `<div class="form-success">${escapeHtml(state.success)}</div>` : ""}
        <form data-form="${isLogin ? "login" : "register"}">
          <div class="field">
            <label for="username">Username</label>
            <input id="username" name="username" type="text" autocomplete="username" required minlength="2" />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input id="password" name="password" type="password" autocomplete="${
              isLogin ? "current-password" : "new-password"
            }" required minlength="4" />
          </div>
          <button type="submit" class="btn btn-primary">${isLogin ? "Sign in" : "Register"}</button>
        </form>
        <p class="auth-switch">
          ${isLogin ? "New here?" : "Already have an account?"}
          <button type="button" class="btn-text" data-action="toggle-auth-mode">
            ${isLogin ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  </div>`;
}

/* ---------- app shell ---------- */

function renderAppShell(session) {
  const navItem = (view, label) => `
    <button type="button" class="nav-item ${state.view === view ? "active" : ""}" data-action="nav" data-view="${view}">
      ${label}
    </button>`;

  let body = "";
  if (state.view === "feed") body = renderFeed(session);
  else if (state.view === "editor") body = renderEditor(session);
  else if (state.view === "profile") body = renderProfile(session);

  return `
  <div class="app-shell">
    <aside class="sidebar">
      <div class="wordmark">Marginalia</div>
      <nav>
        ${navItem("feed", "Feed")}
        ${navItem("editor", "Write a post")}
        ${navItem("profile", "Profile")}
      </nav>
      <div class="sidebar-footer">
        <div class="session-tag">Signed in as <strong>${escapeHtml(session)}</strong></div>
        <button type="button" class="btn btn-ghost btn-small" data-action="logout">Sign out</button>
      </div>
    </aside>
    <main class="main">
      ${body}
    </main>
  </div>`;
}

/* ---------- feed ---------- */

function renderFeed(session) {
  const posts = getPosts().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const list = posts.length
    ? posts
        .map((post) => {
          const mine = post.author === session;
          return `
          <article class="post" data-post-id="${post.id}">
            <div class="post-date">${formatDate(post.createdAt)}${
            post.updatedAt !== post.createdAt ? " · edited" : ""
          }</div>
            <h2 class="post-title">${escapeHtml(post.title)}</h2>
            <div class="post-byline">${escapeHtml(post.author)}</div>
            ${post.image ? `<img class="post-image" src="${post.image}" alt="" />` : ""}
            <p class="post-body">${escapeHtml(post.body)}</p>
            ${
              mine
                ? `<div class="post-actions">
                    <button type="button" class="btn btn-ghost btn-small" data-action="edit-post" data-id="${post.id}">Edit</button>
                    <button type="button" class="btn btn-danger btn-small" data-action="delete-post" data-id="${post.id}">Delete</button>
                  </div>`
                : ""
            }
          </article>`;
        })
        .join("")
    : `<div class="empty-state">
         <h3>Nothing here yet</h3>
         <p>Posts from everyone using this browser will show up here in order. Write the first one.</p>
       </div>`;

  return `
    <div class="main-header">
      <h1>Feed</h1>
      <button type="button" class="btn btn-primary" style="width:auto" data-action="nav" data-view="editor">Write a post</button>
    </div>
    <div class="timeline">${list}</div>`;
}

/* ---------- editor ---------- */

function renderEditor(session) {
  const editing = state.editingPostId
    ? getPosts().find((p) => p.id === state.editingPostId)
    : null;
  const image = state.pendingImage ?? editing?.image ?? null;

  return `
    <div class="main-header">
      <h1>${editing ? "Edit post" : "Write a post"}</h1>
    </div>
    <div class="editor-card">
      ${state.error ? `<div class="form-error">${escapeHtml(state.error)}</div>` : ""}
      <form data-form="post" data-id="${editing ? editing.id : ""}">
        <div class="field">
          <label for="title">Title</label>
          <input id="title" name="title" type="text" required value="${
            editing ? escapeHtml(editing.title) : ""
          }" />
        </div>
        <div class="field">
          <label for="body">Post</label>
          <textarea id="body" name="body" rows="8" required>${
            editing ? escapeHtml(editing.body) : ""
          }</textarea>
        </div>
        <div class="field">
          <label for="image">Image (optional)</label>
          <div class="image-drop">
            <input id="image" name="image" type="file" accept="image/*" data-action="pick-image" />
            ${image ? `<img class="image-preview" src="${image}" alt="Preview" />` : ""}
            ${
              image
                ? `<div style="margin-top:10px"><button type="button" class="btn-text" data-action="remove-image">Remove image</button></div>`
                : ""
            }
          </div>
        </div>
        <input type="hidden" name="imageData" value="${image ? escapeHtml(image) : ""}" />
        <div class="editor-actions">
          <button type="submit" class="btn btn-primary" style="width:auto">${
            editing ? "Save changes" : "Publish"
          }</button>
          <button type="button" class="btn btn-ghost" data-action="cancel-editor">Cancel</button>
        </div>
      </form>
    </div>`;
}

/* ---------- profile ---------- */

function renderProfile(session) {
  const users = getUsers();
  const user = users[session] || {};

  return `
    <div class="main-header">
      <h1>Profile</h1>
    </div>
    ${state.error ? `<div class="form-error">${escapeHtml(state.error)}</div>` : ""}
    ${state.success ? `<div class="form-success">${escapeHtml(state.success)}</div>` : ""}
    <div class="profile-grid">

      <section class="profile-section" style="border-top:none;padding-top:0">
        <h3>Avatar &amp; bio</h3>
        <p class="section-note">Shown next to your posts you write on this browser.</p>
        <form data-form="avatar">
          <div class="avatar-row">
            ${
              user.avatar
                ? `<img class="avatar" src="${user.avatar}" alt="" />`
                : `<div class="avatar" aria-hidden="true"></div>`
            }
            <input type="file" accept="image/*" name="avatar" />
          </div>
          <div class="field">
            <label for="bio">Bio</label>
            <textarea id="bio" name="bio" rows="3">${escapeHtml(user.bio || "")}</textarea>
          </div>
          <button type="submit" class="btn btn-ghost btn-small">Save bio &amp; avatar</button>
        </form>
      </section>

      <section class="profile-section">
        <h3>Username</h3>
        <p class="section-note">Renaming updates your existing posts too.</p>
        <form data-form="username">
          <div class="field">
            <label for="newUsername">New username</label>
            <input id="newUsername" name="newUsername" type="text" minlength="2" value="${escapeHtml(session)}" required />
          </div>
          <button type="submit" class="btn btn-ghost btn-small">Update username</button>
        </form>
      </section>

      <section class="profile-section">
        <h3>Password</h3>
        <p class="section-note">Enter your current password to set a new one.</p>
        <form data-form="password">
          <div class="field">
            <label for="currentPassword">Current password</label>
            <input id="currentPassword" name="currentPassword" type="password" required />
          </div>
          <div class="field">
            <label for="newPassword">New password</label>
            <input id="newPassword" name="newPassword" type="password" minlength="4" required />
          </div>
          <button type="submit" class="btn btn-ghost btn-small">Update password</button>
        </form>
      </section>

      <section class="profile-section danger-zone">
        <h3>Delete account</h3>
        <p class="section-note">Removes your account and every post you've written. This can't be undone.</p>
        <button type="button" class="btn btn-danger" data-action="delete-account">Delete my account</button>
      </section>

    </div>`;
}

/* ---------- actions: auth ---------- */

function handleRegister(form) {
  const username = form.username.value.trim();
  const password = form.password.value;
  const users = getUsers();

  if (users[username]) {
    state.error = "That username is already taken.";
    render();
    return;
  }

  users[username] = {
    passwordHash: simpleHash(password),
    bio: "",
    avatar: "",
    createdAt: new Date().toISOString(),
  };
  saveUsers(users);
  setSession(username);
  clearFlash();
  state.view = "feed";
  render();
}

function handleLogin(form) {
  const username = form.username.value.trim();
  const password = form.password.value;
  const users = getUsers();
  const user = users[username];

  if (!user || user.passwordHash !== simpleHash(password)) {
    state.error = "Username or password is incorrect.";
    render();
    return;
  }

  setSession(username);
  clearFlash();
  state.view = "feed";
  render();
}

function handleLogout() {
  setSession(null);
  clearFlash();
  state.view = "auth";
  state.authMode = "login";
  render();
}

/* ---------- actions: posts ---------- */

function handleSavePost(form, session) {
  const title = form.title.value.trim();
  const body = form.body.value.trim();
  const image = form.imageData.value || null;
  const editingId = form.dataset.id;

  if (!title || !body) {
    state.error = "A post needs both a title and some text.";
    render();
    return;
  }

  const posts = getPosts();
  const now = new Date().toISOString();

  if (editingId) {
    const idx = posts.findIndex((p) => p.id === editingId);
    if (idx !== -1) {
      posts[idx] = { ...posts[idx], title, body, image, updatedAt: now };
    }
  } else {
    posts.push({
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      author: session,
      title,
      body,
      image,
      createdAt: now,
      updatedAt: now,
    });
  }

  savePosts(posts);
  clearFlash();
  state.editingPostId = null;
  state.pendingImage = null;
  state.view = "feed";
  render();
}

function handleEditPost(id) {
  state.editingPostId = id;
  state.pendingImage = null;
  clearFlash();
  state.view = "editor";
  render();
}

function handleDeletePost(id) {
  if (!confirm("Delete this post? This can't be undone.")) return;
  const posts = getPosts().filter((p) => p.id !== id);
  savePosts(posts);
  render();
}

/* ---------- actions: profile ---------- */

function handleUpdateUsername(form, session) {
  const newUsername = form.newUsername.value.trim();
  if (newUsername === session) return;

  const users = getUsers();
  if (users[newUsername]) {
    state.error = "That username is already taken.";
    render();
    return;
  }

  users[newUsername] = users[session];
  delete users[session];
  saveUsers(users);

  const posts = getPosts().map((p) =>
    p.author === session ? { ...p, author: newUsername } : p
  );
  savePosts(posts);

  setSession(newUsername);
  state.error = "";
  state.success = "Username updated.";
  render();
}

function handleUpdatePassword(form, session) {
  const current = form.currentPassword.value;
  const next = form.newPassword.value;
  const users = getUsers();
  const user = users[session];

  if (user.passwordHash !== simpleHash(current)) {
    state.error = "Current password is incorrect.";
    render();
    return;
  }

  user.passwordHash = simpleHash(next);
  saveUsers(users);
  state.error = "";
  state.success = "Password updated.";
  render();
}

function handleUpdateAvatarBio(form, session, avatarData) {
  const users = getUsers();
  const user = users[session];
  user.bio = form.bio.value.trim();
  if (avatarData !== undefined) user.avatar = avatarData;
  saveUsers(users);
  state.error = "";
  state.success = "Profile saved.";
  render();
}

function handleDeleteAccount(session) {
  if (
    !confirm(
      "Delete your account and all your posts? This can't be undone."
    )
  )
    return;

  const users = getUsers();
  delete users[session];
  saveUsers(users);

  const posts = getPosts().filter((p) => p.author !== session);
  savePosts(posts);

  setSession(null);
  clearFlash();
  state.view = "auth";
  render();
}

/* ---------- event wiring (delegated) ---------- */

root.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target;
  const session = getSession();

  if (form.dataset.form === "login") handleLogin(form);
  else if (form.dataset.form === "register") handleRegister(form);
  else if (form.dataset.form === "post") handleSavePost(form, session);
  else if (form.dataset.form === "username") handleUpdateUsername(form, session);
  else if (form.dataset.form === "password") handleUpdatePassword(form, session);
  else if (form.dataset.form === "avatar") {
    const fileInput = form.avatar;
    const file = fileInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => handleUpdateAvatarBio(form, session, reader.result);
      reader.readAsDataURL(file);
    } else {
      handleUpdateAvatarBio(form, session, undefined);
    }
  }

});

root.addEventListener("click", (e) => {
  const target = e.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const session = getSession();

  if (action === "toggle-auth-mode") {
    state.authMode = state.authMode === "login" ? "register" : "login";
    clearFlash();
    render();
  } else if (action === "nav") {
    state.view = target.dataset.view;
    state.editingPostId = null;
    state.pendingImage = null;
    clearFlash();
    render();
  } else if (action === "logout") {
    handleLogout();
  } else if (action === "edit-post") {
    handleEditPost(target.dataset.id);
  } else if (action === "delete-post") {
    handleDeletePost(target.dataset.id);
  } else if (action === "cancel-editor") {
    state.editingPostId = null;
    state.pendingImage = null;
    clearFlash();
    state.view = "feed";
    render();
  } else if (action === "remove-image") {
    state.pendingImage = null;
    const editing = state.editingPostId
      ? getPosts().find((p) => p.id === state.editingPostId)
      : null;
    if (editing) editing.image = null; // cleared visually only until saved
    render();
  } else if (action === "delete-account") {
    handleDeleteAccount(session);
  }

});

root.addEventListener("change", (e) => {
  if (e.target.dataset.action === "pick-image") {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.pendingImage = reader.result;
      render();
    };
    reader.readAsDataURL(file);
  }
});

/* ---------- boot ---------- */

const existingSession = getSession();
state.view = existingSession ? "feed" : "auth";
render();