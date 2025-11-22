// ===============================
// Supabase 연결
// ===============================
const SUPABASE_URL = "https://effnciiebondujprjhio.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZm5jaWllYm9uZHVqcHJqaGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MzQ5MDYsImV4cCI6MjA3OTMxMDkwNn0.abm_hxGYDTsZjP-5MT93IBo_HoIgHQANJj1PMsKkh3c";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// 전역 상태
// ===============================
let posts = [];
let currentSort = "latest";
let currentFilterTag = "";

let currentDetailPostId = null;

// ===============================
// DOM 요소
// ===============================
const postListEl = document.getElementById("postList");
const listInfoEl = document.getElementById("listInfo");
const sortSelectEl = document.getElementById("sortSelect");
const tagFilterListEl = document.getElementById("tagFilterList");

const modal = document.getElementById("detailModal");
const detailTitle = document.getElementById("detailTitle");
const detailContent = document.getElementById("detailContent");
const detailTags = document.getElementById("detailTags");
const detailNickname = document.getElementById("detailNickname");
const detailTime = document.getElementById("detailTime");
const detailComments = document.getElementById("detailComments");
const detailCommentInput = document.getElementById("detailCommentInput");

const btnClose = document.getElementById("detailCloseBtn");
const btnEdit = document.getElementById("detailEditBtn");
const btnDelete = document.getElementById("detailDeleteBtn");
const btnLike = document.getElementById("detailLikeBtn");
const btnCommentSubmit = document.getElementById("detailCommentSubmit");

// ===============================
// 시간 포맷
// ===============================
function timeToKoreanString(ts) {
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
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}.${String(d.getDate()).padStart(2, "0")}`;
}

// ===============================
// 글 목록 불러오기
// ===============================
async function loadPosts() {
  let query = supabase.from("posts").select("*").order("id", { ascending: false });

  if (currentFilterTag) {
    query = query.contains("tags", [currentFilterTag]);
  }

  if (currentSort === "likes") {
    query = query.order("likes", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    alert("글 불러오기 오류: " + error.message);
    return;
  }

  posts = data;
  renderPosts();
  renderTagFilterButtons();
}

// ===============================
// 태그 필터 버튼 렌더링
// ===============================
function renderTagFilterButtons() {
  tagFilterListEl.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.textContent = "전체";
  allBtn.className = "tag-btn" + (currentFilterTag === "" ? " active" : "");
  allBtn.onclick = () => {
    currentFilterTag = "";
    loadPosts();
  };
  tagFilterListEl.appendChild(allBtn);

  const tagSet = new Set();
  posts.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));

  tagSet.forEach((tag) => {
    const btn = document.createElement("button");
    btn.textContent = "#" + tag;
    btn.className = "tag-btn" + (currentFilterTag === tag ? " active" : "");
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

  posts.forEach((p) => {
    const box = document.createElement("div");
    box.className = "post-card";

    box.innerHTML = `
      <strong>${p.title}</strong>  
      <p class="muted">${p.nickname} · ${timeToKoreanString(p.created_at)} 💗 ${p.likes}</p>
      <div>
        <button class="btn small" onclick="openDetail(${p.id})">자세히 보기</button>
        <button class="btn small" onclick="likePost(${p.id})">공감</button>
      </div>
    `;

    postListEl.appendChild(box);
  });
}

// ===============================
// 자세히 보기 모달 열기
// ===============================
async function openDetail(postId) {
  currentDetailPostId = postId;

  const { data, error } = await supabase.from("posts").select("*").eq("id", postId).single();

  if (error) {
    alert("불러오기 오류: " + error.message);
    return;
  }

  const p = data;

  detailTitle.innerText = p.title;
  detailContent.innerText = p.content;
  detailNickname.innerText = p.nickname;
  detailTime.innerText = timeToKoreanString(p.created_at);

  detailTags.innerHTML = p.tags.map((t) => `<span class="tag">#${t}</span>`).join("");

  await loadComments(postId);

  modal.classList.remove("hidden");
}

// ===============================
// 모달 닫기
// ===============================
btnClose.onclick = () => modal.classList.add("hidden");

// ===============================
// 댓글 불러오기
// ===============================
async function loadComments(postId) {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("id", { ascending: true });

  if (error) {
    alert("댓글 불러오기 오류");
    return;
  }

  detailComments.innerHTML = "";

  data.forEach((c) => {
    const cbox = document.createElement("div");
    cbox.className = "comment-box";

    cbox.innerHTML = `
      <strong>${c.nickname}</strong> · ${timeToKoreanString(c.created_at)}
      <br>${c.content}
      <br><button class="btn small delete" onclick="deleteComment(${c.id})">삭제</button>
      <hr>
    `;

    detailComments.appendChild(cbox);
  });
}

// ===============================
// 댓글 작성
// ===============================
btnCommentSubmit.onclick = async () => {
  const content = detailCommentInput.value.trim();
  if (!content) return alert("댓글을 입력해주세요!");

  const nickname = "익명" + Math.floor(Math.random() * 9999);

  const { error } = await supabase.from("comments").insert([
    {
      post_id: currentDetailPostId,
      content,
      nickname,
    },
  ]);

  if (error) {
    alert("댓글 등록 오류");
    return;
  }

  detailCommentInput.value = "";
  loadComments(currentDetailPostId);
};

// ===============================
// 댓글 삭제
// ===============================
async function deleteComment(id) {
  if (!confirm("정말 삭제하시겠습니까?")) return;

  const { error } = await supabase.from("comments").delete().eq("id", id);

  if (error) {
    alert("댓글 삭제 오류");
    return;
  }

  loadComments(currentDetailPostId);
}

// ===============================
// 공감
// ===============================
async function likePost(id) {
  const { error } = await supabase.rpc("increment_likes", { post_id: id });

  if (error) {
    alert("공감 오류");
    return;
  }

  loadPosts();
}

// ===============================
// 글 작성
// ===============================
document.getElementById("postForm").onsubmit = async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const password = passwordInput.value.trim();
  const tags = tagsInput.value
    .split("#")
    .map((t) => t.trim())
    .filter((t) => t);

  const isPremium = isPremiumInput.checked;
  const nickname = "익명" + Math.floor(Math.random() * 9999);

  if (!title || !content || password.length < 4) {
    return alert("입력값을 확인해주세요!");
  }

  const { error } = await supabase.from("posts").insert([
    { title, content, password, nickname, tags, is_premium: isPremium },
  ]);

  if (error) {
    alert("등록 오류");
    return;
  }

  e.target.reset();
  loadPosts();
};

// ===============================
loadPosts();
