# AI-Powered Map Builder for Dungeon Lab

## Overview

This document outlines the architecture and workflow for implementing an AI-powered map builder feature in Dungeon Lab. The feature will allow users to describe dungeons in natural language, then generate complete map files in Universal VTT (UVTT) format, including walls, lighting, and other map features.

## User Experience Workflow

1. **Text Description Input**
   - User enters a natural language description of their desired map
   - Optional additional parameters: map size, style, theme, etc.

2. **AI Image Generation**
   - System processes the description to generate a top-down map image
   - Preview is shown to the user

3. **Iterative Refinement**
   - User provides feedback and modification instructions
   - System regenerates the map based on user feedback
   - Process repeats until user is satisfied

4. **Map Saving**
   - Map image is saved to the asset system
   - Basic map data is stored in the database

5. **Feature Detection**
   - AI analyzes the image to detect and generate:
     - Walls/obstacles
     - Doors/portals
     - Light sources
     - Environmental features

6. **Interactive Editor**
   - User can view and modify the auto-detected elements:
     - Add/remove/modify walls
     - Adjust lighting properties
     - Edit doors and portals
     - Fine-tune environmental settings

7. **UVTT Export**
   - System exports the complete map as a UVTT file
   - User can save locally or directly to their campaign

## Sequential Implementation Plan

### Step 1: User Creates Map Description

**Technical Implementation:**
1. **Frontend Interface**: Build a Vue.js component with a rich text editor that allows users to describe their map in detail.
2. **Context Enhancement**: Implement a system that guides users to include specific details helpful for map generation:
   - Overall dimensions (e.g., 30x30 squares)
   - Theme/setting (e.g., dungeon, tavern, forest)
   - Key features (rooms, corridors, special areas)
   - Environmental elements (water, lava, etc.)
3. **Optional Parameters**: Allow users to specify technical parameters:
   - Art style preferences
   - Grid size
   - Lighting atmosphere

**Model Recommendation:** 
- No AI model needed for this step, but we should implement smart form validation and suggestion features to help users provide comprehensive descriptions.

**Implementation Complexity:** Low to Medium  
**Dependencies:** Vue.js frontend components

### Step 2: Generate Map

**Technical Implementation:**
1. **Prompt Engineering**: Create a specialized prompt template that formats the user's description for optimal image generation results:
   ```
   Generate a top-down fantasy RPG map with clear walls and features with the following description: 
   [USER DESCRIPTION]
   Important: Make walls, doors, and features clearly visible with distinct colors and clean lines.
   Use a resolution of [RESOLUTION] pixels.
   Art style: [STYLE]
   ```

2. **API Integration**: Set up a service to communicate with OpenAI's GPT-4o API for image generation:
   ```javascript
   // Sample code for GPT-4o integration
   async function generateMapImage(description, resolution, style) {
     const response = await openai.images.generate({
       model: "gpt-4o",
       prompt: buildOptimizedPrompt(description, resolution, style),
       n: 1,
       size: resolution,
       response_format: "url"
     });
     return response.data[0].url;
   }
   ```

3. **Image Storage**: Create a system to save the generated image to your storage system (e.g., S3, MinIO) and associate it with the user's map record.

**Model Recommendation:**
- **Primary Model**: OpenAI's GPT-4o or GPT-4.1 with image generation capabilities
- **Alternative**: If cost is a concern, GPT-4o Mini offers a more affordable option with slightly reduced quality

**Implementation Complexity:** Medium  
**Dependencies:** OpenAI API key, Image storage system

### Step 3-4: User Modifications & Iteration

**Technical Implementation:**
1. **Modification Interface**: Create a component that allows users to:
   - View their generated map
   - Input text instructions for modifications
   - Maintain a history of versions

2. **Differential Prompting**: Develop a system that generates targeted prompts based on modification requests:
   ```javascript
   function buildModificationPrompt(originalDescription, modificationRequest) {
     return `
       Make the following changes to the existing map:
       Original Map Description: ${originalDescription}
       
       Changes Requested: ${modificationRequest}
       
       Important: Maintain the same overall layout but apply the requested changes.
       Make walls, doors, and features clearly visible with distinct colors and clean lines.
     `;
   }
   ```

3. **Version Management**: Implement a system to track different versions of the map:
   - Store each iteration in your database
   - Provide a version history viewer
   - Allow users to revert to previous versions

**Model Recommendation:**
- **Same as Step 2**: OpenAI's GPT-4o or alternatives
- Ensure the API implementation includes the current image as reference when possible

**Implementation Complexity:** Medium-High  
**Dependencies:** OpenAI API, Version control system for maps

### Step 5: Map Saving

**Technical Implementation:**
1. **Database Schema**: Implement the Mongoose schema as designed earlier, with the following key components:
   ```javascript
   const mapSchema = new mongoose.Schema({
     format: { type: Number, default: 1.0 },
     resolution: {
       map_origin: {
         x: { type: Number, default: 0 },
         y: { type: Number, default: 0 }
       },
       map_size: {
         x: { type: Number, required: true },
         y: { type: Number, required: true }
       },
       pixels_per_grid: { type: Number, required: true }
     },
     // Other UVTT properties
     image: { type: String, required: true } // Link to asset storage
   });
   ```

2. **Asset Management**: Store the image in your asset management system with appropriate metadata:
   - User ID
   - Campaign association (if applicable)
   - Creation and modification timestamps
   - Permissions/sharing settings

3. **Save Process**: Implement a service that handles the save operation:
   ```javascript
   async function saveMap(userId, mapData, imageUrl) {
     // Create initial map record with image link but no feature data yet
     const map = new Map({
       ...mapData,
       image: imageUrl,
       // Initial empty arrays for features until detection is complete
       line_of_sight: [],
       lights: [],
       portals: []
     });
     
     return await map.save();
   }
   ```

**Implementation Complexity:** Medium  
**Dependencies:** MongoDB, Asset storage system

### Step 6: Feature Detection Pipeline

**Technical Implementation:**
1. **Feature Detection Workflow**: Implement a Python-based Prefect workflow to detect various map features:

   ```python
   # Example Python Prefect workflow structure
   from prefect import flow, task
   import cv2
   import numpy as np
   from ultralytics import YOLO
   import requests

   @task
   def load_image(image_url):
       """Load image from URL or file path"""
       # Handle both remote and local images
       if image_url.startswith('http'):
           response = requests.get(image_url)
           nparr = np.frombuffer(response.content, np.uint8)
           img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
       else:
           img = cv2.imread(image_url)
       return img
   
   @task
   def detect_walls(img, wall_detector):
       """Detect walls using YOLO model"""
       wall_results = wall_detector(img)
       wall_polygons = process_wall_detections(wall_results)
       return wall_polygons
   
   @task
   def detect_doors(img, door_detector):
       """Detect doors and portals using YOLO model"""
       door_results = door_detector(img)
       portal_data = process_door_detections(door_results)
       return portal_data
   
   @task
   def detect_lights(img):
       """Detect light sources based on brightness analysis"""
       light_sources = detect_light_sources(img)
       return light_sources
       
   @task
   def send_progress_update(flow_id, user_id, step, progress, api_base_url):
       """Send progress update via REST API"""
       try:
           requests.post(
               f"{api_base_url}/api/workflows/progress",
               json={
                   "flow_id": flow_id,
                   "user_id": user_id,
                   "step": step,
                   "progress": progress
               }
           )
       except Exception as e:
           print(f"Failed to send progress update: {e}")
   
   @flow
   def detect_map_features(image_url, flow_data):
       """Complete map feature detection workflow"""
       # Load models
       wall_detector = YOLO("models/walls-yolov8.pt")
       door_detector = YOLO("models/doors-yolov8.pt")
       
       # Send initial progress update
       send_progress_update(
           flow_data["flow_id"], flow_data["user_id"], "feature_detection", 10, 
           flow_data["api_base_url"]
       )
       
       # Load image
       img = load_image(image_url)
       
       # Run detection tasks
       send_progress_update(
           flow_data["flow_id"], flow_data["user_id"], "feature_detection", 30, 
           flow_data["api_base_url"]
       )
       wall_polygons = detect_walls(img, wall_detector)
       
       send_progress_update(
           flow_data["flow_id"], flow_data["user_id"], "feature_detection", 60, 
           flow_data["api_base_url"]
       )
       portal_data = detect_doors(img, door_detector)
       
       send_progress_update(
           flow_data["flow_id"], flow_data["user_id"], "feature_detection", 80, 
           flow_data["api_base_url"]
       )
       light_sources = detect_lights(img)
       
       # Send completion update
       send_progress_update(
           flow_data["flow_id"], flow_data["user_id"], "feature_detection", 100, 
           flow_data["api_base_url"]
       )
       
       # Return UVTT compatible format
       return {
           "line_of_sight": wall_polygons,
           "portals": portal_data,
           "lights": light_sources
       }
   ```

2. **Pipeline Components**:

   a. **Wall Detection**:
   - Train a YOLOv8 or YOLOv11 model on a dataset of top-down maps with annotated walls
   - Post-process detections to create continuous wall segments
   - Convert pixel coordinates to grid coordinates

   b. **Portal/Door Detection**:
   - Use a specialized object detection model for doors and entrances
   - Determine door states (open/closed) based on visual cues
   - Calculate rotation and position data

   c. **Light Source Detection**:
   - Implement brightness analysis to identify potential light sources
   - Use color information to determine light types and colors
   - Calculate appropriate intensities and ranges

3. **UVTT Conversion**:
   - Transform all detected features into the UVTT format
   - Apply grid-based coordinate system
   - Validate data structure

**Model Recommendations**:
- **Wall/Structure Detection**: YOLOv8/v11 fine-tuned on map images
- **Segmentation**: Segment Anything 2 (SAM 2) for precise boundary detection
- **Layout Analysis**: Specialized CNN or Transformer model for structural understanding

**Implementation Complexity**: High  
**Dependencies**: Python ML ecosystem (PyTorch, OpenCV), Prefect workflow management, GPU resources for inference

### Step 7-8: Visual Editor and Final Map Saving

**Technical Implementation:**

1. **Visual Map Editor**:
   - Implement a Vue.js canvas-based editor using libraries like Fabric.js or Konva.js
   - Create specialized tools for each feature type:

   ```javascript
   // Example editor initialization with Fabric.js
   const initializeMapEditor = (mapData, imageUrl) => {
     const canvas = new fabric.Canvas('map-editor');
     
     // Add background image
     fabric.Image.fromURL(imageUrl, (img) => {
       canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
       
       // Add wall polygons
       mapData.line_of_sight.forEach(wallPoints => {
         const polygon = new fabric.Polygon(wallPoints.map(p => ({ x: p.x * gridSize, y: p.y * gridSize })), {
           fill: 'transparent',
           stroke: '#ff0000',
           strokeWidth: 2,
           selectable: true
         });
         canvas.add(polygon);
       });
       
       // Add doors/portals
       mapData.portals.forEach(portal => {
         addPortalToCanvas(canvas, portal);
       });
       
       // Add light sources
       mapData.lights.forEach(light => {
         addLightToCanvas(canvas, light);
       });
     });
     
     return canvas;
   };
   ```

2. **Editor Tools**:
   a. **Wall Editor**:
   - Draw new wall segments
   - Modify existing walls
   - Delete wall segments
   - Snap-to-grid functionality

   b. **Light Editor**:
   - Add new light sources
   - Adjust light properties (color, intensity, range)
   - Visual preview of lighting effects

   c. **Portal Editor**:
   - Place doors and portals
   - Configure portal properties (open/closed, rotation)
   - Link portals to other maps (optional)

3. **Real-time UVTT Conversion**:
   - Implement a service that converts editor state to UVTT format:
   ```javascript
   function canvasToUVTT(canvas, mapData) {
     // Extract wall polygons
     const walls = canvas.getObjects('polygon')
       .filter(obj => obj.wallType === 'wall')
       .map(convertPolygonToUVTTFormat);
     
     // Extract portals
     const portals = canvas.getObjects('group')
       .filter(obj => obj.objectType === 'portal')
       .map(convertPortalToUVTTFormat);
     
     // Extract lights
     const lights = canvas.getObjects('circle')
       .filter(obj => obj.objectType === 'light')
       .map(convertLightToUVTTFormat);
     
     return {
       ...mapData,
       line_of_sight: walls,
       portals: portals,
       lights: lights
     };
   }
   ```

4. **Final Save Process**:
   - Update the existing map record with the editor-modified features
   ```javascript
   async function saveMapWithFeatures(mapId, updatedFeatures) {
     return await Map.findByIdAndUpdate(
       mapId,
       { 
         line_of_sight: updatedFeatures.line_of_sight,
         portals: updatedFeatures.portals,
         lights: updatedFeatures.lights,
         // Add any other modified fields
       },
       { new: true }
     );
   }
   ```

5. **Export Functionality**:
   - Implement UVTT file export with proper formatting
   - Generate appropriate file names based on map titles
   - Support direct download to user's device

**Implementation Complexity**: High  
**Dependencies**: Canvas manipulation library, UVTT conversion utilities

## Integration Flow

```mermaid
sequenceDiagram
    participant User as Web Client
    participant Express as Express Server
    participant Prefect as Prefect Server
    participant MapGen as Map Generation Flow
    participant OpenAI as OpenAI GPT-4o
    participant MinIO as Image Storage
    participant FeatureDetect as Feature Detection Flow
    participant CV as Computer Vision Models
    participant MongoDB as MongoDB
    
    User->>Express: 1. Submit map description
    Express->>Prefect: 2. Trigger map generation workflow with userId label
    Prefect-->>Express: 3. Return flow run ID
    Express-->>User: 4. Return flow run ID to client
    
    Prefect->>MapGen: 5. Start map generation flow
    
    MapGen->>Express: 6. Progress update with flowId & userId
    Express-->>User: 7. Real-time update via Socket.io
    
    MapGen->>OpenAI: 8. Request image generation
    OpenAI->>MapGen: 9. Return generated image URL
    
    MapGen->>Express: 10. Progress update (image generated)
    Express-->>User: 11. Display preview image
    
    alt User wants modifications
        User->>Express: 12a. Submit modification request with flowId
        Express->>Prefect: 13a. Trigger regeneration
        Prefect->>MapGen: 14a. Regenerate with modifications
        MapGen->>OpenAI: 15a. Request modified image
        OpenAI->>MapGen: 16a. Return updated image
        MapGen->>Express: 17a. Progress update (image updated)
        Express-->>User: 18a. Display updated preview
    end
    
    User->>Express: 12. Approve image
    Express->>Prefect: 13. Proceed to feature detection
    
    MapGen->>MinIO: 14. Store final image
    MinIO->>MapGen: 15. Confirm storage & return URL
    
    MapGen->>FeatureDetect: 16. Trigger feature detection flow
    
    FeatureDetect->>Express: 17. Progress update (detection started)
    Express-->>User: 18. Update progress to user
    
    FeatureDetect->>CV: 19. Process image for walls
    CV->>FeatureDetect: 20. Return wall data
    FeatureDetect->>Express: 21. Progress update (walls detected)
    Express-->>User: 22. Update progress to user
    
    FeatureDetect->>CV: 23. Process image for doors/portals
    CV->>FeatureDetect: 24. Return portal data
    FeatureDetect->>Express: 25. Progress update (portals detected)
    Express-->>User: 26. Update progress to user
    
    FeatureDetect->>CV: 27. Process image for light sources
    CV->>FeatureDetect: 28. Return lighting data
    FeatureDetect->>Express: 29. Progress update (lights detected)
    Express-->>User: 30. Update progress to user
    
    FeatureDetect->>MongoDB: 31. Save complete map data
    MongoDB->>FeatureDetect: 32. Confirm data saved
    
    FeatureDetect->>Express: 33. Complete notification with map ID
    Express-->>User: 34. Load editor with detected features
    
    Note over User,MongoDB: User can now edit features in the interactive editor
    
    User->>Express: 35. Save map modifications
    Express->>MongoDB: 36. Update map features
    MongoDB->>Express: 37. Confirm update
    Express-->>User: 38. Confirm save & offer UVTT export
    
    User->>Express: 39. Request UVTT export
    Express->>Express: 40. Convert to UVTT format
    Express-->>User: 41. Download UVTT file
```

To wire all these components together:

1. **Frontend-Backend Communication**:
   - Use RESTful API endpoints for map CRUD operations
   - Implement WebSocket for real-time status updates to clients

2. **Workflow Orchestration with Prefect**:
   - Express server triggers Prefect workflows for long-running operations
   - Pass userId as a label on the Prefect job for easy identification
   - REST callbacks from Prefect to Express provide progress updates with flowId and userId
   - Socket.io relays progress to web clients in real-time

3. **Complete Data Flow**:
   ```
   User Input → Express → Prefect Map Generation Flow (with userId label) → Image Storage →
   Prefect Feature Detection Flow → MongoDB →
   Map Editor → MongoDB (Updated Features) →
   UVTT Export
   ```

4. **Express API Implementation**:
   ```javascript
   // API route to start map generation
   router.post('/api/maps/generate', async (req, res) => {
     try {
       const { description, parameters } = req.body;
       const userId = req.session.user.id;
       
       // Flow data to pass to Prefect
       const flowData = {
         api_base_url: process.env.EXPRESS_API_URL,
         user_id: userId
       };
       
       // Start Prefect flow
       const prefect = new PrefectClient();
       const flow = await prefect.createFlowRun({
         flow_name: "Map Generation Flow",
         parameters: {
           description,
           parameters,
           user_id: userId,
           flow_data: flowData
         },
         labels: {
           userId: userId.toString() // Add userId as a label for easy lookup
         }
       });
       
       // Return flow ID to client for tracking
       res.json({ 
         success: true, 
         flowId: flow.id 
       });
       
     } catch (error) {
       console.error("Error starting map generation:", error);
       res.status(500).json({ success: false, error: "Failed to start map generation" });
     }
   });

   // Progress update endpoint (called by Prefect)
   router.post('/api/workflows/progress', (req, res) => {
     const { flow_id, user_id, step, progress } = req.body;
     
     // Emit Socket.io event to client
     io.to(user_id).emit('ai:map:progress', { 
       flowId: flow_id,
       step, 
       progress 
     });
     
     res.json({ success: true });
   });
   ```

5. **Error Handling & Resiliency**:
   - Implement auto-retries for failed workflow steps in Prefect
   - Store intermediate results in MongoDB at each successful step
   - Provide manual editing tools as fallback for detection failures
   - Implement resume capability for workflows that encounter errors

## Mongoose Schema for Maps

```javascript
const mongoose = require('mongoose');

const mapSchema = new mongoose.Schema({
  format: { type: Number, default: 1.0 },
  resolution: {
    map_origin: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 }
    },
    map_size: {
      x: { type: Number, required: true },
      y: { type: Number, required: true }
    },
    pixels_per_grid: { type: Number, required: true }
  },
  line_of_sight: [{ x: Number, y: Number }],
  objects_line_of_sight: [{ x: Number, y: Number }],
  portals: [{
    position: {
      x: Number,
      y: Number
    },
    bounds: [{ x: Number, y: Number }],
    rotation: Number,
    closed: Boolean,
    freestanding: Boolean
  }],
  environment: {
    baked_lighting: Boolean,
    ambient_light: String
  },
  lights: [{
    position: {
      x: Number,
      y: Number
    },
    range: Number,
    intensity: Number,
    color: String,
    shadows: Boolean
  }],
  image: { type: String, required: true } // Link to the asset instead of base64
});

module.exports = mongoose.model('Map', mapSchema);
```

## Conclusion

This sequential approach to building an AI-powered map creator provides a clear roadmap for implementation, from initial user description to final UVTT export. By leveraging Prefect for workflow orchestration, OpenAI's GPT-4o for image generation, and specialized computer vision models like YOLOv8/v11 and SAM 2 for feature detection, we can create a powerful yet user-friendly system for map creation.

The implementation prioritizes user control throughout the process, with AI doing the heavy lifting of initial generation and feature detection while always giving users the final say through iterative refinement and direct editing. This balance of automation and user control will make map creation both efficient and creatively satisfying. 