"""Custom exception classes"""
from fastapi import HTTPException, status


class AppException(Exception):
    """Base application exception"""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class ModelNotLoadedException(AppException):
    """Raised when ML model is not loaded"""
    def __init__(self, model_name: str = "ML Model"):
        super().__init__(
            message=f"{model_name} is not loaded. Please wait for initialization.",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class ImageProcessingException(AppException):
    """Raised when image processing fails"""
    def __init__(self, detail: str = "Failed to process image"):
        super().__init__(
            message=detail,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )


class InvalidFileTypeException(AppException):
    """Raised when file type is not allowed"""
    def __init__(self, allowed_types: list):
        super().__init__(
            message=f"Invalid file type. Allowed types: {', '.join(allowed_types)}",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class FileTooLargeException(AppException):
    """Raised when file exceeds size limit"""
    def __init__(self, max_size_mb: int):
        super().__init__(
            message=f"File too large. Maximum size: {max_size_mb}MB",
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        )


class FoodNotFoundException(AppException):
    """Raised when food item is not found"""
    def __init__(self, food_id: str):
        super().__init__(
            message=f"Food with ID '{food_id}' not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class PredictionException(AppException):
    """Raised when prediction fails"""
    def __init__(self, detail: str = "Prediction failed"):
        super().__init__(
            message=detail,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


def raise_http_exception(exc: AppException):
    """Convert AppException to HTTPException"""
    raise HTTPException(
        status_code=exc.status_code,
        detail=exc.message,
    )
