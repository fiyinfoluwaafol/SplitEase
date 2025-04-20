#!/usr/bin/env python3
"""
Test script for verifying item-price pairing in the receipt extraction process.
This script tests the improved NLP extraction with various receipt formats.
"""

import sys
import os
from nlp_extraction import extract_items_with_prices, extract_receipt_entities

def test_item_price_pairing():
    """Test the improved item-price pairing with various formats"""
    
    print("\n" + "=" * 60)
    print("Testing item-price pairing with various receipt formats")
    print("=" * 60)
    
    # Example 1: Standard format with price at the end
    test_text1 = """GROCERY STORE
    123 Main St
    Date: 01/15/2023
    
    Milk 2%                  3.99
    Whole Wheat Bread        2.49
    Organic Eggs             4.29
    
    Subtotal:               10.77
    Tax:                     0.86
    Total:                  11.63
    """
    
    # Example 2: Format with quantity and unit price
    test_text2 = """SUPERMARKET
    456 Oak Avenue
    Date: 02/20/2023
    
    Apples   3 @ 0.99        2.97
    Bananas  2 @ 0.59        1.18
    Chicken Breast 2 @ 4.99  9.98
    
    Subtotal:               14.13
    Tax:                     1.13
    Total:                  15.26
    """
    
    # Example 3: Format with price at the beginning
    test_text3 = """MINIMART
    789 Pine Street
    Date: 03/10/2023
    
    $2.99  Potato Chips
    $3.49  Soda 2-Liter
    $1.99  Candy Bar
    
    Subtotal:  8.47
    Tax:       0.68
    Total:     9.15
    """
    
    # Example 4: Complex format with weight-based pricing
    test_text4 = """FRESH MARKET
    321 Maple Road
    Date: 04/05/2023
    
    Grapes     2.35 lb   @2.99/lb    7.03
    Beef       1.53 lb   @5.99/lb    9.16
    Cheese     0.75 lb   @4.49/lb    3.37
    
    Subtotal:                        19.56
    Tax:                              1.56
    Total:                           21.12
    """
    
    # Example 5: Mixed format with multi-line items
    test_text5 = """DEPARTMENT STORE
    654 Elm Street
    Date: 05/15/2023
    
    T-Shirt Summer
    Collection               15.99
    Jeans Blue Denim         29.99
    Socks 3-pack
    Men's Size 10-13          8.99
    
    Subtotal:                54.97
    Tax:                      4.40
    Total:                   59.37
    """
    
    # Example 6: Additional multi-line item test (more explicit)
    test_text6 = """CLOTHING OUTLET
    987 Fashion Blvd
    Date: 06/25/2023
    
    Women's Top
                             24.99
    Men's Jacket
    Blue                     49.99
    Kids Shoes
    Size 5                   19.99
    
    Subtotal:                94.97
    Tax:                      7.60
    Total:                  102.57
    """
    
    # Example 7: Mixed multi-line formats
    test_text7 = """ELECTRONICS STORE
    555 Tech Avenue
    Date: 07/10/2023
    
    Wireless Headphones
    Sony XM4                 249.99
    
    USB-C Cable
    3 meters                  15.99
    
    Smart Speaker
                              79.99
    
    Phone Case                24.99
    
    Subtotal:                370.96
    Tax:                      29.68
    Total:                   400.64
    """
    
    # Process each test case
    test_cases = [
        ("Standard Format", test_text1),
        ("Quantity Format", test_text2),
        ("Price-First Format", test_text3),
        ("Weight-Based Format", test_text4),
        ("Multi-Line Format", test_text5),
        ("Explicit Multi-Line Format", test_text6),
        ("Mixed Multi-Line Formats", test_text7)
    ]
    
    for test_name, test_text in test_cases:
        print(f"\nTest Case: {test_name}")
        print("-" * 40)
        
        # Process using the receipt_entities function
        results = extract_receipt_entities(test_text)
        
        # Print the extracted items and prices
        if results["items"]:
            print(f"Found {len(results['items'])} items:")
            for i, item in enumerate(results["items"], 1):
                print(f"{i}. {item['name']}: ${item['price']:.2f}")
        else:
            print("No items found!")
            
        # Print the total if available
        if results["total"]:
            print(f"\nTotal: ${results['total']:.2f}")
        
        print("-" * 40)
    
    print("\nDirectly testing the extract_items_with_prices function:")
    # Test direct extraction of items from lines
    for test_name, test_text in test_cases:
        print(f"\nTest Case: {test_name}")
        print("-" * 40)
        
        lines = [line.strip() for line in test_text.strip().split('\n') if line.strip()]
        items = extract_items_with_prices(lines)
        
        if items:
            print(f"Found {len(items)} items:")
            for i, item in enumerate(items, 1):
                print(f"{i}. {item['name']}: ${item['price']:.2f}")
        else:
            print("No items found!")
            
        print("-" * 40)

if __name__ == "__main__":
    test_item_price_pairing() 