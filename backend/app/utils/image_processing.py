import base64
import os
import cv2
import numpy as np

def save_base64_images(student_id: str, name: str, images_payload: list) -> str:
    """
    Decodes base64 images and saves them to data/faces/{student_id}_{name}/{angle}/
    Returns the student's root folder path.
    """
    folder_name = f"{student_id}_{name.replace(' ', '_')}"
    base_path = "data/faces" 
    student_root_path = os.path.join(base_path, folder_name)
    os.makedirs(student_root_path, exist_ok=True)

    for i, item in enumerate(images_payload):
        # Handle both Pydantic model (API) and dict (internal/test)
        if hasattr(item, 'data'): 
            base64_str = item.data
            metadata = item.metadata
            angle = metadata.angle
        else:
            # Fallback/Backward compatibility or dict
            base64_str = item
            angle = "unknown"

        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
            
        img_data = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is not None:
            # Create angle specific folder
            angle_path = os.path.join(student_root_path, angle)
            os.makedirs(angle_path, exist_ok=True)
            
            filename = f"{student_id}_{angle}_{i:03d}.jpg"
            file_path = os.path.join(angle_path, filename)
            cv2.imwrite(file_path, img)

    return student_root_path
