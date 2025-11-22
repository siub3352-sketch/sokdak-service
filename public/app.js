// ===============================
// Supabase 초기화
// ===============================
const SUPABASE_URL = "https://effnciiebondujprjhio.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZm5jaWllYm9uZHVqcHJqaGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MzQ5MDYsImV4cCI6MjA3OTMxMDkwNn0.abm_hxGYDTsZjP-5MT93IBo_HoIgHQANJj1PMsKkh3c";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 현재 상세보기 중인 게시글 ID 저장 (댓글 갱신용)
let currentDetailPostId = null;

// ===============================
// 시간 포맷 함수
// ===============================
function timeToKoreanString(ts) {
  // Supabase UTC → 한국시간(KST) 변환
  const date = new Date(ts);
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);

  const diff = Date.now() - kst.getTime(); 

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "방금 전";

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;

  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;

  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;

  return `${kst.getFullYear()}.${String(kst.getMonth() + 1).padStart(2, "0")}.${String(
    kst.getDate()
  ).padStart(2, "0")}`;
}


// ===============================
// 글 작성
// ===============================
document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();
  const password = document.getElementById("password").value.trim();
  const tagText = document.getElementById("tags").value.trim();
  const isPremium = document.getElementById("isPremiumInput").checked;


  if (!title || !content) {
    alert("제목과 내용을 입력해주세요!");
    return;
  }
  if (password.length < 4) {
    alert("비밀번호는 4자리 이상이어야 합니다.");
    return;
  }

  // 태그: #으로 구분
  const tags = tagText
    .split("#")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const nickname = "익명" + Math.floor(1000 + Math.random() * 9000);

  const { error } = await supabase.from("posts").insert([
    {
      title,
      content,
      nickname,
      password,
      tags,
      is_premium: isPremium,
    },
  ]);

  if (error) {
    console.error(error);
    alert("글 등록 중 오류가 발생했습니다.");
    return;
  }

  alert("등록 완료!");
  e.target.reset();
  loadPosts();
});

// ===============================
// 글 목록 로드
// ===============================
async function loadPosts() {
  const sort = document.getElementById("sortSelect").value;

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order(sort === "latest" ? "created_at" : "likes", { ascending: false });

  if (error) {
    console.error(error);
    alert("글 목록을 불러오는 중 오류가 발생했습니다.");
    return;
  }

  renderPosts(data);
}

// ===============================
// 글 목록 렌더링
// ===============================
function renderPosts(posts) {
  const list = document.getElementById("postList");
  list.innerHTML = "";

  document.getElementById("listInfo").innerText = `(${posts.length}개)`;

  posts.forEach((post) => {
    const html = `
      <div class="post-card ${post.is_premium ? "premium" : ""}">
        <b>${post.title}</b><br>
        <span class="small">익명${post.nickname.slice(2)} · ${formatTime(
      post.created_at
    )} 💗 ${post.likes}</span>

        <div class="tag-line">
          ${post.tags.map((t) => `<span class="tag">#${t}</span>`).join(" ")}
        </div>

        <div class="post-btn-row">
          <button class="btn-list" onclick="openDetail(${post.id})">자세히 보기</button>
          <button class="btn-list" onclick="startEditPost(${post.id})">수정</button>
          <button class="btn-list danger" onclick="deletePost(${post.id})">삭제</button>
        </div>

        <div id="commentArea_${post.id}" class="hidden"></div>
      </div>
    `;
    list.innerHTML += html;
  });
}

// ===============================
// 상세보기
// ===============================
async function openDetail(postId) {
  currentDetailPostId = postId;

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (error) return;

  const modal = document.getElementById("detailModal");
  modal.querySelector(".detail-title").innerText = data.title;
  modal.querySelector(".detail-content").innerText = data.content;
  modal.querySelector(".detail-likes").innerText = `💗 ${data.likes}`;

  modal.classList.remove("hidden");

  loadComments(postId);
}

// ===============================
// 댓글 목록 불러오기
// ===============================
async function loadComments(postId) {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  const commentBox = document.getElementById(`commentArea_${postId}`);

  if (!commentBox) return;

  if (!data || data.length === 0) {
    commentBox.innerHTML = "<p class='muted'>댓글이 아직 없습니다.</p>";
    return;
  }

  let html = "<h4>댓글</h4>";

  data.forEach((c) => {
    html += `
      <div class="comment-card">
        <b>${c.nickname}</b> · ${formatTime(c.created_at)}<br>
        ${c.content}
        <button class="btn-list del-comment-btn" onclick="deleteComment(${c.id})">삭제</button>
      </div>
    `;
  });

  // 댓글 입력창 생성
  html += `
    <textarea id="commentInput_${postId}" class="comment-input" placeholder="익명으로 따뜻한 한마디를 남겨주세요."></textarea>
    <button class="btn primary" onclick="submitComment(${postId})">댓글 남기기</button>
  `;

  commentBox.classList.remove("hidden");
  commentBox.innerHTML = html;
}

// ===============================
// 댓글 작성
// ===============================
async function submitComment(postId) {
  const input = document.getElementById(`commentInput_${postId}`);
  const content = input.value.trim();

  if (!content) return alert("따뜻한 한마디를 남겨주세요.");

  const nickname = "익명" + Math.floor(1000 + Math.random() * 9000);

  const { error } = await supabase.from("comments").insert([
    { post_id: postId, content, nickname },
  ]);

  if (error) {
    console.error(error);
    alert("댓글 등록 중 오류가 발생했습니다.");
    return;
  }

  input.value = "";
  loadComments(postId);
}

// ===============================
// 댓글 삭제
// ===============================
async function deleteComment(commentId) {
  const ok = confirm("정말 삭제하시겠습니까?");
  if (!ok) return;

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    console.error(error);
    alert("댓글 삭제 중 오류가 발생했습니다.");
    return;
  }

  loadComments(currentDetailPostId);
}

// ===============================
// 게시글 삭제
// ===============================
async function deletePost(id) {
  const pw = prompt("삭제 비밀번호를 입력하세요:");
  if (!pw) return;

  const { data, error } = await supabase
    .from("posts")
    .select("password")
    .eq("id", id)
    .single();

  if (error) return alert("삭제 중 오류 발생");

  if (data.password !== pw) return alert("비밀번호가 일치하지 않습니다!");

  await supabase.from("posts").delete().eq("id", id);

  alert("삭제되었습니다.");
  loadPosts();
}

// ===============================
// 게시글 수정 모드
// ===============================
async function startEditPost(id) {
  const pw = prompt("수정 비밀번호를 입력하세요:");
  if (!pw) return;

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return alert("수정 중 오류 발생");

  if (pw !== data.password) return alert("비밀번호가 일치하지 않습니다!");

  document.getElementById("title").value = data.title;
  document.getElementById("content").value = data.content;
  document.getElementById("tags").value = data.tags
    .map((t) => "#" + t)
    .join(" ");
  document.getElementById("password").value = data.password;
  document.getElementById("isPremium").checked = data.is_premium;

  document.getElementById("submitBtn").innerText = "수정 완료";

  editingPostId = id;
}

// ===============================
// 초기 실행
// ===============================
loadPosts();
