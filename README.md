# CineHub

Catálogo independente de filmes e séries com dados do TMDB e uma página de
reprodução externa. Sem frameworks, dependências de instalação ou compilação.

## Configuração

1. Cria uma conta no TMDB e solicita acesso à API conforme as instruções
   em https://developer.themoviedb.org/docs/getting-started .
2. Na área da API, obtém o **API Read Access Token**.
3. Copia `assets/js/config.example.js` para `assets/js/config.js`.
4. Substitui `COLOCA_AQUI_O_TEU_TOKEN_DE_LEITURA_TMDB` pelo token.

`config.js` está no `.gitignore`, mas isso não torna o token secreto depois
de publicado: o browser recebe o módulo e pode inspecionar a credencial.
Não publiques o ficheiro num repositório. Se o publicares por engano,
revoga e substitui o token no TMDB. Para manter um segredo efetivamente
privado numa aplicação pública, é necessário um backend/proxy que faça os
pedidos ao TMDB no servidor; não faz parte desta implementação estática.

Antes da publicação, confirma as condições de utilização da API e das
imagens do TMDB. O texto e o logótipo de atribuição estão no rodapé.

## Execução local no Windows

Com Python instalado, abre o PowerShell na pasta `CineHub` e executa:

py -m http.server 8000

Visita http://localhost:8000/ . Não uses `file://` para testar o PWA.
O Service Worker requer HTTPS ou uma origem local permitida pelo browser.

## Publicação

Publica o conteúdo da pasta `CineHub` na raiz ou numa subpasta de um
alojamento estático com HTTPS. Inclui `assets/js/config.js` no deploy,
mas exclui-o do repositório. As rotas usam fragmentos, pelo que uma visita
direta a `/#/movie/123` carrega `index.html` e não necessita de rewrites.

Confirma em DevTools que:
- `manifest.webmanifest` e os dois ícones são servidos sem erro;
- `service-worker.js` é registado e controla a página após recarregar;
- as rotas de pesquisa, detalhes e reprodução sobrevivem a recarregamentos;
- os pedidos ao TMDB são autorizados;
- a interface básica abre offline depois de uma primeira visita online.

O offline é parcial: apenas recursos e respostas já armazenados poderão
estar disponíveis. Não há garantia de novas pesquisas ou reprodução offline.

## Reprodução externa

Os endereços do fornecedor são construídos em `assets/js/player.js`.
A política de incorporação, a disponibilidade dos vídeos e os direitos de
distribuição têm de ser confirmados antes de utilizar a integração em
produção. A aplicação não inspeciona o iframe nem contorna restrições.

## Fontes técnicas

- https://developer.themoviedb.org/reference/search-multi
- https://developer.themoviedb.org/docs/faq
- https://www.themoviedb.org/about/logos-attribution
