from app.services.training import TrainingService
import asyncio

def run_training():
    print("Initializing Training Service...")
    service = TrainingService()
    
    print("Starting Model Training...")
    result = service.train_model()
    
    print("\nTraining Result:")
    print(result)

if __name__ == "__main__":
    run_training()
