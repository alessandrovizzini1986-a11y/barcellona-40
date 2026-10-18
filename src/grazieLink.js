// La pagina "Grazie" è statica (public/grazie/index.html), fuori dal router a hash: così WhatsApp legge l'Open Graph.
// Il percorso passa da BASE_URL, perché il sito sta sotto /barcellona-40/.
export const URL_GRAZIE = import.meta.env.BASE_URL.replace(/\/$/, '') + '/grazie/'
