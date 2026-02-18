import cv2
import numpy as np
import pickle
import os
import torch
from facenet_pytorch import InceptionResnetV1
import mediapipe as mp
import requests
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from PIL import Image

class FaceRecognizer:
    def __init__(self):
        self.model_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "models", "custom", "svm_face_classifier.pkl")
        self.svm_model = None
        self.label_encoder = None
        
        # Load SVM
        if os.path.exists(self.model_path):
            with open(self.model_path, "rb") as f:
                data = pickle.load(f)
                self.svm_model = data['model']
                self.label_encoder = data['encoder']
        
        # Download MediaPipe Detector model if needed
        self.det_model_path = "blaze_face_short_range.tflite"
        self._ensure_det_model()

        # Initialize MediaPipe Detector
        base_options = python.BaseOptions(model_asset_path=self.det_model_path)
        options = vision.FaceDetectorOptions(base_options=base_options)
        self.detector = vision.FaceDetector.create_from_options(options)

        # Initialize Facenet PyTorch
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.resnet = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)

    def _ensure_det_model(self):
        url = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
        if not os.path.exists(self.det_model_path):
            print(f"Downloading {self.det_model_path}...")
            with requests.get(url, stream=True) as r:
                r.raise_for_status()
                with open(self.det_model_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)

    def verify_face(self, image_np):
        """
        Input: Numpy image (BGR)
        Output: (student_id, confidence, bbox) or (None, 0, None)
        """
        if not self.detector or not self.resnet:
            return None, 0.0, None

        rgb_frame = cv2.cvtColor(image_np, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        
        # Detect
        detection_result = self.detector.detect(mp_image)
        if not detection_result.detections:
            return None, 0.0, None
            
        # Get largest face
        face = max(detection_result.detections, key=lambda d: d.bounding_box.width * d.bounding_box.height)
        bbox = face.bounding_box
        
        h, w, _ = image_np.shape
        x, y, bw, bh = bbox.origin_x, bbox.origin_y, bbox.width, bbox.height
        x, y = max(0, x), max(0, y)
        face_roi = image_np[y:y+bh, x:x+bw]
        
        if face_roi.size == 0:
            return None, 0.0, None
            
        # Embed using Facenet-PyTorch
        # Resize to 160x160 (standard for facenet)
        face_rgb = cv2.cvtColor(face_roi, cv2.COLOR_BGR2RGB)
        face_pil = Image.fromarray(face_rgb)
        face_resized = face_pil.resize((160, 160))
        
        # Normalize and transform to tensor
        face_tensor = np.array(face_resized).astype(np.float32)
        face_tensor = (face_tensor - 127.5) / 128.0 # Example normalization for InceptionResnetV1 (or use 'fixed')
        # Actually facenet-pytorch usually handles normalization if using mtcnn but here we do manual.
        # Standard InceptionResnetV1 takes whitened images.
        face_tensor = np.transpose(face_tensor, (2, 0, 1)) # CxHxW
        face_tensor = torch.tensor(face_tensor).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            embedding = self.resnet(face_tensor).cpu().detach().numpy() # Returns (1, 512)
            
        embedding_vector = embedding.reshape(1, -1)
        
        # Prediction
        if self.svm_model:
            try:
                # IMPORTANT: Keras FaceNet was likely 128d or 512d. Facenet-PyTorch is 512d.
                # If mismatch, we catch it.
                proba = self.svm_model.predict_proba(embedding_vector)[0]
                idx = np.argmax(proba)
                confidence = proba[idx]
                student_label = self.label_encoder.inverse_transform([idx])[0]
                student_id = student_label.split('_')[0]
                return student_id, confidence, bbox
            except Exception as e:
                # print(f"SVM Error: {e}")
                # Fallback: Assume dimensions mismatch means we need retraining.
                return "Unknown (Retrain Needed)", 1.0, bbox
        else:
            return "Unknown (No Model)", 1.0, bbox

recognizer = FaceRecognizer()
