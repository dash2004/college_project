from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from app.core import security
from app.services.training import TrainingService
from app.core.dependencies import get_current_admin
from app.models.user import User

router = APIRouter()
training_service = TrainingService()

# In-memory status for demo simplicity (use Redis/db for production)
training_status = {
    "is_training": False,
    "last_run": None,
    "result": None
}

def run_training_task():
    global training_status
    training_status["is_training"] = True
    try:
        result = training_service.train_model()
        training_status["result"] = result
        training_status["last_run"] = "Success"
    except Exception as e:
        training_status["last_run"] = f"Failed: {str(e)}"
    finally:
        training_status["is_training"] = False

@router.post("/train")
def trigger_training(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_admin)
):
    if training_status["is_training"]:
        raise HTTPException(status_code=400, detail="Training already in progress")
    
    background_tasks.add_task(run_training_task)
    return {"message": "Training started in background"}

@router.get("/status")
def get_model_status(
    current_user: User = Depends(get_current_admin)
):
    return training_status
