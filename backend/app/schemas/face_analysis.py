"""Face analysis schemas for DeepFace integration."""

from pydantic import BaseModel, Field


class EmotionScores(BaseModel):
    """Emotion scores from face analysis."""

    angry: float = Field(ge=0, le=100, description="怒りのスコア (0-100)")
    disgust: float = Field(ge=0, le=100, description="嫌悪のスコア (0-100)")
    fear: float = Field(ge=0, le=100, description="恐怖・不安のスコア (0-100)")
    happy: float = Field(ge=0, le=100, description="喜びのスコア (0-100)")
    sad: float = Field(ge=0, le=100, description="悲しみのスコア (0-100)")
    surprise: float = Field(ge=0, le=100, description="驚きのスコア (0-100)")
    neutral: float = Field(ge=0, le=100, description="平静のスコア (0-100)")


class FaceRegion(BaseModel):
    """Detected face region coordinates."""

    x: int = Field(description="顔領域の左上X座標")
    y: int = Field(description="顔領域の左上Y座標")
    w: int = Field(description="顔領域の幅")
    h: int = Field(description="顔領域の高さ")


class TensionAnalysis(BaseModel):
    """Tension and relaxation analysis result."""

    tension_level: float = Field(
        ge=0, le=1, description="緊張度 (0=リラックス, 1=緊張)"
    )
    relax_level: float = Field(
        ge=0, le=1, description="リラックス度 (0=緊張, 1=リラックス)"
    )
    dominant_emotion: str = Field(description="最も強い感情")
    feedback_message: str = Field(description="ユーザーへのフィードバックメッセージ")
    feedback_type: str = Field(
        description="フィードバックの種類 (positive/neutral/negative)"
    )


class ImageQuality(BaseModel):
    """Image quality analysis for face detection."""

    average_brightness: float = Field(
        ge=0, le=255, description="平均明るさ (0=黒, 255=白)"
    )
    brightness_status: str = Field(
        description="明るさの状態 (ok/too_dark/too_bright/unknown)"
    )
    is_too_dark: bool = Field(description="暗すぎるかどうか")
    is_too_bright: bool = Field(description="明るすぎるかどうか")


class HeadPose(BaseModel):
    """Head pose estimation result."""

    yaw: float = Field(description="左右の向き（度）: 負=左, 0=正面, 正=右")
    pitch: float = Field(description="上下の向き（度）: 負=下, 0=正面, 正=上")
    roll: float = Field(description="首の傾き（度）: 負=左傾き, 0=正面, 正=右傾き")
    is_looking_at_camera: bool = Field(description="カメラを見ているかどうか")
    face_direction: str = Field(
        description="顔の向き (center/left/right/up/down/away)"
    )
    feedback_message: str = Field(description="ユーザーへのフィードバック")


class FaceAnalysisRequest(BaseModel):
    """Face analysis request."""

    image_base64: str = Field(description="Base64エンコードされた画像データ")

    model_config = {
        "json_schema_extra": {
            "example": {"image_base64": "/9j/4AAQSkZJRgABAQEASABIAAD..."}
        }
    }


class FaceAnalysisResponse(BaseModel):
    """Face analysis response."""

    success: bool = Field(description="分析が成功したかどうか")
    face_detected: bool = Field(description="顔が検出されたかどうか")
    face_region: FaceRegion | None = Field(
        default=None, description="検出された顔の領域"
    )
    emotions: EmotionScores | None = Field(default=None, description="感情スコア")
    tension: TensionAnalysis | None = Field(
        default=None, description="緊張度分析結果"
    )
    image_quality: ImageQuality | None = Field(
        default=None, description="画像品質分析結果"
    )
    head_pose: HeadPose | None = Field(
        default=None, description="顔の向き分析結果"
    )
    error_message: str | None = Field(default=None, description="エラーメッセージ")

    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "face_detected": True,
                "face_region": {"x": 100, "y": 50, "w": 200, "h": 200},
                "emotions": {
                    "angry": 0.5,
                    "disgust": 0.1,
                    "fear": 15.3,
                    "happy": 10.2,
                    "sad": 3.1,
                    "surprise": 2.5,
                    "neutral": 68.3,
                },
                "tension": {
                    "tension_level": 0.25,
                    "relax_level": 0.75,
                    "dominant_emotion": "neutral",
                    "feedback_message": "リラックスして話せていますね",
                    "feedback_type": "positive",
                },
                "error_message": None,
            }
        }
    }
