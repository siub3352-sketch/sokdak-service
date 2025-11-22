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
function formatTime(timeString) {
  const date = new Date(timeString);
  const now = new Date();
  const diffHours = Math.floor((now - date) / (1000 * 60 * 60));

  if (diffHours < 1) return " 방금 전";
  if (diffHours < 24) return ` ${diffHours}시간 전`;
  return ` ${Math.floor(diffHours / 24)}일 전`;
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

  // 게시글 데이터 가져오기
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (error || !data) {
    alert("상세 정보를 불러오는 중 오류가 발생했습니다.");
    return;
  }

  // 카드 아래에 펼쳐질 영역
  const area = document.getElementById(`commentArea_${postId}`);

  // 이미 열려 있으면 닫기
  if (!area.classList.contains("hidden")) {
    area.classList.add("hidden");
    area.innerHTML = "";
    return;
  }

  // 상세보기 UI
  area.classList.remove("hidden");
  area.innerHTML = `
    <div class="detail-box">
      <p>${data.content}</p>

      <h4 style="margin-top:10px;">댓글</h4>
      <div id="comments_${postId}" class="comment-list">불러오는 중...</div>

      <textarea id="commentInput_${postId}" class="comment-input" placeholder="댓글을 입력하세요"></textarea>
      <button class="btn primary" onclick="submitComment(${postId})">댓글 남기기</button>
    </div>
  `;

  loadComments(postId);
}


// ===============================
// 댓글 목록 불러오기
// ===============================
async function loadComments(postId) {
  const target = document.getElementById(`comments_${postId}`);
  if (!target) return;

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    target.innerHTML = "<p class='muted'>댓글을 불러오지 못했습니다.</p>";
    return;
  }

  if (!data || data.length === 0) {
    target.innerHTML = "<p class='muted'>아직 댓글이 없어요.</p>";
    return;
  }

  target.innerHTML = data
    .map(
      (c) => `
      <div class="comment-card">
        <strong>${c.nickname}</strong> · ${formatTime(c.created_at)}
        <p>${c.content}</p>
        <button class="btn-list del-comment-btn" onclick="deleteComment(${c.id})">삭제</button>
      </div>
    `
    )
    .join("");
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
