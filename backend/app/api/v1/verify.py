from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import base64
import numpy as np
import cv2
import os
from datetime import datetime
from app.core.liveness.service import LivenessService
from app.schemas.liveness import LivenessCheckRequest, FaceVerificationRequest, LivenessResponse
from app.core.config import settings

liveness_service = LivenessService()

from app.core.database import get_db
from app.core.face_recognition import recognizer
from app.models.attendance import Attendance
from app.models.student import Student
from app.models.verification_attempt import VerificationAttempt
from app.schemas.attendance import VerificationRequest, AttendanceResponse

router = APIRouter()

def save_snapshot(image, student_id, passed):
    """Saves a snapshot of the verification attempt."""
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        status = "PASS" if passed else "FAIL"
        filename = f"{status}_{student_id}_{timestamp}.jpg"
        
        # Create directory securely
        save_dir = os.path.join("data", "snapshots", datetime.now().strftime("%Y-%m-%d"))
        os.makedirs(save_dir, exist_ok=True)
        
        path = os.path.join(save_dir, filename)
        cv2.imwrite(path, image)
        return path
    except Exception as e:
        print(f"Failed to save snapshot: {e}")
        return None

def valid_json(obj):
    """Recursively convert numpy types to native Python types for JSON serialization."""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: valid_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [valid_json(v) for v in obj]
    return obj

@router.post("/face", response_model=dict)
def verify_face(request: FaceVerificationRequest, db: Session = Depends(get_db)):
    try:
        # 1. Run Liveness Check on the video buffer (30 frames)
        # This prevents spoofing attacks using photos/screens
        liveness_result = liveness_service.full_liveness_check(request.video_frames)
        
        # Prepare Attempt Log
        attempt = VerificationAttempt(
            liveness_score=liveness_result["liveness_score"],
            passed=False
        )
        db.add(attempt) # Add to session to get ID, but don't commit yet

        # Check Liveness Threshold
        if liveness_result["liveness_score"] < settings.LIVENESS_THRESHOLD:
            attempt.failure_reason = "Liveness Check Failed"
            attempt.passed = False
            
            # Save snapshot of best frame if available
            if liveness_result["best_frame_image"] is not None:
                 attempt.snapshot_path = save_snapshot(liveness_result["best_frame_image"], "unknown", False)
            
            db.commit()
            return valid_json({
                "success": False, 
                "message": "Liveness check failed. Please blink and move your head naturally.",
                "liveness_score": liveness_result["liveness_score"]
            })

        # 2. Perform Face Recognition on Best Frame
        best_frame = liveness_result["best_frame_image"]
        if best_frame is None:
             attempt.failure_reason = "No valid frame for recognition"
             db.commit()
             return {"success": False, "message": "Could not extract valid frame."}

        student_id, confidence, bbox = recognizer.verify_face(best_frame)
        
        attempt.student_id = student_id if student_id else "Unknown"
        attempt.confidence = float(confidence)
        
        # Check Confidence Threshold
        if confidence < settings.FACE_CONFIDENCE_THRESHOLD:
            attempt.failure_reason = f"Low Confidence ({confidence:.2f})"
            attempt.passed = False
            attempt.snapshot_path = save_snapshot(best_frame, "unknown", False)
            db.commit()
            return valid_json({
                "success": False,
                "message": f"Face not recognized (Confidence: {confidence:.2f}).",
                "confidence": confidence,
                "student_id": "Unknown"
            })

        # 3. Success - Log Attendance (class-aware)
        attempt.passed = True
        attempt.snapshot_path = save_snapshot(best_frame, student_id, True)
        
        # Fetch student details
        student = db.query(Student).filter(Student.id == student_id).first()
        student_name = student.name if student else "Unknown"

        # 4. Timetable lookup — find current class + today's schedule
        current_class = None
        next_class_info = None
        today_schedule = []
        
        if student and student.branch and student.student_class:
            try:
                from app.models.timetable import Timetable
                from app.utils.timetable_parser import (
                    get_current_class as _get_current,
                    get_next_class as _get_next,
                    get_todays_schedule as _get_todays,
                    count_total_classes as _count_total
                )
                
                tt = db.query(Timetable).filter(
                    Timetable.branch == student.branch.upper(),
                    Timetable.student_class == student.student_class.upper(),
                    Timetable.notifications_enabled == True
                ).first()
                
                if tt and tt.schedule_data:
                    now = datetime.now()
                    current_class = _get_current(tt.schedule_data, now)
                    next_class_info = _get_next(tt.schedule_data, now)
                    
                    # Get today's full schedule
                    todays_classes = _get_todays(tt.schedule_data, now)
                    
                    # Check which classes already have attendance today
                    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                    todays_logs = db.query(Attendance).filter(
                        Attendance.student_id == student_id,
                        Attendance.timestamp >= today_start,
                        Attendance.time_slot.isnot(None)
                    ).all()
                    attended_slots = {log.time_slot for log in todays_logs}
                    
                    current_minutes = now.hour * 60 + now.minute
                    
                    for cls in todays_classes:
                        if cls["time_slot"] in attended_slots:
                            status = "attended"
                        elif cls["start_minutes"] <= current_minutes < cls["end_minutes"]:
                            status = "current"
                        elif cls["start_minutes"] > current_minutes:
                            status = "upcoming"
                        else:
                            status = "missed"
                        
                        today_schedule.append({
                            "time_slot": cls["time_slot"],
                            "subject": cls["subject"],
                            "status": status
                        })
            except Exception as e:
                print(f"Timetable lookup error: {e}")

        # 5. Log Attendance — ONLY during scheduled class time
        subject_for_log = current_class["subject"] if current_class else None
        time_slot_for_log = current_class["time_slot"] if current_class else None
        
        should_log = True
        no_class_message = None
        
        if time_slot_for_log:
            # There IS a class right now — check if already logged for THIS class period today
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            existing = db.query(Attendance).filter(
                Attendance.student_id == student_id,
                Attendance.time_slot == time_slot_for_log,
                Attendance.timestamp >= today_start
            ).first()
            if existing:
                should_log = False
                no_class_message = f"Already marked for {subject_for_log} ({time_slot_for_log})"
        else:
            # No class running right now — DO NOT log attendance
            should_log = False
            no_class_message = "No class is scheduled at this time. Attendance can only be marked during your class hours."
        
        if should_log:
            log = Attendance(
                student_id=student_id,
                confidence=float(confidence),
                liveness_passed=True,
                subject=subject_for_log,
                time_slot=time_slot_for_log
            )
            db.add(log)
            # Update today_schedule to mark this class as attended
            for entry in today_schedule:
                if entry["time_slot"] == time_slot_for_log and entry["status"] == "current":
                    entry["status"] = "attended"
        
        db.commit()
        
        # 6. Calculate attendance percentage
        attendance_percentage = None
        total_classes = 0
        attended_classes = 0
        
        if student and student.branch and student.student_class:
            try:
                from app.models.timetable import Timetable as TT2
                from app.utils.timetable_parser import count_total_classes as _count_total
                
                tt_for_pct = db.query(TT2).filter(
                    TT2.branch == student.branch.upper(),
                    TT2.student_class == student.student_class.upper()
                ).first()
                
                if tt_for_pct and tt_for_pct.schedule_data and tt_for_pct.start_date:
                    from datetime import date as _date
                    total_classes = _count_total(tt_for_pct.schedule_data, tt_for_pct.start_date, _date.today())
                    
                    # Count student's attended classes (with time_slot) since start_date
                    sd = datetime.combine(tt_for_pct.start_date, datetime.min.time())
                    attended_classes = db.query(Attendance).filter(
                        Attendance.student_id == student_id,
                        Attendance.timestamp >= sd,
                        Attendance.time_slot.isnot(None)
                    ).count()
                    
                    if total_classes > 0:
                        attendance_percentage = round((attended_classes / total_classes) * 100, 1)
            except Exception as e:
                print(f"Attendance percentage error: {e}")
        
        # 7. Send SMS notification (after-class)
        if should_log and student and student.phone_number and attendance_percentage is not None:
            try:
                from app.utils.sms_service import send_after_class_update, calculate_shortage
                shortage = calculate_shortage(attended_classes, total_classes)
                send_after_class_update(
                    student.phone_number,
                    student_name,
                    subject_for_log or "Class",
                    attendance_percentage,
                    shortage["classes_needed"]
                )
            except Exception as e:
                print(f"SMS send error: {e}")
        
        # Build response
        response = {
            "success": True,
            "student_id": student_id,
            "name": student_name,
            "branch": student.branch if student else None,
            "student_class": student.student_class if student else None,
            "confidence": confidence,
            "liveness_score": liveness_result["liveness_score"],
            "attendance_logged": should_log,
            "subject": subject_for_log,
            "time_slot": time_slot_for_log,
            "today_schedule": today_schedule,
            "attendance_percentage": attendance_percentage,
            "total_classes": total_classes,
            "attended_classes": attended_classes,
        }
        
        if no_class_message:
            response["no_class_message"] = no_class_message
        
        if next_class_info:
            response["next_subject"] = next_class_info["subject"]
            response["next_time_slot"] = next_class_info["time_slot"]
            response["next_in_minutes"] = next_class_info["minutes_until"]
        
        return valid_json(response)
    except Exception as e:
        import traceback
        try:
             with open("backend_error.log", "a") as f:
                f.write(f"[{datetime.now()}] Error in verify_face:\n")
                traceback.print_exc(file=f)
        except:
             pass
        print(f"Server Error: {e}")
        traceback.print_exc()
        # Return a clean error instead of 500 so frontend handles it gracefully
        return {
            "success": False,
            "message": f"Server Error: {str(e)}",
            "liveness_score": 0.0,
             "confidence": 0.0
        }

@router.post("/liveness-check")
def check_liveness(request: LivenessCheckRequest):
    result = liveness_service.check_liveness(request.frames, request.challenge_type)
    return result
