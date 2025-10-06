import React, { useMemo, useState } from "react";

/*
 Tiempo Tag Team — Judge Mode (Option #2 prototype)
 --------------------------------------------------
 What this does
 • Smart draws: only coherent combinations (time cue ↔ tense compatibility)
 • Local scoring: quick rubric checks tense form, time-cue usage, specials
 • Clipboard integration: 1‑click copy of a structured “ChatGPT Judge” prompt
 • History log: track attempts, scores, and highlights for post‑game review

 Notes
 • No external API calls needed. Works offline.
 • If you later want API scoring, wire up the `scoreWithLLM` stub.

 How to use
 1) Click “New Draw” to deal a coherent set of cards.
 2) Speak/type your sentence, then hit “Score”.
 3) Use “Copy Judge Prompt” if you want a ChatGPT adjudication in parallel.
 4) Toggle difficulty to allow tricky specials and irregulars.
*/

// ---------------------- Data ----------------------
const SUBJECTS = [
  "yo","tú","él","ella","usted","nosotros","ustedes","ellos","ellas"
];

// Verbs (mix of regular + starred irregulars for awareness; not all are auto‑checked)
const VERBS = [
  {inf:"hablar"},{inf:"comer"},{inf:"vivir"},{inf:"trabajar"},{inf:"estudiar"},{inf:"leer"},{inf:"escribir"},{inf:"correr"},{inf:"abrir"},{inf:"beber"},{inf:"comprar"},{inf:"vender"},{inf:"venir★"},{inf:"tener★"},{inf:"poder★"},{inf:"poner★"},{inf:"hacer★"},{inf:"decir★"},{inf:"ir★"},{inf:"ser★"},{inf:"estar★"}
];

// Tenses
const TENSES = [
  {name:"Presente", key:"presente"},
  {name:"Pretérito", key:"preterito"},
  {name:"Futuro (simple)", key:"futuro"},
  {name:"Ir a + infinitivo", key:"ir_a"},
];

// Time cues tagged by compatibility (which tense(s) they naturally go with)
const TIME_CUES = [
  {text:"hoy", allow:["presente","preterito"], weight:2},
  {text:"ahora", allow:["presente"], weight:2},
  {text:"siempre", allow:["presente"], weight:1},
  {text:"a veces", allow:["presente"], weight:1},
  {text:"ayer", allow:["preterito"], weight:2},
  {text:"anoche", allow:["preterito"], weight:1},
  {text:"el lunes pasado", allow:["preterito"], weight:1},
  {text:"el año pasado", allow:["preterito"], weight:1},
  {text:"hace ___ días", allow:["preterito"], weight:1},
  {text:"de repente", allow:["preterito"], weight:1},
  {text:"ya", allow:["preterito","presente"], weight:1},
  {text:"todavía no", allow:["presente"], weight:1},
  {text:"mañana", allow:["futuro","ir_a"], weight:2},
  {text:"pasado mañana", allow:["futuro","ir_a"], weight:1},
  {text:"esta noche", allow:["futuro","ir_a","presente"], weight:1},
  {text:"el viernes que viene", allow:["futuro","ir_a"], weight:1},
  {text:"la semana que viene", allow:["futuro","ir_a"], weight:1},
  {text:"dentro de ___ meses", allow:["futuro","ir_a"], weight:1},
  {text:"pronto", allow:["futuro","ir_a"], weight:1},
  {text:"luego", allow:["futuro","ir_a","presente"], weight:1},
  {text:"más tarde", allow:["futuro","ir_a"], weight:1},
];

// Specials with simple detectors; some are advanced and award bonus on detection
const SPECIALS = [
  {text:"hazlo en negativo", key:"neg"},
  {text:"haz una pregunta", key:"q"},
  {text:"usa ‘porque’ o ‘pero’", key:"conj"},
  {text:"añade un lugar", key:"place"},
  {text:"añade un tiempo extra", key:"time2"},
  {text:"usa un objeto directo (lo/la/los/las)", key:"od"},
  {text:"usa un objeto indirecto (le/les)", key:"oi"},
  {text:"usa un reflexivo si aplica", key:"refl"},
  {text:"cambia al plural", key:"plural"},
  {text:"incluye ‘también’ o ‘tampoco’", key:"tambien"},
  {text:"encadena dos verbos", key:"twoverbs"},
  {text:"usa ‘tener que’ + inf", key:"tenerque"},
  {text:"sin decir ninguna palabra en inglés", key:"noeng"},
];

// ---------------------- Utils ----------------------
function sample(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function weightedSample(items) {
  const pool = items.flatMap(x => Array((x.weight||1)).fill(x));
  return sample(pool);
}

// Very light heuristic checks — not a full parser; aims for fast feedback
const detectors = {
  hasNeg: (s) => /\bno\b/i.test(s),
  isQuestion: (s) => s.trim().startsWith("¿") && s.trim().endsWith("?"),
  hasPorqueOPero: (s) => /\bporque\b|\bpero\b/i.test(s),
  hasPlace: (s) => /\ben (casa|la casa|la escuela|el trabajo|la oficina|el parque|la ciudad)\b|\ben \w+/i.test(s),
  hasExtraTime: (s) => /\bhoy\b|\bmañana\b|\bayer\b|\best(a|e) (noche|tarde|mañana)\b|\bpasado mañana\b|\bla semana que viene\b|\bel año pasado\b|\bel lunes pasado\b|\bdentro de\b|\bhace\b|\bluego\b|\bpronto\b/i.test(s),
  hasOD: (s) => /\b(lo|la|los|las)\b/i.test(s),
  hasOI: (s) => /\b(le|les)\b/i.test(s),
  hasReflexive: (s) => /\b(me|te|se|nos|se)\b.*\b(bañar|lavar|levantar|llamar|sentar|sentir|vestir|duchar|acostar|acordar|quedar)\w*/i.test(s),
  hasTambien: (s) => /\btambién\b|\btampoco\b/i.test(s),
  hasTwoVerbs: (s) => /(\w+\s+){0,4}\b(ir|poder|querer|tener|necesitar|deber|saber)\b\s+\w+\b/i.test(s),
  hasTenerQue: (s) => /\b(tengo|tienes|tiene|tenemos|tienen) que\b/i.test(s),
  hasNoEnglish: (s) => !/[A-Za-z]+\b(?=\s|$)/.test(s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")) // naive; we'll skip enforcing
};

// Tense detection heuristics (loose, fast)
const tenseCheck = {
  ir_a: (s) => /\b(voy|vas|va|vamos|van) a\b/i.test(s),
  futuro: (s) => /\b(é|ás|á|emos|án)\b/.test(s) || /\b(iré|seré|haré|diré|tendré|vendré|pondré|podré|sabré|querré)\b/i.test(s),
  preterito: (s) => /\b(é|aste|ó|amos|aron|í|iste|ió|imos|ieron)\b/.test(s) || /(fui|fuiste|fue|fuimos|fueron|hice|hizo|tuve|estuve|pude|puse|supe|quise|vine|dije|traje|vi|dio)\b/i.test(s),
  presente: (s) => !(/\b(voy|vas|va|vamos|van) a\b/i.test(s) || /(é|ás|á|emos|án)\b/.test(s) || /(é|aste|ó|amos|aron|í|iste|ió|imos|ieron)\b/.test(s)),
};

// ---------------------- Core ----------------------
function generateDraw({difficulty}) {
  const subject = sample(SUBJECTS);
  const tense = sample(TENSES);

  // Filter time cues by tense compatibility
  const cues = TIME_CUES.filter(c => c.allow.includes(tense.key));
  const timeCue = weightedSample(cues);

  // Specials: constrain in easy mode
  const specialsPool = difficulty === "easy" ? SPECIALS.filter(s => !["refl","plural"].includes(s.key)) : SPECIALS;
  const special = sample(specialsPool);

  const verb = sample(VERBS);
  return { subject, verb: verb.inf, tense: tense.name, tenseKey: tense.key, timeCue: timeCue.text, special: special.text, specialKey: special.key };
}

function scoreSentence(s, draw) {
  const original = s.trim();
  const sent = original.normalize("NFC");
  const notes = [];
  let score = 0;

  // 1) Time cue integration
  const cueOK = new RegExp(draw.timeCue.replace(/([.*+?^${}()|[\]\\])/g, "\\$1"), "i").test(sent);
  if (cueOK) { score += 1; } else { notes.push(`Añade la señal de tiempo: “${draw.timeCue}”.`); }

  // 2) Tense compliance
  const tenseOK = tenseCheck[draw.tenseKey] ? tenseCheck[draw.tenseKey](sent) : false;
  if (tenseOK) { score += 2; } else { notes.push(`La forma verbal no coincide con el tiempo: ${draw.tense}.`); }

  // 3) Special condition
  let specialOK = false;
  switch (draw.specialKey) {
    case "neg": specialOK = detectors.hasNeg(sent); break;
    case "q": specialOK = detectors.isQuestion(sent); break;
    case "conj": specialOK = detectors.hasPorqueOPero(sent); break;
    case "place": specialOK = detectors.hasPlace(sent); break;
    case "time2": specialOK = (sent.match(/\b(hoy|mañana|ayer|esta noche|esta tarde|esta mañana|pasado mañana|la semana que viene|el año pasado|el lunes pasado|dentro de|hace|luego|pronto)\b/gi)||[]).length >= 2; break;
    case "od": specialOK = detectors.hasOD(sent); break;
    case "oi": specialOK = detectors.hasOI(sent); break;
    case "refl": specialOK = detectors.hasReflexive(sent); break;
    case "plural": specialOK = /(nosotros|ustedes|ellos|ellas)\b/i.test(sent) || /\b(los|las)\b/i.test(sent); break;
    case "tambien": specialOK = detectors.hasTambien(sent); break;
    case "twoverbs": specialOK = detectors.hasTwoVerbs(sent); break;
    case "tenerque": specialOK = detectors.hasTenerQue(sent); break;
    case "noeng": specialOK = true; break; // Soft — not enforced strictly here
    default: specialOK = false;
  }
  if (specialOK) { score += 2; } else { notes.push(`Falta la condición especial: “${draw.special}”.`); }

  // 4) Subject presence (soft check)
  const subjOK = new RegExp(`\\b${draw.subject}\\b`, "i").test(sent);
  if (subjOK) { score += 1; } else { notes.push(`Incluye o infiere el sujeto: “${draw.subject}”.`); }

  // 5) Bonus for irregular star verbs mentioned and tense seems right
  const starred = /★/.test(draw.verb);
  if (starred && tenseOK) { score += 1; }

  // 6) Fluency feel (length & punctuation simple proxy)
  const words = sent.split(/\s+/).filter(Boolean).length;
  if (words >= 5 && /[\.!?¿¡]/.test(sent)) { score += 1; }

  const max = 9; // local rubric (1 cue + 2 tense + 2 special + 1 subject +1 star +1 fluency)
  return {score, max, notes};
}

function promptForJudge(draw, sentence) {
  return `You are a Spanish grammar judge. Evaluate the player sentence strictly for the given draw.\n\nDRAW:\nSubject: ${draw.subject}\nVerb (infinitive): ${draw.verb}\nTense: ${draw.tense}\nTime cue: ${draw.timeCue}\nSpecial: ${draw.special}\n\nTASK:\n1) Score 0–10 on: conjugation accuracy (0–4), tense-time coherence (0–3), special condition (0–2), naturalness (0–1).\n2) Provide a one-line corrected version (if needed).\n3) Briefly explain the key error(s) in English.\n\nPLAYER SENTENCE:\n${sentence}`;
}

export default function TiempoMadnessApp() {
  const [difficulty, setDifficulty] = useState("standard");
  const [draw, setDraw] = useState(() => generateDraw({difficulty:"standard"}));
  const [sentence, setSentence] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const newDraw = () => {
    const d = generateDraw({difficulty});
    setDraw(d);
    setSentence("");
    setResult(null);
  };

  const doScore = () => {
    const r = scoreSentence(sentence, draw);
    setResult(r);
    setHistory([{ts: new Date().toISOString(), draw, sentence, r}, ...history].slice(0,50));
  };

  const copyPrompt = async () => {
    const txt = promptForJudge(draw, sentence || "(no sentence typed)");
    await navigator.clipboard.writeText(txt);
    alert("Judge prompt copied. Paste into ChatGPT to get an expert score.");
  };

  return (
    <div className="min-h-screen p-6 md:p-10 bg-slate-50 text-slate-900">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold">Tiempo Tag Team — Judge Mode</h1>
          <div className="flex items-center gap-2">
            <label className="text-sm">Difficulty</label>
            <select className="border rounded-lg px-2 py-1 bg-white" value={difficulty} onChange={e=>setDifficulty(e.target.value)}>
              <option value="easy">Easy (no tricky specials)</option>
              <option value="standard">Standard</option>
              <option value="wild">Wild (anything goes)</option>
            </select>
            <button onClick={newDraw} className="ml-2 px-3 py-2 rounded-xl shadow bg-indigo-600 text-white hover:shadow-md">New Draw</button>
          </div>
        </header>

        <section className="grid md:grid-cols-2 gap-4">
          <Card title="Draw">
            <ul className="space-y-2">
              <Li label="Sujeto" value={draw.subject} />
              <Li label="Verbo" value={draw.verb} />
              <Li label="Tiempo" value={draw.tense} />
              <Li label="Señal de tiempo" value={draw.timeCue} />
              <Li label="Especial" value={draw.special} />
            </ul>
            <p className="mt-3 text-sm text-slate-600">All draws are filtered to be tense‑compatible with the time cue.</p>
          </Card>

          <Card title="Your Sentence">
            <textarea
              className="w-full h-36 p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              placeholder="Escribe tu oración aquí…"
              value={sentence}
              onChange={e=>setSentence(e.target.value)}
            />
            <div className="flex gap-2 mt-2">
              <button onClick={doScore} className="px-3 py-2 rounded-xl shadow bg-emerald-600 text-white hover:shadow-md">Score</button>
              <button onClick={copyPrompt} className="px-3 py-2 rounded-xl shadow bg-slate-800 text-white hover:shadow-md">Copy Judge Prompt</button>
            </div>
            {result && (
              <div className="mt-3 rounded-xl border bg-white p-3">
                <p className="font-medium">Local score: {result.score} / {result.max}</p>
                {result.notes.length>0 && (
                  <ul className="list-disc ml-5 mt-1 text-sm text-slate-700 space-y-1">
                    {result.notes.map((n,i)=>(<li key={i}>{n}</li>))}
                  </ul>
                )}
              </div>
            )}
          </Card>
        </section>

        <section>
          <Card title="Session History (last 50)">
            {history.length===0 ? (
              <p className="text-sm text-slate-600">No attempts yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-600">
                      <th className="py-2 pr-3">When</th>
                      <th className="py-2 pr-3">Draw</th>
                      <th className="py-2 pr-3">Sentence</th>
                      <th className="py-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h,idx)=> (
                      <tr key={idx} className="align-top border-t">
                        <td className="py-2 pr-3 whitespace-nowrap">{new Date(h.ts).toLocaleTimeString()}</td>
                        <td className="py-2 pr-3">
                          <div className="text-slate-800">
                            <div><b>S:</b> {h.draw.subject} <b>V:</b> {h.draw.verb} <b>T:</b> {h.draw.tense}</div>
                            <div><b>Cue:</b> {h.draw.timeCue} <b>Esp.:</b> {h.draw.special}</div>
                          </div>
                        </td>
                        <td className="py-2 pr-3">{h.sentence}</td>
                        <td className="py-2">{h.r.score} / {h.r.max}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>

        <footer className="text-xs text-slate-500">
          Heuristics are intentionally lightweight. For high‑fidelity grading, use the “Copy Judge Prompt” button and paste into ChatGPT alongside your sentence.
        </footer>
      </div>
    </div>
  );
}

function Card({title, children}){
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}
function Li({label, value}){
  return (
    <li className="flex gap-2 text-slate-800"><span className="min-w-40 font-medium">{label}:</span><span>{value}</span></li>
  );
}
