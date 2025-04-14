import spacy
import re
from spacy.matcher import Matcher

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
        "dates": [],
        "amounts": [],
        "items": []
    }
    
    # Process the text with spaCy
    doc = nlp(text)
    
    # Setup the matcher for currency patterns
    matcher = Matcher(nlp.vocab)
    
    # Pattern for currency amounts like $10.99
    # This pattern looks for $ followed by digits, optionally a decimal point and more digits
    currency_pattern = [
        {"TEXT": {"REGEX": r"\$"}}, 
        {"TEXT": {"REGEX": r"\d+(\.\d{2})?"}}
    ]
    
    # Add the pattern to the matcher
    matcher.add("MONEY_AMOUNT", [currency_pattern])
    
    # Find all matches
    matches = matcher(doc)
    
    # Extract amounts from matches
    for match_id, start, end in matches:
        # Get the matched span and add it to amounts
        span = doc[start:end]
        amount_text = span.text
        # Clean up the amount - remove $ and convert to float
        try:
            clean_amount = float(amount_text.replace('$', '').strip())
            receipt_data["amounts"].append(clean_amount)
        except ValueError:
            # If conversion fails, just add the text
            receipt_data["amounts"].append(amount_text)
    
    # Extract dates using regex pattern
    # This pattern matches common date formats like MM/DD/YYYY, DD/MM/YYYY, MM-DD-YY, etc.
    date_pattern = r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b'
    dates = re.findall(date_pattern, text)
    receipt_data["dates"] = dates
    
    # Split text into lines
    lines = [line.strip() for line in text.strip().split('\n') if line.strip()]
    
    # Assume the first non-empty line is the vendor name
    if lines:
        receipt_data["vendor"] = lines[0]
    
    # Extract items (lines that include a $ sign, excluding the vendor line)
    for line in lines[1:]:
        if '$' in line:
            # This is a simplistic approach - in a real application,
            # you might want to further parse these lines to separate
            # item names from prices
            receipt_data["items"].append(line.strip())
    
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