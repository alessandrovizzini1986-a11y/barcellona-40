// Info: accordion con appartamento, documenti, eSIM, regole, numeri utili, profilo, DA VERIFICARE
import { people, personById, checks, stopById } from '../data.js'
import { store } from '../store.js'
import { icon } from '../ui/icons.js'
import { URL_GIOCO, URL_GIOCO_CLASSICO } from '../rigoriLink.js'
import { esc } from '../ui/html.js'
import { toast } from '../ui/toast.js'
import { navigate } from '../router.js'
import { albumBanner, bindAlbum } from '../ui/album.js'
import { shareAlbum, bindShareAlbum } from '../ui/share-album.js'
import { songCard, bindSong } from '../ui/song.js'
import { sezioneViaggio, bindViaggio } from '../ui/viaggio.js'

const sec = (id, title, body, open = false) => `<details id="sec-${id}" ${open ? 'open' : ''}><summary>${esc(title)}${icon('chevron')}</summary><div class="acc__body">${body}</div></details>`

export async function render(root, { person, sub, header }) {
  const p = personById(person)
  const openId = ['profilo', 'verifiche', 'foto', 'canzone', 'viaggio'].includes(sub) ? sub : null
  const openChecks = checks.filter((c) => !store.isChecked(c.id)).length

  root.innerHTML = header('Le cose da sapere, in un posto solo') + `<section class="view">
    <div class="acc">
    ${sec('viaggio', 'Viaggio', `
      <p>Voli, parcheggio e lounge in un posto solo. Il QR del P2 è qui dentro: alla colonnina non serve cercarlo nelle mail.</p>
      ${sezioneViaggio(person)}`, !openId || openId === 'viaggio')}
    ${sec('foto', 'Foto', `
      <p>Un album solo, quattro telefoni. Carica le tue quando vuoi, anche dopo essere tornato a casa.</p>
      ${albumBanner()}
      ${person === 'ale' ? shareAlbum() : ''}`, !openId || openId === 'foto')}
    ${sec('canzone', 'La canzone', `
      <p>Scaricala prima di partire: in aereo e in taxi la rete non c'è e il ritornello serve subito.</p>
      ${songCard()}`, !openId || openId === 'canzone')}
    ${sec('extra', 'Extra', `
      <p>Il gioco dei rigori sta dentro questo sito: si apre nella stessa scheda e il tasto indietro riporta qui.</p>
      <ul class="list">
        <li class="row"><a class="row__main" href="${URL_GIOCO}" aria-label="Apri Rigori al Camp Nou">${icon('goal')} <b>Rigori al Camp Nou</b><span class="faint">Cinque rigori contro Ale</span></a></li>
        <li class="row"><a class="row__main" href="${URL_GIOCO_CLASSICO}" aria-label="Apri la versione classica dei rigori">${icon('trophy')} <b>Rigori, versione classica</b><span class="faint">Il gioco precedente, lasciato dov'era</span></a></li>
      </ul>`, openId === 'extra')}
    ${sec('apt', 'Appartamento', `
      <p><strong>Aparthotel Nàpols – Abapart</strong><br>Carrer de Nàpols 116, Eixample</p>
      <ul>
        <li>Prenotazione <strong>#6178165481</strong> · €430 totali · 2 camere, 70 m²</li>
        <li>Check-in venerdì dalle 15:00. Reception 24h: chi arriva sabato fa self check-in a nome Alessandro</li>
        <li>Chiedi <strong>3 set di chiavi</strong></li>
        <li>Frigo in cucina: il jamón di Debón va dentro subito</li>
        <li>Sovrapprezzo 3° ospite sabato notte (€65 + tassa): da chiarire in reception</li>
      </ul>
      <a class="btn" href="https://www.google.com/maps/dir/?api=1&destination=41.395437,2.179608&travelmode=walking" target="_blank" rel="noopener">${icon('map-pin')} Apri in Maps</a>`)}
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
    <div class="row faint" style="justify-content:space-between">
      <span>Versione: ${__BUILD_ID__}</span>
      <button class="btn btn--sm btn--ghost" id="reload">${icon('refresh')} Ricarica l'ultima versione</button>
    </div>
  </section>`

  bindAlbum(root)
  bindSong(root)
  if (person === 'ale') bindShareAlbum(root)
  if (openId) root.querySelector(`#sec-${openId}`)?.scrollIntoView({ block: 'start' })
  root.querySelector('#person').addEventListener('change', (e) => {
    store.person = e.target.value
    const np = personById(e.target.value)
    toast(`Ora sei ${np.name}. Zero fatica, tutto gusto.`)
    navigate('oggi')
  })
  root.querySelector('#theme').addEventListener('change', (e) => { store.theme = e.target.checked ? 'light' : 'dark' })
  // Rete di sicurezza contro la cache del browser: ricarica con una query nuova
  root.querySelector('#reload').addEventListener('click', () => {
    location.replace(location.pathname + '?r=' + Date.now())
  })
  root.querySelector('#gam').addEventListener('change', (e) => { store.gamificationHidden = e.target.checked })
  const ac = new AbortController()
  bindViaggio(root, { signal: ac.signal })
  root.addEventListener('change', (e) => {
    const cb = e.target.closest('input[data-check]')
    if (!cb) return
    store.setCheck(cb.dataset.check, cb.checked) // idempotente: la verità è la casella
    const n = checks.filter((c) => !store.isChecked(c.id)).length
    root.querySelector('#sec-verifiche summary').innerHTML = `Da verificare (${n})${icon('chevron')}`
    const item = cb.closest('.list-item'); item.style.opacity = cb.checked ? '.6' : ''
    item.querySelector('span > span').style.textDecoration = cb.checked ? 'line-through' : ''
    if (n === 0) toast('Tutto verificato. Zero fatica, tutto gusto.')
  }, { signal: ac.signal })
  return () => ac.abort()
}
