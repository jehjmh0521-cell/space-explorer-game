import "@fontsource/nanum-myeongjo/700.css";
import "@fontsource/nanum-myeongjo/800.css";
import "@fontsource/ibm-plex-sans-kr/400.css";
import "@fontsource/ibm-plex-sans-kr/500.css";
import "@fontsource/ibm-plex-sans-kr/700.css";
import "./style.css";
import { SpaceScene } from "./scene.js";
import {
  destinations,
  planets,
  charts,
  phaseNames,
  signalNotes,
  cleanSave,
  reward,
  score,
  phaseForDay,
  lit,
  surface,
  quizSet,
} from "./content.js";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const key = "space-expedition-3d-v1";
let save = cleanSave(null),
  storageOK = true,
  game,
  started = false,
  near = null,
  sound = false,
  audio,
  toastTimer,
  returnFocus = null;
try {
  save = cleanSave(JSON.parse(localStorage.getItem(key) || "null"));
} catch {
  storageOK = false;
}
function toast(s) {
  $("#toast").textContent = s;
  $("#toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("#toast").hidden = true), 4200);
  $("#announcement").textContent = s;
}
function beep(freq = 650) {
  if (!sound) return;
  try {
    audio ??= new AudioContext();
    audio.resume();
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.frequency.value = freq;
    o.type = "sine";
    g.gain.setValueAtTime(0.045, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.3);
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.3);
  } catch {
    sound = false;
    $("#sound").setAttribute("aria-pressed", "false");
  }
}
function persist() {
  try {
    localStorage.setItem(key, JSON.stringify(save));
    storageOK = true;
  } catch {
    storageOK = false;
    toast("자동 저장을 사용할 수 없어요. 도감에서 기록을 내려받아 주세요.");
  }
  updateUI();
}
function updateUI() {
  $("#count").textContent = save.done.length + "/11";
  $("#trayCount").textContent = save.done.length + " / 11";
  $("#signals").textContent = save.signals.length + "/8";
  $("#slots").innerHTML = destinations
    .map(
      (d, i) =>
        `<button class="slot ${save.done.includes(d.id) ? "done" : ""}" data-slot="${d.id}" aria-label="${d.name} ${save.done.includes(d.id) ? "복습" : "탐사"}"><small>${i + 1}</small>${save.done.includes(d.id) ? "✓" : d.symbol}</button>`,
    )
    .join("");
  $$("[data-slot]").forEach((b) => (b.onclick = () => observe(b.dataset.slot)));
  game?.setSave(save);
  $("#resumeNote").hidden = !save.done.length;
  $("#resumeNote").textContent =
    `이전 탐사 ${save.done.length}곳의 기록이 남아 있어요. 이어서 떠나 볼까요?`;
}
function modal(title, kicker, html, paper = false) {
  returnFocus = document.activeElement;
  $("#modal").classList.toggle("paper", paper);
  $("#modalBody").innerHTML =
    `<span class="kicker">${kicker}</span><h2 id="modalTitle">${title}</h2>${html}`;
  if (!$("#modal").open) $("#modal").showModal();
  $("#modal").scrollTop = 0;
  game?.pause(true);
}
function closeModal() {
  $("#modal").close();
}
$("#closeModal").onclick = closeModal;
$("#modal").addEventListener("close", () => {
  game?.pause(false);
  if ($("#sheet").hidden && returnFocus?.isConnected) returnFocus.focus();
});
function closeSheet() {
  $("#sheet").hidden = true;
  document.body.classList.remove("sheet-open");
  $("#orbitActions").hidden = game?.mode !== "orbit";
  $("#returnFlight").focus();
}
$("#closeSheet").onclick = closeSheet;
function start(overview = false) {
  started = true;
  $("#title").hidden = true;
  $("#gameUI").hidden = false;
  $("#pause").hidden = false;
  game.fly("moon");
  if (overview) showMap();
  else
    toast(
      "첫 목적지는 달! 자동 항해 중이에요. 방향키로 직접 조종할 수도 있어요.",
    );
}
$("#start").onclick = () => start();
$("#exploreNow").onclick = () => start(true);
function mode(mode, name) {
  $("#flightHUD").hidden = mode !== "flight";
  $("#orbitActions").hidden = mode !== "orbit";
  $("#touchControls").hidden = mode !== "flight";
  $("#arrival").hidden = true;
  $("#modeLabel").textContent =
    mode === "orbit" ? "우주 관측 기록" : "우주선 항해";
  $("#placeTitle").textContent =
    mode === "orbit"
      ? name + " 구석구석"
      : name === "자유 비행"
        ? name
        : name + "을 향하여";
  $("#missionHint").textContent =
    mode === "orbit"
      ? "관찰하고 확인 문제 2개를 풀어 도감에 담아요."
      : "빛나는 신호를 모으고 천체를 탐사해요.";
  document.body.dataset.mode = mode;
}
function fly(id) {
  if (!started) {
    started = true;
    $("#title").hidden = true;
    $("#gameUI").hidden = false;
    $("#pause").hidden = false;
  }
  closeSheet();
  if ($("#modal").open) closeModal();
  game.fly(id);
  toast(
    destinations.find((d) => d.id === id).name + "으로 자동 항해를 시작해요.",
  );
}
$("#returnFlight").onclick = () => {
  closeSheet();
  game.returnFlight();
};
$("#scan").onclick = () => {
  if (near) observe(near);
};
function cards(journal = false) {
  return `<div class="map-grid">${destinations.map((d) => `<article class="destination-card ${save.done.includes(d.id) ? "done" : ""}"><span class="orb" style="background:${d.color}"></span><strong>${d.name} ${save.done.includes(d.id) ? "✓" : ""}</strong><p>${d.kind}</p><div class="actions"><button class="btn compact" data-visit="${d.id}">${save.done.includes(d.id) ? "복습하기" : "바로 관측"}</button>${journal ? "" : `<button class="btn compact ghost" data-fly="${d.id}">자동 항해 ↗</button>`}</div></article>`).join("")}</div>`;
}
function bindCards() {
  $$("[data-visit]").forEach(
    (b) => (b.onclick = () => observe(b.dataset.visit)),
  );
  $$("[data-fly]").forEach((b) => (b.onclick = () => fly(b.dataset.fly)));
}
function showMap() {
  modal(
    "30분 우주 복습 여행",
    "FLIGHT CHART",
    `<p class="lead-text">권장 약 30분: 달 관찰 7분 → 태양과 행성 탐사 12분 → 북쪽 별자리 6분 → 연구실 복습 5분. 읽기·조작 속도에 따라 달라져요. 시간 제한 없이 천천히 탐험해도 좋아요.</p>${cards()}<p class="source">천체의 배치와 항로는 탐험을 위한 모형이에요. 실제 위치·크기·거리 비율은 아니에요.</p>`,
  );
  bindCards();
}
$("#map").onclick = showMap;
function observe(id) {
  if (!started) {
    started = true;
    $("#title").hidden = true;
    $("#gameUI").hidden = false;
    $("#pause").hidden = false;
  }
  if ($("#modal").open) closeModal();
  clearTimeout(toastTimer);
  $("#toast").hidden = true;
  const d = destinations.find((d) => d.id === id);
  game.orbit(id);
  $("#sheet").hidden = false;
  document.body.classList.add("sheet-open");
  $("#sheetBody").innerHTML =
    `<span class="kicker">${d.en} / FIELD NOTES</span><h2>${d.name}</h2><div class="sub">${d.kind}</div><p>${d.intro}</p><ul class="fact-list">${d.facts.map((f) => `<li>${f}</li>`).join("")}</ul>${id === "moon" ? moonHTML() : id === "stars" ? starHTML() : ""}<p class="source">교과서 연결 · 과학 4-2 「밤하늘 관찰」 ${d.page}쪽</p><button id="beginQuiz" class="btn wide">${save.done.includes(id) ? "복습 퀴즈" : "탐사 퀴즈"} 풀기 →</button><div id="quiz"></div>`;
  $("#beginQuiz").onclick = () => quiz(d);
  if (id === "moon") setupMoon();
  if (id === "stars") setupStars();
  $("#sheet").scrollTop = 0;
  $("#closeSheet").focus();
}
function quiz(d, index = 0) {
  const questions = quizSet(d),
    question = questions[index];
  $("#beginQuiz").hidden = true;
  $("#quiz").innerHTML =
    `<section class="quiz"><span class="kicker">MISSION CHECK · ${index + 1} / ${questions.length}</span><h3>${question.q}</h3><div class="options">${question.options.map((o, i) => `<button class="option" data-answer="${i}">${i + 1}. ${o}</button>`).join("")}</div><div id="answerFeedback" role="status"></div></section>`;
  $$("[data-answer]").forEach(
    (b) =>
      (b.onclick = () => {
        if (Number(b.dataset.answer) !== question.answer) {
          b.classList.add("wrong");
          $("#answerFeedback").className = "feedback retry";
          $("#answerFeedback").textContent =
            "한 번 더 관찰해 볼까요? 위 기록에서 단서를 찾아 다시 골라 주세요. 점수는 줄어들지 않아요.";
          beep(230);
          return;
        }
        b.classList.add("correct");
        $$("[data-answer]").forEach((x) => (x.disabled = true));
        beep(850);
        $("#answerFeedback").className = "feedback";
        const btn = document.createElement("button");
        btn.className = "btn wide";
        if (index < questions.length - 1) {
          $("#answerFeedback").textContent = "맞아요! " + question.why;
          btn.id = "nextQuestion";
          btn.textContent = "한 번 더 생각해 보기 →";
          btn.onclick = () => quiz(d, index + 1);
        } else {
          const first = !save.done.includes(d.id);
          save = reward(save, "done", d.id);
          persist();
          $("#answerFeedback").textContent =
            (first ? "탐사 성공! +100 XP · " : "복습 성공! · ") + question.why;
          const next = destinations.find((x) => !save.done.includes(x.id));
          btn.id = "nextDestination";
          btn.textContent = next
            ? "다음 항해 · " + next.name + " ↗"
            : "우주 탐험가 임명장 보기";
          btn.onclick = () => (next ? fly(next.id) : certificate());
          if (first) toast(d.name + " 관측 기록을 도감에 담았어요!");
        }
        $("#quiz").appendChild(btn);
      }),
  );
  $("#quiz").scrollIntoView({ block: "nearest", behavior: "instant" });
  $$("[data-answer]")[0].focus();
}
function moonHTML() {
  return `<section class="lesson"><h3>01 · 달 표면의 비밀 3개</h3><p>숫자를 눌러 표면을 조사하세요.</p><div class="surface"><svg viewBox="0 0 320 190" role="img" aria-label="충돌 구덩이, 어두운 평원, 밝고 높은 부분이 있는 달 표면 모형"><defs><radialGradient id="moonColor" cx="35%" cy="30%"><stop stop-color="#e6e2d6"/><stop offset="1" stop-color="#8e8c85"/></radialGradient></defs><circle cx="160" cy="96" r="82" fill="url(#moonColor)"/><path d="M111 44Q153 31 168 58T191 91Q143 111 118 89T111 44" fill="#666a68"/><ellipse cx="187" cy="130" rx="25" ry="17" fill="#898b85"/><g fill="#777b78" stroke="#c8c7bb" stroke-width="4"><circle cx="119" cy="122" r="18"/><circle cx="205" cy="78" r="12"/><circle cx="158" cy="146" r="8"/></g><path d="M195 43l7-12 11 15 8-6 8 20" fill="none" stroke="#efe7d6" stroke-width="7"/></svg><button class="hotspot" data-surface="0" style="left:32%;top:58%" aria-label="1 충돌 구덩이 조사">1</button><button class="hotspot" data-surface="1" style="left:42%;top:24%" aria-label="2 어두운 부분 조사">2</button><button class="hotspot" data-surface="2" style="left:65%;top:17%" aria-label="3 밝고 높은 부분 조사">3</button></div><p id="surfaceNote" role="status">발견 0 / 3 · 달은 공처럼 둥글어요.</p></section><section class="lesson"><h3>02 · 시간을 움직여 달을 관찰해요</h3><p>초승달·상현달·보름달·하현달·그믐달을 모두 관찰하세요.</p><div class="phase-display"><canvas id="moonPhase" width="180" height="180" aria-label="지구에서 보이는 달 모양"></canvas><div><strong id="phaseName"></strong><small id="observationDay"></small></div></div><label for="moonDay" class="kicker">관찰 시간 이동 · 0~60일</label><input id="moonDay" type="range" min="0" max="60" value="0" step="1"><div class="phase-picks">${[1, 2, 4, 6, 7].map((p) => `<button class="chip" data-phase="${p}">${phaseNames[p]}</button>`).join("")}</div><p id="phaseNote" role="status"></p><p class="source">약 30일 주기를 단순화한 모형이에요. 실제 날짜 예보가 아니며, 같은 시각에 모든 모양을 볼 수 있다는 뜻도 아니에요.</p></section>`;
}
function setupMoon() {
  const found = new Set(),
    seen = new Set();
  $("#beginQuiz").disabled = true;
  const gate = () =>
    ($("#beginQuiz").disabled =
      found.size < 3 || ![1, 2, 4, 6, 7].every((p) => seen.has(p)));
  const notes = [
    "충돌 구덩이: 돌덩어리 같은 천체가 부딪혀 생긴 움푹 파인 지형이에요.",
    "어두운 부분: 비교적 평평하고 낮은 곳이 많아요. 달의 ‘바다’라고 부르지만 물이 있는 바다가 아니에요.",
    "밝은 부분: 높은 지형이 많아요. 달 표면에는 높고 낮은 곳과 울퉁불퉁한 곳이 있어요.",
  ];
  $$("[data-surface]").forEach(
    (b) =>
      (b.onclick = () => {
        found.add(b.dataset.surface);
        b.classList.add("found");
        $("#surfaceNote").textContent =
          `발견 ${found.size} / 3 · ${notes[Number(b.dataset.surface)]}`;
        beep();
        gate();
      }),
  );
  function draw(p, day, count = true) {
    if (count) seen.add(p);
    const c = $("#moonPhase"),
      g = c.getContext("2d");
    g.clearRect(0, 0, 180, 180);
    for (let y = -76; y <= 76; y++)
      for (let x = -76; x <= 76; x++)
        if (x * x + y * y <= 76 * 76) {
          g.fillStyle = lit(p, x / 76, y / 76) ? "#e9dfbd" : "#25334b";
          g.fillRect(90 + x, 90 + y, 1, 1);
        }
    $("#phaseName").textContent = phaseNames[p];
    $("#observationDay").textContent =
      `관찰 시작 ${day}일째 · 지구에서 본 모습`;
    $("#phaseNote").textContent =
      `주요 모양 ${[1, 2, 4, 6, 7].filter((p) => seen.has(p)).length} / 5 · ${day >= 30 ? "약 30일이 지나면 같은 모양이 다시 나타나요." : "초승달 → 상현달 → 보름달 → 하현달 → 그믐달 순서로 변해요."}`;
    c.setAttribute("aria-label", phaseNames[p] + " 모형");
    $$("[data-phase]").forEach((b) =>
      b.classList.toggle("selected", Number(b.dataset.phase) === p),
    );
    gate();
  }
  $("#moonDay").oninput = (e) =>
    draw(phaseForDay(Number(e.target.value)), Number(e.target.value));
  $$("[data-phase]").forEach(
    (b) =>
      (b.onclick = () => {
        const p = Number(b.dataset.phase),
          day = Math.round((p * 30) / 8);
        $("#moonDay").value = day;
        draw(p, day);
      }),
  );
  draw(0, 0, false);
}
function starHTML() {
  return `<section class="lesson"><h3>01 · 북쪽 하늘의 별을 이어요</h3><p>별자리를 고르고 번호 순서대로 연결하세요. 세 별자리를 모두 완성하고 모양을 비교해 보세요.</p><div class="chart-tabs">${Object.entries(
    charts,
  )
    .map(
      ([id, c]) => `<button class="chip" data-chart="${id}">${c.name}</button>`,
    )
    .join(
      "",
    )}</div><div class="star-board" id="starBoard"></div><p id="starNote" role="status"></p><p id="chartProgress" class="source">완성한 별자리 0 / 3</p></section><section class="lesson"><h3>02 · 북쪽을 알려 주는 별</h3><p>북두칠성의 국자 끝 두 별을 따라 약 다섯 배 연장하면 북극성을 찾을 수 있어요.</p><svg class="polar-svg" viewBox="0 0 320 140" role="img" aria-label="국자 끝 두 별에서 위로 약 다섯 배 연장한 위치가 A입니다"><path d="M24 105L55 95 80 106 108 100 140 100 140 118 108 118 108 100" fill="none" stroke="#a3bbdf"/><path d="M140 100V10" stroke="#ffc56e" stroke-dasharray="3 5"/><g fill="#f1ead9">${[
    [24, 105],
    [55, 95],
    [80, 106],
    [108, 100],
    [140, 100],
    [140, 118],
    [108, 118],
    [140, 10],
    [230, 50],
    [250, 110],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`)
    .join(
      "",
    )}</g><g fill="#dae4f5" font-size="12"><text x="150" y="15">A</text><text x="240" y="53">B</text><text x="260" y="115">C</text><text x="150" y="65">약 5배</text></g></svg><div class="actions">${["A", "B", "C"].map((n) => `<button class="chip" data-polar="${n}">${n} 별</button>`).join("")}</div><p id="polarNote" role="status">모양과 간격을 단순화한 북쪽 하늘 모형이에요.</p></section>`;
}
function setupStars() {
  const completed = new Set();
  let complete = false,
    north = false;
  $("#beginQuiz").disabled = true;
  const gate = () => ($("#beginQuiz").disabled = !(complete && north));
  function chart(id) {
    const c = charts[id];
    let count = 0;
    $$("[data-chart]").forEach((b) =>
      b.classList.toggle("selected", b.dataset.chart === id),
    );
    $("#starNote").textContent = c.note + " 1번 별부터 이어 보세요.";
    $("#starBoard").innerHTML =
      `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><g id="starLines" fill="none" stroke="#ffc56e" stroke-width=".6"></g></svg>${c.points.map(([x, y], i) => `<button class="star-node" data-star="${i}" style="left:${x * 100}%;top:${y * 100}%" aria-label="${i + 1}번 별">${i + 1}</button>`).join("")}`;
    $$("[data-star]").forEach(
      (b) =>
        (b.onclick = () => {
          if (Number(b.dataset.star) !== count) {
            $("#starNote").textContent = `${count + 1}번 별을 먼저 찾아보세요.`;
            return;
          }
          b.classList.add("hit");
          count++;
          beep(450 + count * 70);
          $("#starLines").innerHTML = c.edges
            .filter(([a, b]) => a < count && b < count)
            .map(
              ([a, b]) =>
                `<path d="M${c.points[a][0] * 100} ${c.points[a][1] * 100}L${c.points[b][0] * 100} ${c.points[b][1] * 100}"/>`,
            )
            .join("");
          if (count === c.points.length) {
            completed.add(id);
            complete = completed.size === 3;
            $("#chartProgress").textContent =
              "완성한 별자리 " + completed.size + " / 3";
            $("#starNote").textContent = c.name + " 완성! " + c.note;
            gate();
          } else
            $("#starNote").textContent = `${count + 1}번 별을 이어 주세요.`;
        }),
    );
  }
  $$("[data-chart]").forEach((b) => (b.onclick = () => chart(b.dataset.chart)));
  $$("[data-polar]").forEach(
    (b) =>
      (b.onclick = () => {
        if (b.dataset.polar === "A") {
          north = true;
          $("#polarNote").textContent =
            "맞아요! 북극성은 작은곰자리에 있고 북쪽을 알려 줘요. 가장 밝은 별은 아니에요.";
          beep(800);
        } else
          $("#polarNote").textContent =
            "국자 끝 두 별의 방향을 따라 위쪽으로 연장해 보세요.";
        gate();
      }),
  );
  chart("dipper");
}
function openJournal() {
  modal(
    "나의 우주 탐사 도감",
    "EXPEDITION ARCHIVE",
    `<p class="lead-text">${save.done.length} / 11곳 탐사 · ${score(save)} XP · 연구 배지 ${save.challenges.length} / 3 · 탐사 신호 ${save.signals.length} / 8</p>${cards(true)}<div class="actions" style="margin-top:24px"><button class="btn" id="cert" ${save.done.length === 11 ? "" : "disabled"}>우주 탐험가 임명장</button><button class="btn ghost" id="export">기록 내려받기</button><button class="btn ghost" id="reset">새로운 탐험</button></div><p class="source">${storageOK ? "기록은 이 브라우저에 자동 저장돼요." : "이 브라우저에서는 자동 저장을 사용할 수 없어요. 기록을 내려받아 주세요."} 11곳을 모두 탐사하면 임명장을 받아요.</p>`,
  );
  bindCards();
  $("#cert").onclick = certificate;
  $("#export").onclick = () =>
    download(
      "우주원정대-탐사기록.json",
      JSON.stringify(
        { title: "우주 원정대", ...save, experience: score(save) },
        null,
        2,
      ),
      "application/json",
    );
  $("#reset").onclick = () => {
    modal(
      "새로운 탐험을 시작할까요?",
      "NEW EXPEDITION",
      '<p class="lead-text">현재 브라우저의 탐사 기록·신호·연구 배지가 지워져요. 먼저 도감에서 기록을 내려받을 수 있어요.</p><div class="actions"><button id="cancelReset" class="btn ghost">취소</button><button id="confirmReset" class="btn">기록 지우고 출발</button></div>',
    );
    $("#cancelReset").onclick = openJournal;
    $("#confirmReset").onclick = () => {
      save = cleanSave(null);
      persist();
      game.ship.position.set(0, 8, 80);
      game.hull = 3;
      fly("moon");
    };
  };
}
$("#journal").onclick = openJournal;
function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function certificate() {
  if (save.done.length !== 11) return;
  modal(
    "우주 탐험가 임명장",
    "STARLIGHT EXPLORER",
    `<div class="certificate"><div class="seal">探<br>險</div><p>달의 변화를 관찰하고 여덟 행성의 특징을 기록하며<br>북쪽 하늘의 별빛을 찾아낸 당신을</p><strong>별빛 우주 탐험가</strong><p>로 임명합니다. 새로운 발견을 향한 항해는 계속됩니다.</p><p style="margin-top:20px">11곳 탐사 완료 · ${score(save)} XP · 연구 배지 ${save.challenges.length}개</p><div class="actions"><button class="btn" id="downloadCert">임명장 내려받기</button><button class="btn ghost" id="backJournal">도감으로</button></div></div>`,
    true,
  );
  $("#backJournal").onclick = openJournal;
  $("#downloadCert").onclick = () =>
    download(
      "우주원정대-임명장.svg",
      `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700"><rect width="1000" height="700" fill="#f2e9d6"/><rect x="30" y="30" width="940" height="640" rx="8" fill="none" stroke="#b5a17a" stroke-width="3"/><g text-anchor="middle" fill="#30281f" font-family="serif"><text x="500" y="140" font-size="22">STARLIGHT EXPEDITION</text><text x="500" y="235" font-size="55">우주 탐험가 임명장</text><text x="500" y="330" font-size="25">달과 행성, 북쪽 하늘의 별빛을 탐험한 당신을</text><text x="500" y="405" font-size="42">별빛 우주 탐험가로 임명합니다.</text><text x="500" y="490" font-size="23">11곳 탐사 완료 · ${score(save)} XP · 연구 배지 ${save.challenges.length}개</text><text x="500" y="575" font-size="22">새로운 발견을 향한 항해는 계속됩니다.</text></g></svg>`,
      "image/svg+xml",
    );
}
function showLab() {
  const lessons = [
    [
      "order",
      "01",
      "흩어진 행성 항로",
      "태양에서 가까운 순서로 항로를 연결해요.",
    ],
    [
      "sort",
      "02",
      "행성 표면 분류",
      "딱딱한 땅이 있는 행성과 기체 겉부분의 행성을 구분해요.",
    ],
    ["size", "03", "크기 비교 연구", "가장 큰 행성과 가장 작은 행성을 찾아요."],
  ];
  modal(
    "우주선 안의 작은 연구실",
    "RESEARCH LAB",
    `<p class="lead-text">관측한 내용을 활용해 연구 배지를 모아요. 처음 완료할 때마다 50 XP!</p><div class="lesson-grid">${lessons.map(([id, n, title, desc]) => `<article class="lesson-card"><span class="kicker">MISSION ${n} ${save.challenges.includes(id) ? "✓" : ""}</span><h3>${title}</h3><p>${desc}</p><button class="btn compact" data-lab="${id}">${save.challenges.includes(id) ? "다시 연구하기" : "연구 시작"}</button></article>`).join("")}</div>`,
  );
  $$("[data-lab]").forEach((b) => (b.onclick = () => challenge(b.dataset.lab)));
}
$("#lab").onclick = showLab;
function challenge(id) {
  let index = 0;
  const shuffled = [
    planets[5],
    planets[2],
    planets[7],
    planets[0],
    planets[4],
    planets[1],
    planets[6],
    planets[3],
  ];
  const complete = () => {
    const first = !save.challenges.includes(id);
    save = reward(save, "challenges", id);
    persist();
    $("#challengeFeedback").className = "feedback";
    $("#challengeFeedback").textContent =
      "연구 성공! " +
      (first
        ? "+50 XP · 연구 배지를 받았어요."
        : "이미 받은 배지예요. 복습도 멋지게 성공했어요.");
    $("#labReturn").hidden = false;
    beep(900);
  };
  if (id === "order") {
    modal(
      "태양계 항로를 복원해요",
      "RESEARCH 01",
      `<p class="lead-text">태양에서 가까운 행성부터 차례대로 골라 주세요.</p><div id="orderSlots" class="order-slots">☀ 태양</div><div class="planet-choices">${shuffled.map((d) => `<button data-order="${d.id}">${d.name}</button>`).join("")}</div><p id="challengeFeedback" class="feedback" role="status">첫 목적지는 태양에 가장 가까운 행성이에요.</p><button id="labReturn" class="btn wide" hidden>연구실로 돌아가기</button>`,
    );
    $$("[data-order]").forEach(
      (b) =>
        (b.onclick = () => {
          if (b.dataset.order !== planets[index].id) {
            $("#challengeFeedback").className = "feedback retry";
            $("#challengeFeedback").textContent =
              "다시 생각해 보세요. 다음 행성은 " +
              planets[index].name[0] +
              "(으)로 시작해요.";
            return;
          }
          b.disabled = true;
          $("#orderSlots").textContent += " → " + planets[index++].name;
          if (index === 8) complete();
          else $("#challengeFeedback").textContent = index + " / 8 연결 완료";
        }),
    );
  }
  if (id === "sort") {
    modal(
      "행성의 겉부분을 분류해요",
      "RESEARCH 02",
      '<p class="lead-text">교과서에서 관찰한 표면을 떠올려 보세요. 기체 겉부분은 내부 전체가 기체라는 뜻이 아니에요.</p><div class="compare-planet" id="sortSymbol"></div><h3 id="sortName" style="text-align:center"></h3><div class="actions" style="justify-content:center;margin:20px 0"><button class="btn ghost" data-sort="rock">딱딱한 땅</button><button class="btn ghost" data-sort="gas">기체 겉부분</button></div><p id="challengeFeedback" class="feedback" role="status">0 / 8 분류 완료</p><button id="labReturn" class="btn wide" hidden>연구실로 돌아가기</button>',
    );
    const render = () => {
      $("#sortName").textContent = shuffled[index].name;
      $("#sortSymbol").textContent = shuffled[index].symbol;
      $("#sortSymbol").style.color = shuffled[index].color;
    };
    render();
    $$("[data-sort]").forEach(
      (b) =>
        (b.onclick = () => {
          if (b.dataset.sort !== surface(shuffled[index].id)) {
            $("#challengeFeedback").className = "feedback retry";
            $("#challengeFeedback").textContent =
              "다시 관찰해 보세요. " +
              shuffled[index].facts.find((f) => /땅|기체/.test(f));
            return;
          }
          index++;
          if (index === 8) {
            $$("[data-sort]").forEach((x) => (x.disabled = true));
            complete();
          } else {
            render();
            $("#challengeFeedback").textContent = index + " / 8 분류 완료";
          }
        }),
    );
  }
  if (id === "size") {
    modal(
      "가장 크고, 가장 작은 행성",
      "RESEARCH 03",
      `<p class="lead-text">태양을 제외한 여덟 행성의 상대적인 크기를 비교해요.</p><h3 id="sizeQuestion">여덟 행성 중 가장 큰 행성은?</h3><div class="planet-choices" style="margin-top:20px">${shuffled.map((d) => `<button data-size="${d.id}">${d.name}</button>`).join("")}</div><p id="challengeFeedback" class="feedback" role="status">크기를 떠올려 골라 보세요.</p><button id="labReturn" class="btn wide" hidden>연구실로 돌아가기</button>`,
    );
    $$("[data-size]").forEach(
      (b) =>
        (b.onclick = () => {
          if (b.dataset.size !== ["jupiter", "mercury"][index]) {
            $("#challengeFeedback").className = "feedback retry";
            $("#challengeFeedback").textContent =
              index === 0
                ? "줄무늬와 커다란 붉은 점을 가진 행성을 떠올려 보세요."
                : "태양에 가장 가까운 회색 행성을 떠올려 보세요.";
            return;
          }
          index++;
          if (index === 2) {
            $$("[data-size]").forEach((x) => (x.disabled = true));
            complete();
          } else {
            $("#sizeQuestion").textContent = "그렇다면 가장 작은 행성은?";
            $("#challengeFeedback").textContent =
              "맞아요! 가장 큰 행성은 목성이에요.";
          }
        }),
    );
  }
  $("#labReturn").onclick = showLab;
}
function sources() {
  modal(
    "교과서와 함께 떠나는 항해",
    "LEARNING GUIDE",
    `<p class="lead-text">첨부된 「초_과학4-2(이상원)_교사용교과서_1.pdf」의 1단원 ‘밤하늘 관찰’을 대조하여 구성했어요. 아래 쪽수는 학생용 교과서에 인쇄된 쪽수예요.</p><table class="source-table"><thead><tr><th>핵심 내용</th><th>게임 활동</th><th>교과서</th></tr></thead><tbody><tr><td>달 모양과 표면</td><td>표면 3곳 조사</td><td>20~21쪽</td></tr><tr><td>약 30일의 모양 변화</td><td>시간 이동 관측</td><td>22~23쪽</td></tr><tr><td>태양과 8개 행성</td><td>관측·분류·크기 비교</td><td>24~29쪽</td></tr><tr><td>별과 행성의 차이</td><td>태양 관측 퀴즈</td><td>30~31쪽</td></tr><tr><td>북극성 주변 별자리</td><td>별 잇기·북쪽 찾기</td><td>32~33쪽</td></tr></tbody></table><p class="source">성취기준: [4과13-01], [4과13-02], [4과13-03]. PDF 파일 내 32~33, 38~39, 44~51, 56~61쪽을 대조했어요.</p><p class="lead-text">참고 게임 <a href="https://dokdo-day-game.chaessam.workers.dev/" target="_blank" rel="noopener">독도 원정대</a>의 전체 화면 3D 항해·탐사·수집 흐름을 참고했어요. 같은 Three.js 0.162.0 엔진을 사용하되 우주 장면, 학습 활동과 코드는 새로 제작했어요.</p><p class="source">천체 크기·거리·위치·속도는 실제 비율이 아니에요. 별자리의 모양은 단순화했고 같은 별자리의 별들이 실제로 가까이 모여 있다는 뜻은 아니에요. 달의 공전 원리·행성의 물리량은 필수 평가에 넣지 않았어요. 실제 밤하늘은 어른과 함께 관찰하세요.</p><p class="source">회원 가입·개인정보 입력 없이 사용해요. 기록은 현재 브라우저에 저장돼요.</p>`,
  );
}
$("#curriculum").onclick = sources;
$("#help").onclick = () =>
  modal(
    "별빛 항해 안내",
    "FLIGHT MANUAL",
    '<div class="lesson-grid"><article class="lesson-card"><h3>01 · 우주선 조종</h3><p>← → 또는 A/D로 방향을 바꾸고 ↑ ↓ 또는 W/S로 높이를 조절해요. Space로 가속해요. 터치 화면에서는 방향 버튼이나 화면 끌기를 사용하세요.</p></article><article class="lesson-card"><h3>02 · 관측과 발견</h3><p>항로 지도에서 자동 항해를 선택하거나 바로 관측할 수 있어요. 천체 주변에 도착하면 E 또는 관측 시작! 관측 화면은 끌어서 돌려 볼 수 있어요.</p></article><article class="lesson-card"><h3>03 · 기록과 배지</h3><p>퀴즈를 풀면 도감에 기록되고 100 XP를 받아요. 연구실 배지는 50 XP, 초록 탐사 신호는 10 XP예요. 오답은 감점 없이 다시 풀 수 있어요.</p></article></div><p class="source">직접 조종 중 소행성과 부딪히면 선체가 줄어요. 세 번 부딪히면 지구 기지에서 수리하며 기록은 유지돼요. 자동 항해는 충돌로부터 보호돼요. 11곳을 모두 탐사하면 임명장을 받을 수 있어요.</p>',
  );
$("#sound").onclick = () => {
  sound = !sound;
  $("#sound").setAttribute("aria-pressed", String(sound));
  $("#sound").setAttribute("aria-label", sound ? "소리 끄기" : "소리 켜기");
  $("#sound").textContent = sound ? "♫" : "♪";
  beep();
};
$("#pause").onclick = () => {
  modal(
    "잠깐, 별빛 속에서 쉬어 가요",
    "PAUSED",
    '<p class="lead-text">우주선이 멈춰 있어요. 준비되면 항해를 이어 가세요.</p><div class="actions"><button id="resume" class="btn">항해 계속하기</button><button id="pauseSources" class="btn ghost">학습 안내</button></div>',
  );
  $("#resume").onclick = closeModal;
  $("#pauseSources").onclick = sources;
};
window.addEventListener("keydown", (e) => {
  if ($("#modal").open || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))
    return;
  if (e.key === "Escape" && !$("#sheet").hidden) {
    closeSheet();
    return;
  }
  if (!started || game?.mode !== "flight") return;
  const k = e.key.toLowerCase();
  if (
    [
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
      "w",
      "a",
      "s",
      "d",
      " ",
      "shift",
    ].includes(k)
  ) {
    e.preventDefault();
    game.key(k, true);
  }
  if (k === "e" && !e.repeat && near) observe(near);
});
window.addEventListener("keyup", (e) => game?.key(e.key.toLowerCase(), false));
window.addEventListener("blur", () => game?.keys.clear());
document.addEventListener("visibilitychange", () => {
  game?.keys.clear();
  game?.pause(document.hidden || $("#modal").open);
});
$$("[data-dir]").forEach((b) => {
  const key = "arrow" + b.dataset.dir;
  b.onpointerdown = (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    game?.key(key, true);
  };
  b.onpointerup =
    b.onpointercancel =
    b.onlostpointercapture =
      () => game?.key(key, false);
});
$("#boost").onpointerdown = (e) => {
  e.preventDefault();
  $("#boost").setPointerCapture(e.pointerId);
  game?.key(" ", true);
};
$("#boost").onpointerup =
  $("#boost").onpointercancel =
  $("#boost").onlostpointercapture =
    () => game?.key(" ", false);
try {
  game = new SpaceScene($("#stage"), {
    observe,
    mode,
    flight(s) {
      near = s.near;
      $("#speed").textContent = s.speed;
      $("#hull").textContent = "◆ ".repeat(s.hull) + "◇ ".repeat(3 - s.hull);
      $("#routeFill").style.width =
        Math.min(100, Math.max(0, s.progress * 100)) + "%";
      $("#flightState").textContent = s.target
        ? "AUTO → " + s.target
        : "직접 조종 · 자유 항해";
      $("#arrival").hidden = !near;
      $("#arrivalName").textContent =
        destinations.find((d) => d.id === near)?.name || "";
      $("#stage").dataset.speed = s.speed;
      $("#stage").dataset.near = near || "";
    },
    signal(i) {
      save = reward(save, "signals", i);
      persist();
      beep(1000);
      toast("탐사 신호 발견! +10 XP · " + signalNotes[i]);
    },
    collision(hull) {
      toast(
        hull
          ? "소행성과 접촉했어요! 방향을 바꿔 피해 가세요."
          : "지구 기지에서 선체를 수리했어요. 탐사 기록은 그대로예요.",
      );
      beep(160);
    },
    contextLost() {
      const loading = $("#loading");
      loading.hidden = false;
      loading.innerHTML =
        '<h2>3D 화면 연결이 끊겼어요</h2><p>탐사 기록은 저장되어 있어요. 페이지를 새로고침해 다시 시작해 주세요.</p><button class="btn" id="reload">다시 시작</button>';
      $("#reload").onclick = () => location.reload();
    },
  });
  updateUI();
  $("#loading").hidden = true;
  $("#title").hidden = false;
} catch (error) {
  console.error(error);
  $("#loading").innerHTML =
    '<h2>3D 우주를 열 수 없어요</h2><p>WebGL을 지원하는 최신 Chrome·Edge·Safari를 사용하고 브라우저의 하드웨어 가속을 확인해 주세요.</p><button class="btn" id="retry3d">다시 시도</button>';
  $("#retry3d").onclick = () => location.reload();
}
