import os
import base64
import io
from flask import Flask, render_template, session
from flask_socketio import SocketIO, emit
from PIL import Image
import fitz
import google.generativeai as genai

API_KEY = "AIzaSyB_YcyfK0tnyYg6W5luRyyo7pgQNG-EVUY"
genai.configure(api_key=API_KEY)

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "your_strong_secret_key_here")
socketio = SocketIO(app, cors_allowed_origins="*")

MODELOS = [
    genai.GenerativeModel("gemini-1.5-flash"),
    genai.GenerativeModel("gemini-1.5-pro"),
]

SYSTEM_INSTRUCTION_TEXT = (
    "Você é um assistente virtual chamado 'TNL² - CHAT'. Sempre responda em português, com clareza.\n\n"
    "O nome 'TNL²' é uma sigla formada pela união das iniciais de quatro amigos que se conheceram durante o curso de Análise e Desenvolvimento de Sistemas (ADS).\n"
    "O sistema foi desenvolvido por Thalisson Moura em 2025.\n\n"
    "Ao receber imagens, descreva o conteúdo ou responda com base nelas.\n"
    "Seu nome é 'TNL² - CHAT'. Em que posso ajudar?"
)


def enviar_prompt_com_fallback(chat_history, prompt_parts_for_gemini):
    last_error = None
    for modelo in MODELOS:
        try:
            chat = modelo.start_chat(history=chat_history)
            resposta = chat.send_message(prompt_parts_for_gemini)
            return resposta, chat.history
        except Exception as e:
            msg = str(e).lower()
            if any(keyword in msg for keyword in ['quota', 'rate limit', 'limit exceeded', 'exceeded', 'resource has been exhausted']):
                print(f"Modelo {modelo.model_name} atingiu limite, tentando próximo modelo...")
                last_error = e
                continue
            else:
                raise
    raise last_error or Exception("Nenhum modelo disponível respondeu.")


@socketio.on('conectar')
def on_connect():
    session['historico_chat'] = []
    primeira_mensagem = (
        "Olá! Eu sou o TNL² - CHAT, seu assistente virtual. Como posso ajudar você hoje?"
    )
    session['historico_chat'].append({"role": "model", "parts": [primeira_mensagem]})

    emit('resposta_servidor', {'resposta': primeira_mensagem})
    print("Cliente conectado, histórico inicial enviado.")

@socketio.on('enviar_mensagem')
def on_message(data):
    try:
        if 'historico_chat' not in session:
            session['historico_chat'] = []

        mensagem_usuario = data.get('mensagem', '').strip()
        arquivo_base64 = data.get('arquivo')

        current_user_prompt_parts = []

        if not session['historico_chat'] or (len(session['historico_chat']) == 1 and session['historico_chat'][0]['role'] == 'model' and "Olá! Eu sou o TNL² - CHAT" in session['historico_chat'][0]['parts'][0]):
            current_user_prompt_parts.append(SYSTEM_INSTRUCTION_TEXT + "\n\n")

        if mensagem_usuario:
            current_user_prompt_parts.append(mensagem_usuario)

        if arquivo_base64:
            if "data:application/pdf" in arquivo_base64:
                _, codificado = arquivo_base64.split(",", 1)
                dados_binarios = base64.b64decode(codificado)
                texto_pdf = ""
                with fitz.open(stream=dados_binarios, filetype="pdf") as doc:
                    for pagina in doc:
                        texto_pdf += pagina.get_text()
                current_user_prompt_parts.append(f"\n\n--- CONTEÚDO DO PDF ---\n{texto_pdf}")
                print("PDF recebido, texto extraído e adicionado ao prompt.")
            elif "data:image/" in arquivo_base64:
                _, codificado = arquivo_base64.split(",", 1)
                dados_binarios = base64.b64decode(codificado)
                imagem = Image.open(io.BytesIO(dados_binarios))
                current_user_prompt_parts.append(imagem)
                print("Imagem recebida e adicionada ao prompt.")
            else:
                print("Tipo de arquivo não suportado ou inválido para processamento Gemini.")
                emit('resposta_servidor', {'resposta': 'Erro: Tipo de arquivo anexado não suportado. Por favor, envie uma imagem ou PDF.'})
                return

        session['historico_chat'].append({"role": "user", "parts": current_user_prompt_parts})

        resposta, novo_historico = enviar_prompt_com_fallback(session['historico_chat'], current_user_prompt_parts)
        session['historico_chat'] = novo_historico

        emit('resposta_servidor', {'resposta': resposta.text})

    except Exception as e:
        print(f"Erro no processamento: {e}")
        if 'historico_chat' in session and session['historico_chat'] and session['historico_chat'][-1]['role'] == 'user':
            session['historico_chat'].pop()
        emit('resposta_servidor', {'resposta': f'Ocorreu um erro: {str(e)}. Por favor, tente novamente.'})

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    porta = int(os.getenv("PORT", 3000))
    socketio.run(app, host='0.0.0.0', port=porta, debug=True)