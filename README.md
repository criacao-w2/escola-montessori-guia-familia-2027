# Guia da Família 2027 — Escola Montessori

Versão digital interativa em 3D do livro impresso **Guia da Família 2027**, baseada no projeto
[animated-book-slider-threejs](https://github.com/pakagronglb/animated-book-slider-threejs).
As páginas vêm diretamente do PDF (`public/book/guia.pdf`), renderizadas em tempo real.

## Rodar localmente

```bash
npm install
npm run dev
```

No Windows, basta dar dois cliques em `iniciar-preview.bat` e abrir http://localhost:5173.

Para gerar a versão de publicação: `npm run build` (a pasta `dist/` é o site pronto).

## Atualizar o PDF

1. Substitua `public/book/guia.pdf` mantendo o mesmo nome.
2. Se mudou o número de páginas ou a página em que algum capítulo começa, rode `npm run manifest`
   (refaz o mapa de capítulos em `src/data/book-manifest.json`).

A busca lê o texto do próprio PDF, então correções de texto aparecem nela automaticamente.

## Onde ajustar

| O quê | Arquivo |
|---|---|
| Logo, cores e fonte da interface | `src/config/brand.js` |
| Formato, gramatura/espessura do papel, avanço da capa, qualidade das texturas | `src/config/book.config.js` |
| Títulos e seções do sumário (usados para localizar os capítulos) | `src/data/toc.js` |
| Ficha técnica (popup da aba "i") | `src/components/ui/InfoTab.jsx` |

## Recursos

- Livro em 3D com virada de páginas por clique, setas, teclado (← →, Home, End) e capítulos.
- Modo leitura (tecla **L**): o livro se deita e a câmera enquadra a página dupla (uma página por vez no celular).
- Busca (tecla **/**) por palavra, capítulo, seção ou número de página.
- Texturas sob demanda em várias resoluções, com descarte do que sai de vista (leve mesmo com muitas páginas).

O som de virar página (`public/audios/page-flip-01a.mp3`) veio do projeto original, que não informa licença.
