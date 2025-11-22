// =======================================================
// Supabase 연결
// =======================================================
const SUPABASE_URL = "https://effnciiebondujprjhio.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZm5jaWllYm9uZHVqcHJqaGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MzQ5MDYsImV4cCI6MjA3OTMxMDkwNn0.abm_hxGYDTsZjP-5MT93IBo_HoIgHQANJj1PMsKkh3c";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =======================================================
// 전역 변수
// =======================================================
let posts = [];
let comments = [];
let currentSort = "latest";
let currentFilterTag = "";
let editingPostId = null;

// DOM 선택
const postListEl = document.getElementById("postList");
const listInfoEl = document.getElementById("listInfo");
const sortSelectEl = document.getElementById("sortSelect");
const tagFilterListEl = document.getElementById("tagFilterList");
const postForm = document.getElementById("postForm");
const submitBtn = document.getElementById("submitBtn");

const titleInput = document.getElementById("title");
const contentInput = document.getElementById("content");
const tagsInput = document.getElementById("tags");
const passwordInput = document.getElementById("password");
const isPremiumInput = document.getElementById("isPremium");

// =======================================================
// 한국식 시간 표시
// =======================================================
function timeToKoreanString(ts) {
  // UTC → 한국시간(+9시간) 보정
  const created = new Date(ts).getTime() + 9 * 60 * 60 * 1000;

  const diff = Date.now() - created;
  const sec = Math.floor(diff / 1000);

  if (sec < 60) return "방금 전";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;

  const d = new Date(created);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}


// =======================================================
// 글 목록 불러오기
// =======================================================
async function loadPosts() {
  let query = supabase.from("posts").select("*");

  if (currentFilterTag) {
    query = query.contains("tags", [currentFilterTag]);
  }

  if (currentSort === "latest") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("likes", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    alert("글 불러오기 오류: " + error.message);
    return;
  }

  posts = data;
  renderPosts();
}

// =======================================================
// 태그 필터 버튼 렌더링
// =======================================================
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
  posts.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));

  tagSet.forEach((tag) => {
    const btn = document.createElement("button");
    btn.textContent = "#" + tag;
    btn.className = "btn-tag" + (tag === currentFilterTag ? " active" : "");
    btn.onclick = () => {
      currentFilterTag = tag;
      loadPosts();
    };
    tagFilterListEl.appendChild(btn);
  });
}

// =======================================================
// 글 목록 렌더링
// =======================================================
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

  posts.forEach((post) => {
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

      <div class="post-actions">
        <button class="btn-outline" onclick="toggleDetail(${post.id})">자세히 보기</button>
        <button class="btn-outline" onclick="likePost(${post.id})">공감</button>
        <button class="btn-outline" onclick="startEditPost(${post.id})">수정</button>
        <button class="btn-outline" onclick="deletePost(${post.id})">삭제</button>
      </div>
    `;

    postListEl.appendChild(card);
  });

  renderTagFilterButtons();
}

// =======================================================
// 상세 보기 (댓글 포함)
// =======================================================
async function toggleDetail(postId) {
  const card = [...postListEl.children].find((el) =>
    el.innerHTML.includes(`toggleDetail(${postId})`)
  );
  const exist = card.querySelector(".detail");
  if (exist) {
    exist.remove();
    return;
  }

  const { data: commentData } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  comments = commentData || [];

  const detail = document.createElement("div");
  detail.className = "detail";

  const post = posts.find((p) => p.id === postId);

  detail.innerHTML = `
    <div class="detail-body">${post.content || "(내용 없음)"}</div>
    <div class="comment-title">댓글 / 답변</div>
    <div class="comment-list"></div>
    <textarea class="comment-input" placeholder="#으로 태그를 구분하세요. 예시: #친구 #학교 #연애"></textarea>
    <button class="btn-primary comment-submit">댓글 남기기</button>
  `;

  const commentListEl = detail.querySelector(".comment-list");
  const inputEl = detail.querySelector(".comment-input");
  const submitBtnEl = detail.querySelector(".comment-submit");
  submitBtnEl.onclick = async () => {
  const text = inputEl.value.trim();
  
  if (!text) return alert("댓글 내용을 입력해주세요.");

  await addComment(post.id, text);
  inputEl.value = "";
  await loadComments(post.id);
};


  function renderComments() {
    commentListEl.innerHTML = "";

    if (comments.length === 0) {
      commentListEl.innerHTML = `<div class="muted">아직 답변이 없어요.</div>`;
      return;
    }

    comments.forEach((c) => {
      const voteCount = c.votes ?? 0;

      const el = document.createElement("div");
      el.className = "comment-card";

      el.innerHTML = `
        <div class="comment-header">
          <span>${c.nickname}</span>
          <span>${timeToKoreanString(c.created_at)}</span>
        </div>
        <div>${c.content}</div>
        <button class="btn-tag vote-btn">도움돼요 (${voteCount})</button>
      `;

      el.querySelector(".vote-btn").onclick = async () => {
        await voteComment(c.id);
        const { data: updated } = await supabase
          .from("comments")
          .select("*")
          .eq("post_id", postId);
        comments = updated;
        renderComments();
      };

      commentListEl.appendChild(el);
    });
  }

  submitBtnEl.onclick = async () => {
    const text = inputEl.value.trim();
    if (!text) return alert("댓글 내용을 입력해 주세요.");

    const nickname = "익명" + Math.floor(Math.random() * 9999);

    await supabase.from("comments").insert([
      {
        post_id: postId,
        content: text,
        nickname,
        votes: 0,
      },
    ]);

    inputEl.value = "";

    const { data: updated } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId);

    comments = updated;
    renderComments();
  };

  renderComments();

  card.appendChild(detail);
}

// =======================================================
// 댓글 좋아요
// =======================================================
async function voteComment(commentId) {
  await supabase.rpc("increment_comment_votes", { comment_id: commentId });
}

// =======================================================
// 글 좋아요
// =======================================================
async function likePost(id) {
  await supabase.rpc("increment_likes", { post_id: id });
  loadPosts();
}

// =======================================================
// 글 작성/수정 (+ 태그 # 기반 파싱)
// =======================================================
postForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  // -------------------------
  //  # 해시태그 기반 파싱
  // -------------------------
  const rawTag = tagsInput.value;
  const tags = rawTag
    .split("#")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const password = passwordInput.value;
  const isPremium = isPremiumInput.checked;

  if (!title) return alert("제목을 입력해주세요.");
  if (password.length < 4) return alert("비밀번호는 4자리 이상");

  const nickname = "익명" + Math.floor(Math.random() * 9999);

  if (editingPostId) {
    const pw = prompt("비밀번호를 입력하세요.");
    if (pw !== password) return alert("비밀번호가 일치하지 않습니다.");

    const { error } = await supabase
      .from("posts")
      .update({ title, content, tags, password, is_premium: isPremium })
      .eq("id", editingPostId);

    if (error) return alert("수정 실패");
    editingPostId = null;
    submitBtn.textContent = "작성 완료";
    alert("수정 완료!");
  } else {
    const { error } = await supabase
      .from("posts")
      .insert([{ title, content, tags, password, is_premium: isPremium, nickname }]);

    if (error) return alert("등록 오류: " + error.message);

    alert("등록 완료!");
  }

  postForm.reset();
  loadPosts();
});

// =======================================================
// 글 삭제
// =======================================================
async function deletePost(id) {
  const pw = prompt("이 글의 비밀번호를 입력해주세요.");
  if (pw === null) return;

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();
  if (post.password !== pw) return alert("비밀번호 불일치");

  await supabase.from("posts").delete().eq("id", id);
  loadPosts();
}

// =======================================================
// 초기 로딩
// =======================================================
sortSelectEl.addEventListener("change", () => {
  currentSort = sortSelectEl.value;
  loadPosts();
});

loadPosts();
// ===============================
// 수정하기: 비밀번호 확인 후 폼에 데이터 채워넣기
// ===============================
function startEditPost(id, password) {
  // 먼저 비밀번호 확인
  const pw = prompt("이 글의 비밀번호를 입력해주세요.");
  if (!pw) return;

  // DB에서 해당 글 찾기
  supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single()
    .then(({ data, error }) => {
      if (error || !data) {
        alert("글을 불러오지 못했습니다.");
        return;
      }

      // 비밀번호 일치 검사
      if (data.password !== pw) {
        alert("비밀번호가 일치하지 않습니다.");
        return;
      }

      // 수정 모드로 전환
      editingPostId = id;

      // form에 기존 값 채워넣기
      document.querySelector("#title").value = data.title;
      document.querySelector("#content").value = data.content;
      document.querySelector("#tags").value = data.tags.join(" ");
      document.querySelector("#password").value = pw;
      document.querySelector("#isPremium").checked = data.is_premium;

      // 버튼 문구 변경
      document.querySelector("#submitBtn").textContent = "수정 완료";

      // 화면 맨 위로 이동
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
}
// ===============================
// 댓글 불러오기
// ===============================
async function loadComments(postId) {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("댓글 불러오기 오류:", error);
    return;
  }

  renderCommentList(data, postId);
}

// ===============================
// 댓글 리스트 렌더링
// ===============================
function renderCommentList(comments, postId) {
  const commentBox = document.querySelector(`#comment-box-${postId}`);
  if (!commentBox) return;

  commentBox.innerHTML = "";

  if (comments.length === 0) {
    commentBox.innerHTML = `<div class="muted">아직 댓글이 없어요.</div>`;
    return;
  }

  comments.forEach((c) => {
    const div = document.createElement("div");
    div.className = "comment-item";

    div.innerHTML = `
      <div class="comment-header">
        <b>${c.nickname}</b>
        <span class="comment-time">${timeToKoreanString(c.created_at)}</span>
      </div>
      <div class="comment-content">${c.content}</div>
      <button class="btn-tag" onclick="voteComment(${c.id}, ${postId})">
        도움이 돼요 (${c.votes})
      </button>
    `;

    commentBox.appendChild(div);
  });
}

// ===============================
// 댓글 작성
// ===============================
async function addComment(postId, content) {
  const nickname = "익명" + Math.floor(Math.random() * 9999);

  const { error } = await supabase.from("comments").insert([
    {
      post_id: postId,
      content,
      nickname
    }
  ]);

  if (error) {
    alert("댓글 등록 오류: " + error.message);
    return;
  }

  loadComments(postId);
}

