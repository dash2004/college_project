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

        # 1. Blink Detection
        blink_res = self.blink_detector.detect(frames) # {'passed', 'blink_count', 'score'}
        
        # 2. Motion Detection (Check for ANY significant head movement)
        # We check range of motion for both yaw and pitch
        motion_res_left = self.motion_detector.verify_challenge(frames, "turn_left")
        motion_res_right = self.motion_detector.verify_challenge(frames, "turn_right")
        # Take the best motion score
        motion_score = max(motion_res_left.get("score", 0), motion_res_right.get("score", 0))

        # 3. Combined Score
        # We allow either good blinking OR good motion to contribute.
        # However, for high security, we might want a mix. 
        # For now, let's take the weighted average, but boost it if both are present.
        # Actually, let's use a soft-OR: score = 1 - (1-blink)*(1-motion)
        # If blink=0.8, motion=0.0 -> score = 1 - 0.2*1 = 0.8
        # If blink=0.5, motion=0.5 -> score = 1 - 0.5*0.5 = 0.75
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
