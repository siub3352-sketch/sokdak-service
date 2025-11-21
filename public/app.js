// ===============================
// Supabase 연결
// ===============================
const SUPABASE_URL = "https://effnciiebondujprjhio.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZm5jaWllYm9uZHVqcHJqaGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MzQ5MDYsImV4cCI6MjA3OTMxMDkwNn0.abm_hxGYDTsZjP-5MT93IBo_HoIgHQANJj1PMsKkh3c";

const supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// 전역 상태
// ===============================
let posts = [];
let currentSort = "latest";
let currentFilterTag = "";
let editingPostId = null;

// DOM
const postListEl = document.getElementById("postList");
const listInfoEl = document.getElementById("listInfo");
const sortSelectEl = document.getElementById("sortSelect");
const tagFilterListEl = document.getElementById("tagFilterList");

// ===============================
// 시간 포맷
// ===============================
function timeToKoreanString(ts) {
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();

  const sec = diff / 1000;
  if (sec < 60) return "방금 전";
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}일 전`;

  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
}

// ===============================
// 게시물 불러오기
// ===============================
async function loadPosts() {
  let query = supa.from("posts").select("*");

  if (currentSort === "latest")
    query = query.order("created_at", { ascending: false });
  else
    query = query.order("likes", { ascending: false });

  if (currentFilterTag) {
    query = query.contains("tags", [currentFilterTag]);
  }

  const { data, error } = await query;
  if (error) {
    alert("글 불러오기 오류: " + error.message);
    return;
  }

  posts = data;
  renderPosts();
}

// ===============================
// 태그 버튼 렌더링
// ===============================
function renderTagFilterButtons() {
  tagFilterListEl.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className = "btn-tag" + (currentFilterTag === "" ? " active" : "");
  allBtn.textContent = "전체";
  allBtn.onclick = () => { currentFilterTag = ""; loadPosts(); };
  tagFilterListEl.appendChild(allBtn);

  const tagSet = new Set();
  posts.forEach(p => p.tags?.forEach(t => tagSet.add(t)));

  tagSet.forEach(tag => {
    const btn = document.createElement("button");
    btn.className = "btn-tag" + (currentFilterTag === tag ? " active" : "");
    btn.textContent = "#" + tag;
    btn.onclick = () => { currentFilterTag = tag; loadPosts(); };
    tagFilterListEl.appendChild(btn);
  });
}

// ===============================
// 게시물 렌더링
// ===============================
function renderPosts() {
  postListEl.innerHTML = "";
  listInfoEl.textContent = `(${posts.length}개)`;

  if (posts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "아직 올라온 고민이 없어요.";
    postListEl.appendChild(empty);
    return;
  }

  posts.forEach(post => {
    const card = document.createElement("div");
    card.className = "post-card";

    card.innerHTML = `
      <div class="post-header">
        <div class="post-title">${post.title}</div>
        <div>${post.is_premium ? "<span class='badge-premium'>프리미엄</span>" : ""}</div>
      </div>

      <div class="post-meta">
        <span class="nickname-pill">${post.nickname}</span>
        <span>${timeToKoreanString(post.created_at)}</span>
        <span>💗 ${post.likes}</span>
      </div>

      <div class="post-tags">
        ${(post.tags || []).map(t => `<span>#${t}</span>`).join("")}
      </div>

      <div class="post-actions">
        <div class="post-actions-left">
          <button class="btn-outline" onclick="toggleDetail(${post.id})">자세히 보기</button>
          <button class="btn-outline" onclick="likePost(${post.id})">공감</button>
        </div>
        <div class="post-actions-right">
          <button class="btn-outline" onclick="startEdit(${post.id})">수정</button>
          <button class="btn-outline" onclick="deletePost(${post.id})">삭제</button>
        </div>
      </div>
    `;

    postListEl.appendChild(card);
  });

  renderTagFilterButtons();
}

// ===============================
// 글 작성
// ===============================
document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();
  const tags = document.getElementById("tags").value.split(",").map(t => t.trim()).filter(Boolean);
  const password = document.getElementById("password").value.trim();
  const isPremium = document.getElementById("isPremium").checked;
  const nickname = "익명" + Math.floor(Math.random()*9000+1000);

  if (!title) return alert("제목을 입력해주세요.");
  if (password.length < 4) return alert("비밀번호는 4자리 이상");

  if (editingPostId) {
    await supa.from("posts").update({
      title, content, tags, password, is_premium: isPremium
    }).eq("id", editingPostId);

    editingPostId = null;
    document.getElementById("submitBtn").textContent = "작성 완료";
    alert("수정되었습니다.");
  } else {
    await supa.from("posts").insert([{
      title, content, tags, password, is_premium: isPremium,
      likes: 0,
      nickname
    }]);
    alert("등록 완료!");
  }

  e.target.reset();
  loadPosts();
});

// ===============================
// 공감
// ===============================
async function likePost(id) {
  await supa.rpc("increment_likes", { post_id: id });
  loadPosts();
}

// ===============================
// 초기 로딩
// ===============================
loadPosts();
