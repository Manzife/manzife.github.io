<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Seu Nome</title>
    <style>
      body {
        margin: 0;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #0b0f19;
        color: #e7e9ee;
      }
      .card {
        width: min(520px, 92vw);
        padding: 28px 22px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 14px;
        background: rgba(255,255,255,.04);
      }
      h1 { margin: 0 0 8px; font-size: 28px; }
      p { margin: 0 0 14px; opacity: .85; line-height: 1.45; }
      a { color: #9ad1ff; text-decoration: none; }
      a:hover { text-decoration: underline; }
      .links { display: flex; gap: 12px; flex-wrap: wrap; }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Seu Nome</h1>
      <p>Uma página simples por enquanto. Em breve: projetos, CV e contatos.</p>
      <div class="links">
        <a href="https://github.com/seu-usuario" target="_blank" rel="noopener">GitHub</a>
        <a href="https://www.linkedin.com/in/seu-linkedin" target="_blank" rel="noopener">LinkedIn</a>
        <a href="mailto:seuemail@exemplo.com">Email</a>
      </div>
    </main>
  </body>
</html>
