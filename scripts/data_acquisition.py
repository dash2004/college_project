import cv2
import mediapipe as mp
import os
import time
import sys

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

def check_face_quality(detection, frame_width, frame_height):
    """
    Check if the face is centered and large enough.
    Returns: (is_good, message)
    """
    bbox = detection.bounding_box
    # bbox has origin_x, origin_y, width, height in pixels
    
    x, y, w, h = bbox.origin_x, bbox.origin_y, bbox.width, bbox.height
    
    # Calculate relative center
    cx_rel = (x + w/2) / frame_width
    cy_rel = (y + h/2) / frame_height
    
    # Check centering (tolerance 0.15 from 0.5)
    if not (0.35 < cx_rel < 0.65) or not (0.35 < cy_rel < 0.65):
        return False, "Center your face"
        
    # Check size (min 15% of frame width approximately)
    if w / frame_width < 0.15:
        return False, "Come closer"
        
    return True, "Perfect"

def collect_data():
    print("===========================================")
    print("      DATA ACQUISITION - SMART ATTENDANCE  ")
    print("===========================================")
    
    name = input("Enter Student Name: ").strip().replace(" ", "_")
    student_id = input("Enter Student ID: ").strip()
    
    if not name or not student_id:
        print("Invalid input. Exiting.")
        return

    # Create directory
    folder_name = f"{student_id}_{name}"
    save_path = os.path.join("data", "faces", folder_name)
    os.makedirs(save_path, exist_ok=True)
    
    # Initialize Face Detector Task
    # We need to download the model file if it doesn't exist
    model_path = 'blaze_face_short_range.tflite'
    if not os.path.exists(model_path):
        print("Downloading face detection model...")
        import urllib.request
        url = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
        urllib.request.urlretrieve(url, model_path)

    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.FaceDetectorOptions(base_options=base_options)
    detector = vision.FaceDetector.create_from_options(options)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Cannot open camera")
        return

    stages = [
        {"name": "Neutral Expression", "count": 20, "desc": "Look straight, neutral face"},
        {"name": "Blinking/Moving", "count": 15, "desc": "Blink naturally, slight head movements"},
        {"name": "Varying Light", "count": 15, "desc": "Adjust lighting or move slightly to change shadows"}
    ]

    total_images = sum(s['count'] for s in stages)
    global_count = 0
    
    for stage in stages:
        stage_count = 0
        print(f"\n--- Starting Stage: {stage['name']} ---")
        print(f"Instruction: {stage['desc']}")
        print("Press 'SPACE' to capture, 'q' to quit stage/exit.")
        
        while stage_count < stage['count']:
            ret, frame = cap.read()
            if not ret:
                break
                
            frame = cv2.flip(frame, 1)
            h, w, c = frame.shape
            
            # MediaPipe Tasks expects mp.Image
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            
            # Detect faces
            detection_result = detector.detect(mp_image)
            
            quality_msg = "No Face"
            is_good = False
            best_detection = None
            
            if detection_result.detections:
                # Pick largest face
                best_detection = max(detection_result.detections, key=lambda d: d.bounding_box.width * d.bounding_box.height)
                is_good, quality_msg = check_face_quality(best_detection, w, h)
                
                # Draw bbox
                bbox = best_detection.bounding_box
                cv2.rectangle(frame, (bbox.origin_x, bbox.origin_y), 
                              (bbox.origin_x + bbox.width, bbox.origin_y + bbox.height), 
                              (0, 255, 0) if is_good else (0, 0, 255), 2)

            # UI Overlay
            cv2.rectangle(frame, (0, 0), (w, 60), (40, 40, 40), -1)
            cv2.putText(frame, f"Stage: {stage['name']} ({stage_count}/{stage['count']})", (20, 35), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            color = (0, 255, 0) if is_good else (0, 0, 255)
            cv2.rectangle(frame, (0, h-40), (w, h), color, -1)
            cv2.putText(frame, f"Status: {quality_msg}", (20, h-10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            cv2.imshow('Data Acquisition', frame)
            
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                cap.release()
                cv2.destroyAllWindows()
                return
            elif key == ord(' ') and is_good and best_detection:
                bbox = best_detection.bounding_box
                x, y, bw, bh = bbox.origin_x, bbox.origin_y, bbox.width, bbox.height
                
                # Add padding
                pad = 30
                x1 = max(0, x - pad)
                y1 = max(0, y - pad)
                x2 = min(w, x + bw + pad)
                y2 = min(h, y + bh + pad)
                
                crop = frame[y1:y2, x1:x2]
                
                if crop.size > 0:
                    filename = f"{save_path}/{student_id}_{global_count:03d}.jpg"
                    cv2.imwrite(filename, crop)
                    stage_count += 1
                    global_count += 1
                    print(f"Saved {filename}")
                    time.sleep(0.2)
                
    print("\nCollection Complete!")
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    collect_data()
