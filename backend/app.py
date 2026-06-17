from flask import Flask, request, jsonify
from flask_cors import CORS
from estruturas import Fila, Pilha, Heap
import time

app = Flask(__name__)

# Configurar CORS de forma mais explícita
CORS(app, 
     origins=["*"],
     allow_headers=["*"],
     methods=["GET", "POST", "OPTIONS"],
     supports_credentials=True)

# Heap e Fila em memória (persistem enquanto o servidor está rodando)
_heap_global = Heap()
_fila_global = Fila()
_pilha_historico = Pilha()  # Para desfazer ações

@app.route('/adicionar_na_fila', methods=['POST'])
def adicionar_na_fila():
    """
    Recebe um paciente e o insere na estrutura correta:
    - Prioridade > 0 → Heap (Max-Heap por prioridade, desempate por tempo de chegada)
    - Prioridade == 0 → Fila FIFO
    """
    try:
        paciente = request.json
        if not paciente or 'id' not in paciente:
            return jsonify({"erro": "Dados inválidos: faltam campos obrigatórios"}), 400

        # Validações e valores padrão
        prioridade = paciente.get('prioridade', 0)
        if not isinstance(prioridade, (int, float)) or prioridade < 0:
            prioridade = 0
        
        tempo = paciente.get('criadoEm', 0)
        if not isinstance(tempo, (int, float)) or tempo == 0:
            tempo = int(time.time() * 1000)  # Timestamp em ms
        
        nome = paciente.get('nome', 'Paciente Desconhecido')
        if not nome or not isinstance(nome, str):
            nome = 'Paciente Desconhecido'

        # Garante que o paciente tem os dados necessários
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

        # Registra na pilha de histórico para eventual desfazer
        _pilha_historico.push({'acao': 'adicionar', 'paciente': paciente_limpo})

        return jsonify({
            "status": "ok", 
            "mensagem": f"{nome} adicionado à fila com prioridade {prioridade}."
        }), 200
    
    except Exception as e:
        print(f"[ERRO] em /adicionar_na_fila: {str(e)}")
        return jsonify({"erro": f"Erro interno do servidor: {str(e)}"}), 500


@app.route('/calcular_proximo', methods=['POST'])
def calcular_proximo():
    """
    Calcula quem é o próximo a ser chamado usando as estruturas de dados:
    1. Se o Heap tiver alguém → extrai o de maior prioridade
    2. Se só a Fila normal tiver → extrai o primeiro (FIFO)
    
    Também aceita uma lista de pacientes via POST para reconstruir
    as estruturas antes de calcular (usado pelo frontend).
    """
    try:
        body = request.json or {}
        pacientes = body.get('pacientes', [])

        # Se vieram pacientes na requisição, reconstrói as estruturas do zero
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

        # Caso contrário usa as estruturas em memória
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
        print(f"[ERRO] em /calcular_proximo: {str(e)}")
        return jsonify({"erro": f"Erro ao calcular próximo: {str(e)}"}), 500


@app.route('/status', methods=['GET'])
def status():
    """Retorna o estado atual das estruturas de dados."""
    return jsonify({
        "heap_size": len(_heap_global.heap),
        "fila_size": _fila_global.tamanho,
        "historico_size": _pilha_historico.tamanho,
        "status": "online"
    })


if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    print("=" * 50)
    print("  Motor de Estruturas de Dados - ClinicaWeb")
    print("  Fila (FIFO) + Heap (Prioridade) + Pilha")
    print(f"  Rodando em: http://0.0.0.0:{port}")
    print("=" * 50)
    app.run(host='0.0.0.0', port=port, debug=debug)
