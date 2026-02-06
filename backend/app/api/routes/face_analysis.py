"""Face analysis endpoint using DeepFace and MediaPipe."""

import base64
import io
import math
import tempfile
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from fastapi import APIRouter, HTTPException, status

from app.core.logging import get_logger
from app.schemas.face_analysis import (
    FaceAnalysisRequest,
    FaceAnalysisResponse,
    EmotionScores,
    FaceRegion,
    TensionAnalysis,
    ImageQuality,
    HeadPose,
)

logger = get_logger(__name__)
router = APIRouter()

# MediaPipe Face Mesh instance (lazy loaded)
_face_mesh = None


def get_face_mesh():
    """Get or create MediaPipe Face Mesh instance."""
    global _face_mesh
    if _face_mesh is None:
        import mediapipe as mp
        _face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
        )
    return _face_mesh


def estimate_head_pose(image_bytes: bytes) -> dict | None:
    """Estimate head pose using MediaPipe Face Mesh.

    Uses facial landmarks to calculate:
    - Yaw: Left/right rotation (-90 to +90 degrees)
    - Pitch: Up/down rotation (-90 to +90 degrees)
    - Roll: Head tilt (-90 to +90 degrees)

    Args:
        image_bytes: Raw image bytes

    Returns:
        Dictionary with head pose data or None if face not detected
    """
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            return None

        # Convert BGR to RGB for MediaPipe
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        h, w, _ = image.shape

        # Get face mesh
        face_mesh = get_face_mesh()
        results = face_mesh.process(rgb_image)

        if not results.multi_face_landmarks:
            return None

        face_landmarks = results.multi_face_landmarks[0]

        # Key landmark indices for head pose estimation
        # Nose tip: 1
        # Chin: 152
        # Left eye outer corner: 33
        # Right eye outer corner: 263
        # Left mouth corner: 61
        # Right mouth corner: 291

        # 3D model points (generic face model)
        model_points = np.array([
            (0.0, 0.0, 0.0),          # Nose tip
            (0.0, -330.0, -65.0),     # Chin
            (-225.0, 170.0, -135.0),  # Left eye outer corner
            (225.0, 170.0, -135.0),   # Right eye outer corner
            (-150.0, -150.0, -125.0), # Left mouth corner
            (150.0, -150.0, -125.0),  # Right mouth corner
        ], dtype=np.float64)

        # 2D image points from landmarks
        landmark_indices = [1, 152, 33, 263, 61, 291]
        image_points = np.array([
            (face_landmarks.landmark[idx].x * w, face_landmarks.landmark[idx].y * h)
            for idx in landmark_indices
        ], dtype=np.float64)

        # Camera matrix (approximation)
        focal_length = w
        center = (w / 2, h / 2)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype=np.float64)

        # Distortion coefficients (assuming no distortion)
        dist_coeffs = np.zeros((4, 1))

        # Solve PnP to get rotation and translation vectors
        success, rotation_vector, translation_vector = cv2.solvePnP(
            model_points,
            image_points,
            camera_matrix,
            dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE
        )

        if not success:
            return None

        # Convert rotation vector to rotation matrix
        rotation_matrix, _ = cv2.Rodrigues(rotation_vector)

        # Get Euler angles from rotation matrix
        # Note: OpenCV uses a different convention, so we need to extract angles carefully
        sy = math.sqrt(rotation_matrix[0, 0] ** 2 + rotation_matrix[1, 0] ** 2)
        singular = sy < 1e-6

        if not singular:
            pitch = math.atan2(-rotation_matrix[2, 0], sy)
            yaw = math.atan2(rotation_matrix[1, 0], rotation_matrix[0, 0])
            roll = math.atan2(rotation_matrix[2, 1], rotation_matrix[2, 2])
        else:
            pitch = math.atan2(-rotation_matrix[2, 0], sy)
            yaw = 0
            roll = math.atan2(-rotation_matrix[1, 2], rotation_matrix[1, 1])

        # Convert to degrees
        yaw_deg = math.degrees(yaw)
        pitch_deg = math.degrees(pitch)
        roll_deg = math.degrees(roll)

        # Determine face direction and if looking at camera
        # Thresholds for "looking at camera"
        YAW_THRESHOLD = 15  # degrees
        PITCH_THRESHOLD = 15  # degrees

        is_looking_at_camera = abs(yaw_deg) < YAW_THRESHOLD and abs(pitch_deg) < PITCH_THRESHOLD

        # Determine face direction
        if abs(yaw_deg) < YAW_THRESHOLD and abs(pitch_deg) < PITCH_THRESHOLD:
            face_direction = "center"
        elif yaw_deg < -YAW_THRESHOLD:
            face_direction = "left"
        elif yaw_deg > YAW_THRESHOLD:
            face_direction = "right"
        elif pitch_deg < -PITCH_THRESHOLD:
            face_direction = "down"
        elif pitch_deg > PITCH_THRESHOLD:
            face_direction = "up"
        else:
            face_direction = "away"

        # Generate feedback message
        if is_looking_at_camera:
            feedback_message = "カメラをしっかり見ていますね"
        elif face_direction == "left":
            feedback_message = "少し左を向いています。カメラを見てください"
        elif face_direction == "right":
            feedback_message = "少し右を向いています。カメラを見てください"
        elif face_direction == "up":
            feedback_message = "少し上を向いています。カメラを見てください"
        elif face_direction == "down":
            feedback_message = "少し下を向いています。カメラを見てください"
        else:
            feedback_message = "カメラの方を向いてください"

        return {
            "yaw": round(yaw_deg, 1),
            "pitch": round(pitch_deg, 1),
            "roll": round(roll_deg, 1),
            "is_looking_at_camera": is_looking_at_camera,
            "face_direction": face_direction,
            "feedback_message": feedback_message,
        }

    except Exception as e:
        logger.warning("Head pose estimation failed", error=str(e))
        return None


def analyze_image_brightness(image_bytes: bytes) -> dict:
    """Analyze the brightness of an image.

    Args:
        image_bytes: Raw image bytes

    Returns:
        Dictionary with brightness analysis results:
        - average_brightness: 0-255 (0=black, 255=white)
        - is_too_dark: True if image is too dark for reliable face detection
        - is_too_bright: True if image is overexposed
        - brightness_status: "ok", "too_dark", "too_bright"
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        # Convert to grayscale
        grayscale = image.convert("L")
        # Calculate average brightness
        np_image = np.array(grayscale)
        average_brightness = np.mean(np_image)

        # Thresholds for lighting quality
        DARK_THRESHOLD = 50  # Below this is too dark
        BRIGHT_THRESHOLD = 220  # Above this is too bright

        is_too_dark = average_brightness < DARK_THRESHOLD
        is_too_bright = average_brightness > BRIGHT_THRESHOLD

        if is_too_dark:
            brightness_status = "too_dark"
        elif is_too_bright:
            brightness_status = "too_bright"
        else:
            brightness_status = "ok"

        return {
            "average_brightness": float(average_brightness),
            "is_too_dark": is_too_dark,
            "is_too_bright": is_too_bright,
            "brightness_status": brightness_status,
        }
    except Exception as e:
        logger.warning("Failed to analyze image brightness", error=str(e))
        return {
            "average_brightness": 128.0,
            "is_too_dark": False,
            "is_too_bright": False,
            "brightness_status": "unknown",
        }


def calculate_tension_analysis(emotions: dict[str, float]) -> TensionAnalysis:
    """Calculate tension and relaxation levels from emotion scores.

    Args:
        emotions: Dictionary of emotion scores (0-100)

    Returns:
        TensionAnalysis with calculated levels and feedback
    """
    # Normalize scores to 0-1 range
    fear = emotions.get("fear", 0) / 100
    neutral = emotions.get("neutral", 0) / 100
    happy = emotions.get("happy", 0) / 100
    angry = emotions.get("angry", 0) / 100
    sad = emotions.get("sad", 0) / 100

    # Calculate tension level
    # High fear, anger, or sadness indicates tension
    # Low neutral indicates tension
    tension_level = min(1.0, fear * 1.5 + angry * 0.8 + sad * 0.5 + (1 - neutral) * 0.3)

    # Calculate relax level
    # High neutral or happy indicates relaxation
    relax_level = min(1.0, neutral * 0.7 + happy * 0.3)

    # Ensure they're complementary but allow some overlap
    tension_level = max(0, min(1, tension_level))
    relax_level = max(0, min(1, relax_level))

    # Find dominant emotion
    dominant_emotion = max(emotions.items(), key=lambda x: x[1])[0]

    # Generate feedback message
    feedback_message: str
    feedback_type: str

    if tension_level > 0.6:
        feedback_message = "緊張しているようです。深呼吸してリラックスしてみましょう"
        feedback_type = "negative"
    elif tension_level > 0.4:
        feedback_message = "少し緊張気味です。肩の力を抜いてみてください"
        feedback_type = "neutral"
    elif relax_level > 0.7:
        feedback_message = "リラックスして話せていますね"
        feedback_type = "positive"
    elif relax_level > 0.5:
        feedback_message = "落ち着いて話せています"
        feedback_type = "positive"
    else:
        feedback_message = "自然体で大丈夫ですよ"
        feedback_type = "neutral"

    return TensionAnalysis(
        tension_level=round(tension_level, 3),
        relax_level=round(relax_level, 3),
        dominant_emotion=dominant_emotion,
        feedback_message=feedback_message,
        feedback_type=feedback_type,
    )


@router.post("/analyze", response_model=FaceAnalysisResponse)
async def analyze_face(request: FaceAnalysisRequest) -> FaceAnalysisResponse:
    """Analyze face emotions from an image.

    Args:
        request: FaceAnalysisRequest with base64-encoded image

    Returns:
        FaceAnalysisResponse with emotion analysis results
    """
    try:
        # Decode base64 image
        try:
            # Remove data URL prefix if present
            image_data = request.image_base64
            if "," in image_data:
                image_data = image_data.split(",")[1]
            image_bytes = base64.b64decode(image_data)
        except Exception as e:
            logger.warning("Invalid base64 image data", error=str(e))
            return FaceAnalysisResponse(
                success=False,
                face_detected=False,
                error_message="画像データの形式が不正です",
            )

        # Analyze image brightness
        brightness_info = analyze_image_brightness(image_bytes)
        image_quality = ImageQuality(
            average_brightness=brightness_info["average_brightness"],
            brightness_status=brightness_info["brightness_status"],
            is_too_dark=brightness_info["is_too_dark"],
            is_too_bright=brightness_info["is_too_bright"],
        )

        logger.info(
            "Image brightness analyzed",
            average_brightness=brightness_info["average_brightness"],
            status=brightness_info["brightness_status"],
        )

        # Import DeepFace here to avoid startup delay
        from deepface import DeepFace

        # Save to temporary file for DeepFace (it works better with file paths)
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_file:
            tmp_file.write(image_bytes)
            tmp_path = tmp_file.name

        try:
            # Analyze face with DeepFace
            results = DeepFace.analyze(
                img_path=tmp_path,
                actions=["emotion"],
                enforce_detection=False,
                detector_backend="opencv",
            )

            # DeepFace returns a list of results (one per detected face)
            if not results:
                # Provide specific error message based on lighting
                if brightness_info["is_too_dark"]:
                    error_msg = "照明が暗すぎて顔を検出できません。明るい場所に移動してください"
                elif brightness_info["is_too_bright"]:
                    error_msg = "照明が明るすぎて顔を検出できません。逆光を避けてください"
                else:
                    error_msg = "顔が検出されませんでした。カメラに顔が映っているか確認してください"

                return FaceAnalysisResponse(
                    success=True,
                    face_detected=False,
                    image_quality=image_quality,
                    error_message=error_msg,
                )

            # Use the first detected face
            result = results[0] if isinstance(results, list) else results

            # Check if face region is valid (DeepFace may return empty region)
            region = result.get("region", {})
            if region.get("w", 0) == 0 or region.get("h", 0) == 0:
                # Face not actually detected
                if brightness_info["is_too_dark"]:
                    error_msg = "照明が暗すぎて顔を認識できません。明るい場所で試してください"
                elif brightness_info["is_too_bright"]:
                    error_msg = "照明が明るすぎます。逆光を避けてください"
                else:
                    error_msg = "顔が検出されませんでした"

                return FaceAnalysisResponse(
                    success=True,
                    face_detected=False,
                    image_quality=image_quality,
                    error_message=error_msg,
                )

            face_region = FaceRegion(
                x=region.get("x", 0),
                y=region.get("y", 0),
                w=region.get("w", 0),
                h=region.get("h", 0),
            )

            # Extract emotions
            emotion_data = result.get("emotion", {})
            emotions = EmotionScores(
                angry=emotion_data.get("angry", 0),
                disgust=emotion_data.get("disgust", 0),
                fear=emotion_data.get("fear", 0),
                happy=emotion_data.get("happy", 0),
                sad=emotion_data.get("sad", 0),
                surprise=emotion_data.get("surprise", 0),
                neutral=emotion_data.get("neutral", 0),
            )

            # Calculate tension analysis
            tension = calculate_tension_analysis(emotion_data)

            # Estimate head pose using MediaPipe
            head_pose_data = estimate_head_pose(image_bytes)
            head_pose = None
            if head_pose_data:
                head_pose = HeadPose(
                    yaw=head_pose_data["yaw"],
                    pitch=head_pose_data["pitch"],
                    roll=head_pose_data["roll"],
                    is_looking_at_camera=head_pose_data["is_looking_at_camera"],
                    face_direction=head_pose_data["face_direction"],
                    feedback_message=head_pose_data["feedback_message"],
                )
                logger.info(
                    "Head pose estimated",
                    yaw=head_pose_data["yaw"],
                    pitch=head_pose_data["pitch"],
                    face_direction=head_pose_data["face_direction"],
                    is_looking_at_camera=head_pose_data["is_looking_at_camera"],
                )

            logger.info(
                "Face analysis completed",
                dominant_emotion=tension.dominant_emotion,
                tension_level=tension.tension_level,
                relax_level=tension.relax_level,
            )

            return FaceAnalysisResponse(
                success=True,
                face_detected=True,
                face_region=face_region,
                emotions=emotions,
                tension=tension,
                image_quality=image_quality,
                head_pose=head_pose,
            )

        finally:
            # Clean up temporary file
            Path(tmp_path).unlink(missing_ok=True)

    except Exception as e:
        logger.exception("Face analysis failed", error=str(e))
        return FaceAnalysisResponse(
            success=False,
            face_detected=False,
            error_message=f"分析中にエラーが発生しました: {str(e)}",
        )
