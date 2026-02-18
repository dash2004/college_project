# 🏗️ Smart Attendance System — Architecture Diagram

## High-Level System Architecture

```mermaid
graph TB
    subgraph CLIENT["🖥️ Frontend — React + Vite"]
        direction TB
        APP["App.jsx<br/>Router & Layout"]
        
        subgraph PAGES["Pages"]
            DASH["📊 Dashboard"]
            REG["📝 Registration"]
            LIVE["📸 Live Verification"]
            ATT["📋 Attendance Reports"]
        end
        
        subgraph FE_COMP["Components"]
            SIDEBAR["Sidebar"]
            STATS["StatsCard"]
        end
        
        subgraph FE_SERVICES["Services"]
            AXIOS["api.js<br/>Axios HTTP Client"]
        end
        
        APP --> PAGES
        APP --> FE_COMP
        PAGES --> AXIOS
    end

    subgraph SERVER["⚙️ Backend — FastAPI"]
        direction TB
        MAIN["main.py<br/>App Entry Point + CORS"]
        
        subgraph API["API Layer — /api/v1"]
            AUTH_R["🔐 /auth<br/>Login / Register"]
            STU_R["👤 /students<br/>CRUD Operations"]
            VER_R["✅ /verify<br/>Face Verification"]
            ATT_R["📋 /attendance<br/>Records"]
            DASH_R["📊 /dashboard<br/>Stats & Metrics"]
            MOD_R["🧠 /model<br/>Train / Status"]
        end
        
        subgraph CORE["Core Services"]
            CONFIG["config.py<br/>Settings"]
            DB["database.py<br/>SQLAlchemy Engine"]
            SEC["security.py<br/>JWT / Hashing"]
            DEPS["dependencies.py<br/>Auth Dependencies"]
            
            subgraph FR["Face Recognition"]
                FACE_REC["face_recognition.py<br/>FaceRecognizer Class"]
            end
            
            subgraph LIVENESS["Liveness Detection"]
                LV_SVC["service.py<br/>LivenessService"]
                BLINK["blink_detector.py<br/>EAR Algorithm"]
                MOTION["motion_detector.py<br/>Head Pose Estimation"]
            end
        end
        
        subgraph MODELS["Database Models"]
            USER_M["User"]
            STU_M["Student"]
            ATT_M["Attendance"]
        end
        
        subgraph SCHEMAS["Pydantic Schemas"]
            SCH["Request / Response<br/>Validation"]
        end
        
        MAIN --> API
        API --> CORE
        API --> MODELS
        API --> SCHEMAS
        CORE --> MODELS
    end

    subgraph ML["🤖 ML Pipeline"]
        direction TB
        subgraph ML_SCRIPTS["Scripts"]
            COLLECT["collect_faces_with_liveness.py<br/>Face Data Collection"]
            DATA_ACQ["data_acquisition.py<br/>Image Capture"]
            TRAIN["train_model.py<br/>SVM Classifier Training"]
            REALTIME["real_time_recognition.py<br/>Standalone Recognition"]
        end
        
        subgraph ML_MODELS["Trained Models"]
            SVM["svm_face_classifier.pkl<br/>SVM + Label Encoder"]
        end
        
        subgraph ML_LIBS["ML Libraries"]
            FACENET["FaceNet-PyTorch<br/>InceptionResnetV1<br/>512-dim Embeddings"]
            MP["MediaPipe<br/>BlazeFace Detector"]
            MP_LAND["MediaPipe<br/>Face Landmarker"]
        end
        
        COLLECT --> ML_MODELS
        TRAIN --> ML_MODELS
        DATA_ACQ --> COLLECT
    end

    subgraph STORAGE["💾 Data Storage"]
        SQLITE[("SQLite<br/>sql_app.db")]
        FACE_DATA[("Face Images<br/>data/faces/")]
    end

    %% Cross-layer connections
    AXIOS -- "HTTP REST<br/>JSON + JWT" --> MAIN
    FACE_REC --> FACENET
    FACE_REC --> MP
    FACE_REC --> SVM
    LV_SVC --> BLINK
    LV_SVC --> MOTION
    BLINK --> MP_LAND
    MOTION --> MP_LAND
    DB --> SQLITE
    COLLECT --> FACE_DATA
    
    classDef frontend fill:#3b82f6,stroke:#1d4ed8,color:#fff
    classDef backend fill:#10b981,stroke:#059669,color:#fff
    classDef ml fill:#8b5cf6,stroke:#6d28d9,color:#fff
    classDef storage fill:#f59e0b,stroke:#d97706,color:#fff
    
    class CLIENT frontend
    class SERVER backend
    class ML ml
    class STORAGE storage
```

---

## Data Flow — Attendance Verification

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant FE as 🖥️ Frontend
    participant API as ⚙️ FastAPI
    participant LV as 🔍 Liveness Service
    participant FR as 🧠 Face Recognition
    participant DB as 💾 SQLite

    U->>FE: Open Live Verification page
    FE->>FE: Start webcam capture
    
    rect rgb(59, 130, 246, 0.1)
        Note over FE,LV: Liveness Check
        FE->>API: POST /api/v1/verify/liveness (frame)
        API->>LV: Check blink (EAR algorithm)
        API->>LV: Check head motion (pose estimation)
        LV-->>API: Liveness result
        API-->>FE: {is_live: true/false}
    end

    rect rgb(16, 185, 129, 0.1)
        Note over FE,DB: Face Verification
        FE->>API: POST /api/v1/verify (image)
        API->>FR: verify_face(image)
        FR->>FR: Detect face (MediaPipe BlazeFace)
        FR->>FR: Extract embedding (FaceNet 512-d)
        FR->>FR: Classify (SVM predict_proba)
        FR-->>API: (student_id, confidence, bbox)
        API->>DB: Log attendance record
        DB-->>API: Saved
        API-->>FE: Verification result
    end

    FE->>U: Display result & attendance logged
```

---

## ML Pipeline Flow

```mermaid
flowchart LR
    subgraph COLLECT["1. Data Collection"]
        CAM["📷 Webcam"] --> LIVENESS_CHK["Liveness Check<br/>Blink + Head Motion"]
        LIVENESS_CHK --> CROP["Face Cropping<br/>MediaPipe"]
        CROP --> SAVE["Save to<br/>data/faces/{id}/"]
    end

    subgraph TRAIN["2. Model Training"]
        LOAD["Load Face Images"] --> EMBED["FaceNet Embeddings<br/>InceptionResnetV1<br/>512-dim vectors"]
        EMBED --> SVM_TRAIN["Train SVM Classifier"]
        SVM_TRAIN --> PICKLE["Save .pkl Model<br/>+ Label Encoder"]
    end

    subgraph INFER["3. Inference"]
        INPUT["Input Image"] --> DETECT["MediaPipe<br/>Face Detection"]
        DETECT --> FACE_EMBED["FaceNet<br/>Embedding"]
        FACE_EMBED --> SVM_PRED["SVM predict_proba"]
        SVM_PRED --> RESULT["Student ID<br/>+ Confidence"]
    end

    COLLECT --> TRAIN --> INFER

    style COLLECT fill:#e0f2fe,stroke:#0284c7
    style TRAIN fill:#fae8ff,stroke:#a855f7
    style INFER fill:#dcfce7,stroke:#16a34a
```

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, TailwindCSS, React Router, Axios |
| **Backend** | Python, FastAPI, Uvicorn, SQLAlchemy |
| **Database** | SQLite |
| **Face Detection** | MediaPipe BlazeFace (TFLite) |
| **Face Embedding** | FaceNet-PyTorch (InceptionResnetV1, VGGFace2) |
| **Classifier** | scikit-learn SVM (RBF kernel) |
| **Liveness** | MediaPipe Face Landmarker (EAR blink + head pose) |
| **Auth** | JWT Bearer Tokens, bcrypt hashing |

---

## Directory Structure

```
smart-attendance-system/
├── frontend/                      # React + Vite SPA
│   ├── src/
│   │   ├── App.jsx                # Router & layout wrapper
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # Stats overview
│   │   │   ├── Registration.jsx   # Student registration + face capture
│   │   │   ├── LiveVerification.jsx # Live attendance marking
│   │   │   └── Attendance.jsx     # Attendance reports
│   │   ├── components/
│   │   │   ├── Sidebar.jsx        # Navigation sidebar
│   │   │   └── StatsCard.jsx      # Reusable stat display
│   │   ├── layouts/
│   │   │   └── DashboardLayout.jsx
│   │   └── services/
│   │       └── api.js             # Axios instance + JWT interceptor
│   └── package.json
│
├── backend/                       # FastAPI server
│   ├── app/
│   │   ├── main.py                # App entry, CORS, router includes
│   │   ├── api/v1/
│   │   │   ├── auth.py            # Login / register endpoints
│   │   │   ├── students.py        # Student CRUD
│   │   │   ├── verify.py          # Face verification endpoint
│   │   │   ├── attendance.py      # Attendance records API
│   │   │   ├── dashboard.py       # Dashboard stats API
│   │   │   └── model.py           # Model training trigger
│   │   ├── core/
│   │   │   ├── config.py          # App settings
│   │   │   ├── database.py        # SQLAlchemy engine & session
│   │   │   ├── security.py        # JWT creation & password hashing
│   │   │   ├── dependencies.py    # Auth dependency injection
│   │   │   ├── face_recognition.py# FaceRecognizer (detect + embed + classify)
│   │   │   └── liveness/
│   │   │       ├── service.py     # LivenessService orchestrator
│   │   │       ├── blink_detector.py  # Eye Aspect Ratio algorithm
│   │   │       └── motion_detector.py # Head pose estimation
│   │   ├── models/
│   │   │   ├── user.py            # User ORM model
│   │   │   ├── student.py         # Student ORM model
│   │   │   └── attendance.py      # Attendance ORM model
│   │   └── schemas/               # Pydantic request/response schemas
│   ├── sql_app.db                 # SQLite database file
│   └── requirements.txt
│
├── scripts/                       # Standalone ML utilities
│   ├── collect_faces_with_liveness.py
│   ├── data_acquisition.py
│   ├── train_model.py
│   └── real_time_recognition.py
│
├── models/custom/                 # Trained model artifacts
│   └── svm_face_classifier.pkl
│
└── data/faces/                    # Face image dataset
```
