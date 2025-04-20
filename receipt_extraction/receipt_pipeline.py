from ocr_pipeline import extract_text, extract_table_from_image
from nlp_extraction import extract_receipt_entities
import os
import json
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
    logger.info(f"Extracting text from image: {image_path}")
    extracted_text = extract_text(image_path)
    
    # Print the extracted text for debugging
    logger.info("\nExtracted OCR Text:")
    logger.info("-" * 40)
    logger.info(extracted_text)
    logger.info("-" * 40)
    
    # Step 2: Process the text to extract structured data
    logger.info("Extracting structured data from text...")
    receipt_data = extract_receipt_entities(extracted_text)
    
    # Step 3: Extract tabular data if possible
    try:
        logger.info("Attempting to extract tabular data...")
        df = extract_table_from_image(image_path)
        
        # Only use the tabular data if we found items
        if not df.empty:
            logger.info(f"Successfully extracted {len(df)} items in tabular format")
            
            # Convert DataFrame items to our receipt_data format
            receipt_data["items"] = []
            for _, row in df.iterrows():
                receipt_data["items"].append({
                    "name": row["Item"],
                    "price": row["Price ($)"],
                    "full_text": f"{row['Item']} {row['Price ($)']}"
                })
    except Exception as e:
        logger.warning(f"Failed to extract tabular data: {e}")
        # Continue with the regular extraction method, we already have that from Step 2
    
    return receipt_data

def display_receipt_data(result):
    """
    Display the extracted receipt data in a formatted way
    
    Args:
        result (dict): Structured receipt data
    """
    print("\nExtracted Receipt Data:")
    print("=" * 60)
    
    # Display vendor information
    print(f"Vendor: {result['vendor'] or 'Unknown'}")
    
    # Display store information
    if result['store_info']:
        print("\nStore Information:")
        for key, value in result['store_info'].items():
            print(f"  {key.title()}: {value}")
    
    # Display date(s)
    if result['dates']:
        print(f"\nTransaction Date: {result['dates'][0]}")
        if len(result['dates']) > 1:
            print(f"Other Dates: {', '.join(result['dates'][1:])}")
    else:
        print("\nDate: None detected")
    
    # Display payment information
    if result['payment_method']:
        print(f"\nPayment Method: {result['payment_method']}")
    
    # Display items
    if result['items']:
        print("\nItems Purchased:")
        if isinstance(result['items'][0], dict) and 'name' in result['items'][0]:
            # Use tabular format for structured items
            print(f"{'Item':<30} {'Price':>8}")
            print("-" * 40)
            for item in result['items']:
                print(f"{item['name'][:30]:<30} ${item['price']:>7.2f}")
        else:
            # Simple format for unstructured items
            for item in result['items']:
                print(f"  {item}")
    
    # Display tax details
    if result['tax']:
        print("\nTax Details:")
        for i, tax in enumerate(result['tax']):
            print(f"  Tax {i+1}: ${tax:.2f}")
    
    # Display financial details
    print("\nFinancial Summary:")
    if result['subtotal'] is not None:
        print(f"  Subtotal: ${result['subtotal']:.2f}")
    
    if result['total'] is not None:
        print(f"  Total: ${result['total']:.2f}")
    else:
        # If no total was explicitly found, show the largest amount as probable total
        amounts = sorted(result['amounts'], reverse=True)
        if amounts:
            print(f"  Probable Total: ${amounts[0]:.2f}")
    
    print("=" * 60)
    
    # Optionally save to JSON
    # with open(f"{os.path.splitext(os.path.basename(image_path))[0]}_data.json", "w") as f:
    #     json.dump(result, f, indent=2)

if __name__ == "__main__":
    # Example usage with a sample receipt image
    # Replace with the path to an actual receipt image for testing
    sample_image_path = "sample_receipts/receipt1.jpg"
    
    try:
        # Process the receipt
        result = process_receipt(sample_image_path)
        
        # Display the structured data
        display_receipt_data(result)
        
    except FileNotFoundError as e:
        print(f"Error: {e}")
        print("Please provide a valid path to a receipt image file.") 