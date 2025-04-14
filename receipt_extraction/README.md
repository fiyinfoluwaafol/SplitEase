# Receipt Extraction Module

This module provides OCR and NLP capabilities to extract structured data from receipt images for the Split-Ease application.

## Features

- Image preprocessing for optimal OCR results
- Text extraction from receipt images
- NLP-based extraction of key receipt information:
  - Vendor name
  - Dates
  - Monetary amounts
  - Line items
- REST API for receipt processing

## Setup

1. Install required dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Install SpaCy language model:
   ```
   python -m spacy download en_core_web_sm
   ```

3. Install Tesseract OCR:
   - For macOS: `brew install tesseract`
   - For Ubuntu/Debian: `sudo apt install tesseract-ocr`
   - For Windows: Download and install from https://github.com/UB-Mannheim/tesseract/wiki

## Usage

### As a Python Module

```python
from receipt_pipeline import process_receipt

# Process a receipt image
result = process_receipt('path/to/receipt.jpg')
print(result)
```

### As a REST API

Start the Flask server:

```
python receipt_api.py
```

Then send requests to the API:

```
curl -X POST -F "file=@path/to/receipt.jpg" http://localhost:5000/process_receipt
```

## Module Structure

- `ocr_pipeline.py` - Image preprocessing and OCR text extraction
- `nlp_extraction.py` - NLP processing to extract structured data from text
- `receipt_pipeline.py` - Main pipeline combining OCR and NLP processing
- `receipt_api.py` - Flask API for receipt processing

## Sample Directory

The module creates a `sample_receipts` directory that can be used to store test receipt images.

## Notes

- This module is designed to be flexible but may require adjustments based on the specific format of receipts you're processing.
- OCR accuracy depends on image quality, lighting, and text clarity. 