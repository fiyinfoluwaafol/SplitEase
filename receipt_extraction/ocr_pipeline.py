import cv2
import numpy as np
from PIL import Image
import pytesseract
import os
import platform
import pandas as pd
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# For Windows users, specify the Tesseract path
if platform.system() == 'Windows':
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def preprocess_image(image_path, save_debug=False):
    """
    Preprocess the image for better OCR results
    
    Args:
        image_path (str): Path to the image file
        save_debug (bool): Whether to save debug images
        
    Returns:
        numpy.ndarray: Processed image ready for OCR
    """
    # Load the image
    image = cv2.imread(image_path)
    
    # Check if image is loaded properly
    if image is None:
        raise FileNotFoundError(f"Could not load image from {image_path}")
    
    # Create debug directory if needed
    if save_debug and not os.path.exists('debug_images'):
        os.makedirs('debug_images')
        
    # Save original image for debug
    if save_debug:
        debug_path = os.path.join('debug_images', 'original.jpg')
        cv2.imwrite(debug_path, image)
    
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    if save_debug:
        cv2.imwrite(os.path.join('debug_images', '1_grayscale.jpg'), gray)
    
    # Apply bilateral filter to preserve edges while removing noise
    blur = cv2.bilateralFilter(gray, 9, 75, 75)
    if save_debug:
        cv2.imwrite(os.path.join('debug_images', '2_blur.jpg'), blur)
    
    # Try adaptive thresholding - better for receipts with varying illumination
    thresh = cv2.adaptiveThreshold(
        blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    if save_debug:
        cv2.imwrite(os.path.join('debug_images', '3_threshold.jpg'), thresh)
    
    # Perform morphological operations to clean up the image
    kernel = np.ones((1, 1), np.uint8)
    opening = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    if save_debug:
        cv2.imwrite(os.path.join('debug_images', '4_opening.jpg'), opening)
    
    # Try deskewing the image if it appears to be rotated
    # Simple approximation for deskew - find lines
    edges = cv2.Canny(opening, 50, 150, apertureSize=3)
    if save_debug:
        cv2.imwrite(os.path.join('debug_images', '5_edges.jpg'), edges)
    
    # Apply the final result
    processed_image = opening
    
    return processed_image

def extract_text(image_path, save_debug_images=False):
    """
    Extract text from the image using OCR with improved methods
    
    Args:
        image_path (str): Path to the image file
        save_debug_images (bool): Whether to save debug images
        
    Returns:
        str: Extracted text from the image
    """
    # Preprocess the image
    processed_image = preprocess_image(image_path, save_debug_images)
    
    # Convert the OpenCV image to PIL image for pytesseract
    pil_image = Image.fromarray(processed_image)
    
    # Try multiple OCR configurations for better results
    configs = [
        # Simple default mode
        '--psm 3',
        
        # Assume a single column of text of variable sizes
        '--psm 4 -c preserve_interword_spaces=1',
        
        # Assume a single uniform block of text - good for receipts
        '--psm 6 -c preserve_interword_spaces=1'
    ]
    
    # Try all configs and pick the one with the most text
    best_text = ""
    max_length = 0
    
    for config in configs:
        logger.info(f"Trying OCR with config: {config}")
        text = pytesseract.image_to_string(pil_image, config=config)
        
        # Clean up the text
        cleaned_text = "\n".join([line.strip() for line in text.splitlines() if line.strip()])
        
        # Keep track of the best result based on text length
        if len(cleaned_text) > max_length:
            max_length = len(cleaned_text)
            best_text = cleaned_text
            logger.info(f"Found better result with {len(cleaned_text)} characters")
    
    logger.info(f"Final extracted text has {len(best_text)} characters")
    return best_text

def extract_table_from_image(image_path):
    """
    Extract tabular data from receipt image using Tesseract and pandas
    
    Args:
        image_path (str): Path to the receipt image
        
    Returns:
        pandas.DataFrame: Extracted table data
    """
    # Get raw text from the image
    text = extract_text(image_path)
    
    # Split text into individual lines
    lines = text.splitlines()
    
    # Set up a list to store item data
    items = []

    # Define a regex pattern to capture an item name and a trailing price.
    # This pattern works well for receipt formats that have prices at the end of lines
    import re
    pattern = re.compile(r"^(.*?)\s+(\d+\.\d{2})\s*$")
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        match = pattern.search(line)
        if match:
            item_name = match.group(1).strip()
            try:
                price = float(match.group(2))
                items.append({"Item": item_name, "Price ($)": price})
            except ValueError:
                # In case the conversion fails
                continue
    
    # Create a DataFrame from the extracted items
    df = pd.DataFrame(items)
    return df

if __name__ == "__main__":
    # Example usage
    sample_image_path = "sample_receipts/receipt1.jpg"
    if os.path.exists(sample_image_path):
        # Extract text with debug images saved
        extracted_text = extract_text(sample_image_path, save_debug_images=True)
        print("Extracted Text:")
        print("-" * 40)
        print(extracted_text)
        print("-" * 40)
        
        # Extract tabular data
        try:
            df = extract_table_from_image(sample_image_path)
            print("\nExtracted Tabular Data:")
            print(df)
            
            # Optionally save to CSV
            csv_path = os.path.join('sample_receipts', 'extracted_data.csv')
            df.to_csv(csv_path, index=False)
            print(f"\nSaved tabular data to {csv_path}")
        except Exception as e:
            print(f"Error extracting tabular data: {e}")
            
    else:
        print(f"Sample image not found at {sample_image_path}") 