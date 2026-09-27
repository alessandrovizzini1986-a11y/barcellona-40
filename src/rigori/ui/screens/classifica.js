import { esc } from '../components/esc.js'
import { overlay } from './overlay.js'
// Classifica di serata: chi ha fatto cosa al pass-and-play, più i record personali delle altre modalità.
// Raggiungibile in due tocchi da qualunque schermata (CHI TIRA?, Modalità, Pausa, Risultato).
const data = (d) => { const [y, m, g] = String(d || '').split('-'); return g && m ? `${+g}/${+m}` : '' }
export function classifica(ui, { serata = [], record = {} } = {}) {
  const righe = serata.slice(0, 10).map((e, i) => `<li class="rg-classifica__riga"><span class="rg-classifica__pos">${i + 1}</span><b>${esc(e.name)}</b><span class="rg-classifica__lab">${esc(e.label)}${e.date ? ` · ${data(e.date)}` : ''}</span><span class="rg-classifica__punti">${e.score}</span></li>`).join('')
  const rec = [['shootout', 'Shootout'], ['sfidaAle', 'Sfida Ale'], ['skill', 'Skill'], ['boss', 'Boss']].filter(([k]) => record[k]).map(([k, t]) => `<li><span>${t}</span><b>${esc(record[k].name)} · ${esc(record[k].label)}</b></li>`).join('')
  return overlay(ui, `<h2 class="rg-title">Classifica di serata</h2>
    <p class="rg-sub">Pass-and-play: un punto a gol, un punto a parata. Le partite di stasera e di sempre, su questo telefono.</p>
    ${righe ? `<ol class="rg-classifica">${righe}</ol>` : '<p class="rg-sub">Ancora nessuna partita a più giocatori. Modalità → Pass-and-play.</p>'}
    ${rec ? `<h3 class="rg-h3">Record personali</h3><ul class="rg-record">${rec}</ul>` : ''}
    <div class="rg-row"><button class="rg-btn rg-btn--primary" data-value="ok" aria-label="Chiudi la classifica">Chiudi</button></div>`, { label: 'Classifica di serata', cls: 'rg-overlay--top', sito: true })
}
