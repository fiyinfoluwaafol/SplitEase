from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
import tempfile
import logging
from receipt_pipeline import process_receipt

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Set a size limit for uploaded files (5MB)
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB

# Define allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    """Check if the uploaded file has an allowed extension"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/process_receipt', methods=['POST'])
def api_process_receipt():
    """
    API endpoint to process a receipt image
    
    Expects a multipart/form-data POST with an image file
    Returns JSON with structured receipt data
    """
    # Check if a file was included in the request
    if 'file' not in request.files:
        logger.error("No file part in the request")
        return jsonify({'error': 'No file part in the request'}), 400
    
    file = request.files['file']
    
    # Check if the user submitted an empty form
    if file.filename == '':
        logger.error("No file selected")
        return jsonify({'error': 'No file selected'}), 400
    
    # Check if the file is allowed
    if not allowed_file(file.filename):
        logger.error(f"File type not allowed: {file.filename}")
        return jsonify({'error': 'File type not allowed. Use PNG, JPG, JPEG, or GIF'}), 400
    
    try:
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp:
            temp_path = temp.name
            file.save(temp_path)
            logger.info(f"File saved temporarily at {temp_path}")
        
        # Process the receipt
        logger.info("Processing receipt...")
        result = process_receipt(temp_path)
        
        # Delete the temporary file
        os.unlink(temp_path)
        logger.info(f"Temporary file deleted: {temp_path}")
        
        # Return the structured data
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error processing receipt: {str(e)}")
        # Make sure to clean up the temporary file if an error occurs
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.unlink(temp_path)
            logger.info(f"Temporary file deleted after error: {temp_path}")
        
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Create a folder for sample receipts if it doesn't exist
    os.makedirs('sample_receipts', exist_ok=True)
    
    logger.info("Starting Receipt API server...")
    # Run the Flask app in debug mode (for development only)
    app.run(debug=True, host='0.0.0.0', port=5000) 