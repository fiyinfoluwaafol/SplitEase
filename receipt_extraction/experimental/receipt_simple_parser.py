"""
Simplified Receipt Parser
This parser implements a simpler approach that combines OCR and item extraction
in a more direct pipeline, similar to the sample code provided.
"""

import pytesseract
from PIL import Image
import re
import pandas as pd
import cv2
import numpy as np
import os

# For Windows, specify the location of the tesseract executable if needed:
# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

def preprocess_receipt_image(image_path, debug=False):
    """
    Preprocessing optimized for receipts
    """
    # Read the image
    image = cv2.imread(image_path)
    
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply thresholding to make text stand out
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Apply unsharp mask to enhance edges
    gaussian = cv2.GaussianBlur(thresh, (5, 5), 0)
    sharpened = cv2.addWeighted(thresh, 1.5, gaussian, -0.5, 0)
    
    # Save debug images if requested
    if debug:
        if not os.path.exists('debug_images'):
            os.makedirs('debug_images')
        
        base_name = os.path.basename(image_path)
        cv2.imwrite(f'debug_images/original_{base_name}', image)
        cv2.imwrite(f'debug_images/gray_{base_name}', gray)
        cv2.imwrite(f'debug_images/thresh_{base_name}', thresh)
        cv2.imwrite(f'debug_images/sharpened_{base_name}', sharpened)
    
    return sharpened

def extract_receipt_data(image_path, debug=False):
    """
    Extract data from a receipt image
    
    Args:
        image_path (str): Path to the receipt image
        debug (bool): Whether to save debug images
        
    Returns:
        tuple: (DataFrame of items, raw text)
    """
    # Preprocess the image
    processed_image = preprocess_receipt_image(image_path, debug)
    
    # Convert to PIL Image for Tesseract
    pil_image = Image.fromarray(processed_image)
    
    # Configure Tesseract settings for better accuracy
    custom_config = r'--oem 3 --psm 6 -c preserve_interword_spaces=1'
    raw_text = pytesseract.image_to_string(pil_image, config=custom_config)
    
    # Split text into individual lines for processing
    lines = raw_text.splitlines()
    
    # Set up a list to store item data
    items = []
    
    # Define a regex pattern to capture an item name and a trailing price.
    # This pattern handles formats like "Item name    12.34" or "Item name 12.34"
    pattern = re.compile(r"^(.*?)\s+(\d+\.\d{2})\s*$")
    
    # Define a regex pattern for detecting vendor (typically at the top of receipt)
    vendor_pattern = re.compile(r"^([A-Z0-9\s]+)$")
    
    # Define a regex pattern for detecting date
    date_pattern = re.compile(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b")
    
    # Placeholder for receipt metadata
    vendor = None
    dates = []
    total = None
    
    # First pass - find vendor and dates
    for i, line in enumerate(lines[:10]):  # Check first 10 lines for vendor and date
        line = line.strip()
        if not line:
            continue
            
        # Find vendor in first all-caps line
        if vendor is None and vendor_pattern.match(line) and len(line) > 3:
            vendor = line
            
        # Find dates
        date_matches = date_pattern.findall(line)
        if date_matches:
            dates.extend(date_matches)
    
    # Second pass - look for items with prices
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Find total
        if "TOTAL" in line.upper() and re.search(r"\d+\.\d{2}", line):
            total_match = re.search(r"(\d+\.\d{2})", line)
            if total_match:
                try:
                    total = float(total_match.group(1))
                except ValueError:
                    pass
            continue
            
        # Find items
        match = pattern.search(line)
        if match:
            item_name = match.group(1).strip()
            
            # Skip if this line contains words that suggest it's not an item
            skip_words = ["total", "subtotal", "tax", "balance", "change", "date", "time"]
            if any(word in item_name.lower() for word in skip_words):
                continue
                
            try:
                price = float(match.group(2))
                items.append({"Item": item_name, "Price ($)": price})
            except ValueError:
                # In case the conversion fails
                continue
    
    # Create a DataFrame from the extracted items
    df = pd.DataFrame(items)
    
    # Add metadata to the DataFrame
    metadata = {
        "vendor": vendor,
        "dates": dates,
        "total": total
    }
    
    return df, raw_text, metadata

if __name__ == "__main__":
    # Replace with your receipt path
    receipt_path = "../sample_receipts/receipt1.jpg"
    
    # Check if file exists
    if not os.path.exists(receipt_path):
        print(f"Error: File not found at {receipt_path}")
    else:
        # Extract data
        try:
            extracted_data, raw_text, metadata = extract_receipt_data(receipt_path, debug=True)
            
            # Print results
            print("=" * 50)
            print("RAW TEXT FROM RECEIPT:")
            print("=" * 50)
            print(raw_text)
            
            print("\n" + "=" * 50)
            print("METADATA:")
            print("=" * 50)
            print(f"Vendor: {metadata['vendor']}")
            print(f"Dates: {metadata['dates']}")
            print(f"Total: ${metadata['total']}" if metadata['total'] else "Total: Not found")
            
            print("\n" + "=" * 50)
            print("EXTRACTED ITEMS:")
            print("=" * 50)
            print(extracted_data)
            
            # Save to CSV
            output_path = "../sample_receipts/simple_parser_output.csv"
            extracted_data.to_csv(output_path, index=False)
            print(f"\nSaved extracted items to {output_path}")
            
        except Exception as e:
            print(f"Error processing receipt: {e}") 