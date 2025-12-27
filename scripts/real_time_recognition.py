import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import pickle
import os
import time
from datetime import datetime
from keras_facenet import FaceNet

class AttendanceSystem:
    def __init__(self):
        # Load Model
        self.model_path = os.path.join("models", "custom", "svm_face_classifier.pkl")
        self.load_model()
        
        # Initialize FaceNet
        self.embedder = FaceNet()
        
        # Download models if needed
        self.face_det_model = 'blaze_face_short_range.tflite'
        self.face_mesh_model = 'face_landmarker.task'
        
        self.ensure_models()
        
        # Initialize MediaPipe Tasks
        base_options_det = python.BaseOptions(model_asset_path=self.face_det_model)
        options_det = vision.FaceDetectorOptions(base_options=base_options_det)
        self.detector = vision.FaceDetector.create_from_options(options_det)
        
        base_options_mesh = python.BaseOptions(model_asset_path=self.face_mesh_model)
        options_mesh = vision.FaceLandmarkerOptions(
            base_options=base_options_mesh,
            output_face_blendshapes=True,
            output_facial_transformation_matrixes=True,
            num_faces=1)
        self.landmarker = vision.FaceLandmarker.create_from_options(options_mesh)
        
        # Liveness State
        self.blink_count = 0
        self.eye_state = "OPEN" # OPEN or CLOSED
        self.last_log_time = {} # {student_id: timestamp}
        
    def ensure_models(self):
        import urllib.request
        urls = {
            self.face_det_model: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            self.face_mesh_model: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
        }
        for path, url in urls.items():
            if not os.path.exists(path):
                print(f"Downloading {path}...")
                urllib.request.urlretrieve(url, path)

    def load_model(self):
        if not os.path.exists(self.model_path):
            print("Model not found! Please train first.")
            self.model = None
            self.encoder = None
        else:
            with open(self.model_path, "rb") as f:
                data = pickle.load(f)
                self.model = data['model']
                self.encoder = data['encoder']
            print("Model loaded successfully.")

    def log_attendance(self, student_label):
        student_id = student_label.split('_')[0]
        now = datetime.now()
        if student_id in self.last_log_time:
            if (now - self.last_log_time[student_id]).total_seconds() < 60:
                return False
        log_dir = os.path.join("data", "attendance_logs")
        os.makedirs(log_dir, exist_ok=True)
        csv_path = os.path.join(log_dir, f"attendance_{now.strftime('%Y-%m-%d')}.csv")
        file_exists = os.path.exists(csv_path)
        with open(csv_path, "a") as f:
            if not file_exists:
                f.write("Timestamp,Student_ID,Name,Status\n")
            f.write(f"{now.strftime('%H:%M:%S')},{student_id},{student_label},Present\n")
        self.last_log_time[student_id] = now
        return True

    def run(self, exit_after_recognition=True):
        if not self.model:
            return

        cap = cv2.VideoCapture(0)
        
        print("\n" + "="*50)
        print("SMART ATTENDANCE SYSTEM")
        print("="*50)
        print("Instructions:")
        print("  - Look at the camera")
        print("  - Blink 2 times to verify liveness")
        print("  - Press 'Q' to quit manually")
        print("="*50 + "\n")
        
        while True:
            ret, frame = cap.read()
            if not ret: break
            
            frame = cv2.flip(frame, 1)
            h, w, _ = frame.shape
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            
            # 1. Detection
            det_result = self.detector.detect(mp_image)
            
            if det_result.detections:
                for det in det_result.detections:
                    bbox = det.bounding_box
                    x, y, bw, bh = bbox.origin_x, bbox.origin_y, bbox.width, bbox.height
                    x, y = max(0, x), max(0, y)
                    
                    face_roi = frame[y:y+bh, x:x+bw]
                    
                    # Defaults
                    status_text = "Scanning..."
                    color = (128, 128, 128)  # Gray
                    name_text = "Unknown"
                    confidence = 0
                    
                    if face_roi.size > 0:
                        roi_rgb = cv2.cvtColor(face_roi, cv2.COLOR_BGR2RGB)
                        face_resized = cv2.resize(roi_rgb, (160, 160))
                        
                        try:
                            embedding = self.embedder.embeddings([face_resized])[0]
                            embedding = embedding.reshape(1, -1)
                            proba = self.model.predict_proba(embedding)[0]
                            idx = np.argmax(proba)
                            confidence = proba[idx]
                        except Exception as e:
                            print(f"Recognition error: {e}")
                        
                        # Confidence-based handling
                        if confidence < 0.70:
                            # LOW confidence - Unknown
                            name_text = "Unknown"
                            status_text = "Not Recognized"
                            color = (0, 0, 255)  # RED
                            
                        elif confidence < 0.80:
                            # MEDIUM confidence - Uncertain
                            name_text = self.encoder.inverse_transform([idx])[0]
                            status_text = "Low Confidence"
                            color = (0, 165, 255)  # ORANGE
                            
                        else:
                            # HIGH confidence - Proceed with liveness
                            name_text = self.encoder.inverse_transform([idx])[0]
                            
                            # Liveness Check (Blink)
                            mesh_result = self.landmarker.detect(mp_image)
                            
                            if mesh_result.face_blendshapes:
                                blendshapes = mesh_result.face_blendshapes[0]
                                blink_left = next(s.score for s in blendshapes if s.category_name == 'eyeBlinkLeft')
                                blink_right = next(s.score for s in blendshapes if s.category_name == 'eyeBlinkRight')
                                avg_blink = (blink_left + blink_right) / 2.0
                                
                                if avg_blink > 0.5:
                                    self.eye_state = "CLOSED"
                                elif avg_blink < 0.2 and self.eye_state == "CLOSED":
                                    self.blink_count += 1
                                    self.eye_state = "OPEN"
                                    print(f"Blink detected! ({self.blink_count}/2)")
                            
                            # Require 2 blinks for verification
                            if self.blink_count >= 2:
                                status_text = "ACCESS GRANTED"
                                color = (0, 255, 0)  # GREEN
                                
                                if self.log_attendance(name_text):
                                    print(f"\n✓ Logged: {name_text}")
                                    
                                    # Show success message
                                    cv2.rectangle(frame, (x, y), (x+bw, y+bh), color, 3)
                                    cv2.rectangle(frame, (x, y-30), (x+bw, y), color, -1)
                                    cv2.putText(frame, name_text, (x+5, y-5), 
                                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                                    cv2.putText(frame, "ACCESS GRANTED!", (w//2-150, h//2), 
                                                cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)
                                    cv2.imshow('Smart Attendance System', frame)
                                    cv2.waitKey(2000)  # Show for 2 seconds
                                    
                                    if exit_after_recognition:
                                        print("Exiting after successful recognition...")
                                        cap.release()
                                        cv2.destroyAllWindows()
                                        return
                            else:
                                status_text = f"Blink to Verify ({self.blink_count}/2)"
                                color = (0, 255, 255)  # YELLOW

                    # Visualization
                    cv2.rectangle(frame, (x, y), (x+bw, y+bh), color, 2)
                    cv2.rectangle(frame, (x, y-30), (x+bw, y), color, -1)
                    cv2.putText(frame, name_text, (x+5, y-5), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                    cv2.rectangle(frame, (x, y+bh), (x+bw, y+bh+30), (0, 0, 0), -1)
                    cv2.putText(frame, f"{status_text} ({int(confidence*100)}%)", (x+5, y+bh+20), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

            cv2.imshow('Smart Attendance System', frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    system = AttendanceSystem()
    system.run()
