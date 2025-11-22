// ===============================
// Supabase 연결
// ===============================
const SUPABASE_URL = "https://effnciiebondujprjhio.supabase.co";
const SUPABASE_ANON_KEY =
  "YOUR_ANON_KEY";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// 전역 상태
// ===============================
let posts = [];
let currentSort = "latest";
let currentFilterTag = "";
let editingPostId = null;

// DOM
const postListEl = document.getElementById("postList");
const listInfoEl = document.getElementById("listInfo");
const sortSelectEl = document.getElementById("sortSelect");
const tagFilterListEl = document.getElementById("tagFilterList");

const titleInput = document.getElementById("title");
const contentInput = document.getElementById("content");
const tagsInput = document.getElementById("tags");
const passwordInput = document.getElementById("password");
const isPremiumInput = document.getElementById("isPremium");
const postForm = document.getElementById("postForm");
const submitBtn = document.getElementById("submitBtn");

// ===============================
// 시간 포맷팅
// ===============================
function timeToKoreanString(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "방금 전";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
}

// ===============================
// 태그 파싱 (#태그 → 배열)
// ===============================
function parseTags(str) {
  if (!str.trim()) return [];
  return str
    .split("#")
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

// ===============================
// 글 목록 불러오기
// ===============================
async function loadPosts() {
  let query = supabaseClient.from("posts").select("*");

  if (currentFilterTag)
    query = query.contains("tags", [currentFilterTag]);

  if (currentSort === "latest")
    query = query.order("created_at", { ascending: false });
  else query = query.order("likes", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.log(error);
    return alert("글 불러오기 오류");
  }

  posts = data;
  renderPosts();
}

sortSelectEl.addEventListener("change", loadPosts);

// ===============================
// 목록 렌더링
// ===============================
function renderPosts() {
  postListEl.innerHTML = "";
  listInfoEl.textContent = `(${posts.length}개)`;

  posts.forEach(post => {
    const card = document.createElement("div");
    card.className = "post-card";

    // 제목
    const header = document.createElement("div");
    header.className = "post-header";

    const titleEl = document.createElement("div");
    titleEl.className = "post-title";
    titleEl.textContent = post.title;

    const badgeEl = document.createElement("div");
    if (post.is_premium)
      badgeEl.innerHTML = `<span class="badge-premium">프리미엄</span>`;

    header.appendChild(titleEl);
    header.appendChild(badgeEl);

    // 메타정보
    const meta = document.createElement("div");
    meta.className = "post-meta";
    meta.innerHTML = `
      <span>${post.nickname}</span>
      <span>${timeToKoreanString(post.created_at)}</span>
      <span>💗 ${post.likes}</span>
    `;

    // 버튼 그룹
    const actions = document.createElement("div");
    actions.className = "post-actions";

    // 왼쪽 버튼들
    const leftActions = document.createElement("div");
    leftActions.className = "post-actions-left";

    const detailBtn = document.createElement("button");
    detailBtn.textContent = "자세히 보기";
    detailBtn.className = "btn-outline";
    detailBtn.onclick = () => toggleDetail(card, post);

    const likeBtn = document.createElement("button");
    likeBtn.textContent = "공감";
    likeBtn.className = "btn-outline";
    likeBtn.onclick = () => likePost(post.id);

    leftActions.appendChild(detailBtn);
    leftActions.appendChild(likeBtn);

    // 오른쪽 버튼들
    const rightActions = document.createElement("div");
    rightActions.className = "post-actions-right";

    const editBtn = document.createElement("button");
    editBtn.textContent = "수정";
    editBtn.className = "btn-outline";
    editBtn.onclick = () => startEditPost(post);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "삭제";
    deleteBtn.className = "btn-outline";
    deleteBtn.onclick = () => deletePost(post.id);

    rightActions.appendChild(editBtn);
    rightActions.appendChild(deleteBtn);

    actions.appendChild(leftActions);
    actions.appendChild(rightActions);

    // 카드 조립
    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(actions);

    postListEl.appendChild(card);
  });

  renderTagButtons();
}

// ===============================
// 태그 필터 렌더링
// ===============================
function renderTagButtons() {
  tagFilterListEl.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className = "btn-tag";
  allBtn.textContent = "전체";
  allBtn.onclick = () => {
    currentFilterTag = "";
    loadPosts();
  };
  tagFilterListEl.appendChild(allBtn);

  const tagSet = new Set();
  posts.forEach(p => p.tags.forEach(t => tagSet.add(t)));

  tagSet.forEach(tag => {
    const btn = document.createElement("button");
    btn.className = "btn-tag";
    btn.textContent = `#${tag}`;
    btn.onclick = () => {
      currentFilterTag = tag;
      loadPosts();
    };
    tagFilterListEl.appendChild(btn);
  });
}

// ===============================
// 글 작성 + 수정
// ===============================
postForm.addEventListener("submit", async e => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const password = passwordInput.value.trim();
  const tags = parseTags(tagsInput.value);
  const isPremium = isPremiumInput.checked;

  if (!title || !content || password.length < 4) {
    return alert("입력값을 다시 확인해주세요.");
  }

  // 수정 모드
  if (editingPostId) {
    const { error } = await supabaseClient
      .from("posts")
      .update({
        title,
        content,
        tags,
        password,
        is_premium: isPremium
      })
      .eq("id", editingPostId);

    if (error) return alert("수정 실패");

    alert("수정 완료!");
    editingPostId = null;
    submitBtn.textContent = "작성 완료";
    postForm.reset();
    return loadPosts();
  }

  // 신규 등록
  const nickname = "익명" + Math.floor(Math.random() * 9999);

  const { error } = await supabaseClient.from("posts").insert([
    { title, content, tags, password, nickname, is_premium: isPremium, likes: 0 }
  ]);

  if (error) {
    console.log(error);
    alert("등록 실패");
  } else {
    alert("작성 완료!");
    postForm.reset();
    loadPosts();
  }
});

// ===============================
// 수정 모드 진입
// ===============================
function startEditPost(post) {
  const pw = prompt("이 글의 비밀번호를 입력해주세요.");
  if (pw !== post.password) return alert("비밀번호가 틀렸습니다!");

  // 폼에 내용 채우기
  titleInput.value = post.title;
  contentInput.value = post.content;
  tagsInput.value = "#" + post.tags.join(" #");
  passwordInput.value = pw;
  isPremiumInput.checked = post.is_premium;

  editingPostId = post.id;
  submitBtn.textContent = "수정 완료";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===============================
// 삭제
// ===============================
async function deletePost(id) {
  const pw = prompt("비밀번호를 입력해주세요. 삭제는 복구되지 않습니다!");
  if (!pw) return;

  const { data } = await supabaseClient
    .from("posts")
    .select("password")
    .eq("id", id)
    .single();

  if (pw !== data.password) return alert("비밀번호가 틀렸습니다!");

  await supabaseClient.from("posts").delete().eq("id", id);
  alert("삭제되었습니다!");
  loadPosts();
}

// ===============================
loadPosts();
