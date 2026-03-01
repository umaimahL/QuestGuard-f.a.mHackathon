import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://127.0.0.1:8000";

function formatLocalDateTimeInputValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes())
  );
}

export default function App() {
  const [user, setUser] = useState({ xp: 0, level: 1 });
  const [quests, setQuests] = useState([]);
  const [gps, setGps] = useState(null);
  const [calmOffset, setCalmOffset] = useState(0);

  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [deadlineLocal, setDeadlineLocal] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return formatLocalDateTimeInputValue(d);
  });

  const [levelUpMsg, setLevelUpMsg] = useState(null);
  const [markerPos, setMarkerPos] = useState(null);

 
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = (text) => {
    setToast({ text, id: Date.now() });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1400);
  };

  const maxXP = user.level * 500;
  const xpPercent = Math.min(100, (user.xp / maxXP) * 100);

  const loadAll = async () => {
    const [u, q] = await Promise.all([
      axios.get(`${API}/user`),
      axios.get(`${API}/quests`),
    ]);

    setUser(u.data);
    setQuests(q.data);

    try {
      const g = await axios.get(`${API}/gps`);
      setGps(g.data);
    } catch {
      setGps(null);
    }
  };

  useEffect(() => {
    loadAll();
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const activeQuests = useMemo(
    () => quests.filter((q) => !q.completed),
    [quests]
  );

  
  const gpsComputed = useMemo(() => {
    const total = quests.length;
    const completed = quests.filter((q) => q.completed).length;
    const journey_progress_percent =
      total === 0 ? 0 : Math.round((completed / total) * 100);

    const active = quests.filter((q) => !q.completed);
    if (active.length === 0) {
      return {
        journey_progress_percent,
        global_threat: 0,
        risk: "LOW",
        risk_reason: "No urgent deadlines",
        recommended: null,
        biggest_threat: null,
      };
    }

    const sorted = [...active].sort(
      (a, b) => (b.threat ?? 0) - (a.threat ?? 0)
    );
    const top = sorted[0];
    const threat = top.threat ?? 0;

    let risk = "LOW";
    let risk_reason = "No urgent deadlines";
    if (threat >= 70) {
      risk = "HIGH";
      risk_reason = "Deadline approaching";
    } else if (threat >= 40) {
      risk = "MEDIUM";
      risk_reason = "Keep steady to avoid last-minute stress";
    }

    return {
      journey_progress_percent,
      global_threat: threat,
      risk,
      risk_reason,
      biggest_threat: top,
      recommended: {
        id: top.id,
        title: top.title,
        minutes: 10,
        xp_reward: 20,
      },
    };
  }, [quests]);

  const gpsFinal = useMemo(() => {
    if (gps && typeof gps.global_threat === "number") return gps;
    return gpsComputed;
  }, [gps, gpsComputed]);

  const triggerLevelUp = (newLevel, gainedXp = 0) => {
    const titles = {
      1: "Fresher",
      2: "Scholar",
      3: "Explorer",
      4: "Defender",
      5: "Legend",
    };

    setLevelUpMsg({
      level: newLevel,
      title: titles[newLevel] || "Level Up!",
      gainedXp,
    });

    setTimeout(() => setLevelUpMsg(null), 1800);
  };

  const createQuest = async () => {
    if (!title.trim()) return;
    const iso = new Date(deadlineLocal).toISOString();
    await axios.post(`${API}/create-quest`, null, {
      params: { title, difficulty, deadline: iso },
    });
    setTitle("");
    showToast("Quest created ✨");
    await loadAll();
  };

  const hitQuest = async (id, minutes = 10, xpHint = 20) => {
    await axios.post(`${API}/hit-quest/${id}`, null, { params: { minutes } });
    showToast(`+${xpHint} XP`);
    await loadAll();
  };

  const completeQuest = async (id, xpHint = 100) => {
    const beforeLevel = user.level;
    const beforeXp = user.xp;

    await axios.post(`${API}/complete-quest/${id}`);
    window.dispatchEvent(new Event("monster_defeated"));

    showToast(`+${xpHint} XP • Quest Complete`);

    await loadAll();

    const u = await axios.get(`${API}/user`);
    if (u.data.level > beforeLevel) {
      triggerLevelUp(u.data.level, Math.max(0, u.data.xp - beforeXp));
    }
  };

  const resetAll = async () => {
    try {
      await axios.post(`${API}/reset`, null, {
        params: { progress_only: false },
      });
      showToast("Reset done");
      await loadAll();
    } catch {
      alert(
        "Reset endpoint not found. Add /reset to backend (code provided earlier)."
      );
    }
  };

  const overdue = (gpsFinal?.global_threat ?? 0) >= 85;

  return (
    <div className={`pf-bg ${overdue ? "pf-overdueScreen" : ""}`}>
      {toast && (
        <div className="pf-toast" key={toast.id}>
          {toast.text}
        </div>
      )}

      {levelUpMsg && (
        <div className="pf-modal">
          <div className="pf-modalCard">
            <div className="pf-modalTop">✨ LEVEL UP!</div>
            <div className="pf-modalMain">
              You reached Level {levelUpMsg.level}:<br />
              <span>{levelUpMsg.title.toUpperCase()}</span>
            </div>
            <div className="pf-modalSub">
              +{levelUpMsg.gainedXp} XP gained • Journey Progress Increased
            </div>
          </div>
        </div>
      )}

      <div className="pf-shell">
        <header className="pf-header pf-glass">
          <div className="pf-brand">
            
            <div>
            <div className="pf-logoMark" aria-hidden>
            <ShieldCompassLogo />
            </div>
              <div className="pf-brandName">QUESTGUARD</div>
              <div className="pf-brandSub">Academic GPS</div>
            </div>
          </div>

          <div className="pf-headerRight">
            <div className="pf-levelLine">
              <div className="pf-levelText">
                Level {user.level}{" "}
                <span className="pf-muted">| Network Explorer</span>
              </div>
              <div className="pf-xpText">
                {user.xp} / {user.level * 500} XP
              </div>
            </div>

            <div className="pf-xpBar">
              <div className="pf-xpFill" style={{ width: `${xpPercent}%` }} />
              <div className="pf-barShimmer" />
            </div>

            <div className="pf-headerActions">
              <button className="pf-btnGhost tiny" onClick={resetAll}>
                Reset
              </button>
            </div>
          </div>
        </header>

        {/* Academic Journey */}
        <section className="pf-card pf-glass pf-journeyCard">
          <div className="pf-cardTitle">Academic Journey</div>

          <div className="pf-stepsRow">
            <span className="pf-step strong">START</span>
            <span className="pf-arrow">→</span>
            <span className="pf-step">Research</span>
            <span className="pf-arrow">→</span>
            <span className="pf-step">Practice</span>
            <span className="pf-arrow">→</span>
            <span className="pf-step">Revise</span>
            <span className="pf-arrow">→</span>
            <span className="pf-step strong">SUCCESS 🎓</span>
          </div>

          <div className="pf-journeyMap">
  {/* Far mountains */}
  <svg className="pf-mapLayer far" viewBox="0 0 900 220" aria-hidden>
    <path
      d="M0 135 L120 70 L210 132 L320 62 L430 138 L560 78 L700 132 L820 90 L900 120 L900 220 L0 220 Z"
      fill="var(--map-mtn-far)"
    />
  </svg>

  {/* Mid mountains */}
  <svg className="pf-mapLayer mid" viewBox="0 0 900 220" aria-hidden>
    <path
      d="M0 160 L140 98 L250 158 L360 90 L520 165 L650 112 L820 158 L900 120 L900 220 L0 220 Z"
      fill="var(--map-mtn-mid)"
    />
  </svg>

  {/* Near mountains */}
  <svg className="pf-mapLayer near" viewBox="0 0 900 220" aria-hidden>
    <path
      d="M0 182 C120 150, 210 190, 320 165 C460 132, 560 198, 690 160 C780 135, 840 148, 900 128 L900 220 L0 220 Z"
      fill="var(--map-mtn-near)"
    />
  </svg>

  {/* Foreground hills */}
  <svg className="pf-mapLayer hills" viewBox="0 0 900 220" aria-hidden>
    <path
      d="M0 205 C160 170, 270 220, 420 192 C560 162, 680 212, 900 168 L900 220 L0 220 Z"
      fill="var(--map-hills)"
    />
  </svg>

  {/* Route (SVG above layers) */}
  <svg viewBox="0 0 900 220" className="pf-mapSvg" aria-hidden>
    <path
      id="routePath"
      className="pf-routePath"
      d="M70 185 C170 160, 250 160, 330 175
         C420 195, 520 205, 620 170
         C700 140, 780 150, 840 120"
    />
    <path
      className="pf-routeDots"
      d="M70 185 C170 160, 250 160, 330 175
         C420 195, 520 205, 620 170
         C700 140, 780 150, 840 120"
    />

    <g className="pf-milestones">
      <circle cx="70" cy="185" r="8" className="pf-mileStart" />
      <circle cx="330" cy="175" r="7" className="pf-mileMid" />
      <circle cx="620" cy="170" r="7" className="pf-mileMid" />
      <circle cx="840" cy="120" r="9" className="pf-mileEnd" />
    </g>
  </svg>

  <div className="pf-mapStart">🏁 START</div>
  <div className="pf-mapEnd">🎓 SUCCESS</div>

  <RouteMarker
    progress={gpsFinal?.journey_progress_percent ?? 0}
    onMove={setMarkerPos}
  />

  <div className="pf-journeyProgress">
    <div
      className="pf-journeyFill"
      style={{ width: `${gpsFinal?.journey_progress_percent ?? 0}%` }}
    />
    <div className="pf-barShimmer" />
    <div className="pf-journeyLabel">
      Journey Progress: {gpsFinal?.journey_progress_percent ?? 0}% Complete
    </div>
  </div>
</div>
        </section>

        {/* Risk */}
        <section className="pf-card pf-glass pf-riskCard">
          <div className={`pf-riskBanner ${(gpsFinal?.risk || "LOW").toLowerCase()}`}>
            <div className="pf-riskIcon" aria-hidden>
              ⚠️
            </div>
            <div className="pf-riskText">
              <b>{gpsFinal?.risk || "LOW"} RISK</b>:{" "}
              {gpsFinal?.risk_reason || "No urgent deadlines"}
            </div>

            <div className="pf-monsterSlot">
              <GlobalMonster
                threat={Math.max(0, (gpsFinal?.global_threat ?? 0) - calmOffset)}
                markerPos={markerPos}
              />
            </div>
          </div>

          <div className="pf-recRow">
            <div>
              <div className="pf-recLabel">Recommended Quest:</div>
              <div className="pf-recValue">
                {gpsFinal?.recommended ? (
                  <>
                    Study: {gpsFinal.recommended.title}{" "}
                    <span className="pf-muted">
                      ({gpsFinal.recommended.minutes} min)
                    </span>
                  </>
                ) : (
                  <span className="pf-muted">Add a quest to begin</span>
                )}
              </div>
            </div>

            {gpsFinal?.recommended && (
              <button
                className="pf-btnPrimary"
                onClick={() => {
                  const id =
                    gpsFinal?.recommended?.id ?? gpsFinal?.biggest_threat?.id;
                  const minutes = gpsFinal?.recommended?.minutes ?? 10;
                  setCalmOffset((prev) => Math.min(35, prev + 6));
                  if (!id) return alert("No active quest to start yet.");
                  hitQuest(id, minutes, gpsFinal.recommended.xp_reward ?? 20);
                }}
              >
                Start Quest{" "}
                <span className="pf-btnMeta">
                  +{gpsFinal.recommended.xp_reward} XP
                </span>
              </button>
            )}
          </div>
        </section>

        {/* Create Quest */}
        <section className="pf-card pf-glass">
          <div className="pf-cardTitle">Create New Quest</div>

          <div className="pf-form">
            <input
              className="pf-input"
              placeholder="Task Name..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="pf-formRow">
              <div className="pf-selectWrap">
                <span className="pf-selectLabel">Difficulty</span>
                <select
                  className="pf-input pf-select"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>

              <input
                className="pf-input"
                type="datetime-local"
                value={deadlineLocal}
                onChange={(e) => setDeadlineLocal(e.target.value)}
              />
            </div>

            <button className="pf-btnPrimary wide" onClick={createQuest}>
              Create Quest
            </button>
          </div>
        </section>

        {/* Active Quests */}
        <section className="pf-card pf-glass">
          <div className="pf-cardTitle">Active Quests</div>

          {activeQuests.length === 0 ? (
            <div className="pf-empty">No active quests. Create one above 👆</div>
          ) : (
            <div className="pf-questGrid">
              {activeQuests.map((q) => (
                <div key={q.id} className="pf-questCard">
                  <div className="pf-questTop">
                    <div className="pf-questTitle">{q.title}</div>
                    <span className={`pf-pill ${q.difficulty}`}>
                      {q.difficulty}
                    </span>
                  </div>

                  <div className="pf-questMeta">
                    <div>
                      Risk:
                      <span
                        className={`pf-riskDot ${
                          q.threat >= 70
                            ? "red"
                            : q.threat >= 40
                            ? "amber"
                            : "green"
                        }`}
                      />
                      <b>
                        {q.threat >= 70
                          ? "High"
                          : q.threat >= 40
                          ? "Medium"
                          : "Low"}
                      </b>
                    </div>
                    <div>
                      Reward: <b>{q.xp_reward} XP</b>
                    </div>
                  </div>

                  <div className="pf-questArt">
                    {q.difficulty === "Hard" ? (
                      <CyberFortressArt />
                    ) : (
                      <DatabaseArt />
                    )}
                  </div>

                  <div className="pf-questBtns">
                    <button
                      className="pf-btnPrimary small"
                      onClick={() => completeQuest(q.id, q.xp_reward ?? 100)}
                    >
                      Complete Quest
                    </button>
                    <button
                      className="pf-btnGhost small"
                      onClick={() => {
                        if (!q?.id) return;

                        // calm the monster immediately
                        setCalmOffset((prev) => Math.min(35, prev + 12));

                        // decay calm over time (smoothly)
                        const start = Date.now();
                        const duration = 12000;
                        const tick = () => {
                          const elapsed = Date.now() - start;
                          const t = Math.min(1, elapsed / duration);
                          setCalmOffset((prev) => Math.max(0, prev - 1));
                          if (t < 1) requestAnimationFrame(tick);
                        };
                        requestAnimationFrame(tick);

                        hitQuest(q.id, 10, 20);
                      }}
                    >
                      10-min Hit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function RouteMarker({ progress, onMove }) {
  const [pos, setPos] = useState({ x: 8, y: 70 });

  useEffect(() => {
    const p = Math.min(100, Math.max(0, progress));
    const path = document.getElementById("routePath");
    if (!path) return;

    const len = path.getTotalLength();
    const point = path.getPointAtLength((p / 100) * len);
    const next = { x: (point.x / 900) * 100, y: (point.y / 220) * 100 };

    setPos(next);
    onMove?.(next);
  }, [progress, onMove]);

  return (
    <div
      className="pf-routeMarker"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
    >
      <div className="pf-avatarCircle">👤</div>
      <div className="pf-pinPill">YOU ARE HERE</div>
    </div>
  );
}

function GlobalMonster({ threat, markerPos }) {
  const t = Math.min(100, Math.max(0, threat));
  const danger = t >= 70;
  const overdue = t >= 85;

  const scale = 0.85 + (t / 100) * 1.35;

  const [shout, setShout] = useState(false);
  const [defeated, setDefeated] = useState(false);

  const audioCtxRef = useRef(null);

  const playGrowl = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = audioCtxRef.current || new AudioContext();
      audioCtxRef.current = ctx;

      const o = ctx.createOscillator();
      const g = ctx.createGain();

      o.type = "sawtooth";
      o.frequency.setValueAtTime(90, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.22);

      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.38);
    } catch {}
  };

  const speak = (text) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;

      synth.cancel();

      const voices = synth.getVoices?.() || [];
      const voice =
        voices.find(
          (v) =>
            /en/i.test(v.lang) &&
            /Google|Microsoft|Samantha|Daniel|Alex/i.test(v.name)
        ) ||
        voices.find((v) => /en/i.test(v.lang)) ||
        null;

      const parts = ["DO IT", "NOW"];

      const jitter = (base, amount) =>
        base + (Math.random() * 2 - 1) * amount;

      parts.forEach((p, i) => {
        const u = new SpeechSynthesisUtterance(p);
        if (voice) u.voice = voice;
        u.volume = 1;

        if (i === 0) {
          u.rate = jitter(0.98, 0.06);
          u.pitch = jitter(0.85, 0.08);
        } else {
          u.rate = jitter(0.9, 0.06);
          u.pitch = jitter(1.02, 0.1);
        }
        synth.speak(u);
      });
    } catch {}
  };

  useEffect(() => {
    try {
      window.speechSynthesis?.getVoices?.();
    } catch {}
  }, []);

  useEffect(() => {
    if (!danger) return;
    setShout(true);
    playGrowl();
    const lines = [
      "DO IT NOW!",
      "MOVE. RIGHT. NOW!",
      "STOP WAITING. GO!",
      "THE DEADLINE IS COMING!",
    ];
    speak(lines[Math.floor(Math.random() * lines.length)]);

    const timer = setTimeout(() => setShout(false), 2200);
    return () => clearTimeout(timer);
    
  }, [danger]);

  useEffect(() => {
    if (!danger) return;
    const interval = setInterval(() => {
      setShout(true);
      playGrowl();
      const lines = [
        "DO IT NOW!",
        "MOVE. RIGHT. NOW!",
        "STOP WAITING. GO!",
        "THE DEADLINE IS COMING!",
      ];
      speak(lines[Math.floor(Math.random() * lines.length)]);
      setTimeout(() => setShout(false), 1800);
    }, 18000);
    return () => clearInterval(interval);
   
  }, [danger]);

  useEffect(() => {
    const handler = () => {
      setDefeated(true);
      setTimeout(() => setDefeated(false), 900);
    };
    window.addEventListener("monster_defeated", handler);
    return () => window.removeEventListener("monster_defeated", handler);
  }, []);

  const creep = useMemo(() => {
    if (!markerPos) return { x: 0, y: 0 };
    const k = (t / 100) * 18;
    const dx = ((markerPos.x ?? 50) - 50) / 50;
    const dy = ((markerPos.y ?? 50) - 50) / 50;
    return { x: dx * k, y: dy * k };
  }, [markerPos, t]);

  const eyeSquint = 6 + (t / 100) * 10;
  const pupil = 6 - (t / 100) * 3.5;
  const mouthOpen = 10 + (t / 100) * 16;
  const hornTilt = -6 - (t / 100) * 10;

  let mood = "Dormant.";
  if (t >= 85) mood = "FINAL WARNING.";
  else if (t >= 70) mood = "DEADLINE PANIC.";
  else if (t >= 40) mood = "Getting angry.";

  return (
    <div className="pf-monsterWrap">
      {shout && <div className="pf-monsterShout">DO IT NOWWWW!!!</div>}

      <div
        className={[
          "pf-monsterSvg",
          danger ? "shake" : "",
          overdue ? "overduePulse" : "",
          defeated ? "defeated" : "",
        ].join(" ")}
        style={{
          transform: `translate(${creep.x}px, ${creep.y}px) scale(${scale})`,
        }}
        title={`Threat ${t}%`}
      >
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden>
          <ellipse cx="32" cy="56" rx="18" ry="6" fill="rgba(0,0,0,0.15)" />

          <path
            d="M16 22 C12 14, 14 8, 20 6 C22 12, 22 18, 16 22 Z"
            fill="#1a1d2b"
            transform={`rotate(${hornTilt} 16 22)`}
          />
          <path
            d="M48 22 C52 14, 50 8, 44 6 C42 12, 42 18, 48 22 Z"
            fill="#1a1d2b"
            transform={`rotate(${-hornTilt} 48 22)`}
          />

          <path
            d="M12 30 C12 18, 22 10, 32 10 C42 10, 52 18, 52 30
                   C52 44, 44 54, 32 54 C20 54, 12 44, 12 30 Z"
            fill="#222744"
          />
          <path
            d="M18 28 C18 20, 24 16, 32 16 C40 16, 46 20, 46 28
                   C46 40, 40 48, 32 48 C24 48, 18 40, 18 28 Z"
            fill="#2d3560"
            opacity="0.95"
          />

          <ellipse cx="24" cy="30" rx="9" ry={eyeSquint} fill="#0b0d18" />
          <ellipse cx="40" cy="30" rx="9" ry={eyeSquint} fill="#0b0d18" />

          <ellipse
            cx="24"
            cy="30"
            rx="6.5"
            ry={Math.max(4, eyeSquint - 4)}
            fill="#ff3b3b"
            opacity="0.95"
          />
          <ellipse
            cx="40"
            cy="30"
            rx="6.5"
            ry={Math.max(4, eyeSquint - 4)}
            fill="#ff3b3b"
            opacity="0.95"
          />

          <circle cx="24" cy="30" r={Math.max(2, pupil)} fill="#1a0a0a" />
          <circle cx="40" cy="30" r={Math.max(2, pupil)} fill="#1a0a0a" />

          <path
            d="M16 24 L30 26"
            stroke="#0b0d18"
            strokeWidth="4"
            strokeLinecap="round"
            opacity={0.4 + (t / 100) * 0.6}
          />
          <path
            d="M48 24 L34 26"
            stroke="#0b0d18"
            strokeWidth="4"
            strokeLinecap="round"
            opacity={0.4 + (t / 100) * 0.6}
          />

          <path
            d={`M22 40 C26 ${40 + mouthOpen / 2}, 38 ${
              40 + mouthOpen / 2
            }, 42 40
                    C40 ${40 + mouthOpen}, 24 ${
              40 + mouthOpen
            }, 22 40 Z`}
            fill="#0b0d18"
          />

          <path d="M26 42 L28 46 L30 42 Z" fill="#f5f7ff" opacity="0.9" />
          <path d="M34 42 L36 46 L38 42 Z" fill="#f5f7ff" opacity="0.9" />
          <path d="M30 44 L32 48 L34 44 Z" fill="#f5f7ff" opacity="0.9" />

          <path
            d={`M24 41 C28 ${41 + mouthOpen / 2}, 36 ${
              41 + mouthOpen / 2
            }, 40 41
                    C38 ${41 + mouthOpen - 2}, 26 ${
              41 + mouthOpen - 2
            }, 24 41 Z`}
            fill="#ff3b3b"
            opacity={0.15 + (t / 100) * 0.35}
          />

          {t >= 70 && (
            <path
              d="M32 16 L30 20 L34 23 L31 27"
              stroke="#ff3b3b"
              strokeWidth="2"
              opacity="0.8"
            />
          )}
        </svg>
      </div>

      <div className="pf-monsterMood">{mood}</div>
    </div>
  );
}

/* ===== Replace emoji art with classy SVGs ===== */
function CyberFortressArt() {
  return (
    <svg className="pf-artSvg" viewBox="0 0 520 180" aria-hidden>
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(91,140,255,0.26)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="520" height="180" rx="18" fill="url(#g1)" />
      <path d="M70 140 L120 90 L170 140 Z" fill="rgba(255,255,255,0.12)" />
      <path d="M150 140 L230 70 L310 140 Z" fill="rgba(255,255,255,0.10)" />
      <path d="M280 140 L350 95 L420 140 Z" fill="rgba(255,255,255,0.09)" />

      <rect
        x="190"
        y="78"
        width="140"
        height="78"
        rx="10"
        fill="rgba(15,22,45,0.55)"
        stroke="rgba(255,255,255,0.10)"
      />
      <rect x="205" y="62" width="35" height="22" rx="6" fill="rgba(15,22,45,0.70)" />
      <rect x="280" y="62" width="35" height="22" rx="6" fill="rgba(15,22,45,0.70)" />
      <rect x="250" y="98" width="20" height="58" rx="8" fill="rgba(91,140,255,0.30)" />

      <path
        d="M40 155 C120 130, 220 160, 320 135 C410 116, 470 130, 500 120"
        stroke="rgba(91,140,255,0.35)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="250" cy="128" r="6" fill="rgba(91,140,255,0.75)" />
      <circle cx="270" cy="128" r="4" fill="rgba(70,211,154,0.65)" />
    </svg>
  );
}

function DatabaseArt() {
  return (
    <svg className="pf-artSvg" viewBox="0 0 520 180" aria-hidden>
      <defs>
        <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(70,211,154,0.22)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="520" height="180" rx="18" fill="url(#g2)" />

      <path
        d="M0 132 C90 95, 160 150, 250 118 C330 92, 400 135, 520 98 L520 180 L0 180 Z"
        fill="rgba(255,255,255,0.09)"
      />

      <ellipse
        cx="260"
        cy="68"
        rx="78"
        ry="24"
        fill="rgba(15,22,45,0.55)"
        stroke="rgba(255,255,255,0.10)"
      />
      <rect
        x="182"
        y="68"
        width="156"
        height="74"
        fill="rgba(15,22,45,0.55)"
        stroke="rgba(255,255,255,0.10)"
      />
      <ellipse
        cx="260"
        cy="142"
        rx="78"
        ry="24"
        fill="rgba(15,22,45,0.55)"
        stroke="rgba(255,255,255,0.10)"
      />

      <path
        d="M205 96 H315"
        stroke="rgba(70,211,154,0.55)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M220 116 H300"
        stroke="rgba(91,140,255,0.40)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="338" cy="96" r="7" fill="rgba(70,211,154,0.70)" />
    </svg>
  );
}

function ShieldCompassLogo() {
  return (
    <svg
      viewBox="0 0 64 64"
      width="34"
      height="34"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="qgShield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.60)" />
        </linearGradient>

        <linearGradient id="qgRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.65)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.25)" />
        </linearGradient>
      </defs>

      {/* Shield base */}
      <path
        d="M32 6
           C38 10 45 12 52 12
           V30
           C52 43 43 53 32 58
           C21 53 12 43 12 30
           V12
           C19 12 26 10 32 6 Z"
        fill="url(#qgShield)"
        opacity="0.95"
      />

      {/* Inner shield tint */}
      <path
        d="M32 10
           C37 13 44 15 49 15
           V30
           C49 41 41 49 32 53
           C23 49 15 41 15 30
           V15
           C20 15 27 13 32 10 Z"
        fill="rgba(79,102,255,0.14)"
        opacity="0.95"
      />

      {/* Compass ring */}
      <circle
        cx="32"
        cy="30"
        r="14"
        fill="rgba(255,255,255,0.20)"
        stroke="url(#qgRing)"
        strokeWidth="2"
      />

      {/* Compass ticks */}
      <path
        d="M32 14 V18 M32 42 V46 M16 30 H20 M44 30 H48"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Needle (diamond) */}
      <path
        d="M32 20 L40 30 L32 40 L24 30 Z"
        fill="rgba(79,102,255,0.55)"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth="1.5"
      />

      {/* Needle highlight (top) */}
      <path
        d="M32 20 L40 30 L32 28 Z"
        fill="rgba(255,93,107,0.85)"
      />

      {/* Center dot */}
      <circle cx="32" cy="30" r="2.2" fill="rgba(27,37,64,0.55)" />
    </svg>
  );
}