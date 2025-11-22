//------------------------------------------------------
// 1) Supabase 연결
//------------------------------------------------------
const SUPABASE_URL = "https://effnciiebondujprjhio.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZm5jaWllYm9uZHVqcHJqaGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MzQ5MDYsImV4cCI6MjA3OTMxMDkwNn0.abm_hxGYDTsZjP-5MT93IBo_HoIgHQANJj1PMsKkh3c";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

//------------------------------------------------------
// 2) 전역 변수
//------------------------------------------------------
let posts = [];
let currentSort = "latest";
let currentFilterTag = "";
let editingPostId = null;

// DOM 요소
const postListEl = document.getElementById("postList");
const listInfoEl = document.getElementById("listInfo");
const sortSelectEl = document.getElementById("sortSelect");
const tagFilterListEl = document.getElementById("tagFilterList");

// 글 작성 폼 요소
const postForm = document.getElementById("postForm");
const titleInput = document.getElementById("title");
const contentInput = document.getElementById("content");
const tagsInput = document.getElementById("tags");
const passwordInput = document.getElementById("password");
const isPremiumInput = document.getElementById("isPremium");
const submitBtn = document.getElementById("submitBtn");

//------------------------------------------------------
// 3) 시간 포맷
//------------------------------------------------------
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

//------------------------------------------------------
// 4) 태그 파싱 (#친구 #연애)
//------------------------------------------------------
function parseTags(str) {
  if (!str.trim()) return [];
  return str
    .split("#")
    .map((t) => t.trim())
    .filter((t) => t !== "");
}

//------------------------------------------------------
// 5) 글 불러오기
//------------------------------------------------------
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
  if (error) return alert("글을 불러오는 중 오류 발생");

  posts = data || [];
  renderPosts();
  renderTagFilterButtons();
}

// 정렬 변경
sortSelectEl.addEventListener("change", () => {
  currentSort = sortSelectEl.value;
  loadPosts();
});

//------------------------------------------------------
// 6) 태그 버튼 렌더링
//------------------------------------------------------
function renderTagFilterButtons() {
  tagFilterListEl.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className = "btn-tag" + (currentFilterTag === "" ? " active" : "");
  allBtn.textContent = "전체";
  allBtn.onclick = () => {
    currentFilterTag = "";
    loadPosts();
  };
  tagFilterListEl.appendChild(allBtn);

  const tagSet = new Set();
  posts.forEach((p) => (p.tags || []).forEach((t) => tagSet.add(t)));

  tagSet.forEach((tag) => {
    const btn = document.createElement("button");
    btn.className =
      "btn-tag" + (currentFilterTag === tag ? " active" : "");
    btn.textContent = "#" + tag;
    btn.onclick = () => {
      currentFilterTag = tag;
      loadPosts();
    };
    tagFilterListEl.appendChild(btn);
  });
}

//------------------------------------------------------
// 7) 글 목록 렌더링
//------------------------------------------------------
function renderPosts() {
  postListEl.innerHTML = "";
  listInfoEl.textContent = `(${posts.length}개)`;

  if (posts.length === 0) {
    postListEl.innerHTML =
      '<div class="muted">아직 올라온 고민이 없어요!</div>';
    return;
  }

  posts.forEach((post) => {
    const card = document.createElement("div");
    card.className = "post-card";

    // 제목 + 배지
    const header = document.createElement("div");
    header.className = "post-header";

    const titleEl = document.createElement("div");
    titleEl.className = "post-title";
    titleEl.textContent = post.title;

    const right = document.createElement("div");
    if (post.is_premium) {
      const badge = document.createElement("span");
      badge.className = "badge-premium";
      badge.textContent = "프리미엄";
      right.appendChild(badge);
    }

    header.appendChild(titleEl);
    header.appendChild(right);

    // 메타 정보
    const meta = document.createElement("div");
    meta.className = "post-meta";
    meta.innerHTML = `
      <span>${post.nickname}</span>
      <span>${timeToKoreanString(post.created_at)}</span>
      <span>💗 ${post.likes}</span>
    `;

    // 태그
    const tagRow = document.createElement("div");
    tagRow.className = "post-tags";
    (post.tags || []).forEach((t) => {
      const s = document.createElement("span");
      s.textContent = "#" + t;
      tagRow.appendChild(s);
    });

    // 버튼들
    const actions = document.createElement("div");
    actions.className = "post-actions";

    const detailBtn = document.createElement("button");
    detailBtn.className = "btn-outline";
    detailBtn.textContent = "자세히 보기";
    detailBtn.onclick = () => toggleDetail(card, post);

    const likeBtn = document.createElement("button");
    likeBtn.className = "btn-outline";
    likeBtn.textContent = "공감";
    likeBtn.onclick = () => likePost(post.id);

    const editBtn = document.createElement("button");
    editBtn.className = "btn-outline";
    editBtn.textContent = "수정";
    editBtn.onclick = () => startEditPost(post);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-outline";
    deleteBtn.textContent = "삭제";
    deleteBtn.onclick = () => deletePost(post.id);

    actions.appendChild(detailBtn);
    actions.appendChild(likeBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(tagRow);
    card.appendChild(actions);

    postListEl.appendChild(card);
  });
}

//------------------------------------------------------
// 8) 글 작성 / 수정
//------------------------------------------------------
postForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const pw = passwordInput.value.trim();
  const tags = parseTags(tagsInput.value);
  const isPremium = isPremiumInput.checked;

  if (!title) return alert("제목을 입력해주세요.");
  if (!content) return alert("내용을 입력해주세요.");
  if (!pw || pw.length < 4)
    return alert("비밀번호는 4자리 이상 입력해주세요.");

  if (editingPostId) {
    // 수정
    const { error } = await supabase
      .from("posts")
      .update({
        title,
        content,
        tags,
        password: pw,
        is_premium: isPremium,
      })
      .eq("id", editingPostId);

    if (error) return alert("수정 중 오류 발생");

    editingPostId = null;
    submitBtn.textContent = "작성 완료";
    postForm.reset();
    alert("수정되었습니다.");
  } else {
    // 새 글
    const nickname = "익명" + Math.floor(Math.random() * 9999);

    const { error } = await supabase.from("posts").insert([
      {
        title,
        content,
        tags,
        password: pw,
        is_premium: isPremium,
        nickname,
        likes: 0,
      },
    ]);

    if (error) return alert("등록 중 오류 발생");

    postForm.reset();
    alert("작성되었습니다!");
  }

  loadPosts();
});

//------------------------------------------------------
// 9) 글 수정 모드
//------------------------------------------------------
function startEditPost(post) {
  const pw = prompt("비밀번호를 입력해주세요.");
  if (pw !== post.password) return alert("비밀번호가 틀렸습니다.");

  editingPostId = post.id;

  titleInput.value = post.title;
  contentInput.value = post.content;
  tagsInput.value =
    post.tags.length > 0 ? "#" + post.tags.join(" #") : "";
  passwordInput.value = pw;
  isPremiumInput.checked = post.is_premium;
  submitBtn.textContent = "수정 완료";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

//------------------------------------------------------
// 10) 글 삭제
//------------------------------------------------------
async function deletePost(id) {
  const post = posts.find((p) => p.id === id);
  const pw = prompt("비밀번호를 입력해주세요.");
  if (pw !== post.password) return alert("비밀번호가 틀렸습니다.");

  if (!confirm("정말 삭제할까요?")) return;

  await supabase.from("posts").delete().eq("id", id);
  loadPosts();
}

//------------------------------------------------------
// 11) 공감
//------------------------------------------------------
async function likePost(id) {
  const post = posts.find((p) => p.id === id);
  const newLikes = (post.likes || 0) + 1;

  await supabase
    .from("posts")
    .update({ likes: newLikes })
    .eq("id", id);

  loadPosts();
}

//------------------------------------------------------
// 12) 상세 보기 + 댓글 시스템 (A 방식)
//------------------------------------------------------
async function toggleDetail(cardEl, post) {
  // 이미 detail 열려있으면 제거 (접기)
  const existing = cardEl.querySelector(".detail");
  if (existing) {
    existing.remove();
    return;
  }

  // detail 박스 생성
  const detail = document.createElement("div");
  detail.className = "detail";

  detail.innerHTML = `
    <div class="detail-body">
      ${post.content}
    </div>

    <h4 style="margin-bottom:4px;">댓글</h4>
    <div class="comment-list" id="comment-list-${post.id}">
      <div class="muted">불러오는 중...</div>
    </div>

    <textarea class="comment-input" id="comment-input-${post.id}"
      placeholder="따뜻한 한마디를 남겨주세요"></textarea>

    <button class="btn primary comment-submit"
      id="comment-submit-${post.id}">
      댓글 남기기
    </button>
  `;

  cardEl.appendChild(detail);

  // 댓글 불러오기
  loadComments(post.id);

  // 댓글 작성 버튼 이벤트 연결
  const submitBtn = document.getElementById(
    `comment-submit-${post.id}`
  );
  const inputEl = document.getElementById(
    `comment-input-${post.id}`
  );

  submitBtn.onclick = async () => {
    const text = inputEl.value.trim();
    if (!text) return alert("댓글 내용을 입력해주세요.");

    const nickname = "익명" + Math.floor(Math.random() * 9999);

    const { error } = await supabase.from("comments").insert([
      {
        post_id: post.id,
        content: text,
        nickname,
        votes: 0,
      },
    ]);

    if (error) {
      console.error(error);
      return alert("댓글 등록 중 오류 발생");
    }

    inputEl.value = "";
    loadComments(post.id);
  };
}

//------------------------------------------------------
// 13) 댓글 불러오기
//------------------------------------------------------
async function loadComments(postId) {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const listEl = document.getElementById(`comment-list-${postId}`);
  listEl.innerHTML = "";

  if (!data || data.length === 0) {
    listEl.innerHTML = `<div class="muted">아직 댓글이 없어요.</div>`;
    return;
  }

  data.forEach((c) => {
    const div = document.createElement("div");
    div.className = "comment-item";

    div.innerHTML = `
      <div class="comment-header">
        <span><b>${c.nickname}</b></span>
        <span class="comment-time">${timeToKoreanString(
          c.created_at
        )}</span>
      </div>

      <div class="comment-content">${c.content}</div>

      <button class="btn-tag"
        onclick="voteComment(${c.id}, ${postId})">
        도움이 됐어요 (${c.votes})
      </button>
    `;
    listEl.appendChild(div);
  });
}

//------------------------------------------------------
// 14) 댓글 도움돼요 (투표)
//------------------------------------------------------
async function voteComment(commentId, postId) {
  const { data: cmt } = await supabase
    .from("comments")
    .select("*")
    .eq("id", commentId)
    .single();

  const newVotes = (cmt.votes || 0) + 1;

  await supabase
    .from("comments")
    .update({ votes: newVotes })
    .eq("id", commentId);

  loadComments(postId);
}

//------------------------------------------------------
// 초기 로딩
//------------------------------------------------------
loadPosts();
