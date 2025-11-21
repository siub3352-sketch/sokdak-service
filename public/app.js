//-----------------------------------------------------
// Supabase 연결
//-----------------------------------------------------
const SUPABASE_URL = "https://effnciiebondujprjhio.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZm5jaWllYm9uZHVqcHJqaGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MzQ5MDYsImV4cCI6MjA3OTMxMDkwNn0.abm_hxGYDTsZjP-5MT93IBo_HoIgHQANJj1PMsKkh3c";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

//-----------------------------------------------------
// 전역 상태
//-----------------------------------------------------
let posts = [];
let currentSort = "latest";
let currentFilterTag = "";

//-----------------------------------------------------
// 시간 포맷
//-----------------------------------------------------
function timeToKorean(ts) {
  const now = Date.now();
  const then = new Date(ts).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;

  const d = new Date(ts);
  return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;
}

//-----------------------------------------------------
// 글 목록 불러오기
//-----------------------------------------------------
async function loadPosts() {
  let query = supabaseClient.from("posts").select("*");

  if (currentFilterTag) {
    query = query.contains("tags", [currentFilterTag]);
  }

  query = query.order(
    currentSort === "latest" ? "created_at" : "likes",
    { ascending: false }
  );

  const { data, error } = await query;
  if (error) {
    console.error(error);
    alert("글 불러오기 오류 발생");
    return;
  }

  posts = data;
  renderPosts();
}

//-----------------------------------------------------
// 태그 렌더링
//-----------------------------------------------------
function renderTagFilterButtons() {
  const tagEl = document.getElementById("tagFilterList");
  tagEl.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className = "btn-tag" + (currentFilterTag === "" ? " active" : "");
  allBtn.textContent = "전체";
  allBtn.onclick = () => { currentFilterTag = ""; loadPosts(); };
  tagEl.appendChild(allBtn);

  const tags = new Set();
  posts.forEach(p => p.tags.forEach(t => tags.add(t)));

  tags.forEach(tag => {
    const btn = document.createElement("button");
    btn.className = "btn-tag" + (currentFilterTag === tag ? " active" : "");
    btn.textContent = "#" + tag;
    btn.onclick = () => { currentFilterTag = tag; loadPosts(); };
    tagEl.appendChild(btn);
  });
}

//-----------------------------------------------------
// 글 목록 렌더링
//-----------------------------------------------------
function renderPosts() {
  const list = document.getElementById("postList");
  const info = document.getElementById("listInfo");

  list.innerHTML = "";
  info.textContent = `(${posts.length}개)`;

  if (posts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "아직 올라온 고민이 없어요.";
    list.appendChild(empty);
    return;
  }

  posts.forEach(p => {
    const card = document.createElement("div");
    card.className = "post-card";
    card.innerHTML = `
      <div style="font-weight:600; margin-bottom:6px;">
        ${p.title} ${p.is_premium ? "✨" : ""}
      </div>
      <div style="color:#666; font-size:13px; margin-bottom:4px;">
        ${timeToKorean(p.created_at)} · 공감 ${p.likes}
      </div>
      <button class="btn-tag" onclick="likePost(${p.id})">공감하기</button>
    `;
    list.appendChild(card);
  });

  renderTagFilterButtons();
}

//-----------------------------------------------------
// 글 작성
//-----------------------------------------------------
document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const tags = tagsInput.value.split(",").map(t => t.trim()).filter(t => t);
  const pw = passwordInput.value;
  const premium = isPremiumInput.checked;

  if (title.length < 1) return alert("제목을 입력해주세요.");
  if (pw.length < 4) return alert("비밀번호는 4자리 이상이어야 합니다.");

  const nickname = "익명" + Math.floor(Math.random() * 9999);

  const { error } = await supabaseClient.from("posts").insert([{
    title, content, tags, password: pw,
    is_premium: premium,
    nickname
  }]);

  if (error) {
    console.error(error);
    alert("등록 오류");
    return;
  }

  alert("고민이 등록되었어요!");
  e.target.reset();
  loadPosts();
});

//-----------------------------------------------------
async function likePost(id) {
  await supabaseClient.rpc("increment_likes", { post_id: id });
  loadPosts();
}

//-----------------------------------------------------
document.getElementById("sortSelect").addEventListener("change", () => {
  currentSort = sortSelect.value;
  loadPosts();
});

// 초기 실행
loadPosts();
