//-----------------------------------------------------
// Supabase 연결
//-----------------------------------------------------
const SUPABASE_URL = "https://effnciiebondujprjhio.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZm5jaWllYm9uZHVqcHJqaGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MzQ5MDYsImV4cCI6MjA3OTMxMDkwNn0.abm_hxGYDTsZjP-5MT93IBo_HoIgHQANJj1PMsKkh3c";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

//-----------------------------------------------------
// 전역 상태
//-----------------------------------------------------
let posts = [];
let currentSort = "latest";
let currentFilterTag = "";
let editingPostId = null;

//-----------------------------------------------------
// 시간 포맷
//-----------------------------------------------------
function formatTime(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;

  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;

  const d = new Date(ts);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

//-----------------------------------------------------
// 게시글 목록 불러오기
//-----------------------------------------------------
async function loadPosts() {
  let query = db.from("posts").select("*");

  if (currentFilterTag) {
    query = query.contains("tags", [currentFilterTag]);
  }

  query = query.order(currentSort === "latest" ? "created_at" : "likes", {
    ascending: false,
  });

  const { data, error } = await query;

  if (error) {
    console.error(error);
    alert("글 목록 불러오기 오류");
    return;
  }

  posts = data;
  renderPosts();
}

//-----------------------------------------------------
// 태그 버튼 렌더링
//-----------------------------------------------------
function renderTags() {
  const tagBox = document.getElementById("tagFilterList");
  tagBox.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className = "btn-tag" + (currentFilterTag === "" ? " active" : "");
  allBtn.textContent = "전체";
  allBtn.onclick = () => {
    currentFilterTag = "";
    loadPosts();
  };
  tagBox.appendChild(allBtn);

  const tagSet = new Set();
  posts.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));

  tagSet.forEach((tag) => {
    const btn = document.createElement("button");
    btn.className = "btn-tag" + (currentFilterTag === tag ? " active" : "");
    btn.textContent = "#" + tag;
    btn.onclick = () => {
      currentFilterTag = tag;
      loadPosts();
    };
    tagBox.appendChild(btn);
  });
}

//-----------------------------------------------------
// 게시글 목록 렌더링
//-----------------------------------------------------
function renderPosts() {
  const list = document.getElementById("postList");
  const info = document.getElementById("listInfo");

  list.innerHTML = "";
  info.textContent = `(${posts.length}개)`;

  if (posts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "아직 등록된 고민이 없어요.";
    list.appendChild(empty);
    return;
  }

  posts.forEach((p) => {
    const card = document.createElement("div");
    card.className = "post-card";

    card.innerHTML = `
      <div class="post-title">
        ${p.is_premium ? "✨ " : ""}${p.title}
      </div>
      <div class="muted" style="font-size: 13px;">
        ${formatTime(p.created_at)} · 공감 ${p.likes}
      </div>

    <button class="btn-list" onclick="toggleDetail(${p.id})">자세히 보기</button>
    <button class="btn-list" onclick="likePost(${p.id})">공감하기</button>
    <button class="btn-list" onclick="editPost(${p.id})">수정</button>
    <button class="btn-list" onclick="deletePost(${p.id})">삭제</button>

      <div id="detail-${p.id}" class="detail-box" style="display:none;"></div>
    `;

    list.appendChild(card);
  });

  renderTags();
}

//-----------------------------------------------------
// 상세보기 토글 + 댓글 불러오기
//-----------------------------------------------------
async function toggleDetail(id) {
  const target = document.getElementById(`detail-${id}`);

  if (target.style.display === "block") {
    target.style.display = "none";
    return;
  }

  target.style.display = "block";
  target.innerHTML = "불러오는 중...";

  const { data: post } = await db.from("posts").select("*").eq("id", id).single();

  const { data: comments } = await db
    .from("comments")
    .select("*")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  let html = `
    <div><b>내용</b><br>${post.content}</div>
    <hr>
    <div><b>댓글</b></div>
  `;

  if (!comments || comments.length === 0) {
    html += `<div class="muted">아직 댓글이 없습니다.</div>`;
  } else {
    comments.forEach((c) => {
      html += `
        <div class="comment-card">
          <div><b>${c.nickname}</b> · ${formatTime(c.created_at)}</div>
          <div>${c.content}</div>
          <button class="btn-vote" onclick="voteComment(${c.id}, ${id})">
          도움돼요 (${c.votes})
          </button>

        </div>
      `;
    });
  }

  html += `
    <textarea id="cmt-${id}" placeholder="댓글을 입력하세요"></textarea>
    <button class="btn-comment" onclick="addComment(${id})">댓글 작성</button>
  `;

  target.innerHTML = html;
}

//-----------------------------------------------------
// 댓글 작성
//-----------------------------------------------------
async function addComment(postId) {
  const text = document.getElementById(`cmt-${postId}`).value.trim();
  if (!text) return alert("댓글을 입력해주세요.");

  const nickname = "익명" + Math.floor(Math.random() * 9999);

  await db.from("comments").insert([
    {
      post_id: postId,
      content: text,
      nickname,
    },
  ]);

  toggleDetail(postId);
  toggleDetail(postId);
}

//-----------------------------------------------------
// 댓글 도움돼요(투표)
//-----------------------------------------------------
async function voteComment(commentId, postId) {
  await db.rpc("increment_comment_votes", { comment_id: commentId });

  toggleDetail(postId);
  toggleDetail(postId);
}

//-----------------------------------------------------
// 게시글 공감
//-----------------------------------------------------
async function likePost(id) {
  await db.rpc("increment_likes", { post_id: id });
  loadPosts();
}

//-----------------------------------------------------
// 게시글 수정 준비
//-----------------------------------------------------
async function editPost(id) {
  const pw = prompt("비밀번호를 입력하세요.");
  if (!pw) return;

  const { data: post } = await db.from("posts").select("*").eq("id", id).single();

  if (post.password !== pw) return alert("비밀번호가 일치하지 않습니다!");

  document.getElementById("titleInput").value = post.title;
  document.getElementById("contentInput").value = post.content;
  document.getElementById("tagsInput").value = post.tags.join(", ");
  document.getElementById("passwordInput").value = pw;
  document.getElementById("isPremiumInput").checked = post.is_premium;

  editingPostId = id;
  document.getElementById("submitBtn").textContent = "수정 완료";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

//-----------------------------------------------------
// 게시글 삭제
//-----------------------------------------------------
async function deletePost(id) {
  const pw = prompt("삭제 비밀번호를 입력하세요.");
  if (!pw) return;

  const { data: post } = await db.from("posts").select("*").eq("id", id).single();
  if (post.password !== pw) return alert("비밀번호가 일치하지 않습니다!");

  if (!confirm("정말 삭제하시겠어요?")) return;

  await db.from("posts").delete().eq("id", id);
  loadPosts();
}

//-----------------------------------------------------
// 게시글 작성 / 수정
//-----------------------------------------------------
document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const tags = tagsInput.value
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t);
  const pw = passwordInput.value.trim();
  const premium = isPremiumInput.checked;

  if (!title) return alert("제목을 입력해주세요.");
  if (pw.length < 4) return alert("4자리 이상의 비밀번호를 입력해주세요.");

  const nickname = "익명" + Math.floor(Math.random() * 9999);

  if (editingPostId) {
    await db
      .from("posts")
      .update({
        title,
        content,
        tags,
        password: pw,
        is_premium: premium,
      })
      .eq("id", editingPostId);

    alert("수정되었습니다!");
    editingPostId = null;
    submitBtn.textContent = "작성 완료";
  } else {
    await db.from("posts").insert([
      { title, content, tags, password: pw, is_premium: premium, nickname },
    ]);

    alert("등록되었습니다!");
  }

  e.target.reset();
  loadPosts();
});

//-----------------------------------------------------
// 정렬 변경
//-----------------------------------------------------
document.getElementById("sortSelect").addEventListener("change", () => {
  currentSort = sortSelect.value;
  loadPosts();
});

//-----------------------------------------------------
// 초기 실행
//-----------------------------------------------------
loadPosts();
