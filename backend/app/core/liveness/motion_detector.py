import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os

class MotionDetector:
    def __init__(self):
        # Path to the downloaded model: backend/face_landmarker.task
        # Current file: backend/app/core/liveness/motion_detector.py
        current_dir = os.path.dirname(__file__)
        model_path = os.path.abspath(os.path.join(current_dir, "../../../../face_landmarker.task"))
        
        # Configure MediaPipe Face Landmarker
        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=True,
            output_facial_transformation_matrixes=True,
            num_faces=1
        )
        self.detector = vision.FaceLandmarker.create_from_options(options)
        
    def get_head_pose(self, transform_matrix):
        """
        Extract pitch, yaw, roll from the transformation matrix provided by Tasks API.
        The transformation matrix is a 4x4 float array.
        """
        # The matrix is already provided by Tasks API when output_face_transformation_matrixes=True
        # It's a rotation + translation matrix.
        # We can decompose the rotation part.
        
        # Extraction logic for Euler angles from rotation matrix
        # R = [[r00, r01, r02], [r10, r11, r12], [r20, r21, r22]]
        
        # Convert MediaPipe matrix (flat memoryview) to 4x4 numpy array
        # tobytes() creates a copy and handles non-contiguous memory/unsupported formats
        matrix = np.frombuffer(transform_matrix.tobytes(), dtype=np.float32).reshape(4, 4)
        
        r00, r01, r02 = matrix[0][:3]
        r10, r11, r12 = matrix[1][:3]
        r20, r21, r22 = matrix[2][:3]

        sy = np.sqrt(r00 * r00 + r10 * r10)
        singular = sy < 1e-6

        if not singular:
            x = np.arctan2(r21, r22)
            y = np.arctan2(-r20, sy)
            z = np.arctan2(r10, r00)
        else:
            x = np.arctan2(-r12, r11)
            y = np.arctan2(-r20, sy)
            z = 0

        # Convert to degrees
        pitch = np.degrees(x)
        yaw = np.degrees(y)
        roll = np.degrees(z)
        
        return pitch, yaw, roll

    def verify_challenge(self, frames, challenge_type="turn_left"):
        max_yaw = 0
        min_yaw = 0
        max_pitch = 0
        min_pitch = 0
        
        for frame in frames:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            
            result = self.detector.detect(mp_image)
            
            if result.facial_transformation_matrixes:
                matrix = result.facial_transformation_matrixes[0].data
                pitch, yaw, roll = self.get_head_pose(matrix)
                
                max_yaw = max(max_yaw, yaw)
                min_yaw = min(min_yaw, yaw)
                max_pitch = max(max_pitch, pitch)
                min_pitch = min(min_pitch, pitch)
        
        passed = False
        score = 0.0
        details = f"Yaw: {min_yaw:.1f} to {max_yaw:.1f}, Pitch: {min_pitch:.1f} to {max_pitch:.1f}"

        if challenge_type == "turn_left":
            # Target: > 15 deg
            if max_yaw > 15: passed = True
            # Score based on extent of turn (15 deg -> 0.5, 30 deg -> 1.0)
            score = min(max(0, (max_yaw - 5) / 25.0), 1.0)
            
        elif challenge_type == "turn_right":
            # Target: < -15 deg
            if min_yaw < -15: passed = True
            score = min(max(0, (abs(min_yaw) - 5) / 25.0), 1.0)

        elif challenge_type == "look_up":
            if max_pitch > 10: passed = True
            score = min(max(0, (max_pitch - 5) / 15.0), 1.0)

        elif challenge_type == "look_down":
            if min_pitch < -10: passed = True
            score = min(max(0, (abs(min_pitch) - 5) / 15.0), 1.0)

        elif challenge_type == "combined":
             # Placeholder for complex movement if needed
             pass
            
        return {"passed": passed, "details": details, "score": score}
