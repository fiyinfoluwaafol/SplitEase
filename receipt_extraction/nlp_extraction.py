import re
from datetime import datetime

# Try to import spaCy, but make it optional
try:
    import spacy
    from spacy.matcher import Matcher
    SPACY_AVAILABLE = True
    # Load spaCy model
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        # If model is not installed, fallback to rules-based extraction
        print("Spacy model 'en_core_web_sm' not found. Using rules-based extraction only.")
        SPACY_AVAILABLE = False
except ImportError:
    print("Spacy not installed. Using rules-based extraction only.")
    SPACY_AVAILABLE = False

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
    
    # Extract items with prices using an improved approach
    receipt_data["items"] = extract_items_with_prices(lines)
    
    return receipt_data

def extract_items_with_prices(lines):
    """
    Enhanced function to extract items and associate them with correct prices
    using multiple approaches for better accuracy.
    
    Args:
        lines (list): List of text lines from the receipt
        
    Returns:
        list: List of item dictionaries with name and price
    """
    items = []
    
    # Skip the first few and last few lines which are typically headers and footers
    potential_item_lines = lines[5:-5] if len(lines) > 10 else lines
    
    # Define multiple regex patterns to handle different receipt formats
    patterns = [
        # Pattern 1: Item name followed by price at the end of line
        # Example: "MILK 2%                 3.99"
        re.compile(r'^(.+?)\s{2,}(\d+\.\d{2})\s*([A-Za-z])?$'),
        
        # Pattern 2: Item with quantity and price
        # Example: "EGGS   2 @ 1.99        3.98"
        re.compile(r'^(.+?)\s+(\d+)\s*@\s*(\d+\.\d{2})\s+(\d+\.\d{2})$'),
        
        # Pattern 3: Item with price at the beginning
        # Example: "$2.99  BREAD"
        re.compile(r'^(?:\$\s*)?(\d+\.\d{2})\s{2,}(.+)$'),
        
        # Pattern 4: Item with quantity indicator
        # Example: "APPLES 2.35 lb   @1.99/lb   4.68"
        re.compile(r'^(.+?)\s+(\d+\.?\d*)\s*(?:lb|kg|oz|g)\s*@\s*(?:\$\s*)?(\d+\.?\d*)/(?:lb|kg|oz|g)\s+(\d+\.\d{2})$'),
        
        # Pattern 5: Line with just a price (likely a multi-line item continuation)
        # Example: "                        10.99"
        re.compile(r'^\s*(?:\$\s*)?(\d+\.\d{2})\s*$')
    ]
    
    # Words that indicate this is not an item line
    skip_keywords = ["total", "subtotal", "tax", "change", "cash", "credit", "payment", "amount",
                    "balance", "due", "paid", "card", "receipt", "store", "date", "time"]
    
    # First pass: Clean and mark potential item lines
    candidate_lines = []
    
    for idx, line in enumerate(potential_item_lines):
        line = line.strip()
        
        # Skip empty or very short lines
        if not line or len(line) < 2:
            continue
            
        # Skip header/footer type lines
        line_lower = line.lower()
        if any(keyword in line_lower for keyword in skip_keywords):
            continue
        
        # Mark line properties for easier processing
        price_match = re.search(r'(?:\$\s*)?(\d+\.\d{2})', line)
        price_only_match = patterns[4].search(line)
        
        line_info = {
            "idx": idx,
            "text": line,
            "has_price": bool(price_match),
            "price_only": bool(price_only_match),
            "price_value": float(price_match.group(1)) if price_match else None
        }
        
        candidate_lines.append(line_info)
    
    # Second pass: Group and process multi-line items
    i = 0
    while i < len(candidate_lines):
        current = candidate_lines[i]
        
        # Look for multi-line items with various patterns
        if i + 1 < len(candidate_lines):
            next_line = candidate_lines[i+1]
            consecutive = next_line["idx"] == current["idx"] + 1
            
            # Pattern A: Current line has no price, next line has only a price
            if consecutive and not current["has_price"] and next_line["price_only"]:
                items.append({
                    "name": current["text"],
                    "price": next_line["price_value"],
                    "full_text": f"{current['text']} {next_line['text']}"
                })
                i += 2
                continue
                
            # Pattern B: Current line has text without price, next line has additional text with price
            if consecutive and not current["has_price"] and next_line["has_price"]:
                # Remove price from next line to get additional description
                next_text = next_line["text"]
                price_str = f"{next_line['price_value']:.2f}"
                next_text = next_text.replace('$' + price_str, '').replace(price_str, '').strip()
                
                # If next line has meaningful text besides the price
                if next_text and len(next_text) > 1:
                    items.append({
                        "name": f"{current['text']} {next_text}",
                        "price": next_line["price_value"],
                        "full_text": f"{current['text']} {next_line['text']}"
                    })
                    i += 2
                    continue
                else:  # Next line has just a price with minimal text
                    items.append({
                        "name": current["text"],
                        "price": next_line["price_value"],
                        "full_text": f"{current['text']} {next_line['text']}"
                    })
                    i += 2
                    continue
            
            # Pattern C: Current line has a complete item with price, skip it for individual processing
        
        # Process single line items
        matched = False
        
        # Skip standalone price-only lines
        if current["price_only"]:
            i += 1
            continue
            
        # Try each standard pattern for single-line items
        for pattern_idx, pattern in enumerate(patterns[:4]):
            match = pattern.search(current["text"])
            if match:
                matched = True
                if pattern_idx == 0:  # Standard item with price at end
                    item_name = match.group(1).strip()
                    item_price = float(match.group(2))
                    items.append({"name": item_name, "price": item_price, "full_text": current["text"]})
                elif pattern_idx == 1:  # Item with quantity
                    item_name = match.group(1).strip()
                    item_price = float(match.group(4))  # Total price
                    items.append({"name": item_name, "price": item_price, "full_text": current["text"]})
                elif pattern_idx == 2:  # Price at beginning
                    item_name = match.group(2).strip()
                    item_price = float(match.group(1))
                    items.append({"name": item_name, "price": item_price, "full_text": current["text"]})
                elif pattern_idx == 3:  # Weight-based item
                    item_name = match.group(1).strip()
                    item_price = float(match.group(4))
                    items.append({"name": item_name, "price": item_price, "full_text": current["text"]})
                break
        
        # Generic fallback for lines with a price that didn't match specific patterns
        if not matched and current["has_price"]:
            # Extract the price and the remaining text
            price_match = re.search(r'(?:\$\s*)?(\d+\.\d{2})', current["text"])
            price_str = price_match.group(1)
            
            try:
                price = float(price_str)
                # Remove the price from the line to get the item name
                item_text = current["text"].replace('$' + price_str, '').replace(price_str, '').strip()
                # Only add if the remaining text isn't too short (avoid fragments)
                if len(item_text) > 2:
                    items.append({"name": item_text, "price": price, "full_text": current["text"]})
            except ValueError:
                pass
                
        i += 1
    
    # Post-processing to unify multi-line items that are part of the same entry
    # This is useful for receipts with blank lines between related items
    processed_items = []
    i = 0
    
    while i < len(items):
        current_item = items[i]
        
        # If this isn't the last item and the next item seems part of a sequence
        if i + 1 < len(items) and similar_item_names(current_item["name"], items[i+1]["name"]):
            combined_item = {
                "name": f"{current_item['name']} {items[i+1]['name']}",
                "price": max(current_item["price"], items[i+1]["price"]),
                "full_text": f"{current_item['full_text']} + {items[i+1]['full_text']}"
            }
            processed_items.append(combined_item)
            i += 2
        else:
            processed_items.append(current_item)
            i += 1
            
    return processed_items

def similar_item_names(name1, name2):
    """
    Check if two item names are likely part of the same item.
    
    Args:
        name1 (str): First item name
        name2 (str): Second item name
        
    Returns:
        bool: True if names are likely related, False otherwise
    """
    # If this is clearly a multi-line item where the first line has no price info
    if "@" in name1 or "@" in name2:
        # Don't combine quantity-based items with others
        return False
        
    # If one name is very short and the other has multiple words
    if len(name1.split()) <= 2 and len(name2.split()) > 3:
        # Might be a size/variant indicator for the main item
        return True
        
    # If names have very different lengths, probably not the same item
    if abs(len(name1.split()) - len(name2.split())) > 2:
        return False
        
    # If both names are very short, don't combine unless one may be a modifier
    if len(name1.split()) <= 2 and len(name2.split()) <= 2:
        # Check for size/color/variant keywords
        size_keywords = ['size', 'small', 'medium', 'large', 'xl', 'xxl']
        color_keywords = ['red', 'blue', 'green', 'black', 'white', 'yellow']
        
        name1_lower = name1.lower()
        name2_lower = name2.lower()
        
        has_size = any(word in name1_lower for word in size_keywords) or any(word in name2_lower for word in size_keywords)
        has_color = any(word in name1_lower for word in color_keywords) or any(word in name2_lower for word in color_keywords)
        
        return has_size or has_color
    
    # If the names share specific common words, they might be related
    words1 = set(w.lower() for w in name1.split())
    words2 = set(w.lower() for w in name2.split())
    
    # Ignore common filler words
    ignored_words = {'a', 'an', 'the', 'with', 'and', 'or', 'for'}
    words1 = words1 - ignored_words
    words2 = words2 - ignored_words
    
    common_words = words1.intersection(words2)
    
    # Items must share a significant portion of words to be considered related
    # And have at least one common word
    return len(common_words) >= 1 and len(common_words) >= min(len(words1), len(words2)) // 2

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