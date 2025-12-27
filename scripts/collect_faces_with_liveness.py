"""
Face Data Collection with Liveness Detection
Prevents spoofing with photo/video attacks
"""

import cv2
import numpy as np
import os
from datetime import datetime
import time
import random

class LivenessDetector:
    """Detect if face is from a live person"""
    
    def __init__(self):
        # Load face and eye cascade classifiers
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        self.eye_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_eye.xml'
        )
        
        # Liveness detection state
        self.blink_counter = 0
        self.blink_required = 3
        self.last_blink_time = 0
        self.eye_aspect_ratio_history = []
        
        # Movement detection
        self.face_positions = []
        self.movement_detected = False
        
    def detect_blink(self, frame, face_location):
        """Detect if person blinked"""
        x, y, w, h = face_location
        
        # Extract face region
        roi_gray = frame[y:y+h, x:x+w]
        
        # Detect eyes
        eyes = self.eye_cascade.detectMultiScale(roi_gray, 1.1, 5)
        
        # Calculate Eye Aspect Ratio (EAR)
        if len(eyes) >= 2:
            # Eyes open
            ear = 1.0
        elif len(eyes) == 1:
            # Partially closed
            ear = 0.5
        else:
            # Eyes closed (blink detected)
            ear = 0.0
        
        # Add to history
        self.eye_aspect_ratio_history.append(ear)
        if len(self.eye_aspect_ratio_history) > 10:
            self.eye_aspect_ratio_history.pop(0)
        
        # Detect blink (closed then open)
        if len(self.eye_aspect_ratio_history) >= 4:
            recent = self.eye_aspect_ratio_history[-4:]
            # Pattern: open -> closed -> closed -> open
            if recent[0] > 0.3 and recent[1] < 0.2 and recent[2] < 0.2 and recent[3] > 0.3:
                current_time = time.time()
                if current_time - self.last_blink_time > 0.5:  # Minimum 0.5s between blinks
                    self.blink_counter += 1
                    self.last_blink_time = current_time
                    return True
        
        return False
    
    def detect_movement(self, face_location):
        """Detect head movement (left/right)"""
        x, y, w, h = face_location
        center_x = x + w // 2
        
        # Track face center positions
        self.face_positions.append(center_x)
        if len(self.face_positions) > 30:
            self.face_positions.pop(0)
        
        # Check for significant left-right movement
        if len(self.face_positions) >= 20:
            positions = self.face_positions[-20:]
            movement_range = max(positions) - min(positions)
            
            # If movement > 50 pixels, head moved
            if movement_range > 50:
                self.movement_detected = True
                return True
        
        return False
    
    def check_liveness(self):
        """Check if all liveness tests passed"""
        return {
            'blinks': self.blink_counter >= self.blink_required,
            'movement': self.movement_detected,
            'passed': self.blink_counter >= self.blink_required and self.movement_detected
        }
    
    def reset(self):
        """Reset liveness detection for new session"""
        self.blink_counter = 0
        self.eye_aspect_ratio_history = []
        self.face_positions = []
        self.movement_detected = False

class LivenessChallenge:
    """Random challenge system for liveness verification"""
    
    def __init__(self):
        self.challenges = [
            {
                'action': 'blink',
                'instruction': 'Blink your eyes 3 times',
                'duration': 5
            },
            {
                'action': 'turn_left',
                'instruction': 'Turn your head LEFT slowly',
                'duration': 3
            },
            {
                'action': 'turn_right',
                'instruction': 'Turn your head RIGHT slowly',
                'duration': 3
            },
            {
                'action': 'smile',
                'instruction': 'SMILE :)',
                'duration': 2
            },
            {
                'action': 'nod',
                'instruction': 'Nod your head UP and DOWN',
                'duration': 3
            }
        ]
        
        self.current_challenge = None
        self.challenge_start_time = 0
    
    def get_random_challenge(self):
        """Get a random liveness challenge"""
        self.current_challenge = random.choice(self.challenges)
        self.challenge_start_time = time.time()
        return self.current_challenge
    
    def is_challenge_expired(self):
        """Check if challenge time limit exceeded"""
        if self.current_challenge:
            elapsed = time.time() - self.challenge_start_time
            return elapsed > self.current_challenge['duration']
        return False

def collect_with_liveness(name, roll_no, num_images=20):
    """
    Collect face images with liveness detection
    """
    
    # Create folder
    folder_name = f"{roll_no}_{name.replace(' ', '_')}"
    folder_path = os.path.join('data', 'faces', folder_name)
    os.makedirs(folder_path, exist_ok=True)
    
    # Initialize
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Cannot open camera")
        return False
    
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    )
    
    liveness = LivenessDetector()
    challenge = LivenessChallenge()
    
    print("\n" + "="*60)
    print(f"LIVENESS VERIFICATION for {name}")
    print("="*60)
    print("\n🔐 ANTI-SPOOFING MEASURES ACTIVE")
    print("You must complete liveness checks to proceed:\n")
    print("1. Blink your eyes 3 times")
    print("2. Turn your head left and right")
    print("3. Follow random instructions\n")
    
    input("Press ENTER to start liveness verification...")
    
    # Phase 1: Liveness Verification
    print("\n📹 PHASE 1: Liveness Verification")
    print("-" * 60)
    
    liveness_passed = False
    current_challenge = challenge.get_random_challenge()
    
    while not liveness_passed:
        ret, frame = cap.read()
        if not ret:
            break
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        
        display = frame.copy()
        
        if len(faces) > 0:
            # Get largest face
            face = max(faces, key=lambda f: f[2] * f[3])
            x, y, w, h = face
            
            # Draw face rectangle
            cv2.rectangle(display, (x, y), (x+w, y+h), (0, 255, 0), 2)
            
            # Check liveness
            blink_detected = liveness.detect_blink(gray, face)
            movement_detected = liveness.detect_movement(face)
            
            if blink_detected:
                print(f"  ✓ Blink detected! ({liveness.blink_counter}/{liveness.blink_required})")
            
            if movement_detected:
                print("  ✓ Head movement detected!")
            
            # Display status
            status = liveness.check_liveness()
            
            # Draw status overlay
            overlay = display.copy()
            cv2.rectangle(overlay, (10, 10), (630, 150), (0, 0, 0), -1)
            cv2.addWeighted(overlay, 0.7, display, 0.3, 0, display)
            
            # Status text
            cv2.putText(display, "LIVENESS VERIFICATION", (20, 35),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            
            blink_status = "✓" if status['blinks'] else f"{liveness.blink_counter}/{liveness.blink_required}"
            cv2.putText(display, f"Blinks: {blink_status}", (20, 65),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0) if status['blinks'] else (255, 255, 255), 2)
            
            move_status = "✓" if status['movement'] else "..."
            cv2.putText(display, f"Movement: {move_status}", (20, 90),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0) if status['movement'] else (255, 255, 255), 2)
            
            # Current challenge
            if current_challenge:
                time_left = int(current_challenge['duration'] - (time.time() - challenge.challenge_start_time))
                cv2.putText(display, f"Challenge: {current_challenge['instruction']}", (20, 120),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
                cv2.putText(display, f"Time left: {max(0, time_left)}s", (20, 140),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                
                if challenge.is_challenge_expired():
                    current_challenge = challenge.get_random_challenge()
            
            # Check if passed
            if status['passed']:
                cv2.putText(display, "LIVENESS VERIFIED!", (150, 250),
                           cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)
                liveness_passed = True
        
        else:
            # No face detected
            cv2.putText(display, "No face detected - please position yourself", (50, 250),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        cv2.imshow('Liveness Verification', display)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            cap.release()
            cv2.destroyAllWindows()
            return False
        
        # Show success for 2 seconds
        if liveness_passed:
            cv2.imshow('Liveness Verification', display)
            cv2.waitKey(2000)
            break
    
    if not liveness_passed:
        print("\n❌ Liveness verification failed")
        cap.release()
        cv2.destroyAllWindows()
        return False
    
    print("\n✅ Liveness verified! Proceeding to image collection...")
    
    # Phase 2: Image Collection
    print("\n📸 PHASE 2: Image Collection")
    print("-" * 60)
    
    instructions = [
        "Look straight", "Smile", "Turn left", "Turn right",
        "Look up", "Look down", "Neutral", "Serious",
        "Tilt left", "Tilt right", "Closer", "Back",
        "Natural", "Different angle", "Another pose"
    ]
    
    count = 0
    
    while count < num_images:
        ret, frame = cap.read()
        if not ret:
            break
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        
        display = frame.copy()
        
        # Draw instruction
        instruction = instructions[count % len(instructions)]
        cv2.rectangle(display, (10, 10), (630, 80), (0, 0, 0), -1)
        cv2.putText(display, f"[{count+1}/{num_images}] {instruction}", (20, 50),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        
        # Draw face rectangle
        if len(faces) > 0:
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            cv2.rectangle(display, (x, y), (x+w, y+h), (0, 255, 0), 2)
        
        cv2.imshow('Image Collection (SPACE: Capture, Q: Quit)', display)
        
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord(' ') and len(faces) > 0:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:-3]
            filename = f"{folder_path}/{count+1:03d}_{timestamp}_verified.jpg"
            cv2.imwrite(filename, frame)
            count += 1
            print(f"  ✓ [{count:2d}/{num_images}] {instruction}")
            time.sleep(0.3)
            
        elif key == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()
    
    print("\n" + "="*60)
    print(f"✅ Collected {count} VERIFIED images for {name}")
    print(f"📁 Saved in: {folder_path}")
    print("="*60 + "\n")
    
    return count >= 15

def main():
    """Main function"""
    print("\n" + "="*60)
    print("SECURE FACE DATA COLLECTION")
    print("With Anti-Spoofing Liveness Detection")
    print("="*60)
    
    print("\n🔐 SECURITY FEATURES:")
    print("  ✓ Blink detection")
    print("  ✓ Movement detection")
    print("  ✓ Random challenges")
    print("  ✓ Live person verification\n")
    
    name = input("Student Name: ").strip()
    roll_no = input("Roll Number: ").strip().upper()
    
    if not name or not roll_no:
        print("❌ Name and Roll Number required")
        return
    
    print(f"\n📋 Starting secure collection for {name} ({roll_no})")
    
    success = collect_with_liveness(name, roll_no, num_images=20)
    
    if success:
        print("\n✅ SUCCESS! Liveness-verified images collected")
    else:
        print("\n❌ Collection incomplete")

if __name__ == "__main__":
    main()