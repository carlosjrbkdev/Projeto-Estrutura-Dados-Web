from flask import Flask, request, jsonify, make_response
from estruturas import Fila, Pilha, Heap
import time
import os

app = Flask(__name__)

# Middleware customizado para CORS - executa ANTES de tudo
@app.before_request
def handle_cors():
    """Handler para todas as requisições CORS"""
    if request.method == "OPTIONS":
        response = make_response("OK", 200)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, PUT, DELETE"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
        response.headers["Access-Control-Max-Age"] = "86400"
        return response

@app.after_request
def after_request(response):
    """Adicionar headers CORS em TODAS as respostas"""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, PUT, DELETE"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    response.headers["Access-Control-Max-Age"] = "86400"
    return response

# Heap e Fila em memória (persistem enquanto o servidor está rodando)
_heap_global = Heap()
_fila_global = Fila()
_pilha_historico = Pilha()  # Para desfazer ações

@app.route('/adicionar_na_fila', methods=['POST'])
def adicionar_na_fila():
    try:
        paciente = request.json
        if not paciente or 'id' not in paciente:
            return jsonify({"erro": "Dados inválidos: faltam campos obrigatórios"}), 400

        prioridade = paciente.get('prioridade', 0)
        if not isinstance(prioridade, (int, float)) or prioridade < 0:
            prioridade = 0
        
        tempo = paciente.get('criadoEm', 0)
        if not isinstance(tempo, (int, float)) or tempo == 0:
            tempo = int(time.time() * 1000)
        
        nome = paciente.get('nome', 'Paciente Desconhecido')
        if not nome or not isinstance(nome, str):
            nome = 'Paciente Desconhecido'

        paciente_limpo = {
            'id': paciente.get('id'),
            'nome': nome,
            'prioridade': prioridade,
            'criadoEm': tempo
        }

        if prioridade > 0:
            _heap_global.insert(paciente_limpo, prioridade, tempo)
        else:
            _fila_global.enqueue(paciente_limpo)

        _pilha_historico.push({'acao': 'adicionar', 'paciente': paciente_limpo})

        return jsonify({
            "status": "ok", 
            "mensagem": f"{nome} adicionado à fila com prioridade {prioridade}."
        }), 200
    
    except Exception as e:
        print(f"[ERRO] em /adicionar_na_fila: {str(e)}", flush=True)
        return jsonify({"erro": f"Erro interno do servidor: {str(e)}"}), 500


@app.route('/calcular_proximo', methods=['POST'])
def calcular_proximo():
    try:
        body = request.json or {}
        pacientes = body.get('pacientes', [])

        if pacientes:
            heap_temp = Heap()
            fila_temp = Fila()
            for p in pacientes:
                if not isinstance(p, dict) or 'id' not in p:
                    continue
                
                tempo = p.get('criadoEm', 0)
                if not isinstance(tempo, (int, float)) or tempo == 0:
                    tempo = int(time.time() * 1000)
                
                prioridade = p.get('prioridade', 0)
                if not isinstance(prioridade, (int, float)) or prioridade < 0:
                    prioridade = 0
                
                if prioridade > 0:
                    heap_temp.insert(p, prioridade, tempo)
                else:
                    fila_temp.enqueue(p)

            proximo = None
            if not heap_temp.is_empty():
                proximo = heap_temp.extract_max()
            elif not fila_temp.is_empty():
                proximo = fila_temp.dequeue()

            if proximo is None:
                return jsonify({"erro": "Nenhum paciente na fila"}), 404

            return jsonify({"proximo": proximo}), 200

        proximo = None
        if not _heap_global.is_empty():
            proximo = _heap_global.extract_max()
        elif not _fila_global.is_empty():
            proximo = _fila_global.dequeue()

        if proximo is None:
            return jsonify({"erro": "Fila vazia"}), 404

        _pilha_historico.push({'acao': 'chamar', 'paciente': proximo})
        return jsonify({"proximo": proximo}), 200
    
    except Exception as e:
        print(f"[ERRO] em /calcular_proximo: {str(e)}", flush=True)
        return jsonify({"erro": f"Erro ao calcular próximo: {str(e)}"}), 500


@app.route('/status', methods=['GET'])
def status():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
