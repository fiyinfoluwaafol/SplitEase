import cv2
import numpy as np
from PIL import Image
import pytesseract
import os
import platform
from advanced_preprocessor import preprocess_receipt_image

# For Windows users, specify the Tesseract path
if platform.system() == 'Windows':
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_text(image_path, save_debug_images=False):
    """
    Extract text from the image using OCR with improved preprocessing
    
    Args:
        image_path (str): Path to the image file
        save_debug_images (bool): Whether to save debug images during preprocessing
        
    Returns:
        str: Extracted text from the image
    """
    # Use the advanced preprocessing pipeline
    processed_image = preprocess_receipt_image(image_path, save_debug_images)
    
    # Convert the OpenCV image to PIL image for pytesseract
    pil_image = Image.fromarray(processed_image)
    
    # Extract text using pytesseract with improved configuration
    # Optimized configurations for receipt OCR:
    # PSM modes:
    # 3 = Fully automatic page segmentation, but no OSD (default)
    # 4 = Assume a single column of text of variable sizes
    # 6 = Assume a single uniform block of text
    # Try different PSM modes and combine results for better accuracy
    configs = [
        '--psm 4 --oem 3 -c preserve_interword_spaces=1',
        '--psm 6 --oem 3 -c preserve_interword_spaces=1',
        '--psm 3 --oem 3 -c preserve_interword_spaces=1'
    ]
    
    # Try multiple configurations and use the one with most characters extracted
    results = []
    for config in configs:
        text = pytesseract.image_to_string(pil_image, config=config)
        results.append(text)
    
    # Select the result with the most non-whitespace characters
    best_result = max(results, key=lambda x: len(''.join(x.split())))
    
    # Alternatively, use this to combine results using all configurations
    # This sometimes helps catch things one config misses but another catches
    # combined_text = '\n'.join(set([line for result in results for line in result.split('\n') if line.strip()]))
    # return combined_text
    
    return best_result

if __name__ == "__main__":
    # Example usage
    sample_image_path = "sample_receipts/receipt1.png"
    if os.path.exists(sample_image_path):
        # Extract text with debug images saved
        extracted_text = extract_text(sample_image_path, save_debug_images=True)
        print("Extracted Text:")
        print("-" * 40)
        print(extracted_text)
        print("-" * 40)
    else:
        print(f"Sample image not found at {sample_image_path}") 