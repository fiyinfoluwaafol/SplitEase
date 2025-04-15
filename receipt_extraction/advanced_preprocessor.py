"""
Advanced image preprocessing module specifically for receipt images
"""

import cv2
import numpy as np
from PIL import Image
import os
import pytesseract

def detect_orientation(image):
    """
    Detect the orientation of the text in the image
    
    Args:
        image: OpenCV image
    
    Returns:
        rotation_angle: Angle to rotate the image (0, 90, 180, 270)
    """
    # Try all four orientations and see which one produces the most valid text
    orientations = [0, 90, 180, 270]
    max_confidence = -1
    best_orientation = 0
    
    # Make a copy of the image
    img_copy = image.copy()
    
    # Convert to grayscale if needed
    if len(img_copy.shape) == 3:
        gray = cv2.cvtColor(img_copy, cv2.COLOR_BGR2GRAY)
    else:
        gray = img_copy.copy()
    
    for angle in orientations:
        if angle == 0:
            rotated = gray
        else:
            # Rotate the image
            (h, w) = gray.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(gray, M, (w, h))
        
        # Use Tesseract to detect orientation confidence
        try:
            # Check if rotated image has recognizable text
            osd = pytesseract.image_to_osd(rotated, output_type=pytesseract.Output.DICT)
            confidence = float(osd['orientation_conf'])
            
            if confidence > max_confidence:
                max_confidence = confidence
                best_orientation = angle
        except:
            # If OSD fails, try using basic OCR to check if this orientation produces readable text
            try:
                text = pytesseract.image_to_string(rotated, config='--psm 0')
                words = len(text.split())
                if words > max_confidence:  # Use word count as confidence
                    max_confidence = words
                    best_orientation = angle
            except:
                pass
    
    return best_orientation

def deskew_image(image):
    """
    Deskew the image to correct rotations
    
    Args:
        image: OpenCV image
    
    Returns:
        Deskewed image
    """
    # Convert to grayscale if it's not already
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
    
    # Apply threshold to get black and white image
    thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    
    # Find all contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    
    # Find the largest contour which is likely the receipt
    max_area = 0
    max_contour = None
    for contour in contours:
        area = cv2.contourArea(contour)
        if area > max_area:
            max_area = area
            max_contour = contour
    
    if max_contour is not None:
        # Find the minimum area rectangle around the receipt
        rect = cv2.minAreaRect(max_contour)
        angle = rect[2]
        
        # Adjust angle if needed
        if angle < -45:
            angle = angle + 90
        
        # Rotate the image to deskew it
        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        return rotated
    
    return image  # Return original if no deskewing performed

def remove_background(image):
    """
    Remove background and noise from the image
    
    Args:
        image: OpenCV image
    
    Returns:
        Clean image with background removed
    """
    # Convert to grayscale if it's not already
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
    
    # Apply bilateral filter to preserve edges and reduce noise
    blur = cv2.bilateralFilter(gray, 9, 75, 75)
    
    # Apply adaptive thresholding
    thresh = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                 cv2.THRESH_BINARY, 11, 2)
    
    # Invert if needed (black text on white background)
    if np.mean(thresh) > 127:
        thresh = cv2.bitwise_not(thresh)
    
    # Morphological operations to clean up the image
    kernel = np.ones((2, 2), np.uint8)
    clean = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    # Invert back to have black text on white background
    clean = cv2.bitwise_not(clean)
    
    return clean

def enhance_resolution(image, scale=2):
    """
    Enhance resolution of the image using super resolution techniques
    
    Args:
        image: OpenCV image
        scale: Scale factor for resolution enhancement
    
    Returns:
        Higher resolution image
    """
    # Simple scaling using cubic interpolation
    height, width = image.shape[:2]
    new_height, new_width = int(height * scale), int(width * scale)
    
    enhanced = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
    
    return enhanced

def enhance_contrast(image):
    """
    Enhance contrast in the image
    
    Args:
        image: OpenCV image
    
    Returns:
        Contrast enhanced image
    """
    # Convert to grayscale if it's not already
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
    
    # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    
    return enhanced

def correct_orientation(image):
    """
    Correct the orientation of the image
    
    Args:
        image: OpenCV image
    
    Returns:
        Correctly oriented image
    """
    # Detect the orientation
    angle = detect_orientation(image)
    
    # If the image needs rotation
    if angle > 0:
        # Rotate the image
        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        return rotated, angle
    
    # For walmart receipts which are commonly upside down in our tests 
    # Force a 180 rotation if we have text that's likely upside down
    # This is more reliable than the OCR detection for receipts
    # Quick check: if the text at the top is less than the text at the bottom, it might be upside down
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
    
    h, w = gray.shape[:2]
    top_region = gray[0:h//4, :]
    bottom_region = gray[3*h//4:, :]
    
    # Count non-white pixels (text) in top and bottom regions
    top_count = np.sum(top_region < 200)
    bottom_count = np.sum(bottom_region < 200)
    
    # If there's more text at the bottom than the top, it's probably upside down
    if bottom_count > 1.5 * top_count:
        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, 180, 1.0)
        rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        return rotated, 180
    
    return image, 0

def preprocess_receipt_image(image_path, save_debug_images=False):
    """
    Apply advanced preprocessing to a receipt image to improve OCR
    
    Args:
        image_path: Path to the receipt image
        save_debug_images: Whether to save intermediate images for debugging
        
    Returns:
        Preprocessed image ready for OCR
    """
    # Load the image
    original_image = cv2.imread(image_path)
    
    if original_image is None:
        raise FileNotFoundError(f"Could not load image from {image_path}")
    
    # Make a copy for processing
    image = original_image.copy()
    
    # Get base name for debug images
    if save_debug_images:
        base_name = os.path.splitext(os.path.basename(image_path))[0]
        debug_dir = "debug_images"
        os.makedirs(debug_dir, exist_ok=True)
    
    # 1. Resize if the image is too large
    if max(image.shape[0], image.shape[1]) > 2000:
        scale_factor = 2000 / max(image.shape[0], image.shape[1])
        new_size = (int(image.shape[1] * scale_factor), int(image.shape[0] * scale_factor))
        image = cv2.resize(image, new_size, interpolation=cv2.INTER_AREA)
    
    # 2. Correct orientation (detect and fix upside-down images)
    oriented_image, angle = correct_orientation(image)
    if save_debug_images:
        cv2.imwrite(f"{debug_dir}/{base_name}_0_oriented_{angle}.png", oriented_image)
        print(f"Image was rotated {angle} degrees")
    
    # 3. Deskew the image
    deskewed = deskew_image(oriented_image)
    if save_debug_images:
        cv2.imwrite(f"{debug_dir}/{base_name}_1_deskewed.png", deskewed)
    
    # 4. Enhance contrast
    contrasted = enhance_contrast(deskewed)
    if save_debug_images:
        cv2.imwrite(f"{debug_dir}/{base_name}_2_contrasted.png", contrasted)
    
    # 5. Remove background
    clean = remove_background(contrasted)
    if save_debug_images:
        cv2.imwrite(f"{debug_dir}/{base_name}_3_clean.png", clean)
    
    # 6. Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(clean, (3, 3), 0)
    if save_debug_images:
        cv2.imwrite(f"{debug_dir}/{base_name}_4_blurred.png", blurred)
    
    # 7. Apply threshold to make it binary
    _, binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    if save_debug_images:
        cv2.imwrite(f"{debug_dir}/{base_name}_5_binary.png", binary)
    
    # 8. Apply morphological operations to connect broken characters
    kernel = np.ones((1, 1), np.uint8)
    morphed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    if save_debug_images:
        cv2.imwrite(f"{debug_dir}/{base_name}_6_morphed.png", morphed)
    
    # 9. Enhance resolution for better OCR
    enhanced = enhance_resolution(morphed, scale=1.5)
    if save_debug_images:
        cv2.imwrite(f"{debug_dir}/{base_name}_7_enhanced.png", enhanced)
    
    return enhanced

if __name__ == "__main__":
    # Example usage
    image_path = "sample_receipts/receipt1.png"
    if os.path.exists(image_path):
        try:
            processed = preprocess_receipt_image(image_path, save_debug_images=True)
            print(f"Processed image saved to debug_images folder")
        except Exception as e:
            print(f"Error: {e}")
    else:
        print(f"Image not found: {image_path}") 