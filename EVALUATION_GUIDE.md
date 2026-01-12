# Model Evaluation Dashboard - Ground Truth Format

## Sample Ground Truth JSON Format

The evaluation dashboard expects ground truth annotations in the following format:

```json
[
  [
    {
      "x": 320.5,
      "y": 240.3,
      "width": 150.2,
      "height": 200.5,
      "class": "Chang"
    },
    {
      "x": 500.1,
      "y": 300.7,
      "width": 180.0,
      "height": 220.3,
      "class": "Leo"
    }
  ],
  [
    {
      "x": 400.2,
      "y": 350.5,
      "width": 160.8,
      "height": 210.1,
      "class": "Chang"
    }
  ]
]
```

## Format Explanation

- **Outer Array**: Each element represents one image's annotations
- **Inner Array**: Contains all bounding boxes for that image
- **Bounding Box Object**:
  - `x`: Center X coordinate (pixels)
  - `y`: Center Y coordinate (pixels)
  - `width`: Box width (pixels)
  - `height`: Box height (pixels)
  - `class`: Object class name (string)

## Example: 3 Images with Multiple Objects

```json
[
  // Image 1: 2 objects
  [
    { "x": 100, "y": 150, "width": 50, "height": 80, "class": "Chang" },
    { "x": 300, "y": 200, "width": 60, "height": 90, "class": "Leo" }
  ],
  // Image 2: 1 object
  [
    { "x": 250, "y": 180, "width": 55, "height": 85, "class": "Chang" }
  ],
  // Image 3: 3 objects
  [
    { "x": 120, "y": 160, "width": 50, "height": 75, "class": "Chang" },
    { "x": 350, "y": 220, "width": 65, "height": 95, "class": "Leo" },
    { "x": 200, "y": 300, "width": 70, "height": 100, "class": "Chang" }
  ]
]
```

## How to Use

1. **Prepare Your Data**: Create a JSON file matching the format above
   - Number of outer arrays = Number of test images
   - Each inner array contains ground truth boxes for one image
   - Order must match your uploaded images

2. **Upload Process**:
   - Click "Upload Test Images" and select your images
   - Click "Upload Ground Truth Annotations" and select your JSON file
   - The dashboard will validate that counts match

3. **Run Evaluation**:
   - Set confidence threshold (default: 0.5)
   - Set IoU threshold (default: 0.5)
   - Click "Run Evaluation"

## Features Available (Free Tier Compatible)

✅ **Implemented**:
- IoU (Intersection over Union) calculation
- Precision, Recall, F1 Score calculation
- Mean Average Precision (mAP)
- Per-class performance metrics
- Confusion matrix visualization
- Precision-Recall curve across confidence thresholds
- Optimal threshold finder
- True Positives / False Positives / False Negatives breakdown
- Evaluation history with localStorage
- Export results as JSON
- Interactive threshold adjustment

⚠️ **Skipped (Requires Premium API)**:
- Automatic validation dataset download from Roboflow
- Model version comparison from Roboflow server

## Metrics Explained

- **Precision**: What % of predictions are correct
  - Formula: TP / (TP + FP)
  - High precision = Few false alarms

- **Recall**: What % of actual objects are detected
  - Formula: TP / (TP + FN)
  - High recall = Few missed detections

- **F1 Score**: Balance between Precision and Recall
  - Formula: 2 × (Precision × Recall) / (Precision + Recall)
  - Best overall metric for model quality

- **mAP**: Mean Average Precision across all classes
  - Average of per-class precision values

- **IoU Threshold**: Minimum overlap to count as correct match
  - 0.5 = Standard (50% overlap required)
  - 0.75 = Strict (75% overlap required)

- **Confidence Threshold**: Minimum confidence to accept prediction
  - Higher = More precise but may miss objects
  - Lower = More detections but more false positives

## Storage & Privacy

- All evaluation data stored locally in browser (localStorage)
- No data sent to external servers except Roboflow API for predictions
- Maximum 10 evaluation runs saved (auto-cleanup of old data)
- Export feature allows backing up evaluation results
