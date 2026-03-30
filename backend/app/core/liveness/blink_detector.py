import cv2
import numpy as np
from scipy.spatial import distance as dist
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os
import requests

class BlinkDetector:
    def __init__(self):
        # Path to the downloaded model: backend/face_landmarker.task
        # Current file: backend/app/core/liveness/blink_detector.py
        current_dir = os.path.dirname(__file__)
        self.model_path = os.path.abspath(os.path.join(current_dir, "..", "..", "..", "face_landmarker.task"))
        
        self._ensure_model()
        
        # Configure MediaPipe Face Landmarker
        base_options = python.BaseOptions(model_asset_path=self.model_path)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=True,
            output_facial_transformation_matrixes=True,
            num_faces=1
        )
        self.detector = vision.FaceLandmarker.create_from_options(options)
        
        # Indexes for Left Eye and Right Eye (same as legacy but accessed differently)
        self.LEFT_EYE = [33, 160, 158, 133, 153, 144] 
        self.RIGHT_EYE = [362, 385, 387, 263, 373, 380]
        
        self.EAR_THRESHOLD = 0.22 
        
    def _ensure_model(self):
        url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
        if not os.path.exists(self.model_path):
            print(f"Downloading {self.model_path}...")
            with requests.get(url, stream=True) as r:
                r.raise_for_status()
                with open(self.model_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)
        
        
    def calculate_ear(self, eye_points, landmarks):
        # Landmarks in Tasks API are objects with x, y, z
        def get_coords(idx):
            lm = landmarks[idx]
            return np.array([lm.x, lm.y])

        p1, p2, p3, p4, p5, p6 = [get_coords(i) for i in eye_points]
        
        A = dist.euclidean(p2, p6)
        B = dist.euclidean(p3, p5)
        C = dist.euclidean(p1, p4)
        
        ear = (A + B) / (2.0 * C)
        return ear

    def detect(self, frames):
        blink_count = 0
        eye_closed = False
        
        for frame in frames:
            # Convert BGR to RGB and create MediaPipe Image
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            
            # Detect landmarks
            result = self.detector.detect(mp_image)
            
            if result.face_landmarks:
                face_landmarks = result.face_landmarks[0]
                
                left_ear = self.calculate_ear(self.LEFT_EYE, face_landmarks)
                right_ear = self.calculate_ear(self.RIGHT_EYE, face_landmarks)
                avg_ear = (left_ear + right_ear) / 2.0
                
                if avg_ear < self.EAR_THRESHOLD:
                    if not eye_closed:
                        eye_closed = True
                else:
                    if eye_closed:
                        blink_count += 1
                        eye_closed = False
                            
        # Scoring: 1 blink = 0.5, 2+ blinks = 1.0
        score = min(blink_count / 2.0, 1.0)
        passed = blink_count >= 1 
        return {"passed": passed, "blink_count": blink_count, "score": score}
