"""
Test the specialized Walmart receipt parser
"""

from walmart_parser import parse_walmart_receipt
import sys
import os

def main():
    # Check if a path was provided as an argument
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    else:
        # Default path if not provided
        image_path = "sample_receipts/receipt1.png"
    
    # Check if the file exists
    if not os.path.exists(image_path):
        print(f"Error: Image file not found at {image_path}")
        return
    
    print(f"Processing Walmart receipt: {image_path}")
    print("=" * 60)
    
    # Parse the receipt
    result = parse_walmart_receipt(image_path)
    
    print("\nRaw extraction data:")
    print("-" * 60)
    
    # Summarize the extracted data
    print(f"Items found: {len(result['items'])}")
    print(f"Date(s) found: {result['dates']}")
    
    # Display totals
    if result['totals']:
        print("\nTotals extracted:")
        for key, value in result['totals'].items():
            if key == 'tax' and isinstance(value, list):
                for i, tax in enumerate(value):
                    print(f"  Tax {i+1}: ${tax:.2f}")
            else:
                print(f"  {key.title()}: ${value:.2f}")
    
    # Display store information
    if result['store_info']:
        print("\nStore information:")
        for key, value in result['store_info'].items():
            print(f"  {key.title()}: {value}")
    
    # Display transaction info
    if result['transaction_info']:
        print("\nTransaction information:")
        for key, value in result['transaction_info'].items():
            print(f"  {key.title()}: {value}")
    
    # Show the payment information
    if result['payment_info']:
        print("\nPayment information:")
        for key, value in result['payment_info'].items():
            if isinstance(value, float):
                print(f"  {key.title()}: ${value:.2f}")
            else:
                print(f"  {key.title()}: {value}")
    
    # Show items
    if result['items']:
        print("\nItems purchased:")
        print(f"{'Item':<35} {'Price':>10} {'Taxable':>8}")
        print("-" * 55)
        
        total_items_cost = 0.0
        for item in result['items']:
            taxable = "Yes" if item.get('taxable', False) else "No"
            print(f"{item['name'][:35]:<35} ${item['price']:>9.2f} {taxable:>8}")
            total_items_cost += item['price']
        
        print("-" * 55)
        print(f"{'Total Items Cost:':<35} ${total_items_cost:>9.2f}")
        
        # Validate items total against receipt total
        if 'subtotal' in result['totals']:
            subtotal = result['totals']['subtotal']
            difference = abs(total_items_cost - subtotal)
            if difference < 0.1:  # Allow for small rounding differences
                print(f"\nValidation: Items total matches subtotal (${subtotal:.2f}) ✓")
            else:
                print(f"\nValidation: WARNING - Items total (${total_items_cost:.2f}) " 
                      f"differs from subtotal (${subtotal:.2f}) by ${difference:.2f}")
    
    print("=" * 60)

if __name__ == "__main__":
    main() 