from PIL import Image
import torchvision.transforms as T
import io

def preprocess_image(image_bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    # Example transform
    transform = T.Compose([
        T.Resize((256,256)),
        T.CenterCrop(224),
        T.ToTensor(),
        T.Normalize(mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225])
    ])
    return transform(image).unsqueeze(0)