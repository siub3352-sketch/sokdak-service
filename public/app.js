/* =======================================================
   Supabase 연결
======================================================= */
const SUPABASE_URL = "https://effnciiebondujprjhio.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZm5jaWllYm9uZHVqcHJqaGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MzQ5MDYsImV4cCI6MjA3OTMxMDkwNn0.abm_hxGYDTsZjP-5MT93IBo_HoIgHQANJj1PMsKkh3c";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* =======================================================
   전역 변수
======================================================= */
let currentDetailPostId = null;

/* =======================================================
   한국식 시간 표시
======================================================= */
function formatTime(ts) {
  const t = new Date(ts);
  const diff = (Date.now() - t.getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${t.getFullYear()}.${t.getMonth() + 1}.${t.getDate()}`;
}

/* =======================================================
   글 목록 가져오기
======================================================= */
async function loadPosts() {
  const sort = document.getElementById("sortSelect").value;

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order(sort === "latest" ? "created_at" : "likes", { ascending: false });

  if (error) {
    alert("글 불러오기 오류");
    return;
  }

  renderPosts(data || []);
}

/* =======================================================
   글 목록 렌더링
======================================================= */
function renderPosts(posts) {
  const list = document.getElementById("postList");
  const info = document.getElementById("listInfo");

  list.innerHTML = "";
  info.innerText = `(${posts.length}개)`;

  posts.forEach((p) => {
    const tags =
      p.tags?.map((t) => `<span class="tag">#${t}</span>`).join(" ") || "";

    const el = document.createElement("div");
    el.className = "post-card";
    el.innerHTML = `
      <div class="post-title">${p.title}</div>
      <div class="small">${p.nickname} · ${formatTime(p.created_at)} · 💗 ${
      p.likes ?? 0
    }</div>
      <div class="tag-line">${tags}</div>

      <div class="post-btn-row">
        <button class="btn-list" onclick="openDetail(${p.id})">자세히 보기</button>
        <button class="btn-list" onclick="likePost(${p.id})">공감</button>
        <button class="btn-list" onclick="startEditPost(${p.id})">수정</button>
        <button class="btn-list danger" onclick="deletePost(${p.id})">삭제</button>
      </div>
    `;

    list.appendChild(el);
  });
}

/* =======================================================
   상세보기 모달 열기
======================================================= */
async function openDetail(id) {
  currentDetailPostId = id;

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return alert("상세보기 오류");

  // 모달 채우기
  detailTitle.innerText = data.title;
  detailContent.innerText = data.content;
  detailNickname.innerText = data.nickname;
  detailTime.innerText = formatTime(data.created_at);
  detailLikes.innerText = `💗 ${data.likes ?? 0}`;
  detailTags.innerHTML =
    data.tags?.map((t) => `<span class="tag">#${t}</span>`).join(" ") || "";

  // 댓글 로드
  loadComments(id);

  // 모달 열기
  document.getElementById("detailModal").classList.remove("hidden");
}

/* =======================================================
   상세보기 닫기
======================================================= */
closeDetail.addEventListener("click", () => {
  document.getElementById("detailModal").classList.add("hidden");
});

/* =======================================================
   댓글 목록 로드
======================================================= */
async function loadComments(postId) {
  const { data } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  const list = document.getElementById("commentList");
  list.innerHTML = "";

  if (!data || data.length === 0) {
    list.innerHTML = `<div class="muted">아직 댓글이 없어요.</div>`;
    return;
  }

  data.forEach((c) => {
    const el = document.createElement("div");
    el.className = "comment-card";
    el.innerHTML = `
      <b>${c.nickname}</b> · ${formatTime(c.created_at)}<br>
      ${c.content}
      <button class="btn-list danger small" onclick="deleteComment(${c.id})">삭제</button>
    `;
    list.appendChild(el);
  });
}

/* =======================================================
   댓글 작성
======================================================= */
addCommentBtn.addEventListener("click", async () => {
  const content = commentInput.value.trim();
  if (!content) return alert("댓글 내용을 입력해 주세요.");

  const nickname = "익명" + Math.floor(1000 + Math.random() * 9000);

  await supabase.from("comments").insert([
    { post_id: currentDetailPostId, content, nickname },
  ]);

  commentInput.value = "";
  loadComments(currentDetailPostId);
});

/* =======================================================
   댓글 삭제
======================================================= */
async function deleteComment(id) {
  if (!confirm("정말 댓글을 삭제하시겠습니까?")) return;

  await supabase.from("comments").delete().eq("id", id);

  loadComments(currentDetailPostId);
}

/* =======================================================
   글 공감
======================================================= */
async function likePost(id) {
  await supabase
    .from("posts")
    .update({ likes: supabase.sql`likes + 1` })
    .eq("id", id);

  loadPosts();
}

/* =======================================================
   글 삭제
======================================================= */
async function deletePost(id) {
  const pw = prompt("글 비밀번호를 입력하세요:");
  if (!pw) return;

  const { data } = await supabase
    .from("posts")
    .select("password")
    .eq("id", id)
    .single();

  if (!data || data.password !== pw) return alert("비밀번호가 틀렸습니다.");

  await supabase.from("posts").delete().eq("id", id);

  alert("삭제되었습니다!");
  loadPosts();
}

/* =======================================================
   글 수정 모드
======================================================= */
async function startEditPost(id) {
  const pw = prompt("수정 비밀번호를 입력하세요:");
  if (!pw) return;

  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (!data || data.password !== pw)
    return alert("비밀번호가 일치하지 않습니다.");

  // form 채우기
  title.value = data.title;
  content.value = data.content;
  tags.value = data.tags.map((t) => `#${t}`).join(" ");
  password.value = data.password;
  isPremium.checked = !!data.is_premium;

  editingPostId = id;
  submitBtn.innerText = "수정 완료";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =======================================================
   글 작성 / 수정
======================================================= */
postForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const titleV = title.value.trim();
  const contentV = content.value.trim();
  const passwordV = password.value.trim();
  const tagsArr = tags.value
    .split("#")
    .map((t) => t.trim())
    .filter((t) => t);

  if (!titleV || !contentV) return alert("제목과 내용을 입력하세요.");
  if (passwordV.length < 4) return alert("비밀번호는 4자리 이상");

  if (editingPostId) {
    await supabase
      .from("posts")
      .update({
        title: titleV,
        content: contentV,
        tags: tagsArr,
        password: passwordV,
        is_premium: isPremium.checked,
      })
      .eq("id", editingPostId);

    alert("수정되었습니다!");
    editingPostId = null;
    submitBtn.innerText = "작성 완료";
  } else {
    const nickname = "익명" + Math.floor(1000 + Math.random() * 9000);

    await supabase.from("posts").insert([
      {
        title: titleV,
        content: contentV,
        tags: tagsArr,
        password: passwordV,
        nickname,
        is_premium: isPremium.checked,
        likes: 0,
      },
    ]);

    alert("등록되었습니다!");
  }

  postForm.reset();
  loadPosts();
});

/* =======================================================
   초기 실행
======================================================= */
loadPosts();
