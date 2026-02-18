import os
import cv2
import numpy as np

def create_unknown_class():
    base_path = "data/faces/00000_Unknown/default"
    os.makedirs(base_path, exist_ok=True)
    
    print(f"Creating dummy unknown data at {base_path}...")
    
    # Create 5 dummy images (random noise)
    for i in range(5):
        # random noise image
        img = np.random.randint(0, 255, (160, 160, 3), dtype=np.uint8)
        
        file_path = os.path.join(base_path, f"unknown_{i:03d}.jpg")
        cv2.imwrite(file_path, img)
        
    print("Dummy data created.")

if __name__ == "__main__":
    create_unknown_class()
