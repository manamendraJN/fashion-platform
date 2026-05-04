import cv2
import numpy as np
from PIL import Image
import io
from rembg import remove, new_session

class ImageProcessor:
    """Professional-grade body segmentation using rembg AI"""
    
    def __init__(self):
        try:
            print("🔄 Loading rembg AI model (u2net_human_seg)...")
            print("   This model is specialized for human body segmentation")
            print("   First run will download ~60MB model file...")
            
            # Use u2net_human_seg - BEST model for human bodies
            self.session = new_session("u2net_human_seg")
            
            print("✅ rembg AI model loaded successfully!")
            print("   Model: u2net_human_seg (Human-specialized)")
            
        except Exception as e:
            print(f"⚠️ u2net_human_seg failed: {e}")
            print("   Falling back to u2net (general model)...")
            try:
                self.session = new_session("u2net")
                print("✅ rembg u2net model loaded!")
            except Exception as e2:
                print(f"❌ Failed to initialize rembg: {e2}")
                self.session = None
    
    def is_already_mask(self, img):
        """
        Smart detection: Is this already a binary mask?
        Returns True if image is already processed
        """
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img
        
        # Check unique values
        unique_values = np.unique(gray)
        
        # Binary mask has very few unique values
        if len(unique_values) <= 5:
            print("🎭 Smart Detection: Image is already a mask (skipping AI)")
            return True
        
        # Histogram check
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist = hist.flatten() / hist.sum()
        
        dark_pixels = hist[0:30].sum()
        bright_pixels = hist[226:256].sum()
        
        if (dark_pixels + bright_pixels) > 0.85:
            print("🎭 Smart Detection: Image is already a mask (skipping AI)")
            return True
        
        print("📸 Smart Detection: Color photo detected (applying AI segmentation)")
        return False
    
    def remove_background_ai(self, image_bytes):
        """
        Remove background using state-of-the-art AI
        Returns RGBA image with transparent background
        """
        try:
            # Load image
            input_image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB
            if input_image.mode != 'RGB':
                input_image = input_image.convert('RGB')
            
            # Optimize size for speed (optional)
            original_size = input_image.size
            max_size = 1024
            
            if max(original_size) > max_size:
                ratio = max_size / max(original_size)
                new_size = (int(original_size[0] * ratio), int(original_size[1] * ratio))
                input_image = input_image.resize(new_size, Image.LANCZOS)
                print(f"   Resized from {original_size} to {new_size} for faster processing")
            
            print("🤖 AI is removing background...")
            
            # Remove background with best quality settings
            output_image = remove(
                input_image,
                session=self.session,
                only_mask=False,  # Return full RGBA image
                post_process_mask=True,  # Clean up mask edges
                alpha_matting=False,  # Faster, still good quality
                alpha_matting_foreground_threshold=240,
                alpha_matting_background_threshold=10,
            )
            
            print("✅ Background removed successfully!")
            
            return output_image
            
        except Exception as e:
            print(f"❌ AI background removal failed: {e}")
            raise
    
    def create_clean_mask(self, rgba_image):
        """
        Convert RGBA image to clean binary mask
        """
        # Convert to numpy array
        img_array = np.array(rgba_image)
        
        # Extract alpha channel (transparency = mask)
        if img_array.shape[2] == 4:
            alpha = img_array[:, :, 3]
        else:
            # Fallback if no alpha
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            _, alpha = cv2.threshold(gray, 10, 255, cv2.THRESH_BINARY)
        
        # Create binary mask (white = body, black = background)
        mask = np.where(alpha > 10, 255, 0).astype(np.uint8)
        
        return mask
    
    def refine_mask(self, mask):
        """
        Refine mask for perfect edges
        """
        # Remove small noise
        kernel_small = np.ones((3, 3), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel_small, iterations=1)
        
        # Fill small holes
        kernel_medium = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel_medium, iterations=2)
        
        # Smooth edges
        mask = cv2.GaussianBlur(mask, (3, 3), 0)
        
        # Final threshold
        _, mask = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
        
        return mask
    
    def resize_mask(self, mask, target_size=(512, 384)):
        """
        Resize mask to target dimensions
        target_size: (height, width)
        """
        return cv2.resize(
            mask,
            (target_size[1], target_size[0]),  # OpenCV uses (width, height)
            interpolation=cv2.INTER_LINEAR
        )
    
    def process_image(self, image_bytes, target_size=(512, 384)):
        """
        Complete AI processing pipeline
        
        Args:
            image_bytes: Raw image bytes
            target_size: Output size (height, width)
        
        Returns:
            Processed mask as PNG bytes
        """
        try:
            print("\n" + "="*60)
            print("🎯 Starting Image Processing Pipeline")
            print("="*60)
            
            # Load image for detection
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                raise ValueError("Invalid image - cannot decode")
            
            print(f"📐 Input image size: {img.shape[1]}x{img.shape[0]} pixels")
            
            # SMART DETECTION
            if self.is_already_mask(img):
                # Already a mask - minimal processing
                print("⚡ Fast path: Using existing mask")
                
                if len(img.shape) == 3:
                    mask = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                else:
                    mask = img
                
                # Just ensure binary
                _, mask = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
                
            else:
                # Color photo - apply full AI pipeline
                print("🚀 AI path: Processing color photo")
                
                if self.session is None:
                    raise RuntimeError("rembg AI model not loaded")
                
                # Step 1: Remove background with AI
                img_no_bg = self.remove_background_ai(image_bytes)
                
                # Step 2: Extract mask from alpha channel
                print("🎭 Extracting body mask...")
                mask = self.create_clean_mask(img_no_bg)
                
                # Step 3: Refine edges
                print("✨ Refining mask edges...")
                mask = self.refine_mask(mask)
            
            # Step 4: Resize to target
            print(f"📏 Resizing to {target_size[1]}x{target_size[0]} pixels...")
            mask = self.resize_mask(mask, target_size)
            
            # Convert to PNG bytes
            _, buffer = cv2.imencode('.png', mask)
            
            print("✅ Processing complete!")
            print("="*60 + "\n")
            
            return buffer.tobytes()
            
        except Exception as e:
            print(f"\n❌ PROCESSING FAILED: {e}")
            print("="*60 + "\n")
            import traceback
            traceback.print_exc()
            raise
    
    def process_and_preview(self, image_bytes, target_size=(512, 384)):
        """
        Generate preview with original, overlay, and final mask
        """
        try:
            print("\n🖼️  Generating preview...")
            
            # Load original
            nparr = np.frombuffer(image_bytes, np.uint8)
            original = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if original is None:
                raise ValueError("Invalid image")
            
            # Process based on type
            if self.is_already_mask(original):
                # Already mask
                if len(original.shape) == 3:
                    mask = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
                else:
                    mask = original
                
                _, mask = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
                original_for_preview = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
                
            else:
                # Apply AI
                if self.session is None:
                    raise RuntimeError("rembg not initialized")
                
                img_no_bg = self.remove_background_ai(image_bytes)
                mask = self.create_clean_mask(img_no_bg)
                mask = self.refine_mask(mask)
                original_for_preview = original
            
            # Resize everything
            original_resized = cv2.resize(original_for_preview, (target_size[1], target_size[0]))
            mask_resized = self.resize_mask(mask, target_size)
            
            # Create green overlay preview
            mask_3ch = cv2.cvtColor(mask_resized, cv2.COLOR_GRAY2BGR)
            green_overlay = np.zeros_like(original_resized)
            green_overlay[:, :, 1] = mask_resized  # Green channel
            
            # Blend
            preview = cv2.addWeighted(original_resized, 0.6, green_overlay, 0.4, 0)
            
            # Add contour outline
            contours, _ = cv2.findContours(
                mask_resized, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )
            cv2.drawContours(preview, contours, -1, (0, 255, 0), 2)
            
            # Convert to bytes
            _, mask_buffer = cv2.imencode('.png', mask_resized)
            _, preview_buffer = cv2.imencode('.png', preview)
            
            print("✅ Preview generated!\n")
            
            return {
                'mask_bytes': mask_buffer.tobytes(),
                'preview_bytes': preview_buffer.tobytes()
            }
            
        except Exception as e:
            print(f"❌ Preview generation failed: {e}\n")
            import traceback
            traceback.print_exc()
            raise

# Global instance
image_processor = ImageProcessor()