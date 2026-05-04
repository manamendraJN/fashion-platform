from PIL import Image
import numpy as np
from torchvision import transforms

def preprocess_image(image):
    """
    Shared preprocessing: resize, center-crop, and normalize
    
    Args:
        image: PIL Image
    
    Returns:
        numpy array ready for ONNX inference
    """
    # Define preprocessing pipeline
    preprocess = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])
    
    # Apply preprocessing
    tensor = preprocess(image)
    
    # Convert to numpy and add batch dimension
    array = tensor.numpy().astype(np.float32)
    array = np.expand_dims(array, axis=0)
    
    return array
