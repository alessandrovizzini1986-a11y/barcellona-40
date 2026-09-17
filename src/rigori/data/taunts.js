// Sfottò: frasi italiane, tono goliardico da amici quarantenni, niente insulti veri.
//
// NESSUN NOME È SCRITTO NELLE FRASI. Ogni frase è un modello con i segnaposto {tiratore} e {portiere},
// riempiti con i nomi presi dal record del tiro. Così la stessa frase funziona in qualunque turno: quando
// para il giocatore, "{portiere} ha parlato troppo" nomina lui e non Ale. Le varianti per personaggio sono
// indicizzate sul tiratore e sul portiere separatamente.
export const TAUNTS = {
  preTiro: {
    base: [
      '{portiere} sta già guardando le gambe di {tiratore}.',
      'Respira, {tiratore}. Poi sbaglia pure.',
      'Il dischetto è a undici metri. A {tiratore} pare di più.',
      '{portiere} dice che sa già dove tira {tiratore}.',
      'Tira come se fosse l\'ultimo, {tiratore}. Forse lo è.',
      'La traversa è a 2,44. {tiratore}, non provarci.',
      'Gli sfottò partono al fischio.',
      '{portiere} ha parlato per dieci minuti. {tiratore}, zittiscilo.'
    ],
    tiratore: {
      monne: ['{tiratore}, gli occhiali da sole di notte. Coraggio.', 'Rincorsa alla {tiratore}: veloce, poi vediamo.'],
      giulio: ['{tiratore} non suda. Mai. Nemmeno adesso.', 'Freddo come il ghiaccio. {portiere} no.'],
      mario: ['{tiratore} ne ha tirati più lui che tutti gli altri insieme.', 'Esperienza contro gioventù. {portiere} è la gioventù, dice lui.'],
      ale: ['{tiratore} sul dischetto. Il portiere che tira: che tempi.', '{tiratore} ha annunciato l\'angolo. Non fidarti, {portiere}.']
    },
    portiere: {
      ale: ['{portiere} in porta, e parla troppo.', '{portiere}: "Io lo dico sempre dove pararo. E paro lo stesso."'],
      monne: ['{portiere} in porta con gli occhiali da sole. Serata strana.'],
      giulio: ['{portiere} in porta, espressione invariata da mezz\'ora.'],
      mario: ['{portiere} in porta: dice che ai suoi tempi la porta era più piccola.']
    }
  },
  postGol: {
    base: [
      '{portiere} ha parlato troppo. Ancora.',
      'Dentro. {portiere} cerca i guanti.',
      'Rete. {portiere} dà la colpa all\'erba.',
      'Gol di {tiratore}. {portiere} chiede il VAR, non c\'è.',
      'La rete si gonfia, {portiere} si sgonfia.',
      '{tiratore} segna e {portiere} guarda.',
      'Angolo giusto, portiere sbagliato.',
      'Gol. Disonesti, direbbe {portiere}.'
    ],
    tiratore: {
      monne: ['{tiratore}: troppo veloce anche per gli occhiali.', 'Gol con gli occhiali da sole. Stile.'],
      giulio: ['{tiratore} segna e non esulta. Freddo.', 'Rete. {tiratore} già pensa al prossimo.'],
      mario: ['Il veterano non sbaglia. Mai.', '{tiratore}: gol numero mille, più o meno.'],
      ale: ['{tiratore} segna e para. Dice lui.', 'Il portiere goleador. Insopportabile.']
    },
    portiere: {
      ale: ['{portiere}: "L\'avevo detto dove tirava." Certo.'],
      monne: ['{portiere} non l\'ha vista. Il riflesso degli occhiali.'],
      giulio: ['{portiere} resta impassibile. Dentro piange.'],
      mario: ['{portiere}: "Ai miei tempi quella la prendevo."']
    }
  },
  postParata: {
    base: [
      '{portiere} para. E ora lo racconta a tutti.',
      'Parata. {portiere} la ricorderà per anni.',
      'Muro. {portiere} chiede applausi, non li avrà.',
      '{portiere} ci arriva. Non chiedergli come.',
      'Presa. {portiere}: "Facile."',
      'Parata. {portiere} ha già scritto sul gruppo.',
      'Respinta. {portiere} si allunga, per una volta.',
      '{portiere} para: la serata è finita, dice lui. {tiratore} non risponde.'
    ],
    tiratore: {
      monne: ['{tiratore}, gli occhiali non ti hanno aiutato.', 'Troppo veloce la rincorsa, troppo lento il tiro.'],
      giulio: ['{tiratore} parato. L\'espressione non cambia.', 'Freddo sì, preciso stavolta no.'],
      mario: ['{tiratore} parato. L\'esperienza a volte non basta.', 'Il veterano prende nota. {portiere} pure.'],
      ale: ['{tiratore} parato da {portiere}. Serata strana.', 'Il portiere sbaglia da tiratore. Equilibrio.']
    },
    portiere: {
      ale: ['{portiere}: "Te lo paravo anche da bambino."'],
      monne: ['{portiere} para con gli occhiali da sole. Insopportabile.'],
      giulio: ['{portiere} para e non dice niente. Peggio.'],
      mario: ['{portiere} para e si tocca la schiena. Ne è valsa la pena.']
    }
  },
  postLegno: {
    base: [
      'Legno. {tiratore} guarda il cielo, {portiere} pure.',
      'Il palo salva {portiere}, che si prende il merito.',
      'Ferro. {tiratore} non ci dorme stanotte.',
      'Traversa. A un centimetro dal racconto per vent\'anni.',
      'Il legno non è di nessuno dei due. Ma {portiere} esulta.',
      '{tiratore} colpisce il ferro. {portiere} ringrazia e non lo dice.',
      'Rimbalza fuori. {tiratore} chiede di ripeterlo.',
      'Legno pieno. Silenzio, poi risate.'
    ],
    tiratore: {}, portiere: {}
  },
  postFuori: {
    base: [
      'Fuori. {portiere} non si è nemmeno mosso.',
      '{tiratore} la manda a salutare il pubblico.',
      'Alta. {portiere} ringrazia e sorride.',
      'Fuori di poco, dice {tiratore}. Di tanto, dice {portiere}.',
      'Nessuno l\'ha toccata. {tiratore} nemmeno.',
      'Fuori. {portiere} si prende la parata comunque.',
      '{tiratore} cerca l\'angolo e trova la curva.',
      'Larga. Si ricomincia.'
    ],
    tiratore: {}, portiere: {}
  }
}
// kind: 'preTiro' | 'postGol' | 'postParata' | 'postLegno' | 'postFuori'
// nomi: { tiratore, portiere } sono i nomi da mostrare; ids: { tiratore, portiere } scelgono le varianti.
// extra = set di sfottò sbloccato: le varianti per personaggio entrano sempre nel mazzo.
export function taunt(kind, { nomi = {}, ids = {}, extra = false, rnd = Math.random } = {}) {
  const set = TAUNTS[kind]; if (!set) return ''
  const varianti = [...(set.tiratore?.[ids.tiratore] || []), ...(set.portiere?.[ids.portiere] || [])]
  // le varianti escono una volta su tre; col set sbloccato entrano nel mazzo comune
  const mazzo = extra ? [...set.base, ...varianti] : (varianti.length && rnd() < 0.34 ? varianti : set.base)
  const modello = mazzo[(rnd() * mazzo.length) | 0] || ''
  return riempi(modello, nomi)
}
export const riempi = (modello, { tiratore = 'chi tira', portiere = 'il portiere' } = {}) =>
  modello.replace(/\{tiratore\}/g, tiratore).replace(/\{portiere\}/g, portiere)
// Esito → gruppo di frasi. Non dipende da chi sei: i nomi li mettono i segnaposto.
export const gruppoPerEsito = (esito) =>
  esito === 'goal' ? 'postGol' : esito === 'save' ? 'postParata' : esito === 'miss' ? 'postFuori' : 'postLegno'
