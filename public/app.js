// ===============================
// Supabase 연결
// ===============================
const SUPABASE_URL = "https://effnciiebondujprjhio.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZm5jaWllYm9uZHVqcHJqaGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MzQ5MDYsImV4cCI6MjA3OTMxMDkwNn0.abm_hxGYDTsZjP-5MT93IBo_HoIgHQANJj1PMsKkh3c";

// supabase 라이브러리 객체는 window.supabase로 제공됨 → client 인스턴스 생성
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// 전역 상태
// ===============================
let posts = [];
let currentSort = "latest";
let currentFilterTag = "";
let editingPostId = null;

// DOM 요소
const postListEl = document.getElementById("postList");
const listInfoEl = document.getElementById("listInfo");
const sortSelectEl = document.getElementById("sortSelect");
const tagFilterListEl = document.getElementById("tagFilterList");
const postForm = document.getElementById("postForm");
const submitBtn = document.getElementById("submitBtn");

// form 요소
const titleInput = document.getElementById("title");
const contentInput = document.getElementById("content");
const tagsInput = document.getElementById("tags");
const passwordInput = document.getElementById("password");
const isPremiumInput = document.getElementById("isPremium");

// ===============================
// 시간 포맷
// ===============================
function timeToKoreanString(ts) {
  if (!ts) return "방금 전";

  const diff = Date.now() - new Date(ts).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "방금 전";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;

  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// ===============================
// 글 목록 불러오기
// ===============================
async function loadPosts() {
  let query = client.from("posts").select("*");

  if (currentFilterTag) query = query.contains("tags", [currentFilterTag]);

  if (currentSort === "latest") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("likes", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    alert("글 목록 불러오기 오류: " + error.message);
    return;
  }

  posts = data || [];
  renderPosts();
}

// ===============================
// 태그 필터 버튼 생성
// ===============================
function renderTagFilterButtons() {
  tagFilterListEl.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.textContent = "전체";
  allBtn.className = "btn-tag" + (currentFilterTag === "" ? " active" : "");
  allBtn.onclick = () => {
    currentFilterTag = "";
    loadPosts();
  };
  tagFilterListEl.appendChild(allBtn);

  const tagSet = new Set();
  posts.forEach((p) => p.tags?.forEach((t) => tagSet.add(t)));

  tagSet.forEach((tag) => {
    const btn = document.createElement("button");
    btn.textContent = "#" + tag;
    btn.className = "btn-tag" + (currentFilterTag === tag ? " active" : "");
    btn.onclick = () => {
      currentFilterTag = tag;
      loadPosts();
    };
    tagFilterListEl.appendChild(btn);
  });
}

// ===============================
// 글 목록 렌더링
// ===============================
function renderPosts() {
  postListEl.innerHTML = "";
  listInfoEl.textContent = `(${posts.length}개)`;

  if (posts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "아직 올라온 고민이 없어요!";
    postListEl.appendChild(empty);
    return;
  }

  posts.forEach((post) => {
    const card = document.createElement("div");
    card.className = "post-card";

    const premiumTag = post.is_premium
      ? "<span class='badge-premium'>프리미엄</span>"
      : "";

    card.innerHTML = `
      <div class="post-header">
        <div class="post-title">${post.title}</div>
        <div>${premiumTag}</div>
      </div>

      <div class="post-meta">
        <span class="nickname-pill">${post.nickname}</span>
        <span>${timeToKoreanString(post.created_at)}</span>
        <span>💗 ${post.likes}</span>
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "post-actions";

    const left = document.createElement("div");
    const btnDetail = document.createElement("button");
    btnDetail.className = "btn-outline";
    btnDetail.textContent = "자세히";
    btnDetail.onclick = () => toggleDetail(card, post);
    left.appendChild(btnDetail);

    const btnLike = document.createElement("button");
    btnLike.className = "btn-outline";
    btnLike.textContent = "공감";
    btnLike.onclick = () => likePost(post.id);
    left.appendChild(btnLike);

    const right = document.createElement("div");
    const btnEdit = document.createElement("button");
    btnEdit.className = "btn-outline";
    btnEdit.textContent = "수정";
    btnEdit.onclick = () => startEditPost(post);
    right.appendChild(btnEdit);

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn-outline";
    btnDelete.textContent = "삭제";
    btnDelete.onclick = () => deletePost(post.id);
    right.appendChild(btnDelete);

    actions.appendChild(left);
    actions.appendChild(right);
    card.appendChild(actions);

    postListEl.appendChild(card);
  });

  renderTagFilterButtons();
}

// ===============================
// 글 작성 / 수정
// ===============================
postForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const password = passwordInput.value;
  const tags = tagsInput.value
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  const isPremium = isPremiumInput.checked;

  if (!title) return alert("제목을 입력하세요.");
  if (password.length < 4) return alert("비밀번호는 4자리 이상 입력하세요.");

  const nickname = "익명" + Math.floor(Math.random() * 9999);

  if (editingPostId) {
    const { error } = await client
      .from("posts")
      .update({ title, content, tags, password, is_premium: isPremium })
      .eq("id", editingPostId);

    if (error) return alert("수정 오류: " + error.message);
    alert("수정 완료!");
    editingPostId = null;
    submitBtn.textContent = "작성 완료";
  } else {
    const { error } = await client.from("posts").insert([
      {
        title,
        content,
        tags,
        password,
        is_premium: isPremium,
        nickname,
        likes: 0,
      },
    ]);

    if (error) return alert("등록 오류: " + error.message);
    alert("등록 완료!");
  }

  postForm.reset();
  loadPosts();
});

// ===============================
// 공감
// ===============================
async function likePost(id) {
  await client.rpc("increment_likes", { post_id: id });
  loadPosts();
}

// ===============================
// 상세 보기 (댓글 포함)
// ===============================
async function toggleDetail(cardEl, post) {
  const existing = cardEl.querySelector(".detail");
  if (existing) {
    existing.remove();
    return;
  }

  const detail = document.createElement("div");
  detail.className = "detail";

  const body = document.createElement("div");
  body.className = "detail-body";
  body.textContent = post.content || "(내용 없음)";
  detail.appendChild(body);

  cardEl.appendChild(detail);
}

// ===============================
// 초기 로딩
// ===============================
loadPosts();
