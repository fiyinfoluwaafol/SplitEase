"""
Specialized parser for Walmart receipts
This module enhances the generic receipt parser specifically for Walmart receipts
"""

import re
from datetime import datetime

def parse_walmart_receipt(text, receipt_data):
    """
    Enhance the generic receipt data with Walmart-specific parsing logic
    
    Args:
        text (str): The OCR extracted text
        receipt_data (dict): The receipt data already extracted by the generic parser
        
    Returns:
        dict: Enhanced receipt data
    """
    lines = [line.strip() for line in text.strip().split('\n') if line.strip()]
    
    # Identify Walmart as the vendor (could be misspelled in OCR)
    if receipt_data['vendor'] is None or 'walmart' not in receipt_data['vendor'].lower():
        # Look for Walmart in first few lines
        for line in lines[:5]:
            if 'walmart' in line.lower() or 'wal' in line.lower() and 'mart' in line.lower():
                receipt_data['vendor'] = "Walmart"
                break
    
    # Extract Walmart store number and store address
    store_pattern = re.compile(r'(?:STR#|ST#|STORE)\s*(?:#)?\s*(\d+)', re.IGNORECASE)
    for line in lines:
        store_match = store_pattern.search(line)
        if store_match:
            receipt_data['store_info']['store_number'] = store_match.group(1)
            break
    
    # Parse transaction-specific information like cashier and register
    cashier_pattern = re.compile(r'(?:MGR|MANAGER|CSM)[:.\s]*(\w+)', re.IGNORECASE)
    register_pattern = re.compile(r'(?:REG|REGISTER|TR)#\s*(\d+)', re.IGNORECASE)
    trans_id_pattern = re.compile(r'(?:TR#|TRANS#|TC#)\s*(\d+)', re.IGNORECASE)
    
    for line in lines:
        cashier_match = cashier_pattern.search(line)
        register_match = register_pattern.search(line)
        trans_id_match = trans_id_pattern.search(line)
        
        if cashier_match and 'cashier' not in receipt_data:
            receipt_data['cashier'] = cashier_match.group(1)
        
        if register_match and 'register' not in receipt_data:
            receipt_data['register'] = register_match.group(1)
            
        if trans_id_match and 'transaction_id' not in receipt_data:
            receipt_data['transaction_id'] = trans_id_match.group(1)
    
    # Specific Walmart item pattern, usually: ITEM NAME CODE PRICE X/Y/O/N
    # X = Taxable, Y = Food Stamps Eligible, O = Non-Taxable, N = Normal
    item_pattern = re.compile(r'^(.+?)\s+(\d{10,14})\s+(\d+\.\d{2})\s+([XYORN])$')
    
    # Only scan lines in the middle section of the receipt
    start_idx = 0
    end_idx = len(lines)
    
    # Find the beginning of items section
    for i, line in enumerate(lines):
        if 'SUBTOTAL' in line.upper():
            end_idx = i
            break
    
    # If we found items, clear the existing items list and add the correctly parsed items
    items_found = False
    receipt_data['items'] = []  # Clear previous items
    
    for i, line in enumerate(lines[start_idx:end_idx]):
        item_match = item_pattern.search(line)
        # Try a more flexible pattern if standard doesn't match
        if not item_match:
            # Fallback pattern: look for a price with a letter at the end
            alt_pattern = re.compile(r'^(.+?)\s+(\d+\.\d{2})\s+([XYORN])$')
            item_match = alt_pattern.search(line)
            
            if item_match:
                item_name = item_match.group(1).strip()
                item_price = float(item_match.group(2))
                tax_code = item_match.group(3)
                
                # Skip if it's clearly a header or summary line
                skip_keywords = ["subtotal", "total", "tax", "balance", "change", "paid"]
                if not any(keyword in item_name.lower() for keyword in skip_keywords):
                    receipt_data['items'].append({
                        'name': item_name,
                        'price': item_price,
                        'taxable': tax_code in ['X', 'Y'],
                        'full_text': line
                    })
                    items_found = True
        else:
            # Standard match
            item_name = item_match.group(1).strip()
            item_code = item_match.group(2)
            item_price = float(item_match.group(3))
            tax_code = item_match.group(4)
            
            receipt_data['items'].append({
                'name': item_name,
                'code': item_code,
                'price': item_price,
                'taxable': tax_code in ['X', 'Y'],
                'full_text': line
            })
            items_found = True
    
    # Identify tax rates and amounts
    tax_rate_pattern = re.compile(r'TAX\s+(\d+)\s+(\d+\.\d+)\s*%\s*(\d+\.\d{2})', re.IGNORECASE)
    receipt_data['tax_details'] = []
    
    for line in lines:
        tax_rate_match = tax_rate_pattern.search(line)
        if tax_rate_match:
            tax_number = tax_rate_match.group(1)
            tax_rate = float(tax_rate_match.group(2))
            tax_amount = float(tax_rate_match.group(3))
            
            receipt_data['tax_details'].append({
                'tax_number': tax_number,
                'rate': tax_rate,
                'amount': tax_amount
            })
    
    # Extract payment information
    payment_pattern = re.compile(r'(DISCOVER|DISC[VY]?|CREDIT)(\s+TEND|\s+CARD)?\s+(\d+\.\d{2})', re.IGNORECASE)
    
    for line in lines:
        payment_match = payment_pattern.search(line)
        if payment_match:
            receipt_data['payment_method'] = payment_match.group(1)
            payment_amount = float(payment_match.group(3))
            receipt_data['payment_amount'] = payment_amount
            break
    
    return receipt_data

def enhance_walmart_receipt_data(receipt_data, text):
    """
    Apply Walmart-specific enhancements to the receipt data
    """
    # If it's a Walmart receipt
    if receipt_data['vendor'] and 'walmart' in receipt_data['vendor'].lower():
        receipt_data = parse_walmart_receipt(text, receipt_data)
    elif any('walmart' in line.lower() for line in text.split('\n')):
        receipt_data['vendor'] = "Walmart"
        receipt_data = parse_walmart_receipt(text, receipt_data)
    
    return receipt_data 