// public/app.js

let posts = [];
let currentFilterTag = "";
let currentSort = "latest";
let editingPostId = null;

const postListEl = document.getElementById("postList");
const listInfoEl = document.getElementById("listInfo");
const sortSelectEl = document.getElementById("sortSelect");
const tagFilterListEl = document.getElementById("tagFilterList");

const postForm = document.getElementById("postForm");
const submitBtn = document.getElementById("submitBtn");

// ===== 시간 표시 유틸 =====
function timeToKoreanString(timestamp) {
  const diff = Date.now() - timestamp;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "방금 전";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  const d = new Date(timestamp);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// ===== 서버에서 글 목록 가져오기 =====
async function loadPosts() {
  const params = new URLSearchParams();
  params.set("sort", currentSort);
  if (currentFilterTag) params.set("tag", currentFilterTag);

  const res = await fetch(`/api/posts?${params.toString()}`);
  if (!res.ok) {
    alert("글 목록을 불러오는 중 오류가 발생했습니다.");
    return;
  }
  posts = await res.json();
  renderPosts();
}

// ===== 태그 필터 버튼 렌더링 =====
function renderTagFilterButtons() {
  tagFilterListEl.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "btn-tag" + (currentFilterTag === "" ? " active" : "");
  allBtn.textContent = "전체";
  allBtn.addEventListener("click", () => {
    currentFilterTag = "";
    loadPosts();
  });
  tagFilterListEl.appendChild(allBtn);

  const tagSet = new Set();
  posts.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));

  tagSet.forEach((tag) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-tag" + (currentFilterTag === tag ? " active" : "");
    btn.textContent = `#${tag}`;
    btn.addEventListener("click", () => {
      currentFilterTag = tag;
      loadPosts();
    });
    tagFilterListEl.appendChild(btn);
  });
}

// ===== 글 목록 렌더링 =====
function renderPosts() {
  postListEl.innerHTML = "";
  listInfoEl.textContent = `(${posts.length}개)`;

  if (posts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "아직 올라온 고민이 없어요. 첫 고민을 남겨볼까요?";
    postListEl.appendChild(empty);
    renderTagFilterButtons();
    return;
  }

  posts.forEach((post) => {
    const card = document.createElement("div");
    card.className = "post-card";

    const header = document.createElement("div");
    header.className = "post-header";

    const left = document.createElement("div");
    left.className = "post-title";
    left.textContent = post.title;

    const right = document.createElement("div");
    if (post.isPremium) {
      const badge = document.createElement("span");
      badge.className = "badge-premium";
      badge.textContent = "프리미엄";
      right.appendChild(badge);
    }

    header.appendChild(left);
    header.appendChild(right);

    const meta = document.createElement("div");
    meta.className = "post-meta";

    const nick = document.createElement("span");
    nick.className = "nickname-pill";
    nick.textContent = post.nickname;

    const time = document.createElement("span");
    time.textContent = timeToKoreanString(post.createdAt);

    const stat = document.createElement("span");
    stat.textContent = `💗 ${post.likes}`;

    meta.appendChild(nick);
    meta.appendChild(time);
    meta.appendChild(stat);

    const tagRow = document.createElement("div");
    tagRow.className = "post-tags";
    post.tags.forEach((t) => {
      const span = document.createElement("span");
      span.textContent = `#${t}`;
      tagRow.appendChild(span);
    });

    const actions = document.createElement("div");
    actions.className = "post-actions";

    const actionsLeft = document.createElement("div");
    actionsLeft.className = "post-actions-left";

    const btnDetail = document.createElement("button");
    btnDetail.type = "button";
    btnDetail.className = "btn-outline";
    btnDetail.textContent = "자세히 보기";
    btnDetail.addEventListener("click", () => toggleDetail(card, post));

    const btnLike = document.createElement("button");
    btnLike.type = "button";
    btnLike.className = "btn-outline";
    btnLike.textContent = "공감";
    btnLike.addEventListener("click", () => likePost(post.id));

    actionsLeft.appendChild(btnDetail);
    actionsLeft.appendChild(btnLike);

    const actionsRight = document.createElement("div");
    actionsRight.className = "post-actions-right";

    const btnEdit = document.createElement("button");
    btnEdit.type = "button";
    btnEdit.className = "btn-outline";
    btnEdit.textContent = "수정";
    btnEdit.addEventListener("click", () => startEditPost(post));

    const btnDelete = document.createElement("button");
    btnDelete.type = "button";
    btnDelete.className = "btn-outline";
    btnDelete.textContent = "삭제";
    btnDelete.addEventListener("click", () => deletePost(post.id));

    actionsRight.appendChild(btnEdit);
    actionsRight.appendChild(btnDelete);

    actions.appendChild(actionsLeft);
    actions.appendChild(actionsRight);

    card.appendChild(header);
    card.appendChild(meta);
    if (post.tags.length > 0) card.appendChild(tagRow);
    card.appendChild(actions);

    postListEl.appendChild(card);
  });

  renderTagFilterButtons();
}

// ===== 글 작성 / 수정 =====
postForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();
  const tagsInput = document.getElementById("tags").value.trim();
  const password = document.getElementById("password").value;
  const isPremium = document.getElementById("isPremium").checked;

  if (!title) {
    alert("제목을 입력해 주세요.");
    return;
  }
  if (!password || password.length < 4) {
    alert("비밀번호를 4자리 이상 입력해 주세요.");
    return;
  }

  const tags = tagsInput
    ? tagsInput.split(",").map((t) => t.trim()).filter((t) => t.length > 0)
    : [];

  try {
    if (editingPostId) {
      // 수정
      const res = await fetch(`/api/posts/${editingPostId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, tags, password, isPremium })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "수정 중 오류가 발생했습니다.");
        return;
      }
      alert("글이 수정되었습니다.");
    } else {
      // 새 글
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, tags, password, isPremium })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "등록 중 오류가 발생했습니다.");
        return;
      }
      alert("고민이 등록되었습니다.");
    }
    postForm.reset();
    editingPostId = null;
    submitBtn.textContent = "작성 완료";
    await loadPosts();
  } catch (err) {
    console.error(err);
    alert("서버와 통신 중 오류가 발생했습니다.");
  }
});

function startEditPost(post) {
  const pw = prompt("이 글의 비밀번호를 입력해 주세요.");
  if (pw === null) return;
  // 서버에서 체크는 PUT할 때 하고, 프론트에서는 일단 폼 채우기만
  document.getElementById("title").value = post.title;
  document.getElementById("content").value = post.content;
  document.getElementById("tags").value = post.tags.join(", ");
  document.getElementById("password").value = pw; // 사용자가 방금 입력한 비번 기준으로 수정
  document.getElementById("isPremium").checked = post.isPremium;
  editingPostId = post.id;
  submitBtn.textContent = "수정 완료";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deletePost(postId) {
  const pw = prompt("이 글의 비밀번호를 입력해 주세요. 삭제는 되돌릴 수 없습니다.");
  if (pw === null) return;
  if (!pw) {
    alert("비밀번호를 입력해 주세요.");
    return;
  }

  if (!confirm("정말 삭제할까요?")) return;

  try {
    const res = await fetch(`/api/posts/${postId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "삭제 중 오류가 발생했습니다.");
      return;
    }
    await loadPosts();
  } catch (err) {
    console.error(err);
    alert("서버와 통신 중 오류가 발생했습니다.");
  }
}

async function likePost(postId) {
  try {
    const res = await fetch(`/api/posts/${postId}/like`, {
      method: "POST"
    });
    if (!res.ok) {
      alert("공감 처리 중 오류가 발생했습니다.");
      return;
    }
    await loadPosts();
  } catch (err) {
    console.error(err);
    alert("서버와 통신 중 오류가 발생했습니다.");
  }
}

// ===== 상세보기 + 댓글 =====
async function toggleDetail(cardEl, post) {
  const existing = cardEl.querySelector(".detail");
  if (existing) {
    existing.remove();
    return;
  }

   // 댓글 목록 가져오기
  let comments = [];
  try {
    const res = await fetch(`/api/posts/${post.id}/comments`);
    if (res.ok) comments = await res.json();
  } catch (err) {
    console.error(err);
  }


  const detail = document.createElement("div");
  detail.className = "detail";

  const body = document.createElement("div");
  body.className = "detail-body";
  body.textContent = post.content || "(내용 없음)";

  const commentTitle = document.createElement("div");
  commentTitle.style.fontWeight = "600";
  commentTitle.style.marginTop = "4px";
  commentTitle.textContent = "댓글 / 답변";

  const commentListEl = document.createElement("div");
  commentListEl.className = "comment-list";

  function renderComments() {
    commentListEl.innerHTML = "";
    if (comments.length === 0) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "아직 답변이 없어요.";
      commentListEl.appendChild(empty);
      return;
    }
    comments.forEach((c) => {
      const cc = document.createElement("div");
      cc.className = "comment-card";

      const header = document.createElement("div");
      header.className = "comment-header";

      const left = document.createElement("div");
      left.textContent = c.nickname;

      const right = document.createElement("div");
      right.textContent = timeToKoreanString(c.createdAt);

      header.appendChild(left);
      header.appendChild(right);

      const cb = document.createElement("div");
      cb.textContent = c.content;

      const btnVote = document.createElement("button");
      btnVote.type = "button";
      btnVote.className = "btn-tag";
      btnVote.textContent = `도움이 됐어요 (${c.votes})`;
      btnVote.addEventListener("click", async () => {
        await voteComment(c.id);
        // 다시 불러오기
        const res2 = await fetch(`/api/posts/${post.id}/comments`);
        comments = res2.ok ? await res2.json() : comments;
        renderComments();
      });

      cc.appendChild(header);
      cc.appendChild(cb);
      cc.appendChild(btnVote);

      commentListEl.appendChild(cc);
    });
  }

  renderComments();

  const textarea = document.createElement("textarea");
  textarea.placeholder = "익명으로 따뜻한 한마디를 남겨주세요.";

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.justifyContent = "flex-end";
  btnRow.style.marginTop = "4px";

  const btnComment = document.createElement("button");
  btnComment.type = "button";
  btnComment.className = "btn-primary";
  btnComment.textContent = "댓글 남기기";

  btnComment.addEventListener("click", async () => {
    const text = textarea.value.trim();
    if (!text) {
      alert("댓글 내용을 입력해 주세요.");
      return;
    }
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text })
      });
      if (!res.ok) {
        alert("댓글 등록 중 오류가 발생했습니다.");
        return;
      }
      textarea.value = "";
      const res2 = await fetch(`/api/posts/${post.id}/comments`);
      if (res2.ok) comments = await res2.json();
      renderComments();
    } catch (err) {
      console.error(err);
      alert("서버와 통신 중 오류가 발생했습니다.");
    }
  });

  btnRow.appendChild(btnComment);

  detail.appendChild(body);
  detail.appendChild(commentTitle);
  detail.appendChild(commentListEl);
  detail.appendChild(textarea);
  detail.appendChild(btnRow);

  cardEl.appendChild(detail);
}

async function voteComment(commentId) {
  try {
    await fetch(`/api/comments/${commentId}/vote`, { method: "POST" });
  } catch (err) {
    console.error(err);
  }
}

// ===== 정렬 셀렉트 이벤트 =====
sortSelectEl.addEventListener("change", () => {
  currentSort = sortSelectEl.value;
  loadPosts();
});

// 초기 로딩
loadPosts();
