class Node:
    def __init__(self, data):
        self.data = data
        self.next = None

class Fila:
    def __init__(self):
        self.head = None
        self.tail = None
        self.tamanho = 0

    def enqueue(self, item):
        new_node = Node(item)
        if self.tail is None:
            self.head = new_node
            self.tail = new_node
        else:
            self.tail.next = new_node
            self.tail = new_node
        self.tamanho += 1

    def dequeue(self):
        if self.head is None:
            return None
        temp = self.head
        self.head = self.head.next
        if self.head is None:
            self.tail = None
        self.tamanho -= 1
        return temp.data

    def is_empty(self):
        return self.tamanho == 0

class Pilha:
    def __init__(self):
        self.top = None
        self.tamanho = 0

    def push(self, item):
        new_node = Node(item)
        new_node.next = self.top
        self.top = new_node
        self.tamanho += 1

    def pop(self):
        if self.top is None:
            return None
        temp = self.top
        self.top = self.top.next
        self.tamanho -= 1
        return temp.data

    def is_empty(self):
        return self.tamanho == 0

class Heap:
    def __init__(self):
        self.heap = []
    
    def get_parent_index(self, index): return (index - 1) // 2
    def get_left_child_index(self, index): return 2 * index + 1
    def get_right_child_index(self, index): return 2 * index + 2
    def has_parent(self, index): return self.get_parent_index(index) >= 0
    def has_left_child(self, index): return self.get_left_child_index(index) < len(self.heap)
    def has_right_child(self, index): return self.get_right_child_index(index) < len(self.heap)
    def swap(self, index1, index2):
        self.heap[index1], self.heap[index2] = self.heap[index2], self.heap[index1]
        
    def insert(self, item, prioridade, tempo_criacao):
        # Para desempate no Python, se as prioridades forem iguais, atende o menor tempo (mais antigo).
        # Para Max-Heap (maior valor no topo), prioridade maior = topo.
        # Tempo de criação invertido (negativo) garante que o menor tempo seja considerado "maior" no desempate.
        self.heap.append((prioridade, -tempo_criacao, item))
        self.heapify_up(len(self.heap) - 1)
        
    def extract_max(self):
        if len(self.heap) == 0:
            return None
        if len(self.heap) == 1:
            return self.heap.pop()[2]
            
        max_item = self.heap[0]
        self.heap[0] = self.heap.pop()
        self.heapify_down(0)
        return max_item[2]

    def heapify_up(self, index):
        while (self.has_parent(index) and 
               self.heap[self.get_parent_index(index)] < self.heap[index]):
            self.swap(self.get_parent_index(index), index)
            index = self.get_parent_index(index)
            
    def heapify_down(self, index):
        while self.has_left_child(index):
            larger_child_index = self.get_left_child_index(index)
            if (self.has_right_child(index) and 
                self.heap[self.get_right_child_index(index)] > self.heap[larger_child_index]):
                larger_child_index = self.get_right_child_index(index)
                
            if self.heap[index] > self.heap[larger_child_index]:
                break
            else:
                self.swap(index, larger_child_index)
            index = larger_child_index

    def is_empty(self):
        return len(self.heap) == 0
