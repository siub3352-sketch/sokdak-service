// ===============================
// Supabase 연결
// ===============================
const SUPABASE_URL = "https://effnciiebondujprjhio.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZm5jaWllYm9uZHVqcHJqaGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MzQ5MDYsImV4cCI6MjA3OTMxMDkwNn0.abm_hxGYDTsZjP-5MT93IBo_HoIgHQANJj1PMsKkh3c";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// 전역 상태 & DOM 요소
// ===============================
let posts = [];
let currentSort = "latest";   // latest | likes
let currentFilterTag = "";
let editingPostId = null;

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

// ===============================
// 유틸
// ===============================
function timeToKoreanString(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "방금 전";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;

  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}.${String(d.getDate()).padStart(2, "0")}`;
}

// "#태그1 #태그2" → ["태그1","태그2"]
function parseTags(raw) {
  if (!raw) return [];
  return raw
    .split("#")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// 익명 닉네임 생성
function makeNickname() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `익명${num}`;
}

// ===============================
// 글 목록 불러오기
// ===============================
async function loadPosts() {
  let query = db.from("posts").select("*");

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
    console.error(error);
    alert("글 목록을 불러오는 중 오류가 발생했습니다.");
    return;
  }

  posts = data || [];
  renderPosts();
}

// ===============================
// 태그 필터 버튼 렌더링
// ===============================
function renderTagFilterButtons() {
  tagFilterListEl.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "tag-pill" + (currentFilterTag === "" ? " active" : "");
  allBtn.textContent = "전체";
  allBtn.onclick = () => {
    currentFilterTag = "";
    loadPosts();
  };
  tagFilterListEl.appendChild(allBtn);

  const tagSet = new Set();
  posts.forEach((p) => {
    if (Array.isArray(p.tags)) {
      p.tags.forEach((t) => tagSet.add(t));
    }
  });

  tagSet.forEach((tag) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "tag-pill" + (currentFilterTag === tag ? " active" : "");
    btn.textContent = `#${tag}`;
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
    empty.className = "muted center";
    empty.textContent = "아직 올라온 고민이 없어요. 첫 고민을 남겨볼까요?";
    postListEl.appendChild(empty);
    renderTagFilterButtons();
    return;
  }

  posts.forEach((post) => {
    const card = document.createElement("article");
    card.className = "post-card";

    // 헤더
    const header = document.createElement("div");
    header.className = "post-header";

    const titleEl = document.createElement("h3");
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

    // 메타
    const meta = document.createElement("div");
    meta.className = "post-meta";

    const nick = document.createElement("span");
    nick.className = "nickname-pill";
    nick.textContent = post.nickname;

    const time = document.createElement("span");
    time.textContent = timeToKoreanString(post.created_at);

    const like = document.createElement("span");
    like.textContent = `💗 ${post.likes ?? 0}`;

    meta.appendChild(nick);
    meta.appendChild(time);
    meta.appendChild(like);

    // 태그
    const tagRow = document.createElement("div");
    tagRow.className = "post-tags";
    if (Array.isArray(post.tags) && post.tags.length > 0) {
      post.tags.forEach((t) => {
        const span = document.createElement("span");
        span.textContent = `#${t}`;
        tagRow.appendChild(span);
      });
    }

    // 액션 버튼들
    const actions = document.createElement("div");
    actions.className = "post-actions";

    const leftBtns = document.createElement("div");
    leftBtns.className = "post-actions-left";

    const btnDetail = document.createElement("button");
    btnDetail.type = "button";
    btnDetail.className = "btn-outline small";
    btnDetail.textContent = "자세히 보기";
    btnDetail.onclick = () => toggleDetail(card, post);

    const btnLike = document.createElement("button");
    btnLike.type = "button";
    btnLike.className = "btn-outline small";
    btnLike.textContent = "공감";
    btnLike.onclick = () => likePost(post);

    leftBtns.appendChild(btnDetail);
    leftBtns.appendChild(btnLike);

    const rightBtns = document.createElement("div");
    rightBtns.className = "post-actions-right";

    const btnEdit = document.createElement("button");
    btnEdit.type = "button";
    btnEdit.className = "btn-outline small";
    btnEdit.textContent = "수정";
    btnEdit.onclick = () => startEditPost(post);

    const btnDelete = document.createElement("button");
    btnDelete.type = "button";
    btnDelete.className = "btn-outline small";
    btnDelete.textContent = "삭제";
    btnDelete.onclick = () => deletePost(post);

    rightBtns.appendChild(btnEdit);
    rightBtns.appendChild(btnDelete);

    actions.appendChild(leftBtns);
    actions.appendChild(rightBtns);

    card.appendChild(header);
    card.appendChild(meta);
    if (tagRow.children.length > 0) card.appendChild(tagRow);
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
  const isPremium = isPremiumInput.checked;
  const tags = parseTags(tagsInput.value);

  if (!title) {
    alert("제목을 입력해 주세요.");
    return;
  }
  if (!content) {
    alert("내용을 입력해 주세요.");
    return;
  }
  if (!password || password.length < 4) {
    alert("비밀번호를 4자리 이상 입력해 주세요.");
    return;
  }

  const nickname = makeNickname();

  try {
    if (editingPostId) {
      // 수정
      const { error } = await db
        .from("posts")
        .update({ title, content, tags, password, is_premium: isPremium })
        .eq("id", editingPostId);

      if (error) throw error;

      alert("글이 수정되었습니다.");
      editingPostId = null;
      submitBtn.textContent = "작성 완료";
    } else {
      // 새 글
      const { error } = await db.from("posts").insert([
        { title, content, password, nickname, is_premium: isPremium, tags },
      ]);
      if (error) throw error;

      alert("고민이 등록되었습니다.");
    }

    postForm.reset();
    await loadPosts();
  } catch (err) {
    console.error(err);
    alert("글 저장 중 오류가 발생했습니다.");
  }
});

// 수정 모드 시작
async function startEditPost(post) {
  const pw = prompt("이 글의 비밀번호를 입력해 주세요.");
  if (pw === null) return;
  if (!pw) {
    alert("비밀번호를 입력해 주세요.");
    return;
  }

  try {
    const { data, error } = await db
      .from("posts")
      .select("id")
      .eq("id", post.id)
      .eq("password", pw)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      alert("비밀번호가 올바르지 않습니다.");
      return;
    }

    titleInput.value = post.title;
    contentInput.value = post.content;
    tagsInput.value = Array.isArray(post.tags) ? "#" + post.tags.join(" #") : "";
    passwordInput.value = pw;
    isPremiumInput.checked = !!post.is_premium;

    editingPostId = post.id;
    submitBtn.textContent = "수정 완료";

    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    console.error(err);
    alert("비밀번호 확인 중 오류가 발생했습니다.");
  }
}

// 글 삭제
async function deletePost(post) {
  const pw = prompt("이 글의 비밀번호를 입력해 주세요. 삭제는 되돌릴 수 없습니다.");
  if (pw === null) return;
  if (!pw) {
    alert("비밀번호를 입력해 주세요.");
    return;
  }
  if (!confirm("정말 삭제할까요?")) return;

  try {
    // 비밀번호 검증
    const { data, error } = await db
      .from("posts")
      .select("id")
      .eq("id", post.id)
      .eq("password", pw)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      alert("비밀번호가 올바르지 않습니다.");
      return;
    }

    const { error: delErr } = await db
      .from("posts")
      .delete()
      .eq("id", post.id);

    if (delErr) throw delErr;

    alert("삭제되었습니다.");
    await loadPosts();
  } catch (err) {
    console.error(err);
    alert("삭제 중 오류가 발생했습니다.");
  }
}

// 공감(좋아요)
async function likePost(post) {
  try {
    const { error } = await db
      .from("posts")
      .update({ likes: (post.likes || 0) + 1 })
      .eq("id", post.id);

    if (error) throw error;
    await loadPosts();
  } catch (err) {
    console.error(err);
    alert("공감 처리 중 오류가 발생했습니다.");
  }
}

// ===============================
// 상세 보기 + 댓글
// ===============================
async function toggleDetail(cardEl, post) {
  const existing = cardEl.querySelector(".detail");
  if (existing) {
    existing.remove();
    return;
  }

  // 다른 카드 상세는 닫기
  document.querySelectorAll(".detail").forEach((el) => el.remove());

  // 댓글 불러오기
  let comments = [];
  try {
    const { data, error } = await db
      .from("comments")
      .select("*")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    comments = data || [];
  } catch (err) {
    console.error(err);
  }

  const detail = document.createElement("div");
  detail.className = "detail";

  const body = document.createElement("div");
  body.className = "detail-body";
  body.textContent = post.content || "(내용 없음)";

  const commentTitle = document.createElement("div");
  commentTitle.className = "comment-title";
  commentTitle.textContent = "댓글 / 답변";

  const commentListEl = document.createElement("div");
  commentListEl.className = "comment-list";

  function renderComments() {
    commentListEl.innerHTML = "";
    if (comments.length === 0) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "아직 답변이 없어요. 따뜻한 한마디를 남겨볼까요?";
      commentListEl.appendChild(empty);
      return;
    }

    comments.forEach((c) => {
      const cc = document.createElement("div");
      cc.className = "comment-card";

      const header = document.createElement("div");
      header.className = "comment-header";

      const left = document.createElement("span");
      left.className = "comment-nick";
      left.textContent = c.nickname;

      const right = document.createElement("span");
      right.className = "comment-time";
      right.textContent = timeToKoreanString(c.created_at);

      header.appendChild(left);
      header.appendChild(right);

      const cb = document.createElement("div");
      cb.className = "comment-body";
      cb.textContent = c.content;

      cc.appendChild(header);
      cc.appendChild(cb);
      commentListEl.appendChild(cc);
    });
  }

  renderComments();
  function renderComments() {
  commentListEl.innerHTML = "";

  if (comments.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "아직 답변이 없어요. 따뜻한 한마디를 남겨볼까요?";
    commentListEl.appendChild(empty);
    return;
  }

  comments.forEach((c) => {
    const cc = document.createElement("div");
    cc.className = "comment-card";

    // --- header ---
    const header = document.createElement("div");
    header.className = "comment-header";

    const left = document.createElement("span");
    left.className = "comment-nick";
    left.textContent = c.nickname;

    const rightWrap = document.createElement("div");
    rightWrap.className = "comment-right";

    const time = document.createElement("span");
    time.className = "comment-time";
    time.textContent = timeToKoreanString(c.created_at);

    // 🔥 여기! 삭제 버튼 추가
    const delBtn = document.createElement("button");
    delBtn.className = "btn-outline tiny del-comment-btn";
    delBtn.textContent = "삭제";
    delBtn.onclick = () => deleteComment(c);

    rightWrap.appendChild(time);
    rightWrap.appendChild(delBtn);

    header.appendChild(left);
    header.appendChild(rightWrap);

    // 내용
    const cb = document.createElement("div");
    cb.className = "comment-body";
    cb.textContent = c.content;

    cc.appendChild(header);
    cc.appendChild(cb);

    commentListEl.appendChild(cc);
  });
}


  const textarea = document.createElement("textarea");
  textarea.className = "comment-input";
  textarea.placeholder = "익명으로 따뜻한 한마디를 남겨주세요.";

  const btnRow = document.createElement("div");
  btnRow.className = "comment-btn-row";

  const btnComment = document.createElement("button");
  btnComment.type = "button";
  btnComment.className = "btn primary small";
  btnComment.textContent = "댓글 남기기";

  btnComment.onclick = async () => {
    const text = textarea.value.trim();
    if (!text) {
      alert("댓글 내용을 입력해 주세요.");
      return;
    }

    try {
      const nickname = makeNickname();
      const { error } = await db.from("comments").insert([
        {
          post_id: post.id,
          content: text,
          nickname,
        },
      ]);
      if (error) throw error;

      textarea.value = "";

      const { data, error: reloadErr } = await db
        .from("comments")
        .select("*")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });

      if (reloadErr) throw reloadErr;
      comments = data || [];
      renderComments();
    } catch (err) {
      console.error(err);
      alert("댓글 등록 중 오류가 발생했습니다.");
    }
  };

  btnRow.appendChild(btnComment);

  detail.appendChild(body);
  detail.appendChild(commentTitle);
  detail.appendChild(commentListEl);
  detail.appendChild(textarea);
  detail.appendChild(btnRow);

  cardEl.appendChild(detail);
}

// ===============================
// 정렬 셀렉트 이벤트 & 초기 로딩
// ===============================
sortSelectEl.addEventListener("change", () => {
  currentSort = sortSelectEl.value;
  loadPosts();
});

loadPosts();
async function deleteComment(comment) {
  if (!confirm("정말 이 댓글을 삭제하시겠습니까?")) return;

  try {
    const { error } = await db
      .from("comments")
      .delete()
      .eq("id", comment.id);

    if (error) throw error;

    // 삭제 후 화면 갱신
    const { data } = await db
      .from("comments")
      .select("*")
      .eq("post_id", comment.post_id)
      .order("created_at", { ascending: true });

    comments = data || [];
    renderComments();
  } catch (err) {
    console.error(err);
    alert("댓글 삭제 중 오류가 발생했습니다.");
  }
}

