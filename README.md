# TNL² CHAT

TNL² CHAT é um chatbot interativo desenvolvido para compreender mensagens de texto e imagens em português do Brasil, utilizando a poderosa API Google Gemini (Generative AI). Construído com Flask e Flask-SocketIO, oferece uma comunicação em tempo real por meio de WebSockets, garantindo uma experiência rápida e responsiva.

---

## Funcionalidades

- Conversa em linguagem natural via API Gemini
- Suporte para envio e interpretação de imagens
- Interface web é simples e moderna, desenvolvida com HTML, CSS, TailwindCSS e JavaScript para garantir responsividade e usabilidade.
- Comunicação em tempo real com Flask-SocketIO

---

## Tecnologias Usadas

### Backend

- **Python 3.11+** — linguagem principal do backend
- **Flask** — framework web leve e flexível
- **Flask-SocketIO** — comunicação em tempo real via WebSockets
- **python-dotenv** — gerenciamento de variáveis de ambiente
- **google-generativeai** — integração com a API Google Gemini (Generative AI)
- **Pillow** — manipulação e processamento de imagens
- **Eventlet** — servidor assíncrono para WebSocket e escalabilidade
- **Gunicorn** — servidor WSGI para deploy em produção

### Frontend

- **HTML5** — marcação da interface
- **CSS3** — estilização das páginas
- **TailwindCSS** — framework CSS utilitário para design responsivo e moderno
- **JavaScript** — interatividade e lógica no frontend

---

## Estrutura do Projeto

```
thalis-gemini-api
├── app.py # Aplicação Flask principal
├── Procfile # Configuração para deploy (ex: Heroku)
├── requirements.txt # Dependências do projeto
├── templates/
│ └── index.html # Template HTML principal
```

## Hospedagem

O projeto está hospedado na nuvem usando Railway e está disponível para acesso público no link abaixo:

[https://thalis-api-gemini-production.up.railway.app/](https://thalis-api-gemini-production.up.railway.app/)
