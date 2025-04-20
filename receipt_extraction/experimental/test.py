from receipt_pipeline import process_receipt, display_receipt_data

# Process a receipt image
try:
    result = process_receipt('sample_receipts/receipt1.png')
    display_receipt_data(result)
except Exception as e:
    print(f"Error processing receipt: {e}")