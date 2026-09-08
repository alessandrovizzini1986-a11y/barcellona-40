// Info: accordion con appartamento, documenti, eSIM, regole, numeri utili, profilo, DA VERIFICARE
import { people, personById, checks, stopById } from '../data.js'
import { store } from '../store.js'
import { icon } from '../ui/icons.js'
import { esc } from '../ui/html.js'
import { toast } from '../ui/toast.js'
import { navigate } from '../router.js'

const sec = (id, title, body, open = false) => `<details id="sec-${id}" ${open ? 'open' : ''}><summary>${esc(title)}${icon('chevron')}</summary><div class="acc__body">${body}</div></details>`

export async function render(root, { person, sub, header }) {
  const p = personById(person)
  const openId = sub === 'profilo' ? 'profilo' : sub === 'verifiche' ? 'verifiche' : null
  const openChecks = checks.filter((c) => !store.isChecked(c.id)).length

  root.innerHTML = header('Le cose da sapere, in un posto solo') + `<section class="view">
    <div class="acc">
    ${sec('apt', 'Appartamento', `
      <p><strong>Aparthotel Nàpols – Abapart</strong><br>Carrer de Nàpols 116, Eixample</p>
      <ul>
        <li>Prenotazione <strong>#6178165481</strong> · €430 totali · 2 camere, 70 m²</li>
        <li>Check-in venerdì dalle 15:00. Reception 24h: chi arriva sabato fa self check-in a nome Alessandro</li>
        <li>Chiedi <strong>3 set di chiavi</strong></li>
        <li>Frigo in cucina: il jamón di Debón va dentro subito</li>
        <li>Sovrapprezzo 3° ospite sabato notte (€65 + tassa): da chiarire in reception</li>
      </ul>
      <a class="btn" href="https://www.google.com/maps/dir/?api=1&destination=41.395437,2.179608&travelmode=walking" target="_blank" rel="noopener">${icon('map-pin')} Apri in Maps</a>`, !openId)}
    ${sec('doc', 'Documenti', `
      <ul>
        <li>Spagna = UE/Schengen: passaporto e visto non necessari</li>
        <li>La Sagrada Família richiede un <strong>documento con foto</strong>: il biglietto non è cedibile</li>
      </ul>`)}
    ${sec('esim', 'eSIM', `
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Operatore</th><th>Voto</th><th>Recensioni</th><th>Piani</th></tr></thead>
        <tbody>
          <tr><td>Holafly</td><td>4.76</td><td>23.845</td><td>dati illimitati</td></tr>
          <tr><td>Airalo</td><td>4.66</td><td>21.780</td><td>1 GB/3 gg · 3 GB/3 gg</td></tr>
          <tr><td>Saily</td><td>4.75</td><td>6.850</td><td>–</td></tr>
        </tbody>
      </table></div>
      <p>Sono eSIM <strong>solo dati</strong>: WhatsApp resta sul numero italiano. Installala sul WiFi di casa prima di partire.</p>`)}
    ${sec('rules', 'Regole anti-mal di testa', `
      <ul>
        <li>Un bicchiere d'acqua per ogni calice (1:1)</li>
        <li>Niente digestivi</li>
        <li>Mezza bottiglia è il formato giusto: Bai Gorri ½ L</li>
        <li>Sabato alle 10:30 sei alla Sagrada: la sera prima chiudi presto</li>
      </ul>`)}
    ${sec('num', 'Numeri utili', `
      <p><strong>Emergenze (UE): 112</strong></p>
      <a class="btn" href="tel:112">${icon('phone')} Chiama 112</a>`)}
    ${sec('profilo', 'Profilo', `
      <div class="field"><label for="person">Chi sei</label>
        <select class="input" id="person">${people.map((x) => `<option value="${x.id}" ${x.id === person ? 'selected' : ''}>${esc(x.name)} · ${esc(x.role)}</option>`).join('')}</select></div>
      <label class="switch"><span>Tema chiaro</span><input type="checkbox" id="theme" ${store.theme === 'light' ? 'checked' : ''}></label>
      <label class="switch"><span>Nascondi gamification (missioni, XP)</span><input type="checkbox" id="gam" ${store.gamificationHidden ? 'checked' : ''}></label>
      <p class="faint">Stato salvato solo su questo telefono${store.storageAvailable() ? '' : '. Attenzione: la memoria del browser non è disponibile, le spunte spariranno alla chiusura'}.</p>`, openId === 'profilo')}
    ${sec('verifiche', `Da verificare (${openChecks})`, `
      <p class="faint">${person === 'ale' ? 'Spunta quello che hai chiuso.' : 'Lista gestita da Alessandro: qui la vedi, lui la spunta.'}</p>
      <div class="list">${checks.map((c) => {
        const stop = c.stopId ? stopById(c.stopId) : null
        const who = personById(c.who)
        const done = store.isChecked(c.id)
        return `<label class="check list-item" style="align-items:flex-start;${done ? 'opacity:.6' : ''}"><input type="checkbox" data-check="${c.id}" ${done ? 'checked' : ''} ${person === 'ale' ? '' : 'disabled'} aria-label="${esc(c.text)}"><span><span style="${done ? 'text-decoration:line-through' : ''}">${esc(c.text)}</span><br><span class="faint">${who ? esc(who.name) : ''}${stop ? ` · ${stop.time} ${esc(stop.title)}` : ''}</span></span></label>`
      }).join('')}</div>`, openId === 'verifiche')}
    </div>
    <p class="faint">Pagina web normale: nessuna installazione, la barra del browser resta sempre visibile.</p>
  </section>`

  if (openId) root.querySelector(`#sec-${openId}`)?.scrollIntoView({ block: 'start' })
  root.querySelector('#person').addEventListener('change', (e) => {
    store.person = e.target.value
    const np = personById(e.target.value)
    toast(`Ora sei ${np.name}. Zero fatica, tutto gusto.`)
    navigate('oggi')
  })
  root.querySelector('#theme').addEventListener('change', (e) => { store.theme = e.target.checked ? 'light' : 'dark' })
  root.querySelector('#gam').addEventListener('change', (e) => { store.gamificationHidden = e.target.checked })
  root.addEventListener('change', (e) => {
    const cb = e.target.closest('input[data-check]')
    if (!cb) return
    store.toggleCheck(cb.dataset.check)
    const n = checks.filter((c) => !store.isChecked(c.id)).length
    root.querySelector('#sec-verifiche summary').innerHTML = `Da verificare (${n})${icon('chevron')}`
    const item = cb.closest('.list-item'); item.style.opacity = cb.checked ? '.6' : ''
    item.querySelector('span > span').style.textDecoration = cb.checked ? 'line-through' : ''
    if (n === 0) toast('Tutto verificato. Zero fatica, tutto gusto.')
  })
  return () => {}
}
