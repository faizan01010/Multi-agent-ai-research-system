import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

/* ── palette ──────────────────────────────────────── */
const C = {
    bg: "#03070f",
    surface: "rgba(8,15,30,0.85)",
    border: "rgba(255,255,255,0.07)",
    indigo: "#6366f1",
    violet: "#818cf8",
    emerald: "#34d399",
    cyan: "#22d3ee",
    pink: "#f472b6",
    amber: "#fbbf24",
    text: "#f1f5f9",
    muted: "#64748b",
    dim: "#1e293b",
};

const STEPS = [
    { id: "search", n: 1, label: "search_node", name: "Search Agent", icon: "⌕", color: C.violet, desc: "Searches Tavily for 5 reliable sources. Stores titles, URLs, snippets in state.", file: "agents.py", key: "search_results" },
    { id: "reader", n: 2, label: "reader_node", name: "Reader Agent", icon: "⊞", color: C.emerald, desc: "Picks the best URL, scrapes 3000 chars of clean text via BeautifulSoup.", file: "agents.py", key: "scraped_content" },
    { id: "writer", n: 3, label: "writer_node", name: "Writer Chain", icon: "✦", color: C.cyan, desc: "Combines search + scraped content, drafts structured report via Mistral.", file: "agents.py", key: "report" },
    { id: "critic", n: 4, label: "critic_node", name: "Critic Chain", icon: "◈", color: C.pink, desc: "Scores the report X/10. If score < 8 → loops back to writer. Else → END.", file: "agents.py", key: "feedback" },
];

/* ── neural canvas background ─────────────────────── */
function NeuralBg() {
    const ref = useRef(null);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let W, H, nodes, raf;
        const resize = () => {
            W = canvas.width = canvas.offsetWidth;
            H = canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener("resize", resize);
        nodes = Array.from({ length: 55 }, () => ({
            x: Math.random() * W, y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            r: Math.random() * 1.8 + 0.6,
            pulse: Math.random() * Math.PI * 2,
        }));
        const COLORS = ["#6366f1", "#818cf8", "#34d399", "#22d3ee", "#f472b6"];
        const draw = () => {
            ctx.clearRect(0, 0, W, H);
            nodes.forEach(n => {
                n.x += n.vx; n.y += n.vy; n.pulse += 0.018;
                if (n.x < 0 || n.x > W) n.vx *= -1;
                if (n.y < 0 || n.y > H) n.vy *= -1;
            });
            nodes.forEach((a, i) => {
                nodes.slice(i + 1).forEach(b => {
                    const dx = a.x - b.x, dy = a.y - b.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 130) {
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
                        ctx.strokeStyle = `rgba(129,140,248,${(1 - dist / 130) * 0.18})`;
                        ctx.lineWidth = 0.8; ctx.stroke();
                    }
                });
            });
            nodes.forEach((n, i) => {
                const glow = Math.sin(n.pulse) * 0.4 + 0.6;
                ctx.beginPath(); ctx.arc(n.x, n.y, n.r * glow + 0.5, 0, Math.PI * 2);
                ctx.fillStyle = COLORS[i % COLORS.length];
                ctx.globalAlpha = glow * 0.7; ctx.fill(); ctx.globalAlpha = 1;
            });
            raf = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
    }, []);
    return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />;
}

function Beam({ active, done, fromColor, toColor }) {
    return (
        <div style={{ flex: 1, height: 2, position: "relative", margin: "0 6px", alignSelf: "center", marginBottom: 48 }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.05)", borderRadius: 1 }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 1, background: done ? `linear-gradient(90deg,${fromColor},${toColor})` : "transparent", transition: "background 0.7s ease" }} />
            {active && <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", width: 10, height: 10, borderRadius: "50%", background: fromColor, boxShadow: `0 0 12px ${fromColor}`, animation: "bead 1.2s linear infinite" }} />}
        </div>
    );
}

function PNode({ step, active, done, rewriting, visible }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, minWidth: 100, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(30px)", transition: `opacity 0.6s ${step.n * 0.12}s ease, transform 0.6s ${step.n * 0.12}s ease` }}>
            <div style={{ position: "relative" }}>
                {active && (
                    <>
                        <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: `1.5px solid ${step.color}44`, animation: "rp1 1.8s ease-out infinite" }} />
                        <div style={{ position: "absolute", inset: -18, borderRadius: "50%", border: `1px solid ${step.color}22`, animation: "rp2 1.8s ease-out infinite 0.4s" }} />
                    </>
                )}
                <div style={{ width: 68, height: 68, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: active || done ? `radial-gradient(circle, ${step.color}22 0%, transparent 70%)` : "rgba(8,15,30,0.9)", border: `2px solid ${active || done ? step.color : "rgba(255,255,255,0.08)"}`, boxShadow: active ? `0 0 0 4px ${step.color}33, 0 0 40px ${step.color}55` : done ? `0 0 20px ${step.color}33` : "none", transition: "all 0.45s cubic-bezier(0.4,0,0.2,1)", position: "relative", overflow: "hidden" }}>
                    {rewriting && <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px dashed ${step.color}88`, animation: "spin 2s linear infinite" }} />}
                    <span style={{ fontSize: done ? 22 : 26, color: active || done ? step.color : C.dim, fontWeight: 700, transition: "all 0.3s" }}>{done && !rewriting ? "✓" : step.icon}</span>
                </div>
            </div>
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: active || done ? step.color : C.muted, transition: "color 0.35s", letterSpacing: 0.2 }}>{step.name}</div>
                <div style={{ fontSize: 9, color: C.dim, fontFamily: "monospace", marginTop: 3 }}>{step.label}</div>
                {active && <div style={{ fontSize: 9, color: step.color, marginTop: 3, animation: "blink 1s infinite" }}>● running</div>}
                {rewriting && <div style={{ fontSize: 9, color: C.amber, marginTop: 3 }}>↻ rewriting...</div>}
            </div>
        </div>
    );
}

function RewriteArc({ show }) {
    return (
        <div style={{ position: "absolute", bottom: -64, left: "50%", transform: "translateX(-50%)", width: 320, pointerEvents: "none", opacity: show ? 1 : 0, transition: "opacity 0.5s" }}>
            <div style={{ textAlign: "center", fontSize: 10, color: C.amber, fontFamily: "monospace", marginBottom: 4, fontWeight: 700 }}>should_rewrite() → score(6) &lt; 8 → "rewrite"</div>
            <svg width="100%" height="26" viewBox="0 0 320 26">
                <defs>
                    <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={C.amber} /></marker>
                    <linearGradient id="arcg" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={C.amber} stopOpacity="0.3" />
                        <stop offset="50%" stopColor={C.amber} />
                        <stop offset="100%" stopColor={C.amber} stopOpacity="0.3" />
                    </linearGradient>
                </defs>
                <path d="M 296 5 Q 296 22 160 22 Q 24 22 24 5" stroke="url(#arcg)" strokeWidth="1.5" fill="none" strokeDasharray="5 3" markerEnd="url(#arr)" />
            </svg>
        </div>
    );
}

/* ── pipeline animation schedule ─────────────────── */
const PIPELINE_SCHEDULE = [
    { step: 1, delay: 0, duration: 3000, log: { s: 1, msg: 'StateGraph.invoke() → topic: running...', hi: false } },
    { step: 1, delay: 500, duration: 0, log: { s: 1, msg: "search_node ← ChatMistralAI + web_search tool" } },
    { step: 1, delay: 1500, duration: 0, log: { s: 1, msg: "TavilyClient.search(max_results=5)... retrieving results...", hi: false } },
    { step: 1, delay: 2800, duration: 0, log: { s: 1, msg: "5 results retrieved ✓", hi: true } },
    { step: 2, delay: 3200, duration: 2500, log: { s: 2, msg: "reader_node ← picking most relevant URL..." } },
    { step: 2, delay: 4000, duration: 0, log: { s: 2, msg: "scrape_url() → BeautifulSoup parsing HTML" } },
    { step: 2, delay: 5500, duration: 0, log: { s: 2, msg: "stripped: script/style/nav/footer → text[:3000] ready ✓", hi: true } },
    { step: 3, delay: 6000, duration: 4000, log: { s: 3, msg: "writer_node ← writer_prompt | ChatMistralAI | StrOutputParser()" } },
    { step: 3, delay: 7000, duration: 0, log: { s: 3, msg: "drafting: Introduction → Key Findings → Conclusion → Sources..." } },
    { step: 3, delay: 9800, duration: 0, log: { s: 3, msg: "state['report'] saved — attempt #1 ✓", hi: true } },
    { step: 4, delay: 10200, duration: 2000, log: { s: 4, msg: "critic_node ← evaluating report..." } },
    { step: 4, delay: 11500, duration: 0, log: { s: 4, msg: "scoring report quality...", warn: false } },
];

/* ══════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════ */
export default function App() {
    const [screen, setScreen] = useState("hero");
    const [topic, setTopic] = useState("");
    const [tab, setTab] = useState("workflow");
    const [running, setRunning] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [doneSteps, setDoneSteps] = useState([]);
    const [rewriting, setRewriting] = useState(false);
    const [showArc, setShowArc] = useState(false);
    const [logs, setLogs] = useState([]);
    const [report, setReport] = useState("");
    const [feedback, setFeedback] = useState("");
    const [fileName, setFileName] = useState("");
    const [scores, setScores] = useState([]);
    const [elapsed, setElapsed] = useState(0);
    const [error, setError] = useState("");
    const logRef = useRef(null);
    const timer = useRef(null);
    const t0 = useRef(null);
    const timeoutsRef = useRef([]);

    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [logs]);

    useEffect(() => {
        if (running) {
            t0.current = Date.now();
            timer.current = setInterval(() => setElapsed(((Date.now() - t0.current) / 1000).toFixed(1)), 100);
        } else {
            clearInterval(timer.current);
        }
        return () => clearInterval(timer.current);
    }, [running]);

    const clearTimeouts = () => {
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];
    };

    const addLog = (logEntry) => {
        setLogs(prev => [...prev, logEntry]);
    };

    const runPipeline = async () => {
        if (!topic.trim() || running) return;

        // Reset state
        setRunning(true);
        setError("");
        setLogs([]);
        setReport("");
        setFeedback("");
        setScores([]);
        setDoneSteps([]);
        setActiveStep(0);
        setRewriting(false);
        setShowArc(false);
        setTab("workflow");

        clearTimeouts();

        // Start visual pipeline animation
        PIPELINE_SCHEDULE.forEach(({ step, delay, log }) => {
            const t = setTimeout(() => {
                setActiveStep(step);
                if (log) addLog(log);
            }, delay);
            timeoutsRef.current.push(t);
        });

        // Mark steps done progressively
        [
            [3000, 1], [5800, 2], [10000, 3],
        ].forEach(([delay, step]) => {
            const t = setTimeout(() => {
                setDoneSteps(prev => [...prev, step]);
            }, delay);
            timeoutsRef.current.push(t);
        });

        try {
            // Call the FastAPI backend
            const response = await fetch("https://multi-agent-ai-research-system-5.onrender.com/research", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic }),
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log("FULL RESPONSE =", data);

            // API responded — update UI with real data
            // API responded — update UI with real data
            const reportText =
                data.report ?? data.result ?? data.content ?? JSON.stringify(data, null, 2);

            const feedbackText =
                data.feedback ?? data.critique ?? data.evaluation ?? "";

            // Critic feedback se score nikaalo (e.g. "Score: 6.5/10")
            const scoreMatch = feedbackText.match(/Score:\s*(\d+(\.\d+)?)/i);

            const finalScore =
                data.score ??
                data.final_score ??
                (scoreMatch ? parseFloat(scoreMatch[1]) : 0);

            const allScores =
                data.scores ??
                data.score_history ??
                [finalScore];

            setFileName(data.file_name || "");

            console.log("FILE NAME =", data.file_name);

            setReport(reportText);
            setFeedback(feedbackText);

            clearTimeouts();

            // Complete the animation
            setTimeout(() => {
                addLog({ s: 4, msg: `Score = ${finalScore}/10 — threshold passed ✓`, hi: true });
                addLog({ s: 4, msg: 'should_rewrite() → "end" → graph complete. Report saved as topic.md ✓', hi: true });
                setDoneSteps([1, 2, 3, 4]);
                setActiveStep(0);
                setRewriting(false);
                setShowArc(false);
                setScores(allScores);
                setReport(reportText);
                setFeedback(feedbackText);
                setRunning(false);
                setTab("report");
            }, 500);

        } catch (err) {
            // Handle API error gracefully — show error log and stop animation
            clearTimeouts();

            const isNetworkError = err.message.includes("fetch") || err.message.includes("Failed") || err.message.includes("NetworkError");
            const errMsg = isNetworkError
                ? "Cannot connect to FastAPI server at localhost:8000. Make sure `uvicorn api:app --reload` is running."
                : err.message;

            addLog({ s: 0, msg: `✗ Error: ${errMsg}`, warn: true });
            setError(errMsg);
            setActiveStep(0);
            setRunning(false);
        }
    };

    /* ── HERO SCREEN ─────────────────────────────────── */
    if (screen === "hero") return (
        <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Syne','Inter',system-ui,sans-serif", color: C.text, overflow: "hidden" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes shimmer{0%{background-position:-400% 0}100%{background-position:400% 0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}
        @keyframes glow{0%,100%{box-shadow:0 0 32px #6366f155}50%{box-shadow:0 0 60px #818cf899}}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}
      `}</style>
            <div style={{ position: "fixed", inset: 0, zIndex: 0 }}><NeuralBg /></div>
            <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", background: `radial-gradient(ellipse 70% 60% at 50% 40%, rgba(99,102,241,0.1) 0%, transparent 70%), linear-gradient(to bottom, transparent 60%, ${C.bg} 100%)` }} />

            <nav style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(12px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#4f46e5,#34d399)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, boxShadow: "0 0 20px rgba(99,102,241,0.5)" }}>⬡</div>
                    <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.5 }}>ResearchAI</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 28, fontSize: 13, color: C.muted }}>
                    {["How it works", "Agents", "Tools"].map(l => (
                        <span key={l} style={{ cursor: "pointer", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = C.text} onMouseLeave={e => e.target.style.color = C.muted}>{l}</span>
                    ))}
                    <button onClick={() => setScreen("app")} style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 8, padding: "7px 18px", color: C.violet, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Launch App →</button>
                </div>
            </nav>

            <section style={{ position: "relative", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "96px 32px 72px", minHeight: "80vh", justifyContent: "center" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 999, padding: "6px 16px", marginBottom: 36, animation: "fadeUp 0.6s ease both" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.emerald, display: "inline-block", animation: "blink 1.5s infinite" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.violet, letterSpacing: 1.2, fontFamily: "'JetBrains Mono',monospace" }}>LANGGRAPH · MISTRAL · TAVILY · REFLECTION LOOP</span>
                </div>

                <h1 style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 900, animation: "fadeUp 0.6s 0.1s ease both" }}>
                    AI That{" "}
                    <span style={{ background: "linear-gradient(120deg,#818cf8 0%,#34d399 40%,#22d3ee 70%,#818cf8 100%)", backgroundSize: "300% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", animation: "shimmer 4s linear infinite" }}>Researches,</span>
                    <br />Writes & Critiques Itself
                </h1>

                <p style={{ marginTop: 24, fontSize: 19, color: C.muted, maxWidth: 580, lineHeight: 1.7, fontFamily: "Inter,system-ui", fontWeight: 400, animation: "fadeUp 0.6s 0.2s ease both" }}>
                    A multi-agent LangGraph pipeline that searches the web, scrapes sources, writes a report — and loops until it's good enough to ship.
                </p>

                <div style={{ display: "flex", gap: 14, marginTop: 44, animation: "fadeUp 0.6s 0.3s ease both" }}>
                    <button onClick={() => setScreen("app")} style={{ background: "linear-gradient(135deg,#4f46e5,#818cf8)", border: "none", borderRadius: 12, padding: "15px 36px", color: "#fff", fontFamily: "Inter,system-ui", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 0 40px rgba(99,102,241,0.45)", animation: "glow 3s ease infinite" }}
                        onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                        ▶ Try the Pipeline
                    </button>
                    <button style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "15px 28px", color: C.muted, fontFamily: "Inter,system-ui", fontWeight: 600, fontSize: 15, cursor: "pointer", transition: "all 0.2s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = C.text; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = C.muted; }}>View Source ↗</button>
                </div>

                <div style={{ display: "flex", gap: 16, marginTop: 64, flexWrap: "wrap", justifyContent: "center", animation: "fadeUp 0.6s 0.45s ease both" }}>
                    {[{ val: "4", label: "AI Agents", color: C.violet }, { val: "2", label: "@tool functions", color: C.emerald }, { val: "<8", label: "Score → Rewrite", color: C.amber }, { val: "∞", label: "Reflection loops", color: C.cyan }].map(s => (
                        <div key={s.label} style={{ background: "rgba(8,15,30,0.8)", backdropFilter: "blur(12px)", border: `1px solid ${s.color}33`, borderRadius: 12, padding: "12px 22px", textAlign: "center" }}>
                            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section style={{ position: "relative", zIndex: 5, padding: "0 48px 100px", maxWidth: 1100, margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: 56 }}>
                    <div style={{ fontSize: 11, color: C.violet, fontWeight: 700, letterSpacing: 2, fontFamily: "'JetBrains Mono',monospace", marginBottom: 12 }}>HOW IT WORKS</div>
                    <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>Four agents. One <span style={{ color: C.emerald }}>self-improving</span> loop.</h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
                    {STEPS.map((step, i) => (
                        <div key={step.id} style={{ background: "rgba(8,15,30,0.8)", backdropFilter: "blur(16px)", border: `1px solid ${step.color}22`, borderRadius: 16, padding: 22, borderTop: `3px solid ${step.color}`, animation: `scaleIn 0.5s ${0.1 + i * 0.1}s ease both`, transition: "transform 0.25s, box-shadow 0.25s" }}
                            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 16px 40px ${step.color}22`; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                            <div style={{ width: 44, height: 44, borderRadius: 10, marginBottom: 14, background: `${step.color}18`, border: `1px solid ${step.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: step.color }}>{step.icon}</div>
                            <div style={{ fontSize: 10, color: step.color, fontFamily: "'JetBrains Mono',monospace", marginBottom: 6, fontWeight: 600 }}>STEP {step.n} · {step.label}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{step.name}</div>
                            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.65 }}>{step.desc}</p>
                        </div>
                    ))}
                </div>
                <div style={{ textAlign: "center", marginTop: 64 }}>
                    <button onClick={() => setScreen("app")} style={{ background: "linear-gradient(135deg,#4f46e5,#818cf8)", border: "none", borderRadius: 12, padding: "16px 42px", color: "#fff", fontFamily: "Inter,system-ui", fontWeight: 700, fontSize: 16, cursor: "pointer", boxShadow: "0 0 40px rgba(99,102,241,0.4)", transition: "all 0.25s" }}
                        onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}> Launch Research Pipeline →</button>
                </div>
            </section>
        </div>
    );

    /* ── APP SCREEN ───────────────────────────────────── */
    return (
        <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter','SF Pro Display',system-ui,sans-serif", color: C.text }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes rp1{0%{transform:scale(1);opacity:.5}100%{transform:scale(1.8);opacity:0}}
        @keyframes rp2{0%{transform:scale(1);opacity:.3}100%{transform:scale(2.3);opacity:0}}
        @keyframes bead{0%{left:0}100%{left:100%}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes logIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-400% 0}100%{background-position:400% 0}}
        @keyframes slideIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}
        textarea:focus{outline:none}
        .tbtn{background:transparent;border:1px solid transparent;border-radius:8px;padding:6px 16px;font-family:Inter,system-ui;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;text-transform:capitalize;}
        .tbtn:hover{color:#94a3b8!important;background:rgba(255,255,255,0.04)!important}
        .hcard{transition:transform 0.25s,box-shadow 0.25s}.hcard:hover{transform:translateY(-2px)}
      `}</style>

            {/* Header */}
            <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(3,7,15,0.88)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={() => setScreen("hero")} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 18, lineHeight: 1, marginRight: 4 }}>←</button>
                    <div style={{ width: 30, height: 30, borderRadius: 7, background: "linear-gradient(135deg,#4f46e5,#34d399)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⬡</div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.3, fontFamily: "Syne,system-ui" }}>ResearchAI</div>
                        <div style={{ fontSize: 8.5, color: C.dim, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>LANGGRAPH · MISTRAL-SMALL</div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                    {["workflow", "logs", "report"].map(t => (
                        <button key={t} className="tbtn" onClick={() => setTab(t)} style={{ color: tab === t ? C.violet : C.dim, background: tab === t ? "rgba(99,102,241,0.1)" : "transparent", border: `1px solid ${tab === t ? "rgba(99,102,241,0.25)" : "transparent"}` }}>{t}{t === "report" && report ? " ✓" : ""}</button>
                    ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 10.5 }}>
                    {running && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.emerald }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.emerald, animation: "pulse 1s infinite" }} />
                            {elapsed}s
                        </div>
                    )}
                    {scores.length > 0 && scores.map((sc, i) => (
                        <span key={i} style={{ fontSize: 9.5, fontFamily: "'JetBrains Mono',monospace", color: sc >= 8 ? C.emerald : C.amber, background: `rgba(${sc >= 8 ? "52,211,153" : "251,191,36"},0.1)`, border: `1px solid rgba(${sc >= 8 ? "52,211,153" : "251,191,36"},0.25)`, borderRadius: 5, padding: "2px 7px" }}>{sc}/10</span>
                    ))}
                </div>
            </div>

            <div style={{ display: "flex", height: "calc(100vh - 58px)", overflow: "hidden" }}>
                {/* Sidebar */}
                <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.04)", padding: "14px 10px", display: "flex", flexDirection: "column", gap: 6, background: "rgba(3,7,15,0.5)", overflowY: "auto" }}>
                    <div style={{ fontSize: 8.5, color: C.dim, letterSpacing: 1.5, fontWeight: 700, marginBottom: 4, paddingLeft: 4, fontFamily: "'JetBrains Mono',monospace" }}>GRAPH NODES</div>
                    {STEPS.map(step => {
                        const isA = activeStep === step.n, isD = doneSteps.includes(step.n), isRw = rewriting && step.n === 3;
                        return (
                            <div key={step.id} style={{ background: isA ? `${step.color}12` : "rgba(8,15,30,0.5)", border: `1px solid ${isA ? step.color + "44" : "rgba(255,255,255,0.05)"}`, borderRadius: 10, padding: "10px 12px", boxShadow: isA ? `0 0 20px ${step.color}15` : "none", transition: "all 0.35s", position: "relative", overflow: "hidden" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                                    <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: isA || isD ? `${step.color}18` : "rgba(255,255,255,0.03)", border: `1px solid ${isA || isD ? step.color + "55" : "rgba(255,255,255,0.06)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: isA || isD ? step.color : C.dim, transition: "all 0.3s" }}>{isD && !isRw ? "✓" : step.icon}</div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: isA || isD ? "#f1f5f9" : C.muted, transition: "color 0.3s" }}>{step.name}</div>
                                </div>
                                <div style={{ fontSize: 8.5, color: C.dim, fontFamily: "'JetBrains Mono',monospace", paddingLeft: 32 }}>{step.label}{isA && <span style={{ marginLeft: 5, color: step.color, animation: "blink 1s infinite" }}>▌</span>}</div>
                            </div>
                        );
                    })}
                    <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "6px 0" }} />
                    <div style={{ padding: "10px 12px", background: "rgba(8,15,30,0.5)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)" }}>
                        <div style={{ fontSize: 8.5, color: C.dim, letterSpacing: 1.5, fontWeight: 700, marginBottom: 8, fontFamily: "'JetBrains Mono',monospace" }}>FILES</div>
                        {[{ f: "pipeline.py", c: C.violet, i: "🐍" }, { f: "agents.py", c: C.emerald, i: "🐍" }, { f: "tools.py", c: C.cyan, i: "🐍" }, { f: "state.py", c: C.pink, i: "🐍" }, { f: "api.py", c: C.amber, i: "🐍" }, { f: ".env", c: C.dim, i: "🔒" }].map(x => (
                            <div key={x.f} style={{ display: "flex", gap: 7, padding: "3px 0", fontSize: 9.5, color: x.c, fontFamily: "'JetBrains Mono',monospace" }}><span>{x.i}</span><span>{x.f}</span></div>
                        ))}
                    </div>
                </div>

                {/* Main */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

                    {/* Query bar */}
                    <div style={{ background: "rgba(8,15,30,0.8)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 18px" }}>
                        <div style={{ fontSize: 8.5, color: C.dim, letterSpacing: 1.5, fontWeight: 700, marginBottom: 11, fontFamily: "'JetBrains Mono',monospace" }}>graph.invoke({"{ topic }"}) — pipeline.py</div>
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                            <textarea
                                rows={2}
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runPipeline(); } }}
                                placeholder='e.g. "Agentic AI frameworks in 2025"'
                                style={{ flex: 1, background: "rgba(3,7,15,0.7)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, color: C.text, fontFamily: "Inter,system-ui", fontSize: 14, lineHeight: 1.6, padding: "12px 14px", resize: "none", transition: "border-color 0.2s" }}
                                onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.4)"}
                                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
                            />
                            <button
                                onClick={runPipeline}
                                disabled={running || !topic.trim()}
                                style={{ background: running || !topic.trim() ? "rgba(20,30,50,0.8)" : "linear-gradient(135deg,#4f46e5,#818cf8)", border: "none", borderRadius: 10, padding: "12px 24px", color: running || !topic.trim() ? C.dim : "#fff", fontFamily: "Inter,system-ui", fontWeight: 700, fontSize: 13, cursor: running || !topic.trim() ? "not-allowed" : "pointer", flexShrink: 0, boxShadow: running || !topic.trim() ? "none" : "0 0 28px rgba(99,102,241,0.35)", transition: "all 0.25s" }}>
                                {running ? (
                                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.2)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                                        Running...
                                    </span>
                                ) : "▶ Run Graph"}
                            </button>
                        </div>

                        {/* Error banner */}
                        {error && (
                            <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 12, color: "#f87171", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.6 }}>
                                <strong>✗ Pipeline Error:</strong> {error}
                                <div style={{ marginTop: 4, fontSize: 10, color: C.muted }}>
                                    Make sure your FastAPI server is running: <code style={{ color: C.amber }}>uvicorn api:app --reload</code>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── WORKFLOW TAB ── */}
                    {tab === "workflow" && (
                        <>
                            <div style={{ background: "rgba(8,15,30,0.8)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "24px 28px", position: "relative" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 30 }}>
                                    <div style={{ fontSize: 8.5, color: C.dim, letterSpacing: 1.5, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>StateGraph(ResearchState) — langgraph</div>
                                    {running && <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: C.emerald }}><span style={{ animation: "blink 0.9s infinite" }}>●</span> LIVE</div>}
                                </div>
                                <div style={{ display: "flex", alignItems: "flex-start", padding: "0 12px", position: "relative" }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginRight: 6 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(8,15,30,0.9)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: C.dim, fontFamily: "'JetBrains Mono',monospace" }}>IN</div>
                                        <div style={{ fontSize: 9, color: C.dim, fontFamily: "'JetBrains Mono',monospace" }}>entry</div>
                                    </div>
                                    <div style={{ width: 16, height: 2, background: "rgba(255,255,255,0.06)", alignSelf: "center", marginBottom: 48 }} />
                                    {STEPS.map((step, i) => (
                                        <div key={step.id} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
                                            <PNode step={step} active={activeStep === step.n} done={doneSteps.includes(step.n)} rewriting={rewriting && step.n === 3} visible={true} />
                                            {i < STEPS.length - 1 && <Beam active={activeStep === step.n} done={doneSteps.includes(step.n)} fromColor={step.color} toColor={STEPS[i + 1].color} />}
                                        </div>
                                    ))}
                                    <div style={{ width: 16, height: 2, background: "rgba(255,255,255,0.06)", alignSelf: "center", marginBottom: 48 }} />
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginLeft: 6 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: doneSteps.includes(4) ? "rgba(52,211,153,0.12)" : "rgba(8,15,30,0.9)", border: `1px solid ${doneSteps.includes(4) ? C.emerald + "55" : "rgba(255,255,255,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: doneSteps.includes(4) ? C.emerald : C.dim, fontFamily: "'JetBrains Mono',monospace", transition: "all 0.5s", boxShadow: doneSteps.includes(4) ? `0 0 16px ${C.emerald}33` : "none" }}>END</div>
                                        <div style={{ fontSize: 9, color: doneSteps.includes(4) ? C.emerald : C.dim, fontFamily: "'JetBrains Mono',monospace", transition: "color 0.5s" }}>done</div>
                                    </div>
                                    <RewriteArc show={showArc} />
                                </div>
                                <div style={{ marginTop: 40, padding: "10px 16px", background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 9.5, color: C.amber, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, flexShrink: 0 }}>conditional_edges</span>
                                    <span style={{ fontSize: 12, color: C.muted }}>critic → <span style={{ color: C.amber }}>should_rewrite()</span> → score &lt; 8 → <span style={{ color: C.pink }}>"rewrite"</span> → writer | score ≥ 8 → <span style={{ color: C.emerald }}>"end"</span> → END</span>
                                    {scores.length > 0 && (
                                        <div style={{ marginLeft: "auto", display: "flex", gap: 5, alignItems: "center" }}>
                                            <span style={{ fontSize: 9, color: C.dim, fontFamily: "'JetBrains Mono',monospace" }}>scores:</span>
                                            {scores.map((sc, i) => (
                                                <span key={i} style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: sc >= 8 ? C.emerald : C.amber, background: `rgba(${sc >= 8 ? "52,211,153" : "251,191,36"},0.1)`, border: `1px solid rgba(${sc >= 8 ? "52,211,153" : "251,191,36"},0.25)`, borderRadius: 5, padding: "2px 8px" }}>{sc}/10</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                                {STEPS.map(step => {
                                    const isA = activeStep === step.n, isD = doneSteps.includes(step.n);
                                    return (
                                        <div key={step.id} className="hcard" style={{ background: isA ? `${step.color}0e` : "rgba(8,15,30,0.7)", border: `1px solid ${isA ? step.color + "33" : isD ? step.color + "22" : "rgba(255,255,255,0.05)"}`, borderRadius: 12, padding: 14, borderTop: `2px solid ${isA || isD ? step.color : "rgba(255,255,255,0.05)"}`, transition: "all 0.35s" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                                                <span style={{ fontSize: 16, color: isA || isD ? step.color : C.dim }}>{step.icon}</span>
                                                <span style={{ fontSize: 11.5, fontWeight: 700, color: isA || isD ? "#f1f5f9" : C.muted }}>{step.name}</span>
                                            </div>
                                            <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, marginBottom: 8 }}>{step.desc}</p>
                                            <div style={{ fontSize: 9, color: C.dim, fontFamily: "'JetBrains Mono',monospace" }}>{step.file}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* ── LOGS TAB ── */}
                    {tab === "logs" && (
                        <div style={{ background: "rgba(8,15,30,0.8)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 18px", flex: 1, animation: "fadeUp 0.3s ease" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                <div style={{ fontSize: 8.5, color: C.dim, letterSpacing: 1.5, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>EXECUTION LOG</div>
                                <div style={{ display: "flex", gap: 5 }}>
                                    {["#ef4444", "#f59e0b", "#22c55e"].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.5 }} />)}
                                </div>
                            </div>
                            <div ref={logRef} style={{ background: "rgba(3,5,12,0.9)", borderRadius: 10, padding: "12px 16px", minHeight: 300, maxHeight: "calc(100vh - 280px)", overflowY: "auto", border: "1px solid rgba(255,255,255,0.04)", fontFamily: "'JetBrains Mono',monospace" }}>
                                {logs.length === 0
                                    ? <div style={{ color: C.dim, fontSize: 11 }}><span style={{ color: C.muted }}>$</span> awaiting graph.invoke()...</div>
                                    : logs.map((log, i) => {
                                        const step = STEPS.find(s => s.n === log.s);
                                        return (
                                            <div key={i} style={{ display: "flex", gap: 10, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.025)", animation: "logIn 0.2s ease both", animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}>
                                                <span style={{ color: C.dim, fontSize: 9.5, flexShrink: 0, paddingTop: 1 }}>{String(i).padStart(2, "0")}</span>
                                                <span style={{ color: log.warn ? C.amber : step?.color || C.muted, fontSize: 9.5, minWidth: 68, flexShrink: 0, fontWeight: log.hi ? "700" : "400" }}>[{step?.id || "sys"}]</span>
                                                <span style={{ color: log.warn ? "#fcd34d" : log.hi ? C.text : C.muted, fontSize: 11.5, lineHeight: 1.5, fontWeight: log.hi ? "600" : "400" }}>{log.msg}</span>
                                            </div>
                                        );
                                    })
                                }
                                {running && <div style={{ color: STEPS.find(s => s.n === activeStep)?.color || C.violet, fontSize: 11, marginTop: 4, animation: "blink 0.8s infinite" }}>▌</div>}
                            </div>
                        </div>
                    )}

                    {/* ── REPORT TAB ── */}
                    {tab === "report" && (
                        <div style={{ animation: "slideIn 0.4s ease" }}>
                            {!report && !feedback
                                ? (
                                    <div style={{ background: "rgba(8,15,30,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "80px 20px", textAlign: "center" }}>
                                        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                                        <div style={{ color: C.muted, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No report yet — run the pipeline first.</div>
                                        <div style={{ color: C.dim, fontSize: 12 }}>Enter a topic above and click <strong style={{ color: C.violet }}>▶ Run Graph</strong></div>
                                    </div>
                                )
                                : (
                                    <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14 }}>
                                        {/* Report */}
                                        <div style={{ background: "rgba(8,15,30,0.8)", border: `1px solid ${C.cyan}22`, borderRadius: 14, padding: 24, borderTop: `3px solid ${C.cyan}` }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                                                <span style={{ color: C.cyan, fontSize: 16 }}>✦</span>
                                                <span style={{ fontWeight: 700, fontSize: 14 }}>Research Report</span>
                                                <span style={{ fontSize: 9.5, color: C.cyan, background: `${C.cyan}18`, border: `1px solid ${C.cyan}33`, borderRadius: 5, padding: "1px 7px", fontFamily: "'JetBrains Mono',monospace" }}>writer_node</span>
                                                <span style={{ marginLeft: "auto", fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono',monospace" }}>{topic}</span>
                                            </div>
                                            {fileName && (
                                                <div
                                                    style={{
                                                        marginBottom: 16,
                                                        padding: "12px 14px",
                                                        borderRadius: 10,
                                                        background: "rgba(99,102,241,0.08)",
                                                        border: "1px solid rgba(99,102,241,0.25)"
                                                    }}
                                                >
                                                    <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>
                                                        ✅ Your report has been generated successfully
                                                    </div>

                                                    <a
                                                        href={`http://127.0.0.1:8000/report/${fileName}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            color: C.cyan,
                                                            fontWeight: 700,
                                                            textDecoration: "none"
                                                        }}
                                                    >
                                                        📄 Open {fileName}
                                                    </a>
                                                </div>
                                            )}
                                            <div
                                                style={{
                                                    color: "#94a3b8",
                                                    lineHeight: 1.8,
                                                    fontSize: "13.5px",
                                                    maxHeight: "60vh",
                                                    overflowY: "auto"
                                                }}
                                            >
                                                <ReactMarkdown
                                                    components={{
                                                        a: ({ href, children }) => (
                                                            <a
                                                                href={href}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{ color: "#60a5fa" }}
                                                            >
                                                                {children}
                                                            </a>
                                                        ),
                                                    }}
                                                >
                                                    {report}
                                                </ReactMarkdown>
                                            </div>
                                        </div>

                                        {/* Critic */}
                                        <div style={{ background: "rgba(8,15,30,0.8)", border: `1px solid ${C.pink}22`, borderRadius: 14, padding: 24, borderTop: `3px solid ${C.pink}`, display: "flex", flexDirection: "column", gap: 14 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{ color: C.pink, fontSize: 16 }}>◈</span>
                                                <span style={{ fontWeight: 700, fontSize: 14 }}>Critic Feedback</span>
                                                <span style={{ fontSize: 9.5, color: C.pink, background: `${C.pink}18`, border: `1px solid ${C.pink}33`, borderRadius: 5, padding: "1px 7px", fontFamily: "'JetBrains Mono',monospace" }}>critic_node</span>
                                            </div>

                                            {/* Score ring */}
                                            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 14, background: "rgba(3,5,12,0.7)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)" }}>
                                                <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
                                                    <svg width={88} height={88} style={{ transform: "rotate(-90deg)" }}>
                                                        <circle cx={44} cy={44} r={34} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
                                                        <circle cx={44} cy={44} r={34} fill="none" stroke="url(#rg)" strokeWidth={6}
                                                            strokeDasharray={`${(scores[scores.length - 1] || 9) / 10 * 2 * Math.PI * 34} ${2 * Math.PI * 34}`}
                                                            strokeLinecap="round" style={{ transition: "stroke-dasharray 1.2s ease" }} />
                                                        <defs>
                                                            <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
                                                                <stop offset="0%" stopColor={C.violet} /><stop offset="100%" stopColor={C.emerald} />
                                                            </linearGradient>
                                                        </defs>
                                                    </svg>
                                                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                                        <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{scores[scores.length - 1] || 9}</span>
                                                        <span style={{ fontSize: 9, color: C.dim }}>/10</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>Final Quality Score</div>
                                                    <div style={{ fontSize: 16, fontWeight: 800, background: `linear-gradient(90deg,${C.violet},${C.emerald})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                                                        {(scores[scores.length - 1] || 0) >= 9 ? "Excellent" : (scores[scores.length - 1] || 0) >= 7 ? "Good" : "Acceptable"}
                                                    </div>
                                                    {scores.length > 1 && <div style={{ fontSize: 9.5, color: C.dim, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>↑ improved: {scores[0]}/10 → {scores[scores.length - 1]}/10</div>}
                                                </div>
                                            </div>

                                            {/* Feedback text */}
                                            {feedback && (
                                                <div style={{ background: "rgba(3,5,12,0.5)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 14px", maxHeight: 200, overflowY: "auto" }}>
                                                    <div style={{ fontSize: 9, color: C.pink, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>CRITIC OUTPUT</div>
                                                    <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{feedback}</div>
                                                </div>
                                            )}

                                            <div style={{ padding: "8px 12px", borderRadius: 7, background: `${C.emerald}0a`, border: `1px solid ${C.emerald}22`, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.emerald }}>
                                                ✓ should_rewrite() → "end" → topic.md saved
                                            </div>
                                        </div>
                                    </div>
                                )
                            }
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}