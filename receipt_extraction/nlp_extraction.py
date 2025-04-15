import spacy
import re
from spacy.matcher import Matcher
from datetime import datetime

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    # If model is not installed, suggest installing it
    print("Spacy model 'en_core_web_sm' not found. Please install it using:")
    print("python -m spacy download en_core_web_sm")
    raise

def extract_receipt_entities(text):
    """
    Extract structured information from receipt text
    
    Args:
        text (str): OCR-extracted text from receipt
        
    Returns:
        dict: Structured receipt data with vendor, dates, amounts, and items
    """
    # Initialize return structure
    receipt_data = {
        "vendor": None,
        "store_info": {},
        "dates": [],
        "amounts": [],
        "total": None,
        "subtotal": None,
        "tax": [],
        "payment_method": None,
        "items": []
    }
    
    # Split text into lines and clean them
    lines = [line.strip() for line in text.strip().split('\n') if line.strip()]
    
    # Extract vendor from first few lines (typically logo/header)
    # Look for common store names in the first 5 lines
    common_vendors = ["walmart", "target", "kroger", "costco", "walgreens", "cvs", "safeway", "whole foods"]
    for i, line in enumerate(lines[:5]):
        line_lower = line.lower()
        for vendor in common_vendors:
            if vendor in line_lower:
                receipt_data["vendor"] = line
                break
    
    # If no known vendor found, use the first line as fallback
    if receipt_data["vendor"] is None and lines:
        receipt_data["vendor"] = lines[0]
    
    # Extract store address and phone number
    address_pattern = re.compile(r'\d+\s+[A-Za-z\s]+(ST|STREET|AVE|AVENUE|BLVD|RD|ROAD|DR|DRIVE|LN|LANE)\b', re.IGNORECASE)
    phone_pattern = re.compile(r'(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})')
    
    for line in lines[1:10]:  # Look in first 10 lines
        address_match = address_pattern.search(line)
        phone_match = phone_pattern.search(line)
        
        if address_match and "address" not in receipt_data["store_info"]:
            receipt_data["store_info"]["address"] = line
        
        if phone_match and "phone" not in receipt_data["store_info"]:
            receipt_data["store_info"]["phone"] = phone_match.group(0)
    
    # Extract dates using multiple regex patterns for different formats
    date_patterns = [
        r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',  # MM/DD/YYYY or DD/MM/YYYY
        r'\b\d{2}[/-]\d{2}[/-]\d{2,4}\b',      # MM/DD/YY
        r'\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b' # General pattern with different separators
    ]
    
    for pattern in date_patterns:
        dates = re.findall(pattern, text)
        if dates:
            receipt_data["dates"].extend(dates)
    
    # Extract money amounts
    # Look for dollar amounts with pattern $X.XX or X.XX
    amount_pattern = re.compile(r'(?:\$\s*)?(\d+\.\d{2})')
    amount_matches = amount_pattern.finditer(text)
    
    for match in amount_matches:
        try:
            amount = float(match.group(1))
            receipt_data["amounts"].append(amount)
        except ValueError:
            continue
    
    # Extract subtotal, total and tax information
    subtotal_pattern = re.compile(r'SUBTOTAL\s*(?:\$\s*)?(\d+\.\d{2})', re.IGNORECASE)
    total_pattern = re.compile(r'TOTAL\s*(?:\$\s*)?(\d+\.\d{2})', re.IGNORECASE)
    tax_pattern = re.compile(r'TAX\s*(?:\d+\s*)?(?:\$\s*)?(\d+\.\d{2})|(?:\d+\.\d+)\s*%\s*(\d+\.\d{2})', re.IGNORECASE)
    
    for line in lines:
        subtotal_match = subtotal_pattern.search(line)
        total_match = total_pattern.search(line)
        tax_match = tax_pattern.search(line)
        
        if subtotal_match:
            receipt_data["subtotal"] = float(subtotal_match.group(1))
        
        if total_match:
            receipt_data["total"] = float(total_match.group(1))
        
        if tax_match:
            # Get first non-None group
            tax_amount = next((g for g in tax_match.groups() if g is not None), None)
            if tax_amount:
                receipt_data["tax"].append(float(tax_amount))
    
    # Extract payment method
    payment_methods = ["credit", "debit", "cash", "discover", "visa", "mastercard", "amex", "american express"]
    payment_pattern = re.compile('|'.join(payment_methods), re.IGNORECASE)
    
    for line in lines:
        payment_match = payment_pattern.search(line)
        if payment_match:
            receipt_data["payment_method"] = line
            break
    
    # Extract items with prices (lines containing price patterns)
    # This regex looks for patterns like "ITEM NAME    X.XX X" common in receipts
    item_pattern = re.compile(r'^(.+?)\s+(\d+\.\d{2})\s*([A-Za-z])?$')
    
    # Skip the first few and last few lines which are typically headers and footers
    potential_item_lines = lines[5:-5] if len(lines) > 10 else lines
    
    for line in potential_item_lines:
        item_match = item_pattern.search(line)
        if item_match:
            item_name = item_match.group(1).strip()
            item_price = float(item_match.group(2))
            
            # Skip if this is likely a subtotal/total/tax line
            skip_keywords = ["total", "subtotal", "tax", "change", "cash", "credit", "payment", "amount"]
            if not any(keyword in item_name.lower() for keyword in skip_keywords):
                receipt_data["items"].append({
                    "name": item_name,
                    "price": item_price,
                    "full_text": line
                })
    
    return receipt_data

if __name__ == "__main__":
    # Example usage
    sample_text = """GROCERY STORE
    123 Main St
    Date: 01/15/2023
    
    Milk $3.99
    Bread $2.49
    Eggs $4.29
    
    Total: $10.77
    """
    
    result = extract_receipt_entities(sample_text)
    print("Extracted Receipt Data:")
    for key, value in result.items():
        print(f"{key}: {value}") 