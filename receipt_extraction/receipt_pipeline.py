from ocr_pipeline import extract_text
from nlp_extraction import extract_receipt_entities
import os

def process_receipt(image_path):
    """
    Process a receipt image to extract structured data
    
    Args:
        image_path (str): Path to the receipt image file
        
    Returns:
        dict: Structured receipt data
    """
    # Check if the image file exists
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found: {image_path}")
    
    # Step 1: Extract text from the image using OCR
    print(f"Extracting text from image: {image_path}")
    extracted_text = extract_text(image_path)
    
    # Print the extracted text for debugging
    print("\nExtracted OCR Text:")
    print("-" * 40)
    print(extracted_text)
    print("-" * 40)
    
    # Step 2: Process the text to extract structured data
    print("\nExtracting structured data from text...")
    receipt_data = extract_receipt_entities(extracted_text)
    
    return receipt_data

if __name__ == "__main__":
    # Example usage with a sample receipt image
    # Replace with the path to an actual receipt image for testing
    sample_image_path = "sample_receipts/receipt1.jpg"
    
    try:
        # Process the receipt
        result = process_receipt(sample_image_path)
        
        # Display the structured data
        print("\nExtracted Receipt Data:")
        print("=" * 40)
        print(f"Vendor: {result['vendor']}")
        
        if result['dates']:
            print(f"Date(s): {', '.join(result['dates'])}")
        else:
            print("Date(s): None detected")
        
        print("\nAmounts:")
        for amount in result['amounts']:
            print(f"  ${amount:.2f}" if isinstance(amount, float) else f"  {amount}")
        
        print("\nItems:")
        for item in result['items']:
            print(f"  {item}")
        
        print("=" * 40)
        
    except FileNotFoundError as e:
        print(f"Error: {e}")
        print("Please provide a valid path to a receipt image file.") 