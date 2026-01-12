/**
 * COCO JSON to Simple Ground Truth Format Converter
 * Converts Roboflow COCO annotations to evaluation dashboard format
 */

export interface CocoAnnotation {
  id: number;
  image_id: number;
  category_id: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  area: number;
  segmentation?: any[];
  iscrowd?: number;
}

export interface CocoImage {
  id: number;
  file_name: string;
  width: number;
  height: number;
}

export interface CocoCategory {
  id: number;
  name: string;
  supercategory?: string;
}

export interface CocoFormat {
  images: CocoImage[];
  annotations: CocoAnnotation[];
  categories: CocoCategory[];
}

export interface SimpleGroundTruth {
  x: number;
  y: number;
  width: number;
  height: number;
  class: string;
}

/**
 * Convert COCO format to simple ground truth format
 */
export function convertCocoToSimpleFormat(cocoData: CocoFormat): SimpleGroundTruth[][] {
  console.log('🔄 Converting COCO format...');
  console.log('Categories:', cocoData.categories);
  console.log('Total images:', cocoData.images.length);
  console.log('Total annotations:', cocoData.annotations.length);
  
  // Create category lookup map
  const categoryMap = new Map<number, string>();
  cocoData.categories.forEach((cat) => {
    categoryMap.set(cat.id, cat.name);
    console.log(`Category ${cat.id} -> "${cat.name}"`);
  });

  // Group annotations by image
  const annotationsByImage = new Map<number, CocoAnnotation[]>();
  cocoData.annotations.forEach((ann) => {
    if (!annotationsByImage.has(ann.image_id)) {
      annotationsByImage.set(ann.image_id, []);
    }
    annotationsByImage.get(ann.image_id)!.push(ann);
  });

  // Convert to simple format (one array per image)
  const result: SimpleGroundTruth[][] = [];

  // Sort images by ID to maintain order
  const sortedImages = [...cocoData.images].sort((a, b) => a.id - b.id);

  sortedImages.forEach((image, idx) => {
    const imageAnnotations = annotationsByImage.get(image.id) || [];
    
    if (idx === 0) {
      console.log('First image:', image.file_name);
      console.log('First image annotations:', imageAnnotations.length);
    }
    
    const simpleAnnotations: SimpleGroundTruth[] = imageAnnotations.map((ann) => {
      // COCO bbox format: [x, y, width, height] where x,y is top-left corner
      // We need center x, center y, width, height
      const [x, y, width, height] = ann.bbox;
      
      const converted = {
        x: x + width / 2,  // Convert to center x
        y: y + height / 2, // Convert to center y
        width,
        height,
        class: categoryMap.get(ann.category_id) || `class_${ann.category_id}`,
      };
      
      if (idx === 0 && simpleAnnotations.length === 0) {
        console.log('First annotation COCO:', { x, y, width, height, category: ann.category_id });
        console.log('First annotation converted:', converted);
      }
      
      return converted;
    });

    result.push(simpleAnnotations);
  });
  
  console.log('✅ Conversion complete:', result.length, 'images');
  console.log('First image ground truths:', result[0]);

  return result;
}

/**
 * Download converted data as JSON file
 */
export function downloadGroundTruth(data: SimpleGroundTruth[][], filename: string = 'ground_truth.json'): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
}
