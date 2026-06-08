from flask import Flask, request, jsonify
from flask_cors import CORS
from estruturas import Fila, Pilha, Heap

app = Flask(__name__)
CORS(app)

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
    paciente = request.json
    if not paciente or 'id' not in paciente:
        return jsonify({"erro": "Dados inválidos"}), 400

    prioridade = paciente.get('prioridade', 0)
    tempo = paciente.get('criadoEm', 0)

    if prioridade > 0:
        _heap_global.insert(paciente, prioridade, tempo)
    else:
        _fila_global.enqueue(paciente)

    # Registra na pilha de histórico para eventual desfazer
    _pilha_historico.push({'acao': 'adicionar', 'paciente': paciente})

    return jsonify({"status": "ok", "mensagem": f"{paciente.get('nome')} adicionado à fila."})


@app.route('/calcular_proximo', methods=['POST'])
def calcular_proximo():
    """
    Calcula quem é o próximo a ser chamado usando as estruturas de dados:
    1. Se o Heap tiver alguém → extrai o de maior prioridade
    2. Se só a Fila normal tiver → extrai o primeiro (FIFO)
    
    Também aceita uma lista de pacientes via POST para reconstruir
    as estruturas antes de calcular (usado pelo frontend).
    """
    body = request.json or {}
    pacientes = body.get('pacientes', [])

    # Se vieram pacientes na requisição, reconstrói as estruturas do zero
    if pacientes:
        heap_temp = Heap()
        fila_temp = Fila()
        for p in pacientes:
            tempo = p.get('criadoEm', 0)
            if p.get('prioridade', 0) > 0:
                heap_temp.insert(p, p['prioridade'], tempo)
            else:
                fila_temp.enqueue(p)

        proximo = None
        if not heap_temp.is_empty():
            proximo = heap_temp.extract_max()
        elif not fila_temp.is_empty():
            proximo = fila_temp.dequeue()

        return jsonify({"proximo": proximo})

    # Caso contrário usa as estruturas em memória
    proximo = None
    if not _heap_global.is_empty():
        proximo = _heap_global.extract_max()
    elif not _fila_global.is_empty():
        proximo = _fila_global.dequeue()

    if proximo is None:
        return jsonify({"erro": "Fila vazia"}), 404

    _pilha_historico.push({'acao': 'chamar', 'paciente': proximo})
    return jsonify({"proximo": proximo})


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
    print("=" * 50)
    print("  Motor de Estruturas de Dados - ClinicaWeb")
    print("  Fila (FIFO) + Heap (Prioridade) + Pilha")
    print("  Rodando em: http://localhost:5000")
    print("=" * 50)
    app.run(port=5000, debug=True)
