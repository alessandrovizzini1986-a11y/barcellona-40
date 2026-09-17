// Sfottò: frasi italiane, tono goliardico da amici quarantenni, niente insulti veri. Nessun nome di club.
// Varianti per personaggio: Monne (velocità, occhiali da sole), Giulio (freddezza), Mario (veteranismo),
// Ale (portiere che parla troppo). DA VERIFICARE: battute mie, da rivedere con gli interessati.
export const TAUNTS = {
  preTiro: {
    base: ['Ale ti sta già guardando le gambe.', 'Respira. Poi sbaglia pure.', 'Il dischetto è a undici metri. Pare di più.', 'Ale dice che sa già dove tiri.', 'Tira come se fosse l\'ultimo. Forse lo è.', 'La traversa è a 2,44. Non provarci.', 'Gli sfottò partono al fischio.', 'Ale ha parlato per dieci minuti. Zittiscilo.'],
    monne: ['Monne, gli occhiali da sole di notte. Coraggio.', 'Rincorsa alla Monne: veloce, poi vediamo.', 'Ale: "Con quegli occhiali non vedi manco la porta."'],
    giulio: ['Giulio non suda. Mai. Nemmeno adesso.', 'Freddo come il ghiaccio. Il portiere no.', 'Ale: "Giulio, almeno cambia espressione."'],
    mario: ['Mario ne ha tirati più lui che tutti gli altri insieme.', 'Esperienza contro gioventù. Ale è la gioventù, dice lui.', 'Ale: "Mario, ai tuoi tempi la porta era più piccola."'],
    ale: ['Ale sul dischetto. Il portiere che tira: che tempi.', 'Ale ha annunciato l\'angolo. Non fidarti.', 'Ale: "Io lo dico sempre dove tiro. E segno lo stesso."']
  },
  postGol: {
    base: ['Ale ha parlato troppo. Ancora.', 'Dentro. Il portiere cerca i guanti.', 'Rete. Ale dà la colpa all\'erba.', 'Gol. Ale chiede il VAR, non c\'è.', 'La rete si gonfia, Ale si sgonfia.', 'Segnato. Ale non parla più, per ora.', 'Angolo giusto, portiere sbagliato.', 'Gol. Disonesti, direbbe Ale.'],
    monne: ['Monne: troppo veloce anche per gli occhiali.', 'Gol con gli occhiali da sole. Stile.', 'Ale: "Non l\'ho vista. Il riflesso degli occhiali."'],
    giulio: ['Giulio segna e non esulta. Freddo.', 'Rete. Giulio già pensa al prossimo.', 'Ale: "Giulio, almeno sorridi una volta."'],
    mario: ['Il veterano non sbaglia. Mai.', 'Mario: gol numero mille, più o meno.', 'Ale: "Mario, sei del \'86 come me. Ah no."'],
    ale: ['Ale segna e para. Dice lui.', 'Il portiere goleador. Insopportabile.', 'Ale: "L\'avevo detto dove tiravo."']
  },
  // Quando a parare sei tu: Ale tira. Sono situazioni opposte alle due sopra e richiedono frasi proprie,
  // altrimenti a un gol subito esce una battuta da gol fatto.
  postGolSubito: {
    base: ['Ale segna e lo racconterà per anni.', 'Gol di Ale. Preparati al monologo.', 'Dentro. Ale allarga le braccia come se avesse inventato il calcio.', 'Ale ha segnato e ha già scritto sul gruppo.', 'Palla dentro. Ale ti guarda e non dice niente: peggio.', 'Gol subito. Ale ora parla per venti minuti.', 'Ale esulta da solo. Come sempre.', 'Dentro. Ale: "Te l\'avevo detto dove tiravo."'],
    ale: ['Ale segna a se stesso, in un certo senso. Serata strana.', 'Il portiere che segna al portiere. Roba da quarantenni.']
  },
  postParataTua: {
    base: ['Parata. Ale non parla più.', 'Presa. Ale cerca una scusa, la troverà.', 'Respinta. Ale guarda l\'erba come se fosse colpa sua.', 'L\'hai presa. Godi, dura poco.', 'Parata tua. Ale dice che era un tiro di prova.', 'Muro. Ale ammutolito per tre secondi netti.', 'Gliel\'hai tolta dal sette. Diglielo.', 'Parata. Ora tocca a te parlare troppo.'],
    ale: ['Ale parato da Ale. La serata è ufficialmente strana.']
  },
  postParata: {
    base: ['Ale para. E ora lo racconta a tutti.', 'Parata. Ale la ricorderà per anni.', 'Muro. Ale chiede applausi, non li avrà.', 'Ale ci arriva. Non chiedergli come.', 'Presa. Ale: "Facile."', 'Parata. Ale ha già scritto sul gruppo.', 'Respinta. Ale si allunga, per una volta.', 'Ale para: la serata è finita, dice lui.'],
    monne: ['Monne, gli occhiali non ti hanno aiutato.', 'Troppo veloce la rincorsa, troppo lento il tiro.', 'Ale: "Monne, ti ho letto dagli occhiali."'],
    giulio: ['Giulio parato. L\'espressione non cambia.', 'Freddo sì, preciso stavolta no.', 'Ale: "Giulio, ho sentito il ghiaccio rompersi."'],
    mario: ['Mario parato. L\'esperienza a volte non basta.', 'Il veterano prende nota. Ale pure.', 'Ale: "Mario, quello lo paravo anche da bambino."'],
    ale: ['Ale parato da Ale. Serata strana.', 'Il portiere sbaglia da tiratore. Equilibrio.', 'Ale: "Me lo sono parato da solo, in un certo senso."']
  }
}
// kind: 'preTiro' | 'postGol' | 'postParata' (tira l'utente) · 'postGolSubito' | 'postParataTua' (para l'utente)
export function taunt(kind, characterId = null, extra = false) {
  const set = TAUNTS[kind]; if (!set) return ''
  const pool = [...set.base, ...(extra && characterId && set[characterId] ? set[characterId] : [])]
  // la variante del personaggio esce una volta su tre, il resto dal blocco base (extra = set sbloccato: sempre incluse)
  const useChar = characterId && set[characterId] && (extra || Math.random() < 0.34)
  const from = useChar && !extra ? set[characterId] : pool
  return from[(Math.random() * from.length) | 0] || ''
}
