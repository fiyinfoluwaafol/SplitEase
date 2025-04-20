#!/usr/bin/env python3
"""
Test script for the improved receipt extraction pipeline.
This script runs both the main pipeline and the experimental simple parser
and compares their results.
"""

import os
import time
from receipt_pipeline import process_receipt
import sys

# Add experimental directory to import path
EXPERIMENTAL_DIR = os.path.join(os.path.dirname(__file__), 'experimental')
sys.path.append(EXPERIMENTAL_DIR)

# Import the simple parser from experimental
try:
    from receipt_simple_parser import extract_receipt_data
    HAS_SIMPLE_PARSER = True
except ImportError:
    print("Simple parser not available. Only testing main pipeline.")
    HAS_SIMPLE_PARSER = False

def test_receipt_pipeline(image_path):
    """Test the main receipt pipeline"""
    print("\n" + "=" * 60)
    print(f"Testing main receipt pipeline with image: {image_path}")
    print("=" * 60)
    
    # Time the process
    start_time = time.time()
    
    # Run the main pipeline
    try:
        result = process_receipt(image_path)
        
        # Display some key results
        print("\nMain Pipeline Results:")
        print(f"Vendor: {result['vendor']}")
        if result['dates']:
            print(f"Date: {result['dates'][0]}")
        print(f"Number of items found: {len(result['items'])}")
        
        if result['total']:
            print(f"Total: ${result['total']:.2f}")
        elif result['amounts']:
            print(f"Probable total: ${max(result['amounts']):.2f}")
            
        print(f"\nProcessing time: {time.time() - start_time:.2f} seconds")
        
        return result
    except Exception as e:
        print(f"Error in main pipeline: {e}")
        return None

def test_simple_parser(image_path):
    """Test the simple experimental parser"""
    if not HAS_SIMPLE_PARSER:
        return None
        
    print("\n" + "=" * 60)
    print(f"Testing simple experimental parser with image: {image_path}")
    print("=" * 60)
    
    # Time the process
    start_time = time.time()
    
    # Run the simple parser
    try:
        df, raw_text, metadata = extract_receipt_data(image_path, debug=True)
        
        # Display some key results
        print("\nSimple Parser Results:")
        print(f"Vendor: {metadata['vendor']}")
        if metadata['dates']:
            print(f"Date: {metadata['dates'][0]}")
        print(f"Number of items found: {len(df)}")
        
        if metadata['total']:
            print(f"Total: ${metadata['total']:.2f}")
            
        print(f"\nProcessing time: {time.time() - start_time:.2f} seconds")
        
        return {
            'items_df': df,
            'metadata': metadata,
            'raw_text': raw_text
        }
    except Exception as e:
        print(f"Error in simple parser: {e}")
        return None

def compare_results(main_result, simple_result):
    """Compare results from both pipelines"""
    if not simple_result or not main_result:
        print("\nCannot compare results - one or both parsers failed.")
        return
        
    print("\n" + "=" * 60)
    print("Comparing Results")
    print("=" * 60)
    
    # Compare item counts
    main_items = len(main_result['items'])
    simple_items = len(simple_result['items_df'])
    
    print(f"Main pipeline found {main_items} items")
    print(f"Simple parser found {simple_items} items")
    
    # Compare identified amounts
    if main_result['total'] and simple_result['metadata']['total']:
        print(f"Main pipeline total: ${main_result['total']:.2f}")
        print(f"Simple parser total: ${simple_result['metadata']['total']:.2f}")
        
        diff = abs(main_result['total'] - simple_result['metadata']['total'])
        if diff < 0.01:
            print("✅ Totals match exactly!")
        else:
            print(f"❌ Totals differ by ${diff:.2f}")
    else:
        print("Cannot compare totals - one or both parsers didn't find a total amount")
        
    # Overall assessment
    print("\nOverall Assessment:")
    if main_items > simple_items:
        print(f"✅ Main pipeline found more items (+{main_items - simple_items})")
    elif simple_items > main_items:
        print(f"✅ Simple parser found more items (+{simple_items - main_items})")
    else:
        print("✅ Both parsers found the same number of items")
    
    # Print detailed comparison if requested (could be implemented later)
    # TODO: Compare individual items for more detailed analysis

if __name__ == "__main__":
    # Get a list of receipt images to test
    sample_dir = os.path.join(os.path.dirname(__file__), 'sample_receipts')
    
    # Check if sample directory exists and contains images
    if not os.path.exists(sample_dir):
        os.makedirs(sample_dir)
        print(f"Created sample receipts directory at {sample_dir}")
        print("Please add receipt images to this directory and run the script again.")
        sys.exit(1)
        
    # Find images to test
    image_files = [f for f in os.listdir(sample_dir) 
                   if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    if not image_files:
        print(f"No receipt images found in {sample_dir}")
        print("Please add some receipt images to test.")
        sys.exit(1)
        
    # Test each image
    for image_file in image_files:
        image_path = os.path.join(sample_dir, image_file)
        
        # Run both parsers
        main_result = test_receipt_pipeline(image_path)
        simple_result = test_simple_parser(image_path)
        
        # Compare results
        if HAS_SIMPLE_PARSER:
            compare_results(main_result, simple_result)
            
        print("\n" + "-" * 80 + "\n") 