import cv2
import numpy as np
from PIL import Image
import pytesseract
import os
import platform

# For Windows users, specify the Tesseract path
if platform.system() == 'Windows':
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def preprocess_image(image_path):
    """
    Preprocess the image for better OCR results
    
    Args:
        image_path (str): Path to the image file
        
    Returns:
        numpy.ndarray: Processed image ready for OCR
    """
    # Load the image
    image = cv2.imread(image_path)
    
    # Check if image is loaded properly
    if image is None:
        raise FileNotFoundError(f"Could not load image from {image_path}")
    
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply thresholding to get clear black and white image
    # Adaptive thresholding can be better for receipts with varying illumination
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    
    # Optional: Apply median blur to reduce noise
    processed_image = cv2.medianBlur(thresh, 3)
    
    return processed_image

def extract_text(image_path):
    """
    Extract text from the image using OCR
    
    Args:
        image_path (str): Path to the image file
        
    Returns:
        str: Extracted text from the image
    """
    # Preprocess the image
    processed_image = preprocess_image(image_path)
    
    # Convert the OpenCV image to PIL image for pytesseract
    pil_image = Image.fromarray(processed_image)
    
    # Extract text using pytesseract
    # Additional config options can be added to improve results
    # For receipts, config='--psm 6' can be useful (assumes single uniform block of text)
    text = pytesseract.image_to_string(pil_image, config='--psm 6')
    
    return text

if __name__ == "__main__":
    # Example usage
    sample_image_path = "path/to/sample_receipt.jpg"
    if os.path.exists(sample_image_path):
        extracted_text = extract_text(sample_image_path)
        print("Extracted Text:")
        print(extracted_text)
    else:
        print(f"Sample image not found at {sample_image_path}") 