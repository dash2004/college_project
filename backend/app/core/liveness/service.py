from .blink_detector import BlinkDetector
from .motion_detector import MotionDetector
import base64
import cv2
import numpy as np

class LivenessService:
    def __init__(self):
        self.blink_detector = BlinkDetector()
        self.motion_detector = MotionDetector()

    def process_frames(self, base64_frames):
        """
        Convert list of base64 strings to OpenCV images
        """
        frames = []
        for b64 in base64_frames:
            if "," in b64:
                b64 = b64.split(",")[1]
            img_data = base64.b64decode(b64)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                frames.append(img)
        return frames

    def check_liveness(self, base64_frames, challenge_type="blink"):
        frames = self.process_frames(base64_frames)
        if not frames:
            return {"passed": False, "error": "No valid frames"}

        if challenge_type == "blink":
            return self.blink_detector.detect(frames)
        elif challenge_type in ["turn_left", "turn_right", "look_up", "look_down"]:
            return self.motion_detector.verify_challenge(frames, challenge_type)
        else:
            return {"passed": False, "error": "Unknown challenge type"}

    def full_liveness_check(self, base64_frames):
        """
        Runs both blink and motion detection on the frames.
        Returns combined score and best frame for recognition.
        """
        frames = self.process_frames(base64_frames)
        if not frames:
            return {"passed": False, "liveness_score": 0.0, "error": "No valid frames"}

        # Optimization: Take max 10 frames evenly spaced to speed up MediaPipe processing
        if len(frames) > 10:
            indices = np.linspace(0, len(frames)-1, 10).astype(int)
            sampled_frames = [frames[i] for i in indices]
        else:
            sampled_frames = frames

        # 1. Blink Detection
        blink_res = self.blink_detector.detect(sampled_frames) # {'passed', 'blink_count', 'score'}
        
        # 2. Motion Detection (Check for ANY significant head movement)
        # Evaluate left/right motion in a single pass over sampled frames
        motion_res = self.motion_detector.evaluate_motion(sampled_frames)
        motion_score = motion_res["best_motion_score"]

        # 3. Combined Score
        # We allow either good blinking OR good motion to contribute.
        # Soft-OR: score = 1 - (1-blink)*(1-motion)
        liveness_score = 1.0 - ((1.0 - blink_res.get("score", 0)) * (1.0 - motion_score))
        
        passed = liveness_score > 0.80 # Internal threshold slightly lower than global strict one

        # 4. Find Best Frame (Largest face, most frontal)
        # For simplicity, we'll pick the middle frame or the one with best face detection
        # Since we don't want to run face detection on all 30 frames again here (expensive),
        # we can just return the middle frame index or index where eyes were open.
        best_frame_idx = len(frames) // 2 
        
        return {
            "passed": passed,
            "liveness_score": liveness_score,
            "blink_data": blink_res,
            "motion_score": motion_score,
            "best_frame_index": best_frame_idx,
            "best_frame_image": frames[best_frame_idx] if frames else None
        }
