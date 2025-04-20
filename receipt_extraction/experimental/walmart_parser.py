"""
Specialized parser for Walmart receipts
"""

import re
import os
import cv2
import pytesseract
from PIL import Image
from advanced_preprocessor import preprocess_receipt_image

def extract_walmart_receipt(image_path, save_debug=False):
    """
    Special handler for Walmart receipts that processes the specific format
    
    Args:
        image_path: Path to the Walmart receipt image
        save_debug: Whether to save debug images
        
    Returns:
        dict: Structured receipt data
    """
    # Process the image with our advanced preprocessor
    processed_image = preprocess_receipt_image(image_path, save_debug_images=save_debug)
    
    # Convert to PIL image for Tesseract
    pil_image = Image.fromarray(processed_image)
    
    # First try to detect item list with a walmart-specific configuration
    # Use a config that preserves line and word positions
    hocr_config = r'-c preserve_interword_spaces=1 --oem 3 --psm 6 hocr'
    hocr_data = pytesseract.image_to_pdf_or_hocr(pil_image, extension='hocr', config=hocr_config)
    
    # Standard text extraction with multiple configs for best results
    configs = [
        '--psm 6 --oem 3 -c preserve_interword_spaces=1',
        '--psm 4 --oem 3 -c preserve_interword_spaces=1',
        '--psm 3 --oem 3 -c preserve_interword_spaces=1'
    ]
    
    # Extract text with multiple configurations and select the best one
    results = []
    for config in configs:
        text = pytesseract.image_to_string(pil_image, config=config)
        results.append(text)
    
    # Use the result with the most non-whitespace characters
    best_text = max(results, key=lambda x: len(''.join(x.split())))
    
    # Save the best text for debugging
    if save_debug:
        debug_dir = "debug_images"
        os.makedirs(debug_dir, exist_ok=True)
        with open(f"{debug_dir}/walmart_receipt_text.txt", "w") as f:
            f.write(best_text)
    
    # Initialize the receipt data structure
    receipt_data = {
        "vendor": "Walmart",
        "store_info": {},
        "transaction_info": {},
        "dates": [],
        "payment_info": {},
        "items": [],
        "totals": {}
    }
    
    # Parse the text
    lines = [line.strip() for line in best_text.split('\n') if line.strip()]
    
    # Look for Walmart identifiers
    for i, line in enumerate(lines[:5]):
        if "walmart" in line.lower() or "wal-mart" in line.lower():
            receipt_data["vendor"] = line
            break
    
    # Extract store information
    store_pattern = re.compile(r'(?:ST#|STR#|STORE)\s*(?:#)?\s*(\d+)', re.IGNORECASE)
    phone_pattern = re.compile(r'(?:TEL|PHONE)[:\s]*(\(?\d{3}\)?[-\s.]?\d{3}[-\s.]?\d{4})', re.IGNORECASE)
    address_pattern = re.compile(r'(\d+\s+[A-Za-z\s]+(?:ST|AVE|RD|DR|BLVD|LN)\s+(?:NW|NE|SW|SE)?)', re.IGNORECASE)
    
    for line in lines[:15]:  # Look in first 15 lines for store info
        store_match = store_pattern.search(line)
        phone_match = phone_pattern.search(line)
        address_match = address_pattern.search(line)
        
        if store_match:
            receipt_data["store_info"]["store_number"] = store_match.group(1)
        
        if phone_match:
            receipt_data["store_info"]["phone"] = phone_match.group(1)
            
        if address_match:
            receipt_data["store_info"]["address"] = address_match.group(0)
    
    # Extract city, state, zip
    city_state_zip = re.compile(r'([A-Za-z\s]+),?\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)', re.IGNORECASE)
    for line in lines[:20]:
        csz_match = city_state_zip.search(line)
        if csz_match:
            receipt_data["store_info"]["city"] = csz_match.group(1).strip()
            receipt_data["store_info"]["state"] = csz_match.group(2)
            receipt_data["store_info"]["zip"] = csz_match.group(3)
            break
    
    # Extract manager/cashier name
    manager_pattern = re.compile(r'(?:MGR|MANAGER)[:\s]+(\w+)', re.IGNORECASE)
    for line in lines[:20]:
        manager_match = manager_pattern.search(line)
        if manager_match:
            receipt_data["transaction_info"]["manager"] = manager_match.group(1)
            break
    
    # Parse items section - find start and end indexes
    start_idx = 0
    end_idx = len(lines) - 1
    
    # Find where items begin (after store info)
    for i, line in enumerate(lines):
        if line.lower().startswith("st#") or line.lower().startswith("te#"):
            start_idx = i + 1
            break
    
    # Find where items end (before subtotal)
    for i, line in enumerate(lines[start_idx:], start_idx):
        if "subtotal" in line.lower():
            end_idx = i
            break
    
    # Enhanced Walmart item pattern matching
    # Format is typically: ITEM NAME      BARCODE     PRICE [X/F/O/N]
    # Where X means taxable, F is food stamps eligible, O is non-taxable, N is normal
    # First try with strict pattern
    strict_item_pattern = re.compile(r'^([A-Za-z0-9\s\-\/\.]+)\s+(\d{10,14})\s+(\d+\.\d{2})\s+([XFON])$')
    
    # Fallback pattern for less structured items
    fallback_item_pattern = re.compile(r'^(.+?)(?:\s{2,})(\d+\.\d{2})\s+([XFON])$')
    
    for line in lines[start_idx:end_idx]:
        item_match = strict_item_pattern.search(line)
        if item_match:
            item_name = item_match.group(1).strip()
            item_code = item_match.group(2)
            price = float(item_match.group(3))
            tax_code = item_match.group(4)
            
            receipt_data["items"].append({
                "name": item_name,
                "code": item_code,
                "price": price,
                "taxable": tax_code == 'X',
                "food_stamps_eligible": tax_code == 'F',
                "full_text": line
            })
        else:
            # Try fallback pattern
            fallback_match = fallback_item_pattern.search(line)
            if fallback_match:
                item_name = fallback_match.group(1).strip()
                price = float(fallback_match.group(2))
                tax_code = fallback_match.group(3)
                
                # Skip if it's a header or total line
                skip_keywords = ["subtotal", "total", "tax", "balance", "change"]
                if not any(keyword in item_name.lower() for keyword in skip_keywords):
                    receipt_data["items"].append({
                        "name": item_name,
                        "price": price,
                        "taxable": tax_code == 'X',
                        "food_stamps_eligible": tax_code == 'F',
                        "full_text": line
                    })
    
    # Extract financial information
    subtotal_pattern = re.compile(r'SUBTOTAL\s*(\d+\.\d{2})', re.IGNORECASE)
    tax_pattern = re.compile(r'TAX\s*(?:\d+)?\s*(?:\d+\.\d+)?\s*%?\s*(\d+\.\d{2})', re.IGNORECASE)
    total_pattern = re.compile(r'TOTAL\s*(\d+\.\d{2})', re.IGNORECASE)
    
    for line in lines[end_idx:]:
        subtotal_match = subtotal_pattern.search(line)
        tax_match = tax_pattern.search(line)
        total_match = total_pattern.search(line)
        
        if subtotal_match:
            receipt_data["totals"]["subtotal"] = float(subtotal_match.group(1))
        
        if tax_match:
            if "tax" not in receipt_data["totals"]:
                receipt_data["totals"]["tax"] = []
            receipt_data["totals"]["tax"].append(float(tax_match.group(1)))
        
        if total_match:
            receipt_data["totals"]["total"] = float(total_match.group(1))
    
    # Extract payment information
    payment_pattern = re.compile(r'(CASH|DEBIT|CREDIT|DISCOVER|VISA|MASTERCARD|AMEX)\s+(?:TEND|AMOUNT|TOTAL)?\s*(\d+\.\d{2})', re.IGNORECASE)
    
    for line in lines[end_idx:]:
        payment_match = payment_pattern.search(line)
        if payment_match:
            receipt_data["payment_info"]["method"] = payment_match.group(1)
            receipt_data["payment_info"]["amount"] = float(payment_match.group(2))
            break
    
    # Extract date
    date_pattern = re.compile(r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', re.IGNORECASE)
    
    for line in lines:
        date_match = date_pattern.search(line)
        if date_match:
            receipt_data["dates"].append(date_match.group(1))
    
    # If we didn't find any items or important details, it's likely the OCR failed
    if not receipt_data["items"] and not receipt_data["totals"]:
        print("Warning: OCR may have failed. No items or totals found.")
    
    return receipt_data

def parse_walmart_receipt(image_path):
    """
    Main entry point for parsing a Walmart receipt
    
    Args:
        image_path: Path to the Walmart receipt image
        
    Returns:
        dict: Structured receipt data
    """
    try:
        return extract_walmart_receipt(image_path, save_debug=True)
    except Exception as e:
        print(f"Error parsing Walmart receipt: {e}")
        # Return a basic structure even if parsing fails
        return {
            "vendor": "Walmart",
            "store_info": {},
            "transaction_info": {},
            "dates": [],
            "payment_info": {},
            "items": [],
            "totals": {},
            "error": str(e)
        }

if __name__ == "__main__":
    # Test with sample receipt
    receipt_path = "sample_receipts/receipt1.png"
    if os.path.exists(receipt_path):
        result = parse_walmart_receipt(receipt_path)
        
        # Print formatted output
        print("\nWalmart Receipt Parser Output:")
        print("=" * 60)
        
        print(f"Vendor: {result['vendor']}")
        
        if result['store_info']:
            print("\nStore Information:")
            for key, value in result['store_info'].items():
                print(f"  {key.title()}: {value}")
        
        if result['dates']:
            print(f"\nTransaction Date: {result['dates'][0]}")
        
        if result['items']:
            print("\nItems Purchased:")
            print(f"{'Item':<30} {'Price':>8} {'Taxable':>8}")
            print("-" * 48)
            for item in result['items']:
                taxable = "Yes" if item.get('taxable', False) else "No"
                print(f"{item['name'][:30]:<30} ${item['price']:>7.2f} {taxable:>8}")
        
        if result['totals']:
            print("\nFinancial Summary:")
            if 'subtotal' in result['totals']:
                print(f"  Subtotal: ${result['totals']['subtotal']:.2f}")
            
            if 'tax' in result['totals']:
                for i, tax in enumerate(result['totals']['tax']):
                    print(f"  Tax {i+1}: ${tax:.2f}")
            
            if 'total' in result['totals']:
                print(f"  Total: ${result['totals']['total']:.2f}")
        
        if result['payment_info']:
            print("\nPayment Information:")
            for key, value in result['payment_info'].items():
                if isinstance(value, float):
                    print(f"  {key.title()}: ${value:.2f}")
                else:
                    print(f"  {key.title()}: {value}")
        
        print("=" * 60)
    else:
        print(f"Receipt image not found at {receipt_path}") 