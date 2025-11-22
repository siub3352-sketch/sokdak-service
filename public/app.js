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
let editingPostId = null;
let currentSort = "latest";
let currentFilterTag = "";

// ===============================
// 요소 가져오기
// ===============================
const postListEl = document.getElementById("postList");
const sortSelectEl = document.getElementById("sortSelect");
const tagFilterListEl = document.getElementById("tagFilterList");
const listInfoEl = document.getElementById("listInfo");

// ===============================
// 시간 함수
// ===============================
function formatTime(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return "방금 전";
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

// ===============================
// 글 불러오기
// ===============================
async function loadPosts() {
  let query = supabase.from("posts").select("*");

  if (currentFilterTag) {
    query = query.contains("tags", [currentFilterTag]);
  }

  if (currentSort === "likes") {
    query = query.order("likes", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    alert("글 목록 불러오기 오류");
    return;
  }

  renderPosts(data || []);
  renderTagFilterButtons(data || []);
}

// ===============================
// 태그 버튼 렌더링
// ===============================
function renderTagFilterButtons(posts) {
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
function renderPosts(posts) {
  postListEl.innerHTML = "";
  listInfoEl.textContent = `(${posts.length}개)`;

  posts.forEach((p) => {
    const card = document.createElement("div");
    card.className = "post-card";

    card.innerHTML = `
      <strong>${p.title}</strong>
      <p class="muted">${p.nickname} · ${formatTime(p.created_at)} · 💗 ${p.likes}</p>

      <div class="tag-line">${p.tags.map((t) => `<span class="tag">#${t}</span>`).join("")}</div>

      <div class="post-btn-row">
        <button class="btn small" onclick="toggleDetail(${p.id}, this)">자세히 보기</button>
        <button class="btn small" onclick="likePost(${p.id})">공감</button>
        <button class="btn small" onclick="editPost(${p.id})">수정</button>
        <button class="btn small delete" onclick="deletePost(${p.id})">삭제</button>
      </div>
    `;

    postListEl.appendChild(card);
  });
}

// ===============================
// 상세보기 (카드 아래 펼침)
// ===============================
async function toggleDetail(postId, btn) {
  const card = btn.closest(".post-card");
  const existing = card.querySelector(".detail-box");
  if (existing) {
    existing.remove();
    return;
  }

  const { data, error } = await supabase.from("posts").select("*").eq("id", postId).single();
  if (error) return alert("상세보기 오류");

  const box = document.createElement("div");
  box.className = "detail-box";

  box.innerHTML = `
    <p>${data.content}</p>

    <div id="comments-${postId}"></div>

    <textarea id="commentInput-${postId}" placeholder="댓글을 입력하세요"></textarea>
    <button class="btn small" onclick="addComment(${postId})">댓글 작성</button>
  `;

  card.appendChild(box);

  loadComments(postId);
}

// ===============================
// 댓글 불러오기
// ===============================
async function loadComments(postId) {
  const target = document.getElementById(`comments-${postId}`);
  if (!target) return;

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) return;

  target.innerHTML = data
    .map(
      (c) => `
      <div class="comment">
        <strong>${c.nickname}</strong> · ${formatTime(c.created_at)}
        <p>${c.content}</p>
        <button class="btn small delete" onclick="deleteComment(${c.id}, ${postId})">삭제</button>
      </div>
    `
    )
    .join("");
}

// ===============================
// 댓글 작성
// ===============================
async function addComment(postId) {
  const input = document.getElementById(`commentInput-${postId}`);
  const text = input.value.trim();
  if (!text) return alert("댓글을 입력하세요!");

  const nickname = "익명" + Math.floor(Math.random() * 9999);

  await supabase.from("comments").insert([{ post_id: postId, content: text, nickname }]);

  input.value = "";
  loadComments(postId);
}

// ===============================
// 댓글 삭제
// ===============================
async function deleteComment(commentId, postId) {
  if (!confirm("정말 삭제하시겠습니까?")) return;

  await supabase.from("comments").delete().eq("id", commentId);
  loadComments(postId);
}

// ===============================
// 공감
// ===============================
async function likePost(postId) {
  await supabase.rpc("increment_likes", { post_id: postId });
  loadPosts();
}

// ===============================
// 글 삭제
// ===============================
async function deletePost(id) {
  const pw = prompt("비밀번호를 입력하세요:");
  if (!pw) return;

  const { data } = await supabase.from("posts").select("password").eq("id", id).single();

  if (!data || data.password !== pw) return alert("비밀번호가 틀렸습니다.");

  await supabase.from("posts").delete().eq("id", id);

  alert("삭제되었습니다!");
  loadPosts();
}

// ===============================
// 글 수정
// ===============================
async function editPost(id) {
  const pw = prompt("수정 비밀번호를 입력하세요:");
  if (!pw) return;

  const { data } = await supabase.from("posts").select("*").eq("id", id).single();

  if (!data || data.password !== pw) {
    alert("비밀번호가 일치하지 않습니다.");
    return;
  }

  document.getElementById("title").value = data.title;
  document.getElementById("content").value = data.content;
  document.getElementById("tags").value = data.tags.map((t) => `#${t}`).join(" ");
  document.getElementById("password").value = data.password;
  document.getElementById("isPremium").checked = data.is_premium;

  editingPostId = id;
  document.getElementById("submitBtn").textContent = "수정 완료";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===============================
// 글 작성
// ===============================
document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();
  const password = document.getElementById("password").value.trim();
  const tags = document
    .getElementById("tags")
    .value.split("#")
    .map((t) => t.trim())
    .filter((t) => t);

  if (!title || !content) return alert("제목과 내용을 입력해주세요!");
  if (password.length < 4) return alert("비밀번호는 4자리 이상입니다!");

  if (editingPostId) {
    await supabase
      .from("posts")
      .update({ title, content, tags, password })
      .eq("id", editingPostId);

    editingPostId = null;
    document.getElementById("submitBtn").textContent = "작성 완료";
    alert("수정되었습니다!");
  } else {
    const nickname = "익명" + Math.floor(Math.random() * 9999);

    await supabase.from("posts").insert([{ title, content, password, tags, nickname, likes: 0 }]);

    alert("등록되었습니다!");
  }

  e.target.reset();
  loadPosts();
});

// ===============================
loadPosts();
