/**
 * Sumário oficial do PDF (textos preservados).
 * `printedRef` = número que o próprio Sumário do PDF imprime.
 * As páginas reais do arquivo são calculadas em `book-manifest` pelo script
 * `npm run manifest` (busca o conteúdo no PDF, sem confiar nos números impressos).
 *
 * `match`: frases (sem acento/caixa) procuradas no texto das páginas.
 */
export const TOC = [
  {
    id: "01", label: "COMUNIDADE",
    title: "Bem-vindos à nossa comunidade.", printedRef: 6,
    match: ["bem-vindos a nossa comunidade"],
    subsections: [
      { title: "Quem somos.", match: ["quem somos"] },
      { title: "A parceria que transforma a educação.", match: ["a parceria que transforma a educacao"] },
    ],
  },
  {
    id: "02", label: "MONTESSORI",
    title: "Descubra o mundo Montessori.", printedRef: 10,
    match: ["descubra o mundo montessori"],
    subsections: [
      { title: "Nossa filosofia e método.", match: ["nossa filosofia e metodo"] },
      { title: "Áreas do conhecimento.", match: ["areas do conhecimento"] },
      { title: "Pilares Montessori.", match: ["pilares montessori"] },
    ],
  },
  {
    id: "03", label: "PERCURSO",
    title: "Cada fase, novas descobertas.", printedRef: 14,
    match: ["cada fase, novas descobertas"],
    subsections: [
      { title: "Nossos segmentos.", match: ["nossos segmentos"] },
      { title: "Horários, chegadas e saídas.", match: ["horarios, chegadas e saidas", "horario, chegadas e saidas"] },
      { title: "Os pequenos combinados que fazem a vida escolar acontecer.", match: ["os pequenos combinados"] },
    ],
  },
  {
    id: "04", label: "PERTENCES",
    title: "Achados e Perdidos", printedRef: 35,
    match: ["achados e perdidos"],
    subsections: [
      { title: "Organização dos pertences.", match: ["organizacao dos pertences"] },
      { title: "Cuidar de si, do outro e do ambiente.", match: ["cuidar de si, do outro e do ambiente"] },
    ],
  },
  {
    id: "05", label: "CUIDADO",
    title: "Cuidar e acolher é criar um ambiente seguro para crescer.", printedRef: 38,
    match: ["cuidar e acolher e criar um ambiente seguro"],
    subsections: [
      { title: "Enfermaria e cuidados importantes.", match: ["enfermaria e cuidados"] },
    ],
  },
  {
    id: "06", label: "ALIMENTAÇÃO",
    title: "Nossa relação com a alimentação.", printedRef: 50,
    match: ["nossa relacao com a alimentacao"],
    subsections: [
      { title: "Lanches, refeições e hábitos saudáveis.", match: ["lanches, refeicoes e habitos saudaveis"] },
    ],
  },
  {
    id: "07", label: "CONVIVÊNCIA",
    title: "Convivência Antibullying.", printedRef: 53,
    match: ["convivencia antibullying"],
    subsections: [
      { title: "Nossa cultura de cuidado e prevenção ao bullying.", match: ["nossa cultura de cuidado e preservacao", "nossa cultura de cuidado"] },
    ],
  },
  {
    id: "08", label: "CELEBRAR",
    title: "Celebrar também faz parte da nossa jornada.", printedRef: 60,
    match: ["celebrar tambem faz parte da nossa jornada"],
    subsections: [
      { title: "Comemorações de aniversários.", match: ["comemoracoes de aniversarios"] },
    ],
  },
  {
    id: "09", label: "EXPERIÊNCIAS",
    title: "Experiências que ampliam o aprendizado.", printedRef: 64,
    match: ["experiencias que ampliam o aprendizado"],
    subsections: [
      { title: "Projetos pedagógicos.", match: ["projetos pedagogicos"] },
      { title: "Cultura, esporte e atividades que ampliam a aprendizagem.", match: ["cultura, esporte e outras experiencias", "cultura, esporte e atividades"] },
    ],
  },
  {
    id: "10", label: "COMUNICAÇÃO",
    title: "Juntos, construímos cada capítulo dessa história.", printedRef: 78,
    match: ["juntos, construimos cada capitulo dessa historia"],
    subsections: [
      { title: "Canais de comunicação.", match: ["canais de comunicacao"] },
      { title: "Como acompanhar essa jornada.", match: ["como acompanhar essa jornada"] },
    ],
  },
  {
    id: "11", label: "NOSSA EQUIPE",
    title: "Nossa equipe está mais perto de você.", printedRef: 86,
    match: ["nossa equipe esta mais perto de voce"],
    subsections: [
      { title: "Nosso time Montessori.", match: ["nosso time montessori"] },
    ],
  },
];

/** Páginas especiais do arquivo (1 = capa). */
export const SPECIAL = {
  summary: { match: ["sumario"], label: "SUMÁRIO", title: "Sumário" },
};
