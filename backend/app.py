from flask import Flask, request, jsonify
from flask_cors import CORS
from estruturas import Fila, Heap

app = Flask(__name__)
CORS(app) # Permite que o React (porta 5173) faça requisições para o Flask (porta 5000)

@app.route('/calcular_proximo', methods=['POST'])
def calcular_proximo():
    pacientes = request.json.get('pacientes', [])
    
    if not pacientes:
        return jsonify({"erro": "Fila vazia"}), 404
        
    fila_normal = Fila()
    heap_prioridade = Heap()
    
    # 1. Alimentar as Estruturas de Dados
    for p in pacientes:
        # p é um dicionário vindo do React
        # O tempo_criacao será um timestamp em milissegundos para ordenação de desempate
        tempo = p.get('criadoEm', 0)
        
        if p.get('prioridade', 0) == 0:
            fila_normal.enqueue(p)
        else:
            heap_prioridade.insert(p, p['prioridade'], tempo)
            
    # 2. Descobrir quem é o próximo
    proximo = None
    if not heap_prioridade.is_empty():
        proximo = heap_prioridade.extract_max()
    elif not fila_normal.is_empty():
        proximo = fila_normal.dequeue()
        
    return jsonify({"proximo": proximo})

if __name__ == '__main__':
    app.run(port=5000, debug=True)
