import cv2
import torch
import numpy as np
import os
import time
import sqlite3
from datetime import datetime

# Configurar la base de datos
def setup_database():
    conn = sqlite3.connect('tracking.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS player_positions
        (id INTEGER PRIMARY KEY AUTOINCREMENT,
         left_count INTEGER,
         right_count INTEGER,
         timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)
    ''')
    
    # Tabla para el estado del juego
    c.execute('''
        CREATE TABLE IF NOT EXISTS game_state
        (id INTEGER PRIMARY KEY,
         current_question_id TEXT,
         is_voting_active BOOLEAN)
    ''')
    
    # Insertar estado inicial si no existe
    c.execute('INSERT OR IGNORE INTO game_state (id, current_question_id, is_voting_active) VALUES (1, "1", 0)')
    
    conn.commit()
    return conn

# Configurar PyTorch y modelo
os.environ['TORCH_HOME'] = './torch_cache'
model = torch.hub.load('ultralytics/yolov5', 'yolov5n', pretrained=True)
model.classes = [0]
model.conf = 0.6
# Configurar la cámara
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 320)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)

# Inicializar base de datos
conn = setup_database()
cursor = conn.cursor()

# Variables para el suavizado de conteos
smooth_left = 0
smooth_right = 0
alpha = 0.3  # factor de suavizado

def update_counts(left_count, right_count):
    global smooth_left, smooth_right
    
    # Aplicar suavizado exponencial
    smooth_left = alpha * left_count + (1 - alpha) * smooth_left
    smooth_right = alpha * right_count + (1 - alpha) * smooth_right
    
    # Redondear para almacenar en la base de datos
    final_left = round(smooth_left)
    final_right = round(smooth_right)
    
    # Actualizar la base de datos
    cursor.execute('''
        INSERT INTO player_positions (left_count, right_count)
        VALUES (?, ?)
    ''', (final_left, final_right))
    conn.commit()

try:
    prev_time = time.time()
    update_interval = 0.1  # actualizar DB cada 100ms
    last_update = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Error al capturar el frame.")
            break

        # Realizar la detección
        results = model(frame, size=320)
        detections = results.xyxy[0].numpy()

        # Contar personas
        left_count = 0
        right_count = 0
        frame_height, frame_width = frame.shape[:2]

        for detection in detections:
            xmin, ymin, xmax, ymax, confidence, class_id = detection
            center_x = int((int(xmin) + int(xmax)) / 2)
            
            if center_x < frame_width / 2:
                left_count += 1
            else:
                right_count += 1

            # Dibujar bounding boxes
            cv2.rectangle(frame, (int(xmin), int(ymin)), (int(xmax), int(ymax)), (0, 255, 0), 2)

        # Actualizar DB cada intervalo
        current_time = time.time()
        if current_time - last_update >= update_interval:
            update_counts(left_count, right_count)
            last_update = current_time

        # Mostrar visualización
        cv2.line(frame, (frame_width // 2, 0), (frame_width // 2, frame_height), (255, 0, 0), 2)
        cv2.putText(frame, f'I: {left_count}', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        cv2.putText(frame, f'D: {right_count}', (frame_width - 100, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

        # Mostrar FPS
        fps = 1 / (current_time - prev_time)
        prev_time = current_time
        cv2.putText(frame, f'FPS: {int(fps)}', (10, frame_height - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)

        cv2.imshow('Detector de Personas YOLOv5', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

finally:
    cap.release()
    cv2.destroyAllWindows()
    conn.close()