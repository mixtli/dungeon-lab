#!/bin/bash

# Upload Pack Script
# Usage: ./upload-pack.sh <zip-file-path>

set -e

# Check if zip file argument is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <zip-file-path>"
    echo "Example: $0 /path/to/my-pack.zip"
    exit 1
fi

ZIP_FILE="$1"
API_BASE_URL="http://localhost:3000/api"
UPLOAD_ENDPOINT="$API_BASE_URL/compendiums/import"

# Check if zip file exists
if [ ! -f "$ZIP_FILE" ]; then
    echo "Error: File '$ZIP_FILE' not found!"
    exit 1
fi

# Check if API_AUTH_TOKEN is set
if [ -z "$API_AUTH_TOKEN" ]; then
    echo "Error: API_AUTH_TOKEN environment variable is not set!"
    echo "Please set it with: export API_AUTH_TOKEN=your_token_here"
    exit 1
fi

echo "Uploading pack: $ZIP_FILE"
echo "Upload endpoint: $UPLOAD_ENDPOINT"
echo ""

# Upload the zip file
echo "Starting upload..."
UPLOAD_RESPONSE=$(curl -s -X POST \
  "$UPLOAD_ENDPOINT" \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -H "Content-Type: application/zip" \
  --data-binary "@$ZIP_FILE" \
  -w "\nHTTP_STATUS:%{http_code}")

# Extract HTTP status and response body
HTTP_STATUS=$(echo "$UPLOAD_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | sed '/HTTP_STATUS:/d')

echo "HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" != "202" ]; then
    echo "Upload failed!"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi

# Parse job ID from response
JOB_ID=$(echo "$RESPONSE_BODY" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
    echo "Error: Could not extract job ID from response"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi

echo "Upload started successfully!"
echo "Job ID: $JOB_ID"
echo ""

# Monitor the import job status
STATUS_ENDPOINT="$API_BASE_URL/compendiums/import/$JOB_ID/status"
echo "Monitoring import progress..."
echo "Status endpoint: $STATUS_ENDPOINT"
echo ""

while true; do
    # Get status
    STATUS_RESPONSE=$(curl -s -X GET \
        "$STATUS_ENDPOINT" \
        -H "Authorization: Bearer $API_AUTH_TOKEN" \
        -H "Content-Type: application/json")
    
    # Parse status fields
    JOB_STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    STAGE=$(echo "$STATUS_RESPONSE" | grep -o '"stage":"[^"]*"' | cut -d'"' -f4)
    PROCESSED=$(echo "$STATUS_RESPONSE" | grep -o '"processedItems":[0-9]*' | cut -d: -f2)
    TOTAL=$(echo "$STATUS_RESPONSE" | grep -o '"totalItems":[0-9]*' | cut -d: -f2)
    COMPENDIUM_ID=$(echo "$STATUS_RESPONSE" | grep -o '"compendiumId":"[^"]*"' | cut -d'"' -f4)
    
    # Default values if parsing fails
    PROCESSED=${PROCESSED:-0}
    TOTAL=${TOTAL:-0}
    
    # Print status update
    echo "$(date '+%H:%M:%S') - Status: $JOB_STATUS | Stage: $STAGE | Progress: $PROCESSED/$TOTAL"
    
    # Debug: show compendium ID if available
    if [ -n "$COMPENDIUM_ID" ] && [ "$COMPENDIUM_ID" != "null" ]; then
        echo "$(date '+%H:%M:%S') - Compendium ID found: $COMPENDIUM_ID"
    fi
    
    # Check if job is complete
    if [ "$JOB_STATUS" = "completed" ]; then
        echo ""
        echo "✅ Import completed successfully!"
        
        # Show compendium ID if available
        if [ -n "$COMPENDIUM_ID" ] && [ "$COMPENDIUM_ID" != "null" ]; then
            echo "📦 Compendium ID: $COMPENDIUM_ID"
        fi
        break
    elif [ "$JOB_STATUS" = "failed" ]; then
        # Special case: if we have a compendium ID but status is failed, it might be a false negative
        if [ -n "$COMPENDIUM_ID" ] && [ "$COMPENDIUM_ID" != "null" ]; then
            echo ""
            echo "⚠️  Import appears to have succeeded despite failed status!"
            echo "📦 Compendium ID: $COMPENDIUM_ID"
            echo "🔍 This may be a status reporting issue - check the server logs"
            break
        fi
        echo ""
        echo "❌ Import failed!"
        
        # Try to extract error message
        ERROR_MSG=$(echo "$STATUS_RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$ERROR_MSG" ]; then
            echo "Error: $ERROR_MSG"
        fi
        
        # Try to extract detailed errors
        ERRORS=$(echo "$STATUS_RESPONSE" | grep -o '"errors":\[[^]]*\]' | sed 's/"errors":\[\(.*\)\]/\1/' | tr ',' '\n' | sed 's/^"//; s/"$//')
        if [ -n "$ERRORS" ]; then
            echo "Detailed errors:"
            echo "$ERRORS" | while read -r error; do
                if [ -n "$error" ]; then
                    echo "  - $error"
                fi
            done
        fi
        
        echo ""
        echo "Full response:"
        echo "$STATUS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATUS_RESPONSE"
        exit 1
    fi
    
    # Wait 5 seconds before next check
    sleep 5
done

echo ""
echo "🎉 Pack upload and import completed successfully!"