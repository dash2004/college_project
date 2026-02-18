import os
import cv2
import torch
import numpy as np
import pickle
from facenet_pytorch import InceptionResnetV1
from sklearn.svm import SVC
from sklearn.preprocessing import LabelEncoder
from PIL import Image

class TrainingService:
    def __init__(self):
        self.device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
        self.resnet = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)
        self.data_dir = "data/faces"
        self.model_path = "models/custom/svm_face_classifier.pkl"
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)

    def train_model(self):
        """
        Loads all images from data/faces, extracts embeddings, and trains an SVM.
        """
        embeddings = []
        labels = []
        label_map = {} # student_id -> name

        print("Starting training pipeline...")
        
        # Traverse data directory: data/faces/{student_id}_{name}/{angle}/*.jpg
        if not os.path.exists(self.data_dir):
            print("No data directory found.")
            return {"status": "failed", "message": "No data found"}

        for student_folder in os.listdir(self.data_dir):
            student_path = os.path.join(self.data_dir, student_folder)
            if not os.path.isdir(student_path):
                continue
            
            # extract student_id and name
            parts = student_folder.split('_')
            student_id = parts[0]
            
            print(f"Processing student: {student_folder}")

            # Walk through all subfolders (angles)
            for root, _, files in os.walk(student_path):
                for file in files:
                    if file.endswith(('.jpg', '.jpeg', '.png')):
                        img_path = os.path.join(root, file)
                        try:
                            emb = self.get_embedding(img_path)
                            if emb is not None:
                                embeddings.append(emb)
                                labels.append(student_folder) # Use folder name as label
                        except Exception as e:
                            print(f"Error processing {img_path}: {e}")

        if not embeddings:
            return {"status": "failed", "message": "No valid face embeddings found."}

        # Train SVM
        print(f"Training on {len(embeddings)} samples...")
        le = LabelEncoder()
        labels_enc = le.fit_transform(labels)
        
        clf = SVC(kernel='linear', probability=True)
        clf.fit(embeddings, labels_enc)

        # Save model and label encoder
        with open(self.model_path, 'wb') as f:
            pickle.dump({'model': clf, 'le': le}, f)
            
        print("Training complete. Model saved.")
        return {"status": "success", "samples": len(embeddings), "classes": len(le.classes_)}

    def get_embedding(self, img_path):
        img = cv2.imread(img_path)
        if img is None:
            return None
            
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img_pil = Image.fromarray(img_rgb)
        
        # Resize to 160x160 for InceptionResnetV1
        img_resized = img_pil.resize((160, 160))
        
        # Transform to tensor
        img_tensor = np.array(img_resized).astype(np.float32)
        img_tensor = (img_tensor - 127.5) / 128.0 # Standardize
        img_tensor = np.transpose(img_tensor, (2, 0, 1)) # CxHxW
        img_tensor = torch.tensor(img_tensor).unsqueeze(0).to(self.device)

        with torch.no_grad():
            embedding = self.resnet(img_tensor).cpu().detach().numpy()
            
        return embedding.flatten()
