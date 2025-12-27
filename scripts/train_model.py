import os
import cv2
import numpy as np
import pickle
from keras_facenet import FaceNet
from sklearn.preprocessing import LabelEncoder
from sklearn.svm import SVC
import sys

def train_model():
    print("==========================================")
    print("      MODEL TRAINING - SMART ATTENDANCE   ")
    print("==========================================")

    data_dir = os.path.join("data", "faces")
    models_dir = os.path.join("models", "custom")
    os.makedirs(models_dir, exist_ok=True)
    
    if not os.path.exists(data_dir):
        print(f"Error: Data directory '{data_dir}' not found.")
        return

    # Initialize FaceNet
    print("Loading FaceNet model...")
    embedder = FaceNet()
    
    X = []
    y = []
    
    print("Processing images...")
    
    # Iterate through each student folder
    for student_folder in os.listdir(data_dir):
        student_path = os.path.join(data_dir, student_folder)
        
        if not os.path.isdir(student_path):
            continue
            
        print(f"-> Processing: {student_folder}")
        
        # Iterate through images
        for img_name in os.listdir(student_path):
            img_path = os.path.join(student_path, img_name)
            
            # Read image
            image = cv2.imread(img_path)
            if image is None:
                continue
                
            # Convert to RGB (FaceNet expects RGB)
            rgb_img = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Get embeddings
            # extract creates a list of dicts with 'box', 'confidence', 'keypoints', 'embedding'
            # IF using just valid faces. But since we already cropped, we might just resize and predict.
            # However, keras-facenet `embeddings` method expects a list of images.
            # Let's use clean `extract` which handles detection + alignment or just `embeddings` if we trust crops.
            # Given we have tight crops, `embeddings` on resized image is safer/faster if detection fails on partial faces.
            # But let's use `extract` first to be sure it's a face.
            
            # Resize to 160x160
            face_resized = cv2.resize(rgb_img, (160, 160))
            
            try:
                # Get embeddings (returns list of 1x512 arrays)
                embedding = embedder.embeddings([face_resized])[0]
                X.append(embedding)
                y.append(student_folder)
            except Exception as e:
                print(f"Skipping {img_name}: {e}")
                
    if not X:
        print("No faces found used for training.")
        return

    X = np.array(X)
    y = np.array(y)
    
    print(f"\nTraining on {len(X)} embeddings from {len(np.unique(y))} classes.")
    
    # Encode labels
    encoder = LabelEncoder()
    y_encoded = encoder.fit_transform(y)
    
    # Train SVM
    model = SVC(kernel='linear', probability=True)
    model.fit(X, y_encoded)
    
    # Save Model & Encoder
    save_path = os.path.join(models_dir, "svm_face_classifier.pkl")
    with open(save_path, "wb") as f:
        pickle.dump({'model': model, 'encoder': encoder}, f)
        
    print(f"Model saved to {save_path}")
    print("Training Complete!")

if __name__ == "__main__":
    train_model()
